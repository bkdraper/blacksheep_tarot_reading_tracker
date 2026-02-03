/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('Integration: index.html + session-store.js', () => {
  let session;

  beforeEach(() => {
    // Load full HTML
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    document.documentElement.innerHTML = html;

    // Mock Supabase
    global.supabaseClient = {
      from: jest.fn(() => ({
        update: jest.fn(() => ({ eq: jest.fn() })),
        select: jest.fn(() => ({ 
          not: jest.fn(),
          eq: jest.fn(() => ({
            order: jest.fn(() => ({ order: jest.fn() }))
          }))
        }))
      }))
    };

    // Mock global functions from index.html
    global.showSnackbar = jest.fn();
    global.vibrate = jest.fn();
    global.registerBackgroundSync = jest.fn();

    // Load session-store.js
    const code = fs.readFileSync(path.join(__dirname, 'session-store.js'), 'utf8');
    const SessionStore = eval(`(function() { ${code}; return SessionStore; })()`);

    // Initialize SessionStore
    session = new SessionStore();
    global.session = session;
    localStorage.clear();
  });

  describe('User Selection Flow', () => {
    test('should update DOM when user is set', () => {
      session.user = 'Amanda';
      expect(document.getElementById('userBtn').textContent).toBe('Amanda');
      expect(document.getElementById('userBtn').classList.contains('selected')).toBe(true);
    });

    test('should enable Load Session button when user is set', () => {
      const loadBtn = document.querySelector('.btn-load-session');
      session.user = 'Amanda';
      session.updateUI();
      expect(loadBtn.classList.contains('disabled')).toBe(false);
    });
  });

  describe('Session Creation Flow', () => {
    test('should highlight required fields in SETUP phase', () => {
      session.updateUI();
      expect(document.getElementById('userBtn').classList.contains('required-field')).toBe(true);
      expect(document.getElementById('location').classList.contains('required-field')).toBe(true);
    });

    test('should activate Create Session button when ready', () => {
      session.user = 'Amanda';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      session.updateUI();
      const createBtn = document.querySelector('.btn-create-session');
      expect(createBtn.classList.contains('inactive')).toBe(false);
    });

    test('should show New Session button in ACTIVE phase', () => {
      session._sessionId = 'test-id';
      session.user = 'Amanda';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      session.updateUI();
      const newBtn = document.querySelector('.btn-new-session');
      expect(newBtn.style.display).toBe('block');
    });
  });

  describe('Reading Management Flow', () => {
    beforeEach(() => {
      session._sessionId = 'test-id';
      session.user = 'Amanda';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      session.price = 40;
    });

    test('should render reading in DOM with delete button', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      const readingsList = document.getElementById('readingsList');
      expect(readingsList.innerHTML).toContain('delete-btn');
      expect(readingsList.innerHTML).toContain('1.');
    });

    test('should render tip input with correct value', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 7.5, price: 40 });
      const readingsList = document.getElementById('readingsList');
      expect(readingsList.innerHTML).toContain('value="7.5"');
    });

    test('should call global deleteReading function', () => {
      global.deleteReading = jest.fn();
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      const readingsList = document.getElementById('readingsList');
      expect(readingsList.innerHTML).toContain('onclick="deleteReading(0)"');
    });
  });

  describe('Totals Display Flow', () => {
    beforeEach(() => {
      session._sessionId = 'test-id';
      session.user = 'Amanda';
      session.price = 40;
    });

    test('should update all total elements in DOM', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      expect(document.getElementById('readingCount').textContent).toBe('1');
      expect(document.getElementById('baseTotal').textContent).toBe('40.00');
      expect(document.getElementById('tipsTotal').textContent).toBe('5.00');
      expect(document.getElementById('grandTotal').textContent).toBe('45.00');
    });
  });

  describe('UI Visibility Flow', () => {
    test('should hide sections in SETUP phase', () => {
      session.updateUI();
      expect(document.querySelector('.buttons').style.display).toBe('none');
      expect(document.querySelector('.totals').style.display).toBe('none');
      expect(document.querySelector('.readings-list').style.display).toBe('none');
    });

    test('should show sections in ACTIVE phase', () => {
      session._sessionId = 'test-id';
      session.user = 'Amanda';
      session.location = 'Test Location';
      session.sessionDate = '2025-01-15';
      session.updateUI();
      expect(document.querySelector('.buttons').style.display).toBe('flex');
      expect(document.querySelector('.totals').style.display).toBe('block');
      expect(document.querySelector('.readings-list').style.display).toBe('block');
    });
  });

  describe('Input Synchronization Flow', () => {
    test('should sync location input with session state', () => {
      session.location = 'Denver Fall 25';
      expect(document.getElementById('location').value).toBe('Denver Fall 25');
    });

    test('should sync price input with session state', () => {
      session.price = 50;
      expect(document.getElementById('price').value).toBe('50');
    });

    test('should sync sessionDate input with session state', () => {
      session.sessionDate = '2025-01-15';
      expect(document.getElementById('sessionDate').value).toBe('2025-01-15');
    });
  });

  describe('localStorage Integration', () => {
    test('should save to user-specific localStorage key', () => {
      session.user = 'Amanda';
      session.location = 'Test Location';
      session.save();
      const saved = localStorage.getItem('readingTracker_Amanda');
      expect(saved).toBeTruthy();
      const data = JSON.parse(saved);
      expect(data.user).toBe('Amanda');
      expect(data.location).toBe('Test Location');
    });

    test('should load from user-specific localStorage key', () => {
      const state = {
        sessionId: 'test-id',
        user: 'Amanda',
        location: 'Test Location',
        sessionDate: '2025-01-15',
        price: 40,
        readings: []
      };
      localStorage.setItem('readingTracker_Amanda', JSON.stringify(state));
      session.user = 'Amanda';
      session.loadFromStorage();
      expect(session.location).toBe('Test Location');
      expect(document.getElementById('location').value).toBe('Test Location');
    });
  });

  describe('Global Function Calls', () => {
    test('should call showSnackbar on user switch', () => {
      session._sessionId = 'test-id';
      session.user = 'Amanda';
      session.location = 'Test';
      session.sessionDate = '2025-01-15';
      session.user = 'Bob';
      expect(global.showSnackbar).toHaveBeenCalledWith(
        expect.stringContaining('Switched to Bob'),
        'success'
      );
    });

    test('should call registerBackgroundSync on save error', async () => {
      global.supabaseClient.from = jest.fn(() => ({
        update: jest.fn(() => ({ 
          eq: jest.fn(() => Promise.reject(new Error('Network error')))
        }))
      }));
      session._sessionId = 'test-id';
      session.user = 'Amanda';
      await session.save();
      expect(global.registerBackgroundSync).toHaveBeenCalled();
    });
  });
});
