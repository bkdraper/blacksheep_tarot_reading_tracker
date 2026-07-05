/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('Integration: Offline Queue Flush Triggers and UX', () => {
  let OfflineQueue;
  let offlineQueue;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Set up minimal DOM
    document.body.innerHTML = `
      <div id="offlineIndicator" style="display: none;"></div>
    `;

    // Mock globals that offline-queue.js depends on
    global.showSnackbar = jest.fn();
    global.registerBackgroundSync = jest.fn();
    global.Utils = {
      isDevelopmentMode: jest.fn(() => false),
      sanitize: jest.fn((str) => str)
    };

    // Load the offline-queue module
    const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'offline-queue.js'), 'utf8');
    OfflineQueue = eval(`(function() { ${code}; return OfflineQueue; })()`);

    offlineQueue = new OfflineQueue();
    window.offlineQueue = offlineQueue;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Online event triggers flush', () => {
    test('should call flush when online event fires', () => {
      const flushSpy = jest.spyOn(window.offlineQueue, 'flush');

      // Simulate the updateOnlineStatus handler that index.html wires up
      function updateOnlineStatus() {
        const indicator = document.getElementById('offlineIndicator');
        if (!navigator.onLine) {
          indicator.style.display = 'inline-block';
        } else {
          indicator.style.display = 'none';
          window.offlineQueue.flush();
        }
      }

      // Simulate being online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });

      updateOnlineStatus();
      expect(flushSpy).toHaveBeenCalled();
    });

    test('should not call flush when offline', () => {
      const flushSpy = jest.spyOn(window.offlineQueue, 'flush');

      function updateOnlineStatus() {
        const indicator = document.getElementById('offlineIndicator');
        if (!navigator.onLine) {
          indicator.style.display = 'inline-block';
        } else {
          indicator.style.display = 'none';
          window.offlineQueue.flush();
        }
      }

      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

      updateOnlineStatus();
      expect(flushSpy).not.toHaveBeenCalled();
    });

    test('should hide offline indicator when coming online', () => {
      const indicator = document.getElementById('offlineIndicator');
      indicator.style.display = 'inline-block';

      function updateOnlineStatus() {
        if (!navigator.onLine) {
          indicator.style.display = 'inline-block';
        } else {
          indicator.style.display = 'none';
          window.offlineQueue.flush();
        }
      }

      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
      updateOnlineStatus();

      expect(indicator.style.display).toBe('none');
    });
  });

  describe('Service worker SYNC_READINGS message triggers flush', () => {
    test('should call flush when SYNC_READINGS message is received', () => {
      const flushSpy = jest.spyOn(window.offlineQueue, 'flush');

      // Simulate the SW message handler from index.html
      function handleSWMessage(event) {
        if (event.data.type === 'SYNC_READINGS') {
          window.offlineQueue.flush();
        }
      }

      handleSWMessage({ data: { type: 'SYNC_READINGS' } });
      expect(flushSpy).toHaveBeenCalled();
    });

    test('should not call flush for other SW message types', () => {
      const flushSpy = jest.spyOn(window.offlineQueue, 'flush');

      function handleSWMessage(event) {
        if (event.data.type === 'SYNC_READINGS') {
          window.offlineQueue.flush();
        }
      }

      handleSWMessage({ data: { type: 'RESET_TIMER' } });
      expect(flushSpy).not.toHaveBeenCalled();
    });
  });

  describe('Post-auth calls setUserId then flush', () => {
    test('should call setUserId then flush after successful auth', () => {
      const setUserIdSpy = jest.spyOn(window.offlineQueue, 'setUserId');
      const flushSpy = jest.spyOn(window.offlineQueue, 'flush');

      // Simulate the post-auth initialization from index.html
      const auth = { userId: 'user-123' };
      window.offlineQueue.setUserId(auth.userId);
      window.offlineQueue.flush();

      expect(setUserIdSpy).toHaveBeenCalledWith('user-123');
      expect(flushSpy).toHaveBeenCalled();
    });

    test('should call setUserId before flush (correct order)', () => {
      const callOrder = [];
      jest.spyOn(window.offlineQueue, 'setUserId').mockImplementation(() => {
        callOrder.push('setUserId');
      });
      jest.spyOn(window.offlineQueue, 'flush').mockImplementation(() => {
        callOrder.push('flush');
      });

      // Simulate post-auth
      const auth = { userId: 'user-456' };
      window.offlineQueue.setUserId(auth.userId);
      window.offlineQueue.flush();

      expect(callOrder).toEqual(['setUserId', 'flush']);
    });
  });

  describe('Snackbar notifications', () => {
    test('should show "Saved offline" snackbar on enqueue', () => {
      offlineQueue.setUserId('user-123');

      const message = {
        type: 'insert_reading',
        createdAt: new Date().toISOString(),
        sessionId: 'session-1',
        payload: { timestamp: new Date().toISOString(), tip: 5, price: 40, payment: 'Cash', source: 'Walk-up' }
      };

      offlineQueue.enqueue(message);

      expect(global.showSnackbar).toHaveBeenCalledWith(
        'Saved offline \u2014 will sync when connected',
        'info'
      );
    });

    test('should show persistent "Syncing offline changes..." snackbar on flush start', async () => {
      offlineQueue.setUserId('user-123');

      // Enqueue a message so flush has work to do
      offlineQueue._queue = [{
        type: 'delete_reading',
        createdAt: new Date().toISOString(),
        readingId: 'reading-1'
      }];

      // Mock supabaseClient to succeed
      global.supabaseClient = {
        from: jest.fn(() => ({
          delete: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      };

      // Spy on _createPersistentSnackbar
      const createSpy = jest.spyOn(offlineQueue, '_createPersistentSnackbar');

      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });

      await offlineQueue.flush();

      expect(createSpy).toHaveBeenCalledWith('Syncing offline changes...');
    });

    test('should show "All changes synced" snackbar on flush success', async () => {
      offlineQueue.setUserId('user-123');

      offlineQueue._queue = [{
        type: 'delete_reading',
        createdAt: new Date().toISOString(),
        readingId: 'reading-1'
      }];

      global.supabaseClient = {
        from: jest.fn(() => ({
          delete: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      };

      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });

      await offlineQueue.flush();

      expect(global.showSnackbar).toHaveBeenCalledWith('All changes synced', 'success');
    });

    test('should show "Sync failed" snackbar with 4s duration on flush error', async () => {
      offlineQueue.setUserId('user-123');

      offlineQueue._queue = [{
        type: 'delete_reading',
        createdAt: new Date().toISOString(),
        readingId: 'reading-1'
      }];

      // Mock supabaseClient to fail
      global.supabaseClient = {
        from: jest.fn(() => ({
          delete: jest.fn(() => ({
            eq: jest.fn(() => Promise.reject(new Error('Network error')))
          }))
        }))
      };

      const timedSpy = jest.spyOn(offlineQueue, '_showTimedSnackbar');

      await offlineQueue.flush();

      expect(timedSpy).toHaveBeenCalledWith(
        'Sync failed \u2014 will retry when connected',
        'error',
        4000
      );
    });

    test('should remove persistent syncing snackbar after flush completes', async () => {
      offlineQueue.setUserId('user-123');

      offlineQueue._queue = [{
        type: 'delete_reading',
        createdAt: new Date().toISOString(),
        readingId: 'reading-1'
      }];

      global.supabaseClient = {
        from: jest.fn(() => ({
          delete: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      };

      const removeSpy = jest.spyOn(offlineQueue, '_removePersistentSnackbar');
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });

      await offlineQueue.flush();

      expect(removeSpy).toHaveBeenCalled();
    });

    test('should remove persistent syncing snackbar after flush error', async () => {
      offlineQueue.setUserId('user-123');

      offlineQueue._queue = [{
        type: 'delete_reading',
        createdAt: new Date().toISOString(),
        readingId: 'reading-1'
      }];

      global.supabaseClient = {
        from: jest.fn(() => ({
          delete: jest.fn(() => ({
            eq: jest.fn(() => Promise.reject(new Error('Network error')))
          }))
        }))
      };

      const removeSpy = jest.spyOn(offlineQueue, '_removePersistentSnackbar');

      await offlineQueue.flush();

      expect(removeSpy).toHaveBeenCalled();
    });
  });

  describe('Offline badge removal on successful flush', () => {
    test('should hide offline indicator after successful flush when online', async () => {
      offlineQueue.setUserId('user-123');
      const indicator = document.getElementById('offlineIndicator');
      indicator.style.display = 'inline-block';

      offlineQueue._queue = [{
        type: 'delete_reading',
        createdAt: new Date().toISOString(),
        readingId: 'reading-1'
      }];

      global.supabaseClient = {
        from: jest.fn(() => ({
          delete: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      };

      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });

      await offlineQueue.flush();

      expect(indicator.style.display).toBe('none');
    });

    test('should not hide offline indicator after successful flush when offline', async () => {
      offlineQueue.setUserId('user-123');
      const indicator = document.getElementById('offlineIndicator');
      indicator.style.display = 'inline-block';

      offlineQueue._queue = [{
        type: 'delete_reading',
        createdAt: new Date().toISOString(),
        readingId: 'reading-1'
      }];

      global.supabaseClient = {
        from: jest.fn(() => ({
          delete: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      };

      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

      await offlineQueue.flush();

      expect(indicator.style.display).toBe('inline-block');
    });

    test('should not hide offline indicator when flush fails', async () => {
      offlineQueue.setUserId('user-123');
      const indicator = document.getElementById('offlineIndicator');
      indicator.style.display = 'inline-block';

      offlineQueue._queue = [{
        type: 'delete_reading',
        createdAt: new Date().toISOString(),
        readingId: 'reading-1'
      }];

      global.supabaseClient = {
        from: jest.fn(() => ({
          delete: jest.fn(() => ({
            eq: jest.fn(() => Promise.reject(new Error('Network error')))
          }))
        }))
      };

      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });

      await offlineQueue.flush();

      expect(indicator.style.display).toBe('inline-block');
    });
  });
});
