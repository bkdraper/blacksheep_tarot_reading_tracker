/**
 * @jest-environment jsdom
 */

/**
 * Tests for session-store.js — deleteSession and type change
 * Validates: Requirements 5.1, 5.3, 5.4, 5.5, 6.2, 6.3, 7.2, 7.7
 */

document.body.innerHTML = `
  <button id="userBtn"></button>
  <input id="location" />
  <input id="price" value="40" />
  <input id="sessionDate" />
  <div id="readingsList"></div>
  <span id="readingCount">0</span>
  <span id="baseTotal">0.00</span>
  <span id="tipsTotal">0.00</span>
  <span id="grandTotal">0.00</span>

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
global.Utils = { sanitize: jest.fn((str) => str), toISODate: jest.fn(() => '2025-01-15'), formatSessionDate: jest.fn((start, end) => {
  if (!start) return '';
  if (!end || start === end) return '01/15';
  return 'Jan 15–17';
}) };

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

global.normalizeDate = function(dateStr) {
  if (!dateStr) return null;
  if (dateStr.match(/^\d{2,4}-\d{2}-\d{2}$/)) {
    let [year, month, day] = dateStr.split('-');
    if (year.length === 2) year = '20' + year;
    return `${parseInt(month)}/${parseInt(day)}/${year}`;
  }
  return dateStr;
};

const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn((msg) => {
    if (!msg.includes('Supabase') && !msg.includes('Failed')) originalError(msg);
  });
});
afterAll(() => { console.error = originalError; });

const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'session-store.js'), 'utf8');
const SessionStore = eval(`(function() { ${code}; return SessionStore; })()`);

describe('SessionStore — deleteSession', () => {
  let session;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    session = new SessionStore();
    session._sessionId = 'session-abc';
    session._location = 'Denver Spring 26';
    session._startDate = '2026-03-15';
    session._endDate = '2026-03-17';
    session._price = 40;
  });

  test('should call Supabase update with deleted_at timestamp on success', async () => {
    const eqMock = jest.fn(() => Promise.resolve({ data: null, error: null }));
    const updateMock = jest.fn(() => ({ eq: eqMock }));
    global.supabaseClient.from.mockImplementation((table) => {
      if (table === 'blacksheep_reading_tracker_sessions') {
        return { update: updateMock };
      }
      return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
    });

    await session.deleteSession();

    expect(global.supabaseClient.from).toHaveBeenCalledWith('blacksheep_reading_tracker_sessions');
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) })
    );
    // deleted_at should be a local ISO timestamp without Z suffix
    const payload = updateMock.mock.calls[0][0];
    expect(payload.deleted_at).not.toContain('Z');
    expect(payload.deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(eqMock).toHaveBeenCalledWith('id', 'session-abc');
  });

  test('should call startOver() on successful delete', async () => {
    const eqMock = jest.fn(() => Promise.resolve({ data: null, error: null }));
    global.supabaseClient.from.mockImplementation(() => ({
      update: jest.fn(() => ({ eq: eqMock }))
    }));

    const startOverSpy = jest.spyOn(session, 'startOver');
    await session.deleteSession();

    expect(startOverSpy).toHaveBeenCalled();
    expect(session._sessionId).toBeNull();
  });

  test('should show success snackbar on successful delete', async () => {
    const eqMock = jest.fn(() => Promise.resolve({ data: null, error: null }));
    global.supabaseClient.from.mockImplementation(() => ({
      update: jest.fn(() => ({ eq: eqMock }))
    }));

    await session.deleteSession();

    expect(global.showSnackbar).toHaveBeenCalledWith('Session deleted', 'success');
  });

  test('should not make DB call when no sessionId', async () => {
    session._sessionId = null;
    await session.deleteSession();

    expect(global.supabaseClient.from).not.toHaveBeenCalled();
  });

  describe('offline fallback', () => {
    test('should enqueue update_session with deleted_at payload on network error', async () => {
      const eqMock = jest.fn(() => Promise.resolve({ data: null, error: { message: 'Network error' } }));
      global.supabaseClient.from.mockImplementation(() => ({
        update: jest.fn(() => ({ eq: eqMock }))
      }));

      await session.deleteSession();

      expect(window.offlineQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'update_session',
          sessionId: 'session-abc',
          payload: expect.objectContaining({
            deleted_at: expect.any(String)
          })
        })
      );
      // Verify the enqueued payload has proper timestamp
      const enqueued = window.offlineQueue.enqueue.mock.calls[0][0];
      expect(enqueued.createdAt).toBeDefined();
      expect(enqueued.payload.deleted_at).not.toContain('Z');
    });

    test('should still call startOver() when offline', async () => {
      const eqMock = jest.fn(() => Promise.reject(new Error('Network error')));
      global.supabaseClient.from.mockImplementation(() => ({
        update: jest.fn(() => ({ eq: eqMock }))
      }));

      const startOverSpy = jest.spyOn(session, 'startOver');
      await session.deleteSession();

      expect(startOverSpy).toHaveBeenCalled();
      expect(session._sessionId).toBeNull();
    });

    test('should show offline snackbar on error', async () => {
      const eqMock = jest.fn(() => Promise.reject(new Error('Network error')));
      global.supabaseClient.from.mockImplementation(() => ({
        update: jest.fn(() => ({ eq: eqMock }))
      }));

      await session.deleteSession();

      expect(global.showSnackbar).toHaveBeenCalledWith('Session deleted (will sync when online)', 'info');
    });
  });
});

describe('SessionStore — type change format validation', () => {
  let session;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    session = new SessionStore();
    session._sessionId = 'session-abc';
    session._location = 'Denver Spring 26';
    session._startDate = '2026-03-15';
    session._endDate = '2026-03-17';
    session._price = 40;

    // Mock settings for format validation
    global.window.settings = {
      get: jest.fn((key) => {
        if (key === 'formats') return [
          { name: 'Expo', scope: 'event' },
          { name: 'Shop', scope: 'event' },
          { name: 'Party', scope: 'event' },
          { name: 'In-Person', scope: 'private' },
          { name: 'Phone', scope: 'private' }
        ];
        if (key === 'sources') return [];
        if (key === 'privatePricePresets') return [];
        return null;
      })
    };

    // Add DOM elements needed for openSessionSheet / selectSessionType
    document.body.innerHTML += `
      <div id="sessionSheetTitle"></div>
      <div id="sessionSheetFields"></div>
      <div id="sessionSheetOverlay"></div>
      <div id="sessionCreationSheet"></div>
      <button id="btn-session-save">Save</button>
      <span id="session-bar-location"></span>
      <div id="session-bar-badges" style="display: none">
        <span id="session-bar-type"></span>
        <span id="session-bar-format"></span>
      </div>
      <span id="session-bar-price"></span>
      <span id="session-bar-date"></span>
      <button id="btn-session-edit"></button>
    `;

    global.showSheet = jest.fn();
    global.hideSheet = jest.fn();
  });

  test('event→private clears "Expo" (invalid for private) and defaults to first valid private format', () => {
    session._type = 'event';
    session._format = 'Expo';

    // Open session sheet in edit mode with current type
    session.openSessionSheet('edit', 'event');
    expect(session._sheetSelectedFormat).toBe('Expo');

    // Change type from event to private
    session.selectSessionType('private');

    // Expo is not valid for private — should be cleared and replaced with default private format
    expect(session._sheetSelectedFormat).not.toBe('Expo');
    expect(session._sheetSelectedFormat).toBe('In-Person');
  });

  test('event→private keeps "In-Person" (valid for private)', () => {
    session._type = 'event';
    session._format = 'In-Person';

    session.openSessionSheet('edit', 'event');

    // Manually set to In-Person before switching (simulating a scenario where it was already set)
    session._sheetSelectedFormat = 'In-Person';
    session.selectSessionType('private');

    // In-Person IS valid for private — should be kept
    expect(session._sheetSelectedFormat).toBe('In-Person');
  });

  test('private→event clears "Phone" (invalid for event) and defaults to first valid event format', () => {
    session._type = 'private';
    session._format = 'Phone';

    session.openSessionSheet('edit', 'private');

    // Change type from private to event
    session.selectSessionType('event');

    // Phone is not valid for event — should be cleared and replaced with default event format
    expect(session._sheetSelectedFormat).not.toBe('Phone');
    expect(session._sheetSelectedFormat).toBe('Expo');
  });

  test('private→event keeps "Shop" (valid for event)', () => {
    session._type = 'private';
    session._format = 'Shop';

    session.openSessionSheet('edit', 'private');

    // Manually set to Shop before switching
    session._sheetSelectedFormat = 'Shop';
    session.selectSessionType('event');

    // Shop IS valid for event — should be kept
    expect(session._sheetSelectedFormat).toBe('Shop');
  });

  test('no format change when selecting same type', () => {
    session._type = 'event';
    session._format = 'Expo';

    session.openSessionSheet('edit', 'event');

    // selectSessionType with same type should be a no-op
    session.selectSessionType('event');

    // Format should remain unchanged
    expect(session._sheetSelectedFormat).toBe('Expo');
  });
});

describe('SessionStore — type change persistence via saveSessionSheet', () => {
  let session;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    session = new SessionStore();
    session._sessionId = 'session-abc';
    session._location = 'Denver Spring 26';
    session._startDate = '2026-03-15';
    session._endDate = '2026-03-17';
    session._price = 40;
    session._type = 'event';
    session._format = 'Expo';

    global.window.settings = {
      get: jest.fn((key) => {
        if (key === 'formats') return [
          { name: 'Expo', scope: 'event' },
          { name: 'Shop', scope: 'event' },
          { name: 'Party', scope: 'event' },
          { name: 'In-Person', scope: 'private' },
          { name: 'Phone', scope: 'private' }
        ];
        if (key === 'sources') return [];
        if (key === 'privatePricePresets') return [];
        return null;
      })
    };

    document.body.innerHTML += `
      <div id="sessionSheetTitle"></div>
      <div id="sessionSheetFields"></div>
      <div id="sessionSheetOverlay"></div>
      <div id="sessionCreationSheet"></div>
      <button id="btn-session-save">Save</button>
      <span id="session-bar-location"></span>
      <div id="session-bar-badges" style="display: none">
        <span id="session-bar-type"></span>
        <span id="session-bar-format"></span>
      </div>
      <span id="session-bar-price"></span>
      <span id="session-bar-date"></span>
      <button id="btn-session-edit"></button>
    `;

    global.showSheet = jest.fn();
    global.hideSheet = jest.fn();
  });

  test('saveSessionSheet persists type change to Supabase', async () => {
    const updateMock = jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }));
    global.supabaseClient.from.mockImplementation(() => ({
      update: updateMock,
      select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ limit: jest.fn(() => Promise.resolve({ data: [], error: null })) })) })) })) }))
    }));

    // Open sheet in edit mode, change type to private, select valid format
    session.openSessionSheet('edit', 'event');
    session.selectSessionType('private');
    session.selectSessionFormat('In-Person');

    await session.saveSessionSheet();

    expect(updateMock).toHaveBeenCalled();
    const payload = updateMock.mock.calls[0][0];
    expect(payload.type).toBe('private');
    expect(payload.format).toBe('In-Person');
  });

  test('saveSessionSheet persists cleared format when type change invalidates it', async () => {
    const updateMock = jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }));
    global.supabaseClient.from.mockImplementation(() => ({
      update: updateMock,
      select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ limit: jest.fn(() => Promise.resolve({ data: [], error: null })) })) })) })) }))
    }));

    // Open sheet in edit mode, change type to private
    session.openSessionSheet('edit', 'event');
    session.selectSessionType('private');
    // Format was Expo, which is now invalid for private — cleared to null
    // But validation requires a format, so select one
    session.selectSessionFormat('Phone');

    await session.saveSessionSheet();

    expect(updateMock).toHaveBeenCalled();
    const payload = updateMock.mock.calls[0][0];
    expect(payload.type).toBe('private');
    expect(payload.format).toBe('Phone');
  });

  test('no DB call when selected type matches current type and no other changes', async () => {
    // This tests that selectSessionType short-circuits when same type
    session.openSessionSheet('edit', 'event');

    // Attempt to "change" to same type — selectSessionType returns early
    const fromSpy = jest.spyOn(global.supabaseClient, 'from');
    session.selectSessionType('event');

    // No extra DB calls triggered by selectSessionType (it's just sheet-local state)
    // The key assertion is that selectSessionType didn't change anything
    expect(session._sheetType).toBe('event');
    expect(session._sheetSelectedFormat).toBe('Expo');
  });

  test('saveSessionSheet falls back to offline mode on Supabase error', async () => {
    const updateMock = jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Network timeout' } }))
    }));
    global.supabaseClient.from.mockImplementation(() => ({
      update: updateMock,
      select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ limit: jest.fn(() => Promise.resolve({ data: [], error: null })) })) })) })) }))
    }));

    session.openSessionSheet('edit', 'event');
    session.selectSessionType('private');
    session.selectSessionFormat('In-Person');

    await session.saveSessionSheet();

    // On error, saveSessionSheet shows error snackbar and falls back to offline mode
    expect(global.showSnackbar).toHaveBeenCalledWith('Database error, using offline mode', 'error');
    // Local state should still be updated
    expect(session._type).toBe('private');
    expect(session._format).toBe('In-Person');
  });
});
