/**
 * @jest-environment jsdom
 */

// Set up DOM with elements needed for app mode behavior testing
document.body.innerHTML = `
  <div id="container-readings-buttons" class="buttons"></div>
  <div id="container-readings-totals" class="totals"></div>
  <div id="container-readings-list" class="readings-list"></div>
  <div id="container-timer" class="timer"></div>
  <div id="session-bar" class="session-bar">
      <span id="session-bar-location" class="session-bar-location"></span>
      <span id="session-bar-price" class="session-bar-price"></span>
      <span id="session-bar-date" class="session-bar-date"></span>
      <button id="btn-session-edit" class="session-bar-edit" style="display: none;">
          <i class="fas fa-pencil-alt"></i>
      </button>
  </div>
  <div id="readingsList"></div>
  <span id="readingCount">0</span>
  <span id="baseTotal">0.00</span>
  <span id="tipsTotal">0.00</span>
  <span id="grandTotal">0.00</span>
  <div id="hamburger-end-session"></div>
  <div id="hamburger-overlay" style="display: none;"></div>
  <div id="hamburger-menu" style="display: none;"></div>

  <div id="requiredFieldsNote"></div>
  <button class="btn-create-session"></button>
  <button class="btn-new-session"></button>
  <button class="btn-load-session"></button>
`;

global.showSnackbar = jest.fn();
global.vibrate = jest.fn();
global.registerBackgroundSync = jest.fn();
global.Utils = { sanitize: jest.fn((str) => str) };
global.hideSheet = jest.fn();

global.window.auth = {
  userId: 'user-123',
  getUserName: jest.fn(() => 'TestUser')
};

const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'session-store.js'), 'utf8');
const SessionStore = eval(`(function() { ${code}; return SessionStore; })()`);

describe('App Mode Behavior', () => {
  let session;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    session = new SessionStore();
    // Reset display states
    document.getElementById('container-readings-buttons').style.display = '';
    document.getElementById('container-readings-totals').style.display = '';
    document.getElementById('container-readings-list').style.display = '';
    document.getElementById('container-timer').style.display = '';
  });

  describe('No session state - readings hidden', () => {
    test('readings buttons section hidden when no session', () => {
      session.updateUI();
      expect(document.querySelector('.buttons').style.display).toBe('none');
    });

    test('readings totals section hidden when no session', () => {
      session.updateUI();
      expect(document.querySelector('.totals').style.display).toBe('none');
    });

    test('readings list section hidden when no session', () => {
      session.updateUI();
      expect(document.querySelector('.readings-list').style.display).toBe('none');
    });

    test('sessionPhase is SETUP when no session data', () => {
      expect(session.sessionPhase).toBe('SETUP');
    });
  });

  describe('Active session - readings visible', () => {
    beforeEach(() => {
      session._sessionId = 'test-session-id';
      session._location = 'Test Location';
      session._sessionDate = '2025-06-14';
      session._price = 65;
    });

    test('readings buttons section visible when session active', () => {
      session.updateUI();
      expect(document.querySelector('.buttons').style.display).toBe('flex');
    });

    test('readings totals section visible when session active', () => {
      session.updateUI();
      expect(document.querySelector('.totals').style.display).toBe('block');
    });

    test('readings list section visible when session active', () => {
      session.updateUI();
      expect(document.querySelector('.readings-list').style.display).toBe('block');
    });

    test('sessionPhase is ACTIVE with valid session', () => {
      expect(session.sessionPhase).toBe('ACTIVE');
    });
  });

  describe('Timer visible in both modes', () => {
    test('timer visible when no session', () => {
      session.updateUI();
      const timer = document.getElementById('container-timer');
      // Timer should never be set to display:none by updateUI
      expect(timer.style.display).not.toBe('none');
    });

    test('timer visible when session active', () => {
      session._sessionId = 'test-session-id';
      session._location = 'Test Location';
      session._sessionDate = '2025-06-14';
      session.updateUI();
      const timer = document.getElementById('container-timer');
      expect(timer.style.display).not.toBe('none');
    });
  });

  describe('Transition to active mode on session create', () => {
    test('creating session transitions readings from hidden to visible', async () => {
      // Start in SETUP - readings hidden
      session._location = 'Test Location';
      session._sessionDate = '2025-06-14';
      session._price = 65;
      session.updateUI();
      expect(document.querySelector('.buttons').style.display).toBe('none');

      // Create session triggers transition to ACTIVE
      await session.createSession();

      expect(session.sessionPhase).toBe('ACTIVE');
      expect(document.querySelector('.buttons').style.display).toBe('flex');
      expect(document.querySelector('.totals').style.display).toBe('block');
      expect(document.querySelector('.readings-list').style.display).toBe('block');
    });

    test('setting sessionId directly triggers updateUI and shows readings', () => {
      session._location = 'Test Location';
      session._sessionDate = '2025-06-14';
      // Manually set _sessionId to simulate load without DB call
      session._sessionId = 'loaded-session-id';
      session.updateUI();

      expect(document.querySelector('.buttons').style.display).toBe('flex');
      expect(document.querySelector('.totals').style.display).toBe('block');
      expect(document.querySelector('.readings-list').style.display).toBe('block');
    });
  });

  describe('Transition to no-session mode on end session', () => {
    beforeEach(() => {
      session._sessionId = 'test-session-id';
      session._location = 'Test Location';
      session._sessionDate = '2025-06-14';
      session._price = 65;
      session._readings = [{ id: 'r1', timestamp: '2025-06-14T10:00:00Z', tip: 5, price: 65 }];
      session.updateUI();
      // Confirm readings visible before ending
      expect(document.querySelector('.buttons').style.display).toBe('flex');
    });

    test('end session hides readings section when confirmed', () => {
      global.confirm = jest.fn(() => true);

      session.endSession();

      expect(document.querySelector('.buttons').style.display).toBe('none');
      expect(document.querySelector('.totals').style.display).toBe('none');
      expect(document.querySelector('.readings-list').style.display).toBe('none');
    });

    test('end session clears session state', () => {
      global.confirm = jest.fn(() => true);

      session.endSession();

      expect(session._sessionId).toBeNull();
      expect(session._location).toBe('');
      expect(session._readings).toEqual([]);
      expect(session.sessionPhase).toBe('SETUP');
    });

    test('end session does not hide readings when cancelled', () => {
      global.confirm = jest.fn(() => false);

      session.endSession();

      expect(document.querySelector('.buttons').style.display).toBe('flex');
      expect(session._sessionId).toBe('test-session-id');
    });

    test('timer remains visible after ending session', () => {
      global.confirm = jest.fn(() => true);

      session.endSession();

      const timer = document.getElementById('container-timer');
      expect(timer.style.display).not.toBe('none');
    });
  });

  describe('App load with persisted session', () => {
    test('loadFromStorage restores active session and shows readings', () => {
      const state = {
        sessionId: 'persisted-session-id',
        location: 'Persisted Location',
        sessionDate: '2025-06-14',
        price: 65,
        type: 'event',
        readings: [{ id: 'r1', timestamp: '2025-06-14T10:00:00Z', tip: 5, price: 65 }]
      };
      localStorage.setItem('readingTracker_user-123', JSON.stringify(state));

      session.loadFromStorage();

      expect(session.sessionPhase).toBe('ACTIVE');
      expect(document.querySelector('.buttons').style.display).toBe('flex');
      expect(document.querySelector('.totals').style.display).toBe('block');
      expect(document.querySelector('.readings-list').style.display).toBe('block');
    });

    test('loadFromStorage without session keeps readings hidden', () => {
      const state = {
        sessionId: null,
        location: '',
        sessionDate: '',
        price: 40,
        type: 'event',
        readings: []
      };
      localStorage.setItem('readingTracker_user-123', JSON.stringify(state));

      session.loadFromStorage();

      expect(session.sessionPhase).toBe('SETUP');
      expect(document.querySelector('.buttons').style.display).toBe('none');
      expect(document.querySelector('.totals').style.display).toBe('none');
      expect(document.querySelector('.readings-list').style.display).toBe('none');
    });
  });
});
