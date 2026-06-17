/**
 * @jest-environment jsdom
 */

// Set up DOM with hamburger menu elements matching index.html structure
document.body.innerHTML = `
  <button id="btn-hamburger" class="hamburger-btn" onclick="session.toggleHamburgerMenu()">
      <i class="fas fa-bars"></i>
  </button>
  <div id="hamburger-overlay" class="hamburger-overlay" onclick="session.closeHamburgerMenu()"></div>
  <div id="hamburger-menu" class="hamburger-menu">
      <div class="hamburger-item" onclick="session.newEvent()">
          <i class="fas fa-calendar-alt"></i> New Event
      </div>
      <div class="hamburger-item" onclick="session.newPrivateReading()">
          <i class="fas fa-user"></i> New Private Reading
      </div>
      <div class="hamburger-item" onclick="session.showLoadSession()">
          <i class="fas fa-folder-open"></i> Load Session
      </div>
      <div id="hamburger-end-session" class="hamburger-item" onclick="session.endSession()">
          <i class="fas fa-stop-circle"></i> End Session
      </div>
  </div>

  <!-- Minimal DOM elements required by SessionStore -->
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
  <div id="session-bar" class="session-bar">
      <span id="session-bar-location" class="session-bar-location"></span>
      <span id="session-bar-price" class="session-bar-price"></span>
      <span id="session-bar-date" class="session-bar-date"></span>
      <button id="btn-session-edit" class="session-bar-edit" style="display: none;">
          <i class="fas fa-pencil-alt"></i>
      </button>
  </div>
`;

global.showSnackbar = jest.fn();
global.vibrate = jest.fn();
global.registerBackgroundSync = jest.fn();
global.Utils = { sanitize: jest.fn((str) => str) };

global.window.auth = {
  userId: 'user-123',
  getUserName: jest.fn(() => 'TestUser')
};

const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'session-store.js'), 'utf8');
const SessionStore = eval(`(function() { ${code}; return SessionStore; })()`);

describe('Hamburger Menu', () => {
  let session;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    session = new SessionStore();
    // Reset menu state
    document.getElementById('hamburger-overlay').style.display = 'none';
    document.getElementById('hamburger-menu').style.display = 'none';
  });

  describe('Menu Items', () => {
    test('should contain exactly 4 items in correct order', () => {
      const items = document.querySelectorAll('#hamburger-menu .hamburger-item');
      expect(items.length).toBe(4);
      expect(items[0].textContent.trim()).toContain('New Event');
      expect(items[1].textContent.trim()).toContain('New Private Reading');
      expect(items[2].textContent.trim()).toContain('Load Session');
      expect(items[3].textContent.trim()).toContain('End Session');
    });
  });

  describe('End Session Disabled State', () => {
    test('should add disabled class to End Session when no active session', () => {
      expect(session.hasValidSession).toBeFalsy();
      session.toggleHamburgerMenu();
      const endItem = document.getElementById('hamburger-end-session');
      expect(endItem.classList.contains('disabled')).toBe(true);
    });

    test('should not have disabled class when active session exists', () => {
      session._sessionId = 'test-id';
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      expect(session.hasValidSession).toBeTruthy();
      session.toggleHamburgerMenu();
      const endItem = document.getElementById('hamburger-end-session');
      expect(endItem.classList.contains('disabled')).toBe(false);
    });
  });

  describe('Toggle and Close', () => {
    test('should show menu and overlay when toggled open', () => {
      session.toggleHamburgerMenu();
      expect(document.getElementById('hamburger-menu').style.display).toBe('block');
      expect(document.getElementById('hamburger-overlay').style.display).toBe('block');
    });

    test('should hide menu and overlay when toggled closed', () => {
      // Open first
      session.toggleHamburgerMenu();
      expect(document.getElementById('hamburger-menu').style.display).toBe('block');
      // Toggle again to close
      session.toggleHamburgerMenu();
      expect(document.getElementById('hamburger-menu').style.display).toBe('none');
      expect(document.getElementById('hamburger-overlay').style.display).toBe('none');
    });

    test('overlay click should close menu', () => {
      session.toggleHamburgerMenu();
      expect(document.getElementById('hamburger-menu').style.display).toBe('block');
      // Simulate overlay click by calling closeHamburgerMenu (the onclick handler)
      session.closeHamburgerMenu();
      expect(document.getElementById('hamburger-menu').style.display).toBe('none');
      expect(document.getElementById('hamburger-overlay').style.display).toBe('none');
    });
  });

  describe('New Event Action', () => {
    test('should close menu and open session sheet with type=event', () => {
      session.openSessionSheet = jest.fn();
      session.toggleHamburgerMenu();
      expect(document.getElementById('hamburger-menu').style.display).toBe('block');

      session.newEvent();

      expect(document.getElementById('hamburger-menu').style.display).toBe('none');
      expect(session.openSessionSheet).toHaveBeenCalledWith('create', 'event');
    });
  });

  describe('New Private Reading Action', () => {
    test('should close menu and open session sheet with type=private', () => {
      session.openSessionSheet = jest.fn();
      session.toggleHamburgerMenu();
      expect(document.getElementById('hamburger-menu').style.display).toBe('block');

      session.newPrivateReading();

      expect(document.getElementById('hamburger-menu').style.display).toBe('none');
      expect(session.openSessionSheet).toHaveBeenCalledWith('create', 'private');
    });
  });

  describe('End Session Action', () => {
    test('should not clear state when no active session', () => {
      session._sessionId = null;
      global.confirm = jest.fn(() => true);

      session.endSession();

      expect(global.confirm).not.toHaveBeenCalled();
      expect(session.sessionId).toBeNull();
    });

    test('should clear state when confirmed with active session', () => {
      session._sessionId = 'test-id';
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      session._readings = [{ id: 'r1', timestamp: '2025-01-15T14:00:00Z', tip: 5 }];
      global.confirm = jest.fn(() => true);

      session.endSession();

      expect(global.confirm).toHaveBeenCalled();
      expect(session._sessionId).toBeNull();
      expect(session._location).toBe('');
      expect(session._readings).toEqual([]);
    });

    test('should not clear state when cancelled', () => {
      session._sessionId = 'test-id';
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      global.confirm = jest.fn(() => false);

      session.endSession();

      expect(global.confirm).toHaveBeenCalled();
      expect(session._sessionId).toBe('test-id');
      expect(session._location).toBe('Test Location');
    });
  });
});
