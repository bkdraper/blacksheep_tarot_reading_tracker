/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('Integration: index.html + session-store.js', () => {
  let session;

  beforeEach(() => {
    // Load full HTML
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
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
    global.Utils = {
      sanitize: jest.fn((str) => str)
    };

    // Load session-store.js
    const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'session-store.js'), 'utf8');
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
      global.readingsManager = { deleteReading: jest.fn() };
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      const readingsList = document.getElementById('readingsList');
      expect(readingsList.innerHTML).toContain('onclick="readingsManager.deleteReading(0)"');
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
      global.showSnackbar.mockClear();
      session.user = 'Bob';
      expect(global.showSnackbar).toHaveBeenCalled();
    });

    test('should call registerBackgroundSync on save error', async () => {
      global.supabaseClient.from = jest.fn(() => ({
        update: jest.fn(() => ({ 
          eq: jest.fn(() => Promise.reject(new Error('Network error')))
        }))
      }));
      session._sessionId = 'test-id';
      session.user = 'Amanda';
      global.registerBackgroundSync.mockClear();
      await session.save();
      expect(global.registerBackgroundSync).toHaveBeenCalled();
    });
  });

  describe('User Selection Functions (onclick handlers)', () => {
    beforeEach(() => {
      global.showSheet = jest.fn();
      global.hideSheet = jest.fn();
    });

    test('showUserSelection should call showSheet', () => {
      session.showUserSelection();
      expect(global.showSheet).toHaveBeenCalledWith('userOverlay', 'userSheet');
      expect(document.getElementById('userList').innerHTML).toContain('spinner');
    });

    test('hideUserSelection should call hideSheet', () => {
      session.hideUserSelection();
      expect(global.hideSheet).toHaveBeenCalledWith('userOverlay', 'userSheet');
    });

    test('selectUser should update user and call hideUserSelection', () => {
      session.selectUser('TestUser');
      expect(session.user).toBe('TestUser');
      expect(global.hideSheet).toHaveBeenCalled();
    });

    test('addNewUser should prompt and set user', () => {
      global.prompt = jest.fn(() => 'NewUser');
      session.addNewUser();
      expect(session.user).toBe('NewUser');
      expect(global.hideSheet).toHaveBeenCalled();
    });
  });

  describe('Session Management Functions (onclick handlers)', () => {
    test('handleCreateSession should show error when inactive', () => {
      global.showSnackbar.mockClear();
      session.handleCreateSession();
      expect(global.showSnackbar).toHaveBeenCalledWith('User, location and date are required', 'error');
    });

    test('handleCreateSession should call createSession when ready', async () => {
      session.user = 'Amanda';
      session.location = 'Test';
      session.sessionDate = '2025-01-15';
      session.createSession = jest.fn();
      session.handleCreateSession();
      expect(session.createSession).toHaveBeenCalled();
    });

    test('startNewSession should call startOver on confirm', () => {
      global.confirm = jest.fn(() => true);
      global.window.timer = { reset: jest.fn() };
      global.window.settings = { get: jest.fn(() => 15) };
      session._sessionId = 'test-id';
      session.startNewSession();
      expect(session.sessionId).toBeNull();
    });

    test('showLoadSession should populate sessionsList', async () => {
      session.user = 'Amanda';
      global.normalizeDate = jest.fn((date) => date);
      global.supabaseClient.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ 
                data: [{ id: '1', location: 'Test', session_date: '2025-01-15', readings: [] }] 
              }))
            }))
          }))
        }))
      }));
      global.showSheet = jest.fn();
      await session.showLoadSession();
      expect(document.getElementById('sessionsList').innerHTML).toContain('Test');
      expect(global.showSheet).toHaveBeenCalledWith('sessionOverlay', 'sessionSheet');
    });

    test('closeSessionSheet should call hideSheet', () => {
      global.hideSheet = jest.fn();
      session.closeSessionSheet();
      expect(global.hideSheet).toHaveBeenCalledWith('sessionOverlay', 'sessionSheet');
    });
  });
});

describe('Integration: index.html + readings-manager.js', () => {
  let readingsManager;
  let session;

  beforeEach(() => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    document.documentElement.innerHTML = html;

    global.supabaseClient = {
      from: jest.fn(() => ({
        update: jest.fn(() => ({ eq: jest.fn() }))
      }))
    };
    global.Utils = {
      vibrate: jest.fn(),
      showSheet: jest.fn(),
      hideSheet: jest.fn(),
      showSnackbar: jest.fn(),
      sanitize: jest.fn((str) => str)
    };
    global.window.handleBackgroundBackup = jest.fn();

    const SessionStore = eval(`(function() { ${fs.readFileSync(path.join(__dirname, '..', 'modules', 'session-store.js'), 'utf8')}; return SessionStore; })()`);
    const ReadingsManager = eval(`(function() { ${fs.readFileSync(path.join(__dirname, '..', 'modules', 'readings-manager.js'), 'utf8')}; return ReadingsManager; })()`);

    session = new SessionStore();
    session._sessionId = 'test-id';
    session.user = 'Amanda';
    session.price = 40;
    global.window.session = session;
    global.window.settings = { get: jest.fn(() => ['Cash', 'CC', 'Venmo']) };

    readingsManager = new ReadingsManager();
    global.window.readingsManager = readingsManager;
  });

  describe('DOM Element Existence', () => {
    test('should find paymentOptions element', () => {
      expect(document.getElementById('paymentOptions')).toBeTruthy();
    });

    test('should find sourceOptions element', () => {
      expect(document.getElementById('sourceOptions')).toBeTruthy();
    });

    test('should find paymentOverlay element', () => {
      expect(document.getElementById('paymentOverlay')).toBeTruthy();
    });

    test('should find paymentSheet element', () => {
      expect(document.getElementById('paymentSheet')).toBeTruthy();
    });

    test('should find sourceOverlay element', () => {
      expect(document.getElementById('sourceOverlay')).toBeTruthy();
    });

    test('should find sourceSheet element', () => {
      expect(document.getElementById('sourceSheet')).toBeTruthy();
    });
  });

  describe('Payment Sheet Flow', () => {
    test('should populate paymentOptions when opened', () => {
      readingsManager.openPaymentSheet(0);
      const options = document.getElementById('paymentOptions');
      expect(options.innerHTML).toContain('Cash');
      expect(options.innerHTML).toContain('CC');
      expect(options.innerHTML).toContain('Other');
    });

    test('should call showSheet with correct IDs', () => {
      readingsManager.openPaymentSheet(0);
      expect(global.Utils.showSheet).toHaveBeenCalledWith('paymentOverlay', 'paymentSheet');
    });
  });

  describe('Source Sheet Flow', () => {
    test('should populate sourceOptions when opened', () => {
      readingsManager.openSourceSheet(0);
      const options = document.getElementById('sourceOptions');
      expect(options.innerHTML).toContain('Cash');
      expect(options.innerHTML).toContain('Other');
    });

    test('should call showSheet with correct IDs', () => {
      readingsManager.openSourceSheet(0);
      expect(global.Utils.showSheet).toHaveBeenCalledWith('sourceOverlay', 'sourceSheet');
    });
  });

  describe('Reading Management Functions (onclick handlers)', () => {
    beforeEach(() => {
      session._sessionId = 'test-id';
      session.user = 'Amanda';
      session.location = 'Test';
      session.sessionDate = '2025-01-15';
    });

    test('addReading should add reading to session', async () => {
      await readingsManager.addReading();
      expect(session.readings.length).toBe(1);
      expect(session.readings[0].tip).toBe(0);
    });

    test('removeReading should prompt and remove last reading', () => {
      global.confirm = jest.fn(() => true);
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      readingsManager.removeReading();
      expect(session.readings.length).toBe(0);
    });

    test('deleteReading should prompt and remove specific reading', () => {
      global.confirm = jest.fn(() => true);
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      readingsManager.deleteReading(0);
      expect(session.readings.length).toBe(0);
    });

    test('selectPaymentMethod should update reading payment', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      readingsManager.currentPaymentIndex = 0;
      readingsManager.selectPaymentMethod('Venmo');
      expect(session.readings[0].payment).toBe('Venmo');
    });

    test('selectCustomPayment should prompt and update payment', () => {
      global.prompt = jest.fn(() => 'Custom Payment');
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      readingsManager.currentPaymentIndex = 0;
      readingsManager.selectCustomPayment();
      expect(session.readings[0].payment).toBe('Custom Payment');
    });

    test('selectSource should update reading source', () => {
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      readingsManager.currentSourceIndex = 0;
      readingsManager.selectSource('Referral');
      expect(session.readings[0].source).toBe('Referral');
    });

    test('selectCustomSource should prompt and update source', () => {
      global.prompt = jest.fn(() => 'Custom Source');
      session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      readingsManager.currentSourceIndex = 0;
      readingsManager.selectCustomSource();
      expect(session.readings[0].source).toBe('Custom Source');
    });
  });
});

describe('Integration: index.html + settings-store.js', () => {
  let settings;

  beforeEach(() => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    document.documentElement.innerHTML = html;

    global.supabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: [] }))
          }))
        }))
      }))
    };
    global.vibrate = jest.fn();
    global.showSheet = jest.fn();
    global.hideSheet = jest.fn();
    global.showSnackbar = jest.fn();

    const SettingsStore = eval(`(function() { ${fs.readFileSync(path.join(__dirname, '..', 'modules', 'settings-store.js'), 'utf8')}; return SettingsStore; })()`);
    settings = new SettingsStore();
    global.window.settings = settings;
    global.window.session = { user: 'Amanda', collapseSettings: jest.fn(), toggleSettings: jest.fn() };
    localStorage.clear();
  });

  describe('DOM Element Existence', () => {
    test('should find settingsOverlay element', () => {
      expect(document.getElementById('settingsOverlay')).toBeTruthy();
    });

    test('should find settingsDrawer element', () => {
      expect(document.getElementById('settingsDrawer')).toBeTruthy();
    });

    test('should find paymentMethodsList element', () => {
      expect(document.getElementById('paymentMethodsList')).toBeTruthy();
    });

    test('should find sourcesList element', () => {
      expect(document.getElementById('sourcesList')).toBeTruthy();
    });

    test('should find defaultTimer select element', () => {
      expect(document.getElementById('defaultTimer')).toBeTruthy();
    });

    test('should find all toggle elements', () => {
      expect(document.getElementById('soundToggle')).toBeTruthy();
      expect(document.getElementById('hapticToggle')).toBeTruthy();
      expect(document.getElementById('darkModeToggle')).toBeTruthy();
    });
  });

  describe('Settings Drawer Flow', () => {
    test('should add open class to overlay and drawer', () => {
      settings.openDrawer();
      expect(document.getElementById('settingsOverlay').classList.contains('open')).toBe(true);
      expect(document.getElementById('settingsDrawer').classList.contains('open')).toBe(true);
    });

    test('should remove open class when closed', () => {
      settings.openDrawer();
      settings.closeDrawer();
      expect(document.getElementById('settingsOverlay').classList.contains('open')).toBe(false);
      expect(document.getElementById('settingsDrawer').classList.contains('open')).toBe(false);
    });
  });

  describe('Payment Methods Sheet Flow', () => {
    test('should populate paymentMethodsList', () => {
      settings.showPaymentMethodsSheet();
      const list = document.getElementById('paymentMethodsList');
      expect(list.innerHTML).toContain('Cash');
      expect(list.innerHTML).toContain('payment-method-input');
    });
  });

  describe('Sources Sheet Flow', () => {
    test('should populate sourcesList', () => {
      settings.showSourcesSheet();
      const list = document.getElementById('sourcesList');
      expect(list.innerHTML).toContain('Referral');
      expect(list.innerHTML).toContain('payment-method-input');
    });
  });

  describe('Settings Functions (onclick handlers)', () => {
    test('toggleSetting should toggle boolean settings', () => {
      const initialSound = settings.get('sound');
      settings.toggleSetting('sound');
      expect(settings.get('sound')).toBe(!initialSound);
    });

    test('updateSetting should update defaultTimer', () => {
      settings.updateSetting('defaultTimer', '20');
      expect(settings.get('defaultTimer')).toBe(20);
      expect(document.getElementById('timerInput').value).toBe('20');
    });

    test('customizePaymentMethods should call showPaymentMethodsSheet', () => {
      settings.showPaymentMethodsSheet = jest.fn();
      settings.customizePaymentMethods();
      expect(settings.showPaymentMethodsSheet).toHaveBeenCalled();
    });

    test('customizeSources should call showSourcesSheet', () => {
      settings.showSourcesSheet = jest.fn();
      settings.customizeSources();
      expect(settings.showSourcesSheet).toHaveBeenCalled();
    });

    test('exportData should show error when no user', async () => {
      global.window.session.user = null;
      global.showSnackbar.mockClear();
      await settings.exportData();
      expect(global.showSnackbar).toHaveBeenCalledWith('Select a user first', 'error');
    });

    test('closePaymentMethodsSheet should call hideSheet', () => {
      global.hideSheet.mockClear();
      settings.closePaymentMethodsSheet();
      expect(global.hideSheet).toHaveBeenCalledWith('paymentMethodsOverlay', 'paymentMethodsSheet');
    });

    test('closeSourcesSheet should call hideSheet', () => {
      global.hideSheet.mockClear();
      settings.closeSourcesSheet();
      expect(global.hideSheet).toHaveBeenCalledWith('sourcesOverlay', 'sourcesSheet');
    });

    test('addPaymentMethod should add new method', () => {
      const initialLength = settings.get('paymentMethods').length;
      settings.addPaymentMethod();
      expect(settings.get('paymentMethods').length).toBe(initialLength + 1);
    });

    test('updatePaymentMethod should update method at index', () => {
      settings.updatePaymentMethod(0, 'Updated Method');
      expect(settings.get('paymentMethods')[0]).toBe('Updated Method');
    });

    test('deletePaymentMethod should remove method at index', () => {
      const initialLength = settings.get('paymentMethods').length;
      settings.deletePaymentMethod(0);
      expect(settings.get('paymentMethods').length).toBe(initialLength - 1);
    });

    test('addSource should add new source', () => {
      const initialLength = settings.get('sources').length;
      settings.addSource();
      expect(settings.get('sources').length).toBe(initialLength + 1);
    });

    test('updateSource should update source at index', () => {
      settings.updateSource(0, 'Updated Source');
      expect(settings.get('sources')[0]).toBe('Updated Source');
    });

    test('deleteSource should remove source at index', () => {
      const initialLength = settings.get('sources').length;
      settings.deleteSource(0);
      expect(settings.get('sources').length).toBe(initialLength - 1);
    });
  });
});

describe('Integration: index.html + timer.js', () => {
  let timer;

  beforeEach(() => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    document.documentElement.innerHTML = html;

    global.vibrate = jest.fn();
    global.showSnackbar = jest.fn();
    global.window.settings = { get: jest.fn(() => true) };
    global.window.APP_LOGO = 'logo.png';

    const Timer = eval(`(function() { ${fs.readFileSync(path.join(__dirname, '..', 'modules', 'timer.js'), 'utf8')}; return Timer; })()`);
    timer = new Timer();
    global.window.timer = timer;
  });

  describe('DOM Element Existence', () => {
    test('should find timerCanvas element', () => {
      expect(document.getElementById('timerCanvas')).toBeTruthy();
    });

    test('should find timerDisplay element', () => {
      expect(document.getElementById('timerDisplay')).toBeTruthy();
    });

    test('should find timerInput element', () => {
      expect(document.getElementById('timerInput')).toBeTruthy();
    });
  });

  describe('Timer Display Flow', () => {
    test('should update timerDisplay text content', () => {
      timer.seconds = 300;
      expect(document.getElementById('timerDisplay').textContent).toBe('05:00');
    });

    test('should update timerDisplay when reset', () => {
      document.getElementById('timerInput').value = '10';
      timer.reset();
      expect(document.getElementById('timerDisplay').textContent).toBe('10:00');
    });
  });

  describe('Timer Canvas Flow', () => {
    test('should initialize canvas context', () => {
      timer.initCanvas();
      expect(timer.canvas).toBeTruthy();
      expect(timer.ctx).toBeTruthy();
    });
  });

  describe('Timer Input Flow', () => {
    test('should read from timerInput on reset', () => {
      const input = document.getElementById('timerInput');
      input.value = '20';
      timer.reset();
      expect(timer.seconds).toBe(1200);
    });
  });

  describe('Timer Functions (onclick handlers)', () => {
    test('start should set isRunning to true', () => {
      timer.seconds = 300;
      timer.start();
      expect(timer.isRunning).toBe(true);
      timer.pause();
    });

    test('pause should set isRunning to false', () => {
      timer.seconds = 300;
      timer.start();
      timer.pause();
      expect(timer.isRunning).toBe(false);
    });

    test('initAudio should create audio context', () => {
      timer.initAudio();
      expect(timer._audioContext).toBeTruthy();
    });
  });
});
