/**
 * @jest-environment jsdom
 */

// Mock globals needed by OfflineQueue
global.showSnackbar = jest.fn();
global.registerBackgroundSync = jest.fn();
global.Utils = { isDevelopmentMode: jest.fn(() => false) };

// Override the localStorage mock from jest.setup.js with a functional store for this test
let localStore = {};
const localStorageMock = {
    getItem: jest.fn((key) => localStore[key] || null),
    setItem: jest.fn((key, value) => { localStore[key] = String(value); }),
    removeItem: jest.fn((key) => { delete localStore[key]; }),
    clear: jest.fn(() => { localStore = {}; })
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'offline-queue.js'), 'utf8');

// Helper to load a fresh OfflineQueue instance
function loadOfflineQueue() {
    delete window.offlineQueue;
    eval(code);
    return window.offlineQueue;
}

describe('OfflineQueue', () => {
    let queue;

    beforeEach(() => {
        jest.clearAllMocks();
        localStore = {};
        // Re-apply the store-backed implementations after clearAllMocks strips them
        localStorageMock.getItem.mockImplementation((key) => localStore[key] || null);
        localStorageMock.setItem.mockImplementation((key, value) => { localStore[key] = String(value); });
        localStorageMock.removeItem.mockImplementation((key) => { delete localStore[key]; });
        localStorageMock.clear.mockImplementation(() => { localStore = {}; });
        Utils.isDevelopmentMode.mockReturnValue(false);
        queue = loadOfflineQueue();
        queue.setUserId('user-123');
    });

    // Helper to create a valid insert_reading message
    function makeInsertMessage(overrides = {}) {
        return {
            type: 'insert_reading',
            createdAt: new Date().toISOString(),
            sessionId: 'sess-1',
            payload: { timestamp: '2025-01-15T14:00:00Z', tip: 5, price: 40, payment: 'Cash', source: 'Walk-up' },
            ...overrides
        };
    }

    function makeUpdateMessage(overrides = {}) {
        return {
            type: 'update_reading',
            createdAt: new Date().toISOString(),
            readingId: 'reading-1',
            payload: { field: 'tip', value: 10 },
            ...overrides
        };
    }

    function makeDeleteMessage(overrides = {}) {
        return {
            type: 'delete_reading',
            createdAt: new Date().toISOString(),
            readingId: 'reading-1',
            ...overrides
        };
    }

    function makeSessionMessage(overrides = {}) {
        return {
            type: 'update_session',
            createdAt: new Date().toISOString(),
            sessionId: 'sess-1',
            payload: { location: 'Ren Fest' },
            ...overrides
        };
    }

    describe('enqueue', () => {
        test('should append message to queue and update localStorage', () => {
            const msg = makeInsertMessage();
            queue.enqueue(msg);

            expect(queue.count()).toBe(1);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'offlineQueue_user-123',
                expect.any(String)
            );
            const persisted = JSON.parse(localStorageMock.getItem('offlineQueue_user-123'));
            expect(persisted[0].type).toBe('insert_reading');
        });

        test('should preserve insertion order (FIFO)', () => {
            const msg1 = makeInsertMessage({ sessionId: 'sess-1' });
            const msg2 = makeUpdateMessage({ readingId: 'r-2' });
            const msg3 = makeDeleteMessage({ readingId: 'r-3' });

            queue.enqueue(msg1);
            queue.enqueue(msg2);
            queue.enqueue(msg3);

            expect(queue.count()).toBe(3);
            const peeked = queue.peek();
            expect(peeked[0].type).toBe('insert_reading');
            expect(peeked[1].type).toBe('update_reading');
            expect(peeked[2].type).toBe('delete_reading');
        });

        test('should show snackbar and register background sync', () => {
            queue.enqueue(makeInsertMessage());
            expect(showSnackbar).toHaveBeenCalledWith('Saved offline — will sync when connected', 'info');
            expect(registerBackgroundSync).toHaveBeenCalled();
        });

        test('should reject invalid message type', () => {
            queue.enqueue({ type: 'bogus', createdAt: new Date().toISOString() });
            expect(queue.count()).toBe(0);
        });

        test('should reject null message', () => {
            queue.enqueue(null);
            expect(queue.count()).toBe(0);
        });

        test('should reject message missing createdAt', () => {
            queue.enqueue({ type: 'insert_reading', sessionId: 'sess-1', payload: { timestamp: 'x' } });
            expect(queue.count()).toBe(0);
        });

        test('should reject insert_reading missing sessionId', () => {
            queue.enqueue({ type: 'insert_reading', createdAt: new Date().toISOString(), payload: {} });
            expect(queue.count()).toBe(0);
        });

        test('should reject update_reading missing readingId', () => {
            queue.enqueue({ type: 'update_reading', createdAt: new Date().toISOString(), payload: { field: 'tip', value: 5 } });
            expect(queue.count()).toBe(0);
        });

        test('should reject delete_reading missing readingId', () => {
            queue.enqueue({ type: 'delete_reading', createdAt: new Date().toISOString() });
            expect(queue.count()).toBe(0);
        });
    });

    describe('enqueue edge cases', () => {
        test('should handle localStorage quota error gracefully', () => {
            localStorageMock.setItem.mockImplementationOnce(() => { throw new DOMException('QuotaExceededError'); });
            // Should not throw — message stays in memory
            queue.enqueue(makeInsertMessage());
            expect(queue.count()).toBe(1);
        });

        test('should enforce 500-message cap', () => {
            // Fill the queue to capacity
            queue._queue = new Array(500).fill(makeInsertMessage());

            queue.enqueue(makeInsertMessage());
            expect(queue.count()).toBe(500);
        });

        test('should log warning when queue is at capacity', () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            queue._queue = new Array(500).fill(makeInsertMessage());

            queue.enqueue(makeInsertMessage());
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Queue at capacity')
            );
            warnSpy.mockRestore();
        });
    });

    describe('flush happy path', () => {
        beforeEach(() => {
            // Mock supabaseClient for successful operations
            global.supabaseClient = {
                from: jest.fn(() => ({
                    insert: jest.fn(() => ({
                        select: jest.fn(() => Promise.resolve({ data: [{ id: 'new-id' }], error: null }))
                    })),
                    update: jest.fn(() => ({
                        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
                    })),
                    delete: jest.fn(() => ({
                        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
                    }))
                }))
            };
            Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        });

        test('should process all messages FIFO and clear queue', async () => {
            queue.enqueue(makeInsertMessage());
            queue.enqueue(makeUpdateMessage());
            queue.enqueue(makeDeleteMessage());

            await queue.flush();

            expect(queue.count()).toBe(0);
            expect(supabaseClient.from).toHaveBeenCalledTimes(3);
        });

        test('should clear localStorage after successful flush', async () => {
            queue.enqueue(makeInsertMessage());

            await queue.flush();

            // After flush, persisted queue should be empty
            const stored = JSON.parse(localStorageMock.getItem('offlineQueue_user-123'));
            expect(stored).toEqual([]);
        });

        test('should show success snackbar after flush', async () => {
            queue.enqueue(makeInsertMessage());
            showSnackbar.mockClear();

            await queue.flush();

            expect(showSnackbar).toHaveBeenCalledWith('All changes synced', 'success');
        });

        test('should not call flush when queue is empty', async () => {
            await queue.flush();
            expect(supabaseClient.from).not.toHaveBeenCalled();
        });
    });

    describe('flush partial failure', () => {
        test('should stop on first error and keep remaining messages', async () => {
            let callCount = 0;
            global.supabaseClient = {
                from: jest.fn(() => ({
                    insert: jest.fn(() => ({
                        select: jest.fn(() => {
                            callCount++;
                            if (callCount <= 2) {
                                return Promise.resolve({ data: [{ id: 'ok' }], error: null });
                            }
                            return Promise.resolve({ data: null, error: { message: 'Server error' } });
                        })
                    })),
                    update: jest.fn(() => ({
                        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
                    })),
                    delete: jest.fn(() => ({
                        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
                    }))
                }))
            };

            // Enqueue 4 insert messages
            queue.enqueue(makeInsertMessage({ sessionId: 'a' }));
            queue.enqueue(makeInsertMessage({ sessionId: 'b' }));
            queue.enqueue(makeInsertMessage({ sessionId: 'c' }));
            queue.enqueue(makeInsertMessage({ sessionId: 'd' }));

            await queue.flush();

            // First 2 succeeded, 3rd failed, 4th never attempted
            expect(queue.count()).toBe(2);
        });

        test('should re-register background sync on error', async () => {
            global.supabaseClient = {
                from: jest.fn(() => ({
                    insert: jest.fn(() => ({
                        select: jest.fn(() => Promise.resolve({ data: null, error: { message: 'fail' } }))
                    }))
                }))
            };

            queue.enqueue(makeInsertMessage());
            registerBackgroundSync.mockClear();

            await queue.flush();

            expect(registerBackgroundSync).toHaveBeenCalled();
        });
    });

    describe('flush concurrency guard', () => {
        test('should return immediately if flush already in progress', async () => {
            let resolveFirst;
            const blockingPromise = new Promise(r => { resolveFirst = r; });

            global.supabaseClient = {
                from: jest.fn(() => ({
                    insert: jest.fn(() => ({
                        select: jest.fn(() => blockingPromise)
                    }))
                }))
            };

            queue.enqueue(makeInsertMessage());
            queue.enqueue(makeInsertMessage());

            // Start first flush (will block)
            const flush1 = queue.flush();

            // Second flush should return immediately
            await queue.flush();

            // Queue should still have items since first flush is blocked
            expect(queue.count()).toBe(2);

            // Resolve the blocking call
            resolveFirst({ data: [{ id: 'ok' }], error: null });
            await flush1;
        });
    });

    describe('count() and peek()', () => {
        test('count() returns correct value', () => {
            expect(queue.count()).toBe(0);
            queue.enqueue(makeInsertMessage());
            expect(queue.count()).toBe(1);
            queue.enqueue(makeUpdateMessage());
            expect(queue.count()).toBe(2);
        });

        test('peek() returns copy not reference', () => {
            queue.enqueue(makeInsertMessage());
            const peeked = queue.peek();

            // Mutating the returned array should not affect internal queue
            peeked.push({ type: 'fake' });
            expect(queue.count()).toBe(1);
        });

        test('peek() returns all messages in order', () => {
            const msg1 = makeInsertMessage();
            const msg2 = makeDeleteMessage();
            queue.enqueue(msg1);
            queue.enqueue(msg2);

            const peeked = queue.peek();
            expect(peeked.length).toBe(2);
            expect(peeked[0].type).toBe('insert_reading');
            expect(peeked[1].type).toBe('delete_reading');
        });
    });

    describe('setUserId', () => {
        test('should load existing queue from localStorage', () => {
            const existingQueue = [makeInsertMessage(), makeUpdateMessage()];
            localStore['offlineQueue_user-456'] = JSON.stringify(existingQueue);

            queue.setUserId('user-456');

            expect(localStorageMock.getItem).toHaveBeenCalledWith('offlineQueue_user-456');
            expect(queue.count()).toBe(2);
            expect(queue.peek()[0].type).toBe('insert_reading');
        });

        test('should handle missing localStorage data', () => {
            queue.setUserId('user-new');
            expect(queue.count()).toBe(0);
        });

        test('should handle corrupt JSON in localStorage', () => {
            localStore['offlineQueue_user-corrupt'] = 'not valid json{{{';
            queue.setUserId('user-corrupt');
            expect(queue.count()).toBe(0);
        });

        test('should handle non-array stored data', () => {
            localStore['offlineQueue_user-obj'] = JSON.stringify({ not: 'an array' });
            queue.setUserId('user-obj');
            expect(queue.count()).toBe(0);
        });

        test('should reset queue when userId is null', () => {
            queue.enqueue(makeInsertMessage());
            expect(queue.count()).toBe(1);

            queue.setUserId(null);
            expect(queue.count()).toBe(0);
        });
    });

    describe('dev-mode logging', () => {
        beforeEach(() => {
            Utils.isDevelopmentMode.mockReturnValue(true);
            global.supabaseClient = {
                from: jest.fn(() => ({
                    insert: jest.fn(() => ({
                        select: jest.fn(() => Promise.resolve({ data: [{ id: 'ok' }], error: null }))
                    })),
                    update: jest.fn(() => ({
                        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
                    })),
                    delete: jest.fn(() => ({
                        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
                    }))
                }))
            };
            Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        });

        test('should log enqueue with [OfflineQueue] prefix in dev mode', () => {
            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            queue.enqueue(makeInsertMessage());

            expect(logSpy).toHaveBeenCalledWith(
                expect.stringContaining('[OfflineQueue] enqueue:')
            );
            logSpy.mockRestore();
        });

        test('should log flush-start and flush-complete in dev mode', async () => {
            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            queue.enqueue(makeInsertMessage());
            logSpy.mockClear();

            await queue.flush();

            const calls = logSpy.mock.calls.map(c => c[0]);
            expect(calls.some(c => c.includes('[OfflineQueue] flush-start:'))).toBe(true);
            expect(calls.some(c => c.includes('[OfflineQueue] flush-complete:'))).toBe(true);
            logSpy.mockRestore();
        });

        test('should not log in production mode', () => {
            Utils.isDevelopmentMode.mockReturnValue(false);
            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            queue.enqueue(makeInsertMessage());

            const offlineQueueLogs = logSpy.mock.calls.filter(c => 
                typeof c[0] === 'string' && c[0].includes('[OfflineQueue]')
            );
            expect(offlineQueueLogs.length).toBe(0);
            logSpy.mockRestore();
        });
    });

    describe('flush — new operation payloads (soft delete, type change, label)', () => {
        let mockUpdate;
        let mockEq;

        beforeEach(() => {
            mockEq = jest.fn(() => Promise.resolve({ data: null, error: null }));
            mockUpdate = jest.fn(() => ({ eq: mockEq }));
            global.supabaseClient = {
                from: jest.fn(() => ({
                    insert: jest.fn(() => ({
                        select: jest.fn(() => Promise.resolve({ data: [{ id: 'new-id' }], error: null }))
                    })),
                    update: mockUpdate,
                    delete: jest.fn(() => ({
                        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
                    }))
                }))
            };
            Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        });

        test('update_session with { deleted_at } payload flushes correctly', async () => {
            const deletedAt = '2026-07-10T14:30:00.000';
            queue.enqueue({
                type: 'update_session',
                createdAt: new Date().toISOString(),
                sessionId: 'sess-to-delete',
                payload: { deleted_at: deletedAt }
            });

            await queue.flush();

            expect(queue.count()).toBe(0);
            expect(supabaseClient.from).toHaveBeenCalledWith('blacksheep_reading_tracker_sessions');
            expect(mockUpdate).toHaveBeenCalledWith({ deleted_at: deletedAt });
            expect(mockEq).toHaveBeenCalledWith('id', 'sess-to-delete');
        });

        test('update_session with { type } payload flushes correctly', async () => {
            queue.enqueue({
                type: 'update_session',
                createdAt: new Date().toISOString(),
                sessionId: 'sess-type-change',
                payload: { type: 'private' }
            });

            await queue.flush();

            expect(queue.count()).toBe(0);
            expect(supabaseClient.from).toHaveBeenCalledWith('blacksheep_reading_tracker_sessions');
            expect(mockUpdate).toHaveBeenCalledWith({ type: 'private' });
            expect(mockEq).toHaveBeenCalledWith('id', 'sess-type-change');
        });

        test('update_reading with { field: "label", value } payload flushes correctly', async () => {
            queue.enqueue({
                type: 'update_reading',
                createdAt: new Date().toISOString(),
                readingId: 'reading-label-1',
                payload: { field: 'label', value: 'Sarah' }
            });

            await queue.flush();

            expect(queue.count()).toBe(0);
            expect(supabaseClient.from).toHaveBeenCalledWith('blacksheep_reading_tracker_readings');
            expect(mockUpdate).toHaveBeenCalledWith({ label: 'Sarah' });
            expect(mockEq).toHaveBeenCalledWith('id', 'reading-label-1');
        });
    });

    describe('user isolation', () => {
        test('switching userId loads independent queue', () => {
            const user1Queue = [makeInsertMessage({ sessionId: 'user1-sess' })];
            const user2Queue = [makeDeleteMessage({ readingId: 'user2-reading' })];

            localStore['offlineQueue_user-1'] = JSON.stringify(user1Queue);
            localStore['offlineQueue_user-2'] = JSON.stringify(user2Queue);

            queue.setUserId('user-1');
            expect(queue.count()).toBe(1);
            expect(queue.peek()[0].sessionId).toBe('user1-sess');

            queue.setUserId('user-2');
            expect(queue.count()).toBe(1);
            expect(queue.peek()[0].readingId).toBe('user2-reading');
        });

        test('enqueue persists to correct user key', () => {
            queue.setUserId('user-abc');
            localStorageMock.setItem.mockClear();
            queue.enqueue(makeInsertMessage());

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'offlineQueue_user-abc',
                expect.any(String)
            );
        });
    });
});
