/**
 * @jest-environment jsdom
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
global.Utils = { sanitize: jest.fn((str) => str) };

global.window.auth = {
  userId: 'user-123',
  getUserName: jest.fn(() => 'TestUser')
};

// normalizeDate is a global function defined in index.html, needed by filterLoadedSessions
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

describe('SessionStore', () => {
  let session;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    session = new SessionStore();
  });

  describe('Auth Integration', () => {
    test('should get userId from window.auth', () => {
      expect(session.userId).toBe('user-123');
    });

    test('should get userName from window.auth', () => {
      expect(session.userName).toBe('TestUser');
    });

    test('should return null userId when auth not available', () => {
      const savedAuth = global.window.auth;
      global.window.auth = null;
      expect(session.userId).toBeNull();
      global.window.auth = savedAuth;
    });
  });

  describe('Session Creation', () => {
    test('should validate canCreateSession', () => {
      expect(session.canCreateSession).toBeFalsy();
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      session._price = 40;
      expect(session.canCreateSession).toBeTruthy();
    });

    test('should validate hasValidSession', () => {
      expect(session.hasValidSession).toBeFalsy();
      session._sessionId = 'test-id';
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      expect(session.hasValidSession).toBeTruthy();
    });

    test('should determine correct session phase', () => {
      expect(session.sessionPhase).toBe('SETUP');
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      expect(session.sessionPhase).toBe('READY_TO_CREATE');
      session._sessionId = 'test-id';
      expect(session.sessionPhase).toBe('ACTIVE');
    });

    test('should create session and set sessionId', async () => {
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      session._price = 40;

      await session.createSession();

      expect(session.sessionId).toBe('mock-id');
      expect(session.sessionPhase).toBe('ACTIVE');
    });

    test('should not include readings in session insert', async () => {
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      session._price = 40;

      await session.createSession();

      const insertCall = global.supabaseClient.from.mock.calls
        .find(c => c[0] === 'blacksheep_reading_tracker_sessions');
      expect(insertCall).toBeTruthy();
    });

    test('should show buttons after creating session', async () => {
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      session._price = 40;
      session.updateUI();
      expect(document.querySelector('.buttons').style.display).toBe('none');

      await session.createSession();

      expect(document.querySelector('.buttons').style.display).toBe('flex');
      expect(document.querySelector('.btn-create-session').style.display).toBe('none');
      expect(document.querySelector('.btn-new-session').style.display).toBe('block');
    });
  });

  describe('Reading Management', () => {
    beforeEach(() => {
      session._sessionId = 'test-id';
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
    });

    test('should add reading and insert to DB', async () => {
      const reading = { timestamp: new Date().toISOString(), tip: 5, price: 40 };
      await session.addReading(reading);
      expect(session.readings.length).toBe(1);
      expect(global.supabaseClient.from).toHaveBeenCalledWith('blacksheep_reading_tracker_readings');
    });

    test('should store returned id on reading after insert', async () => {
      const returnedId = 'reading-uuid-123';
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => Promise.resolve({ data: [{ id: returnedId }], error: null }))
            }))
          };
        }
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      const reading = { timestamp: new Date().toISOString(), tip: 5, price: 40 };
      await session.addReading(reading);
      expect(session.readings[0].id).toBe(returnedId);
    });

    test('should add reading without DB insert when no sessionId', async () => {
      session._sessionId = null;
      const reading = { timestamp: new Date().toISOString(), tip: 5 };
      await session.addReading(reading);
      expect(session.readings.length).toBe(1);
      expect(global.supabaseClient.from).not.toHaveBeenCalledWith('blacksheep_reading_tracker_readings');
    });

    test('should remove reading and delete from DB', async () => {
      const deleteMock = jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) }));
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') return { delete: deleteMock };
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      session._readings = [{ id: 'r1', timestamp: new Date().toISOString(), tip: 5 }];
      await session.removeReading(0);

      expect(session.readings.length).toBe(0);
      expect(deleteMock).toHaveBeenCalled();
    });

    test('should remove reading without DB call when no id', async () => {
      session._readings = [{ timestamp: new Date().toISOString(), tip: 5 }];
      await session.removeReading(0);
      expect(session.readings.length).toBe(0);
    });

    test('should update reading field and update DB', async () => {
      const updateMock = jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) }));
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') return { update: updateMock };
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      session._readings = [{ id: 'r1', timestamp: new Date().toISOString(), tip: 5 }];
      await session.updateReading(0, 'tip', 10);

      expect(session.readings[0].tip).toBe(10);
      expect(updateMock).toHaveBeenCalledWith({ tip: 10 });
    });

    test('should update reading without DB call when no id', async () => {
      session._readings = [{ timestamp: new Date().toISOString(), tip: 5 }];
      await session.updateReading(0, 'tip', 10);
      expect(session.readings[0].tip).toBe(10);
    });

    test('should register background sync on reading insert error', async () => {
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') {
          return { insert: jest.fn(() => ({ select: jest.fn(() => Promise.reject(new Error('Network error'))) })) };
        }
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      await session.addReading({ timestamp: new Date().toISOString(), tip: 5 });
      expect(global.registerBackgroundSync).toHaveBeenCalled();
    });
  });

  describe('Totals Calculation', () => {
    beforeEach(() => {
      session._sessionId = 'test-id';
      session._price = 40;
    });

    test('should calculate totals with default price', async () => {
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: null });
      expect(document.getElementById('readingCount').textContent).toBe('1');
      expect(document.getElementById('baseTotal').textContent).toBe('40.00');
      expect(document.getElementById('tipsTotal').textContent).toBe('5.00');
      expect(document.getElementById('grandTotal').textContent).toBe('45.00');
    });

    test('should calculate totals with custom price', async () => {
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 50 });
      expect(document.getElementById('baseTotal').textContent).toBe('50.00');
      expect(document.getElementById('grandTotal').textContent).toBe('55.00');
    });

    test('should handle multiple readings', async () => {
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      await session.addReading({ timestamp: new Date().toISOString(), tip: 10, price: 50 });
      expect(document.getElementById('readingCount').textContent).toBe('2');
      expect(document.getElementById('baseTotal').textContent).toBe('90.00');
      expect(document.getElementById('tipsTotal').textContent).toBe('15.00');
      expect(document.getElementById('grandTotal').textContent).toBe('105.00');
    });
  });

  describe('Persistence', () => {
    test('should save session metadata to localStorage', () => {
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      session.saveToLocalStorage();
      const saved = JSON.parse(localStorage.getItem('readingTracker_user-123'));
      expect(saved.location).toBe('Test Location');
    });

    test('should save readings array to localStorage', () => {
      session._sessionId = 'test-id';
      session._readings = [{ id: 'r1', timestamp: new Date().toISOString(), tip: 5 }];
      session.saveToLocalStorage();
      const saved = JSON.parse(localStorage.getItem('readingTracker_user-123'));
      expect(saved.readings.length).toBe(1);
      expect(saved.readings[0].id).toBe('r1');
    });

    test('should load from localStorage including readings with ids', () => {
      const state = {
        sessionId: 'test-id',
        location: 'Test Location',
        sessionDate: '2025-01-15',
        price: 40,
        readings: [{ id: 'r1', timestamp: new Date().toISOString(), tip: 5, price: 40 }]
      };
      localStorage.setItem('readingTracker_user-123', JSON.stringify(state));
      session.loadFromStorage();
      expect(session.sessionId).toBe('test-id');
      expect(session.location).toBe('Test Location');
      expect(session.readings.length).toBe(1);
      expect(session.readings[0].id).toBe('r1');
    });

    test('should not save without userId', () => {
      const savedAuth = global.window.auth;
      global.window.auth = null;
      session.saveToLocalStorage();
      expect(localStorage.getItem('readingTracker_null')).toBeNull();
      global.window.auth = savedAuth;
    });
  });

  describe('Save - Session Metadata Only', () => {
    test('should update session without readings JSONB', async () => {
      const updateMock = jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) }));
      global.supabaseClient.from.mockImplementation(() => ({ update: updateMock }));

      session._sessionId = 'test-id';
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';

      await session.save();

      const updateData = updateMock.mock.calls[0][0];
      expect(updateData.location).toBe('Test Location');
      expect(updateData.readings).toBeUndefined();
    });

    test('should not include empty session_date in update', async () => {
      const updateMock = jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) }));
      global.supabaseClient.from.mockImplementation(() => ({ update: updateMock }));

      session._sessionId = 'test-id';
      session._sessionDate = '';

      await session.save();

      const updateData = updateMock.mock.calls[0][0];
      expect(updateData.session_date).toBeUndefined();
    });

    test('should not save without userId', async () => {
      const savedAuth = global.window.auth;
      global.window.auth = null;
      await session.save();
      expect(global.supabaseClient.from).not.toHaveBeenCalled();
      global.window.auth = savedAuth;
    });

    test('should not save during loading', async () => {
      session._loading = true;
      await session.save();
      expect(global.supabaseClient.from).not.toHaveBeenCalled();
    });

    test('should register background sync on save error', async () => {
      global.supabaseClient.from.mockImplementation(() => ({
        update: jest.fn(() => ({ eq: jest.fn(() => Promise.reject(new Error('Network error'))) }))
      }));

      session._sessionId = 'test-id';
      await session.save();
      expect(global.registerBackgroundSync).toHaveBeenCalled();
    });
  });

  describe('loadExistingSession', () => {
    test('should load readings from normalized table', async () => {
      const mockReadings = [
        { id: 'r1', timestamp: '2025-01-15T14:00:00Z', tip: 5, price: 40 },
        { id: 'r2', timestamp: '2025-01-15T15:00:00Z', tip: 10, price: 40 }
      ];
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({ data: mockReadings }))
              }))
            }))
          };
        }
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      await session.loadExistingSession({ id: 'sess-1', location: 'Test', session_date: '2025-01-15', reading_price: 40 });

      expect(session.readings.length).toBe(2);
      expect(session.readings[0].id).toBe('r1');
      expect(session.readings[1].id).toBe('r2');
    });

    test('should fall back to empty array on load error', async () => {
      global.supabaseClient.from.mockImplementation((table) => {
        if (table === 'blacksheep_reading_tracker_readings') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => Promise.reject(new Error('DB error')))
              }))
            }))
          };
        }
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) };
      });

      await session.loadExistingSession({ id: 'sess-1', location: 'Test', session_date: '2025-01-15', reading_price: 40 });
      expect(session.readings).toEqual([]);
    });
  });

  describe('UI State Management', () => {
    test('should show/hide sections based on phase', () => {
      session.updateSections();
      expect(document.querySelector('.buttons').style.display).toBe('none');
      session._sessionId = 'test-id';
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      session.updateSections();
      expect(document.querySelector('.buttons').style.display).toBe('flex');
    });

    test('should show create button in SETUP phase', () => {
      session.updateUI();
      expect(document.querySelector('.btn-create-session').style.display).toBe('block');
      expect(document.querySelector('.btn-create-session').classList.contains('inactive')).toBe(true);
      expect(document.querySelector('.btn-new-session').style.display).toBe('none');
    });

    test('should activate create button in READY_TO_CREATE phase', () => {
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      session.updateUI();
      const createBtn = document.querySelector('.btn-create-session');
      expect(createBtn.classList.contains('active')).toBe(true);
      expect(createBtn.classList.contains('inactive')).toBe(false);
    });

    test('should hide create button and show new session button in ACTIVE phase', () => {
      session._sessionId = 'test-id';
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      session.updateUI();
      expect(document.querySelector('.btn-create-session').style.display).toBe('none');
      expect(document.querySelector('.btn-new-session').style.display).toBe('block');
    });

    test('should disable load session button without userId', () => {
      const savedAuth = global.window.auth;
      global.window.auth = { userId: null, getUserName: jest.fn(() => '') };
      session.updateButtons();
      expect(document.querySelector('.btn-load-session').disabled).toBe(true);
      global.window.auth = savedAuth;
    });

    test('should enable load session button with userId', () => {
      session.updateUI();
      expect(document.querySelector('.btn-load-session').disabled).toBe(false);
    });
  });

  describe('Setters Side Effects', () => {
    test('should trigger updateUI when sessionId changes', () => {
      const spy = jest.spyOn(session, 'updateUI');
      session.sessionId = 'new-id';
      expect(spy).toHaveBeenCalled();
    });

    test('should trigger updateUI when location changes', () => {
      const spy = jest.spyOn(session, 'updateUI');
      session.location = 'New Location';
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Timestamp Formatting', () => {
    test('should format ISO timestamp', () => {
      const formatted = session.formatTimestamp('2025-01-15T14:30:00.000Z');
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
    });

    test('should handle legacy format', () => {
      expect(session.formatTimestamp('2:30 PM')).toBe('2:30 PM');
    });

    test('should handle empty timestamp', () => {
      expect(session.formatTimestamp('')).toBe('');
      expect(session.formatTimestamp(null)).toBe('');
    });
  });

  describe('State Reset', () => {
    test('should reset all state with startOver', () => {
      session._sessionId = 'test-id';
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      session._price = 50;
      session._readings = [{ id: 'r1', timestamp: new Date().toISOString(), tip: 5 }];

      session.startOver();

      expect(session.sessionId).toBeNull();
      expect(session.location).toBe('');
      expect(session.sessionDate).toBe('');
      expect(session.price).toBe(40);
      expect(session.readings).toEqual([]);
    });

    test('clear should be alias for startOver', () => {
      session._sessionId = 'test-id';
      session.clear();
      expect(session.sessionId).toBeNull();
    });

    test('should clear user localStorage data', () => {
      localStorage.setItem('readingTracker_user-123', JSON.stringify({ location: 'test' }));
      expect(localStorage.getItem('readingTracker_user-123')).toBeTruthy();
      session.clearUserData();
      expect(localStorage.getItem(`readingTracker_${session.userId}`)).toBeNull();
    });
  });

  describe('Debounced Save', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    test('should debounce save calls', () => {
      const saveSpy = jest.spyOn(session, 'save');
      session.debouncedSave();
      session.debouncedSave();
      session.debouncedSave();
      expect(saveSpy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(500);
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    test('should debounce localStorage-only saves', () => {
      const spy = jest.spyOn(session, 'saveToLocalStorage');
      session.debouncedSaveToLocalStorage();
      session.debouncedSaveToLocalStorage();
      expect(spy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(500);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Price Fallback', () => {
    beforeEach(() => {
      session._sessionId = 'test-id';
      session._price = 40;
    });

    test('should use session price when reading price is null', async () => {
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: null });
      expect(document.getElementById('baseTotal').textContent).toBe('40.00');
    });

    test('should use reading price when provided', async () => {
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 50 });
      expect(document.getElementById('baseTotal').textContent).toBe('50.00');
    });

    test('should handle mixed prices correctly', async () => {
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: null });
      await session.addReading({ timestamp: new Date().toISOString(), tip: 10, price: 50 });
      await session.addReading({ timestamp: new Date().toISOString(), tip: 0, price: 30 });
      expect(document.getElementById('baseTotal').textContent).toBe('120.00');
      expect(document.getElementById('tipsTotal').textContent).toBe('15.00');
      expect(document.getElementById('grandTotal').textContent).toBe('135.00');
    });
  });

  describe('Reading List Rendering', () => {
    beforeEach(() => {
      session._sessionId = 'test-id';
      session._price = 40;
    });

    test('should render reading with delete button', async () => {
      await session.addReading({ timestamp: '2025-01-15T14:30:00.000Z', tip: 5, price: 40 });
      expect(document.getElementById('readingsList').innerHTML).toContain('delete-btn');
    });

    test('should render tip input with value', async () => {
      await session.addReading({ timestamp: '2025-01-15T14:30:00.000Z', tip: 5, price: 40 });
      expect(document.getElementById('readingsList').innerHTML).toContain('value="5"');
    });

    test('should render payment button as selected when set', async () => {
      await session.addReading({ timestamp: '2025-01-15T14:30:00.000Z', tip: 5, payment: 'CC' });
      const html = document.getElementById('readingsList').innerHTML;
      expect(html).toContain('CC');
      expect(html).toContain('selected');
    });

    test('should number readings sequentially', async () => {
      await session.addReading({ timestamp: '2025-01-15T14:30:00.000Z', tip: 5 });
      await session.addReading({ timestamp: '2025-01-15T14:35:00.000Z', tip: 10 });
      const html = document.getElementById('readingsList').innerHTML;
      expect(html).toContain('1.');
      expect(html).toContain('2.');
    });
  });

  describe('Load Session Filtering and Search', () => {
    const mockSessions = [
      { id: 'sess-1', location: 'Renaissance Festival', session_date: '2025-01-10', type: 'event', readings_count: 5, total_earnings: 200 },
      { id: 'sess-2', location: 'Home Office', session_date: '2025-01-11', type: 'private', readings_count: 2, total_earnings: 120 },
      { id: 'sess-3', location: 'Comic Convention', session_date: '2025-01-12', type: 'event', readings_count: 8, total_earnings: 320 },
      { id: 'sess-4', location: 'Private Studio', session_date: '2025-01-13', type: 'private', readings_count: 1, total_earnings: 60 },
    ];

    beforeEach(() => {
      session._loadedSessions = mockSessions;
      session._sessionFilter = 'all';
      document.getElementById('session-search').value = '';
    });

    test('type filter "event" shows only event sessions', () => {
      session.filterLoadedSessions('event');
      const html = document.getElementById('sessionsList').innerHTML;
      expect(html).toContain('Renaissance Festival');
      expect(html).toContain('Comic Convention');
      expect(html).not.toContain('Home Office');
      expect(html).not.toContain('Private Studio');
    });

    test('type filter "private" shows only private sessions', () => {
      session.filterLoadedSessions('private');
      const html = document.getElementById('sessionsList').innerHTML;
      expect(html).toContain('Home Office');
      expect(html).toContain('Private Studio');
      expect(html).not.toContain('Renaissance Festival');
      expect(html).not.toContain('Comic Convention');
    });

    test('type filter "all" shows both types', () => {
      session.filterLoadedSessions('all');
      const html = document.getElementById('sessionsList').innerHTML;
      expect(html).toContain('Renaissance Festival');
      expect(html).toContain('Home Office');
      expect(html).toContain('Comic Convention');
      expect(html).toContain('Private Studio');
    });

    test('search filters by location substring (case-insensitive)', () => {
      document.getElementById('session-search').value = 'festival';
      session.filterLoadedSessions();
      const html = document.getElementById('sessionsList').innerHTML;
      expect(html).toContain('Renaissance Festival');
      expect(html).not.toContain('Home Office');
      expect(html).not.toContain('Comic Convention');
      expect(html).not.toContain('Private Studio');
    });

    test('combined filter + search works correctly', () => {
      document.getElementById('session-search').value = 'studio';
      session.filterLoadedSessions('private');
      const html = document.getElementById('sessionsList').innerHTML;
      expect(html).toContain('Private Studio');
      expect(html).not.toContain('Home Office');
      expect(html).not.toContain('Renaissance Festival');
      expect(html).not.toContain('Comic Convention');
    });

    test('empty results show "No matching sessions" message', () => {
      document.getElementById('session-search').value = 'zzz_no_match';
      session.filterLoadedSessions();
      const html = document.getElementById('sessionsList').innerHTML;
      expect(html).toContain('No matching sessions');
    });

    test('type badge displays correct icon for each type', () => {
      session.filterLoadedSessions('all');
      const html = document.getElementById('sessionsList').innerHTML;
      expect(html).toContain('fa-store');
      expect(html).toContain('fa-user');
      expect(html).toContain('session-type-event');
      expect(html).toContain('session-type-private');
    });
  });
});
