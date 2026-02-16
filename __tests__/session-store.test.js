/**
 * @jest-environment jsdom
 */

// Mock DOM elements
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
  <div id="settingsContent"></div>
  <span class="collapse-icon"></span>
  <div id="requiredFieldsNote"></div>
  <button class="btn-create-session"></button>
  <button class="btn-new-session"></button>
  <button class="btn-load-session"></button>
  <div class="buttons"></div>
  <div class="totals"></div>
  <div class="readings-list"></div>
`;

// Mock global functions
global.showSnackbar = jest.fn();
global.vibrate = jest.fn();
global.isDevelopmentMode = jest.fn(() => false);
global.sendTestNotification = jest.fn();
global.supabaseClient = {
  from: jest.fn(() => ({
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    select: jest.fn(() => ({ not: jest.fn(() => Promise.resolve({ data: [] })) }))
  }))
};
global.registerBackgroundSync = jest.fn();

// Suppress console.error for expected Supabase mock errors
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn((msg) => {
    if (!msg.includes('Supabase update error') && !msg.includes('Error details') && !msg.includes('Data being sent')) {
      originalError(msg);
    }
  });
});
afterAll(() => {
  console.error = originalError;
});

// Load SessionStore class
const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'session-store.js'), 'utf8');
const SessionStore = eval(`(function() { ${code}; return SessionStore; })()`);

describe('SessionStore', () => {
  let session;

  beforeEach(() => {
    localStorage.clear();
    session = new SessionStore();
  });

  describe('User Management', () => {
    test('should set user and update button', () => {
      session.user = 'TestUser';
      expect(session.user).toBe('TestUser');
      expect(document.getElementById('userBtn').textContent).toBe('TestUser');
    });

    test('should clear session when switching users', () => {
      session._sessionId = 'test-id';
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      session.user = 'User1';
      session.user = 'User2';
      expect(session.sessionId).toBeNull();
      expect(session.location).toBe('');
    });
  });

  describe('Session Creation', () => {
    test('should validate canCreateSession', () => {
      expect(session.canCreateSession).toBeFalsy();
      session.user = 'TestUser';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      session.price = 40;
      expect(session.canCreateSession).toBeTruthy();
    });

    test('should validate hasValidSession', () => {
      expect(session.hasValidSession).toBeFalsy();
      session._sessionId = 'test-id';
      session.user = 'TestUser';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      expect(session.hasValidSession).toBeTruthy();
    });

    test('should determine correct session phase', () => {
      expect(session.sessionPhase).toBe('SETUP');
      session.user = 'TestUser';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      expect(session.sessionPhase).toBe('READY_TO_CREATE');
      session._sessionId = 'test-id';
      expect(session.sessionPhase).toBe('ACTIVE');
    });

    test('should call updateUI after creating session', async () => {
      // Mock Supabase for createSession
      global.supabaseClient.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({ data: [] }))
              }))
            }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => Promise.resolve({ 
            data: [{ id: 'new-session-id' }] 
          }))
        }))
      }));

      session.user = 'TestUser';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      session.price = 40;

      const updateUISpy = jest.spyOn(session, 'updateUI');
      
      await session.createSession();
      
      expect(session.sessionId).toBe('new-session-id');
      expect(updateUISpy).toHaveBeenCalled();
      expect(session.sessionPhase).toBe('ACTIVE');
    });

    test('should show add/delete buttons after creating session', async () => {
      // Mock Supabase for createSession
      global.supabaseClient.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({ data: [] }))
              }))
            }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => Promise.resolve({ 
            data: [{ id: 'new-session-id' }] 
          }))
        }))
      }));

      session.user = 'TestUser';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      session.price = 40;

      // Before creating - in READY_TO_CREATE phase, buttons start hidden
      // (updateSections sets display:none when sessionPhase !== 'ACTIVE')
      session.updateUI();
      expect(document.querySelector('.buttons').style.display).toBe('none');
      expect(document.querySelector('.totals').style.display).toBe('none');
      expect(document.querySelector('.readings-list').style.display).toBe('none');
      
      await session.createSession();
      
      // After creating - in ACTIVE phase, buttons are visible
      expect(document.querySelector('.buttons').style.display).toBe('flex');
      expect(document.querySelector('.totals').style.display).toBe('block');
      expect(document.querySelector('.readings-list').style.display).toBe('block');
      expect(document.querySelector('.btn-create-session').style.display).toBe('none');
      expect(document.querySelector('.btn-new-session').style.display).toBe('block');
    });
  });

  describe('Reading Management', () => {
    beforeEach(() => {
      session._sessionId = 'test-id';
      session.user = 'TestUser';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
    });

    test('should add reading', () => {
      const reading = { timestamp: new Date().toISOString(), tip: 5, price: 40 };
      session.addReading(reading);
      expect(session.readings.length).toBe(1);
      expect(session.readings[0]).toEqual(reading);
    });

    test('should remove reading', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      session.addReading({ timestamp: new Date().toISOString(), tip: 10, price: 40 });
      expect(session.readings.length).toBe(2);
      session.removeReading(0);
      expect(session.readings.length).toBe(1);
    });

    test('should update reading field', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      session.updateReading(0, 'tip', 10);
      expect(session.readings[0].tip).toBe(10);
    });
  });

  describe('Totals Calculation', () => {
    beforeEach(() => {
      session._sessionId = 'test-id';
      session.user = 'TestUser';
      session.price = 40;
    });

    test('should calculate totals with default price', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: null });
      expect(document.getElementById('readingCount').textContent).toBe('1');
      expect(document.getElementById('baseTotal').textContent).toBe('40.00');
      expect(document.getElementById('tipsTotal').textContent).toBe('5.00');
      expect(document.getElementById('grandTotal').textContent).toBe('45.00');
    });

    test('should calculate totals with custom price', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 50 });
      expect(document.getElementById('baseTotal').textContent).toBe('50.00');
      expect(document.getElementById('grandTotal').textContent).toBe('55.00');
    });

    test('should handle multiple readings', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      session.addReading({ timestamp: new Date().toISOString(), tip: 10, price: 50 });
      expect(document.getElementById('readingCount').textContent).toBe('2');
      expect(document.getElementById('baseTotal').textContent).toBe('90.00');
      expect(document.getElementById('tipsTotal').textContent).toBe('15.00');
      expect(document.getElementById('grandTotal').textContent).toBe('105.00');
    });
  });

  describe('Persistence', () => {
    test('should save to localStorage', () => {
      session.user = 'TestUser';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      session.save();
      const saved = JSON.parse(localStorage.getItem('readingTracker_TestUser'));
      expect(saved.user).toBe('TestUser');
      expect(saved.location).toBe('Test Location');
    });

    test('should load from localStorage', () => {
      const state = {
        sessionId: 'test-id',
        user: 'TestUser',
        location: 'Test Location',
        sessionDate: '2025-01-15',
        price: 40,
        readings: [{ timestamp: new Date().toISOString(), tip: 5, price: 40 }]
      };
      localStorage.setItem('readingTracker_TestUser', JSON.stringify(state));
      session.user = 'TestUser';
      session.loadFromStorage();
      expect(session.sessionId).toBe('test-id');
      expect(session.location).toBe('Test Location');
      expect(session.readings.length).toBe(1);
    });
  });

  describe('UI State Management', () => {
    test('should show/hide sections based on phase', () => {
      session.updateSections();
      expect(document.querySelector('.buttons').style.display).toBe('none');
      session._sessionId = 'test-id';
      session.user = 'TestUser';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      session.updateSections();
      expect(document.querySelector('.buttons').style.display).toBe('flex');
    });

    test('should show add/delete buttons when session is active', () => {
      // SETUP phase - buttons hidden
      session.updateUI();
      expect(document.querySelector('.buttons').style.display).toBe('none');
      expect(document.querySelector('.totals').style.display).toBe('none');
      expect(document.querySelector('.readings-list').style.display).toBe('none');

      // ACTIVE phase - buttons visible
      session._sessionId = 'test-id';
      session.user = 'TestUser';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      session.updateUI();
      
      expect(document.querySelector('.buttons').style.display).toBe('flex');
      expect(document.querySelector('.totals').style.display).toBe('block');
      expect(document.querySelector('.readings-list').style.display).toBe('block');
    });

    test('should show create button in SETUP phase', () => {
      session.updateUI();
      const createBtn = document.querySelector('.btn-create-session');
      const newBtn = document.querySelector('.btn-new-session');
      
      expect(createBtn.style.display).toBe('block');
      expect(createBtn.classList.contains('inactive')).toBe(true);
      expect(newBtn.style.display).toBe('none');
    });

    test('should activate create button in READY_TO_CREATE phase', () => {
      session.user = 'TestUser';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      session.updateUI();
      
      const createBtn = document.querySelector('.btn-create-session');
      expect(createBtn.style.display).toBe('block');
      expect(createBtn.classList.contains('active')).toBe(true);
      expect(createBtn.classList.contains('inactive')).toBe(false);
    });

    test('should hide create button and show new session button in ACTIVE phase', () => {
      session._sessionId = 'test-id';
      session.user = 'TestUser';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      session.updateUI();
      
      const createBtn = document.querySelector('.btn-create-session');
      const newBtn = document.querySelector('.btn-new-session');
      
      expect(createBtn.style.display).toBe('none');
      expect(newBtn.style.display).toBe('block');
    });

    test('should highlight required fields in SETUP phase', () => {
      session.updateUI();
      
      const userBtn = document.getElementById('userBtn');
      const locationInput = document.getElementById('location');
      const dateInput = document.getElementById('sessionDate');
      const requiredNote = document.getElementById('requiredFieldsNote');
      
      expect(userBtn.classList.contains('required-field')).toBe(true);
      expect(locationInput.classList.contains('required-field')).toBe(true);
      expect(dateInput.classList.contains('required-field')).toBe(true);
      expect(requiredNote.style.display).toBe('block');
    });

    test('should remove required field highlights when filled', () => {
      session.user = 'TestUser';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      session.updateUI();
      
      const userBtn = document.getElementById('userBtn');
      const locationInput = document.getElementById('location');
      const dateInput = document.getElementById('sessionDate');
      
      expect(userBtn.classList.contains('required-field')).toBe(false);
      expect(locationInput.classList.contains('required-field')).toBe(false);
      expect(dateInput.classList.contains('required-field')).toBe(false);
    });

    test('should hide required note when session is active', () => {
      session._sessionId = 'test-id';
      session.user = 'TestUser';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      session.updateUI();
      
      const requiredNote = document.getElementById('requiredFieldsNote');
      expect(requiredNote.style.display).toBe('none');
    });

    test('should disable load session button without user', () => {
      session.updateUI();
      const loadBtn = document.querySelector('.btn-load-session');
      
      expect(loadBtn.classList.contains('disabled')).toBe(true);
      expect(loadBtn.disabled).toBe(true);
    });

    test('should enable load session button with user', () => {
      session.user = 'TestUser';
      session.updateUI();
      const loadBtn = document.querySelector('.btn-load-session');
      
      expect(loadBtn.classList.contains('disabled')).toBe(false);
      expect(loadBtn.disabled).toBe(false);
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

    test('should update DOM input when location set', () => {
      session.location = 'Test Location';
      expect(document.getElementById('location').value).toBe('Test Location');
    });

    test('should update DOM input when price set', () => {
      session.price = 50;
      expect(document.getElementById('price').value).toBe('50');
    });

    test('should update DOM input when sessionDate set', () => {
      session.sessionDate = '2025-01-15';
      expect(document.getElementById('sessionDate').value).toBe('2025-01-15');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty readings array', () => {
      session.readings = [];
      expect(document.getElementById('readingCount').textContent).toBe('0');
      expect(document.getElementById('grandTotal').textContent).toBe('0.00');
    });

    test('should handle null values in readings', () => {
      session.price = 40;
      session.addReading({ timestamp: new Date().toISOString(), tip: null, price: null });
      expect(document.getElementById('tipsTotal').textContent).toBe('0.00');
      expect(document.getElementById('baseTotal').textContent).toBe('40.00');
    });

    test('should not save without user', () => {
      session.save();
      expect(localStorage.getItem('readingTracker_')).toBeNull();
    });

    test('should not save during loading', () => {
      session.user = 'TestUser';
      session._loading = true;
      session.save();
      expect(localStorage.getItem('readingTracker_TestUser')).toBeNull();
    });
  });

  describe('Timestamp Formatting', () => {
    test('should format ISO timestamp', () => {
      const timestamp = '2025-01-15T14:30:00.000Z';
      const formatted = session.formatTimestamp(timestamp);
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
    });

    test('should handle legacy format', () => {
      const timestamp = '2:30 PM';
      const formatted = session.formatTimestamp(timestamp);
      expect(formatted).toBe('2:30 PM');
    });

    test('should handle empty timestamp', () => {
      expect(session.formatTimestamp('')).toBe('');
      expect(session.formatTimestamp(null)).toBe('');
    });
  });

  describe('State Reset', () => {
    test('should reset all state with startOver', () => {
      session._sessionId = 'test-id';
      session._user = 'TestUser';
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      session._price = 50;
      session._readings = [{ timestamp: new Date().toISOString(), tip: 5 }];
      
      session.startOver();
      
      expect(session.sessionId).toBeNull();
      expect(session.location).toBe('');
      expect(session.sessionDate).toBe('');
      expect(session.price).toBe(40);
      expect(session.readings).toEqual([]);
    });

    test('should clear be alias for startOver', () => {
      session._sessionId = 'test-id';
      session.clear();
      expect(session.sessionId).toBeNull();
    });

    test('should clear user localStorage data', () => {
      session.user = 'TestUser';
      session.save();
      expect(localStorage.getItem('readingTracker_TestUser')).toBeTruthy();
      
      session.clearUserData();
      expect(localStorage.getItem('readingTracker_TestUser')).toBeNull();
    });
  });

  describe('Reading Fields', () => {
    beforeEach(() => {
      session._sessionId = 'test-id';
      session.user = 'TestUser';
    });

    test('should handle payment method in readings', () => {
      session.addReading({ 
        timestamp: new Date().toISOString(), 
        tip: 5, 
        price: 40,
        payment: 'CC'
      });
      expect(session.readings[0].payment).toBe('CC');
    });

    test('should handle source in readings', () => {
      session.addReading({ 
        timestamp: new Date().toISOString(), 
        tip: 5, 
        price: 40,
        source: 'referral'
      });
      expect(session.readings[0].source).toBe('referral');
    });

    test('should update payment method', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5 });
      session.updateReading(0, 'payment', 'Venmo');
      expect(session.readings[0].payment).toBe('Venmo');
    });

    test('should update source', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5 });
      session.updateReading(0, 'source', 'repeat');
      expect(session.readings[0].source).toBe('repeat');
    });
  });

  describe('Reading List Rendering', () => {
    beforeEach(() => {
      session._sessionId = 'test-id';
      session.user = 'TestUser';
      session.price = 40;
    });

    test('should render reading with delete button', () => {
      session.addReading({ timestamp: '2025-01-15T14:30:00.000Z', tip: 5, price: 40 });
      const list = document.getElementById('readingsList');
      expect(list.innerHTML).toContain('delete-btn');
      expect(list.innerHTML).toContain('×');
    });

    test('should render tip input', () => {
      session.addReading({ timestamp: '2025-01-15T14:30:00.000Z', tip: 5, price: 40 });
      const list = document.getElementById('readingsList');
      expect(list.innerHTML).toContain('tip-input');
      expect(list.innerHTML).toContain('value="5"');
    });

    test('should render price input with placeholder', () => {
      session.addReading({ timestamp: '2025-01-15T14:30:00.000Z', tip: 5, price: null });
      const list = document.getElementById('readingsList');
      expect(list.innerHTML).toContain('price-input');
      expect(list.innerHTML).toContain('placeholder="40"');
    });

    test('should render payment button', () => {
      session.addReading({ timestamp: '2025-01-15T14:30:00.000Z', tip: 5, payment: 'CC' });
      const list = document.getElementById('readingsList');
      expect(list.innerHTML).toContain('CC');
      expect(list.innerHTML).toContain('selected');
    });

    test('should render source button', () => {
      session.addReading({ timestamp: '2025-01-15T14:30:00.000Z', tip: 5, source: 'referral' });
      const list = document.getElementById('readingsList');
      expect(list.innerHTML).toContain('referral');
    });

    test('should number readings sequentially', () => {
      session.addReading({ timestamp: '2025-01-15T14:30:00.000Z', tip: 5 });
      session.addReading({ timestamp: '2025-01-15T14:35:00.000Z', tip: 10 });
      const list = document.getElementById('readingsList');
      expect(list.innerHTML).toContain('1.');
      expect(list.innerHTML).toContain('2.');
    });
  });

  describe('Debounced Save', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      session.user = 'TestUser';
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should debounce save calls', () => {
      const saveSpy = jest.spyOn(session, 'save');
      
      session.debouncedSave();
      session.debouncedSave();
      session.debouncedSave();
      
      expect(saveSpy).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(500);
      
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Supabase Integration', () => {
    test('should call Supabase update on save', async () => {
      const updateMock = jest.fn(() => ({ eq: jest.fn() }));
      global.supabaseClient.from = jest.fn(() => ({ update: updateMock }));
      
      session._sessionId = 'test-id';
      session.user = 'TestUser';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      
      await session.save();
      
      expect(global.supabaseClient.from).toHaveBeenCalledWith('blacksheep_reading_tracker_sessions');
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        user_name: 'TestUser',
        location: 'Test Location',
        session_date: '2025-01-15'
      }));
    });

    test('should not include empty session_date in update', async () => {
      const updateMock = jest.fn(() => ({ eq: jest.fn() }));
      global.supabaseClient.from = jest.fn(() => ({ update: updateMock }));
      
      session._sessionId = 'test-id';
      session.user = 'TestUser';
      session.sessionDate = '';
      
      await session.save();
      
      const updateData = updateMock.mock.calls[0][0];
      expect(updateData.session_date).toBeUndefined();
    });

    test('should register background sync on error', async () => {
      global.supabaseClient.from = jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.reject(new Error('Network error')))
        }))
      }));
      
      session._sessionId = 'test-id';
      session.user = 'TestUser';
      
      await session.save();
      
      expect(global.registerBackgroundSync).toHaveBeenCalled();
    });
  });

  describe('Load Users', () => {
    test('should fetch unique users from database', async () => {
      const mockData = [
        { user_name: 'Amanda' },
        { user_name: 'TestUser' },
        { user_name: 'Amanda' }
      ];
      
      global.supabaseClient.from = jest.fn(() => ({
        select: jest.fn(() => ({
          not: jest.fn(() => Promise.resolve({ data: mockData }))
        }))
      }));
      
      const users = await session.loadUsers();
      
      expect(users).toEqual(['Amanda', 'TestUser']);
      expect(users.length).toBe(2);
    });

    test('should handle database error gracefully', async () => {
      global.supabaseClient.from = jest.fn(() => ({
        select: jest.fn(() => ({
          not: jest.fn(() => Promise.reject(new Error('DB error')))
        }))
      }));
      
      const users = await session.loadUsers();
      expect(users).toEqual([]);
    });
  });

  describe('Price Fallback', () => {
    beforeEach(() => {
      session._sessionId = 'test-id';
      session.user = 'TestUser';
      session.price = 40;
    });

    test('should use session price when reading price is null', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: null });
      expect(document.getElementById('baseTotal').textContent).toBe('40.00');
    });

    test('should use session price when reading price is undefined', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5 });
      expect(document.getElementById('baseTotal').textContent).toBe('40.00');
    });

    test('should use reading price when provided', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 50 });
      expect(document.getElementById('baseTotal').textContent).toBe('50.00');
    });

    test('should handle mixed prices correctly', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: null });
      session.addReading({ timestamp: new Date().toISOString(), tip: 10, price: 50 });
      session.addReading({ timestamp: new Date().toISOString(), tip: 0, price: 30 });
      expect(document.getElementById('baseTotal').textContent).toBe('120.00');
      expect(document.getElementById('tipsTotal').textContent).toBe('15.00');
      expect(document.getElementById('grandTotal').textContent).toBe('135.00');
    });
  });
});
