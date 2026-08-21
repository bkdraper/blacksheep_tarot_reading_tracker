/**
 * @jest-environment jsdom
 */

/**
 * Tests for session-store.js — reading label logic
 * Validates: Requirements 2.3, 2.4, 2.5
 */

document.body.innerHTML = `
  <button id="userBtn"></button>
  <input id="location" />
  <input id="price" value="40" />
  <input id="sessionDate" />
  <div id="readingsList"></div>
  <div id="totalsContent"></div>

  <div id="requiredFieldsNote"></div>
  <button class="btn-create-session"></button>
  <button class="btn-new-session"></button>
  <button class="btn-load-session"></button>
  <div class="buttons"></div>
  <div class="totals"></div>
  <div class="readings-list"></div>

  <input id="session-search" />
  <div id="sessionsList"></div>
  <button class="session-filter-btn" data-filter="all">All</button>
  <button class="session-filter-btn" data-filter="event">Events</button>
  <button class="session-filter-btn" data-filter="private">Private</button>
`;

global.showSnackbar = jest.fn();
global.vibrate = jest.fn();
global.registerBackgroundSync = jest.fn();
global.Utils = {
  sanitize: jest.fn((str) => str || ''),
  toISODate: jest.fn(() => '2025-01-15'),
  formatSessionDate: jest.fn((start, end) => start || '')
};

global.window.offlineQueue = {
  enqueue: jest.fn(),
  flush: jest.fn(),
  count: jest.fn(),
  peek: jest.fn(),
  setUserId: jest.fn()
};

global.window.auth = {
  userId: 'user-123',
  getUserName: jest.fn(() => 'TestUser')
};

const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'session-store.js'), 'utf8');
const SessionStore = eval(`(function() { ${code}; return SessionStore; })()`);

describe('SessionStore — Reading Label Logic', () => {
  let session;

  beforeEach(() => {
    jest.clearAllMocks();
    session = new SessionStore();
    session._sessionId = 'test-session-id';
    session._location = 'Denver Spring 26';
    session._startDate = '2026-03-15';
    session._endDate = '2026-03-15';
    session._price = 40;
  });

  describe('addReading() — private session label defaults (Req 2.3)', () => {
    test('should set label to session location when type is private and no label provided', async () => {
      session._type = 'private';

      const reading = { timestamp: '2026-03-15T14:30:00.000', tip: 5, price: 40 };
      await session.addReading(reading);

      expect(session.readings[0].label).toBe('Denver Spring 26');
    });

    test('should preserve existing label when type is private and label is provided', async () => {
      session._type = 'private';

      const reading = { timestamp: '2026-03-15T14:30:00.000', tip: 5, price: 40, label: 'Sarah' };
      await session.addReading(reading);

      expect(session.readings[0].label).toBe('Sarah');
    });

    test('should not set label when type is event', async () => {
      session._type = 'event';

      const reading = { timestamp: '2026-03-15T14:30:00.000', tip: 5, price: 40 };
      await session.addReading(reading);

      expect(session.readings[0].label).toBeUndefined();
    });

    test('should not overwrite empty string label on event sessions', async () => {
      session._type = 'event';

      const reading = { timestamp: '2026-03-15T14:30:00.000', tip: 5, price: 40, label: '' };
      await session.addReading(reading);

      // Event sessions don't touch label at all, so it stays as-is
      expect(session.readings[0].label).toBe('');
    });
  });

  describe('addReading() — label in Supabase insert payload (Req 2.3)', () => {
    test('should include label in insert payload when label is defined', async () => {
      session._type = 'private';

      const insertMock = jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [{ id: 'new-reading-id' }], error: null }))
      }));
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') {
          return { insert: insertMock };
        }
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      const reading = { timestamp: '2026-03-15T14:30:00.000', tip: 5, price: 40 };
      await session.addReading(reading);

      expect(insertMock).toHaveBeenCalled();
      const payload = insertMock.mock.calls[0][0][0];
      expect(payload.label).toBe('Denver Spring 26');
      expect(payload.session_id).toBe('test-session-id');
    });

    test('should not include label in insert payload when label is undefined (event)', async () => {
      session._type = 'event';

      const insertMock = jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [{ id: 'new-reading-id' }], error: null }))
      }));
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') {
          return { insert: insertMock };
        }
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      const reading = { timestamp: '2026-03-15T14:30:00.000', tip: 5, price: 40 };
      await session.addReading(reading);

      const payload = insertMock.mock.calls[0][0][0];
      expect(payload.label).toBeUndefined();
    });

    test('should include custom label in insert payload when provided', async () => {
      session._type = 'private';

      const insertMock = jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [{ id: 'new-reading-id' }], error: null }))
      }));
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') {
          return { insert: insertMock };
        }
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      const reading = { timestamp: '2026-03-15T14:30:00.000', tip: 10, price: 40, label: 'Sarah' };
      await session.addReading(reading);

      const payload = insertMock.mock.calls[0][0][0];
      expect(payload.label).toBe('Sarah');
    });
  });

  describe('updateReading() — label field updates (Req 2.4, 2.5)', () => {
    beforeEach(() => {
      session._readings = [
        { id: 'r1', timestamp: '2026-03-15T14:30:00.000', tip: 5, price: 40, label: 'Denver Spring 26' }
      ];
    });

    test('should update label in UI immediately', async () => {
      const updateMock = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }));
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') {
          return { update: updateMock };
        }
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      await session.updateReading(0, 'label', 'Sarah');

      expect(session.readings[0].label).toBe('Sarah');
    });

    test('should persist label to DB via Supabase update', async () => {
      const eqMock = jest.fn(() => Promise.resolve({ data: null, error: null }));
      const updateMock = jest.fn(() => ({ eq: eqMock }));
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') {
          return { update: updateMock };
        }
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      await session.updateReading(0, 'label', 'Sarah');

      expect(updateMock).toHaveBeenCalledWith({ label: 'Sarah' });
      expect(eqMock).toHaveBeenCalledWith('id', 'r1');
    });

    test('should revert label to previous value on DB failure', async () => {
      const updateMock = jest.fn(() => ({
        eq: jest.fn(() => Promise.reject(new Error('Network error')))
      }));
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') {
          return { update: updateMock };
        }
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      await session.updateReading(0, 'label', 'NewName');

      // Should revert to original value
      expect(session.readings[0].label).toBe('Denver Spring 26');
    });

    test('should show error snackbar on label update failure', async () => {
      const updateMock = jest.fn(() => ({
        eq: jest.fn(() => Promise.reject(new Error('Network error')))
      }));
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') {
          return { update: updateMock };
        }
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      await session.updateReading(0, 'label', 'NewName');

      expect(global.showSnackbar).toHaveBeenCalledWith('Failed to update label', 'error');
    });

    test('should enqueue update_reading to offline queue on label update failure', async () => {
      const updateMock = jest.fn(() => ({
        eq: jest.fn(() => Promise.reject(new Error('Network error')))
      }));
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') {
          return { update: updateMock };
        }
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      await session.updateReading(0, 'label', 'NewName');

      expect(window.offlineQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'update_reading',
          readingId: 'r1',
          payload: { field: 'label', value: 'NewName' }
        })
      );
    });

    test('should not revert non-label fields on update failure', async () => {
      const updateMock = jest.fn(() => ({
        eq: jest.fn(() => Promise.reject(new Error('Network error')))
      }));
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') {
          return { update: updateMock };
        }
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      await session.updateReading(0, 'tip', 15);

      // Non-label fields should NOT revert — only label has revert behavior
      expect(session.readings[0].tip).toBe(15);
    });
  });
});
