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

    // Reset mocks (use global mock from jest.setup.js)
    jest.clearAllMocks();

    // Mock global functions from index.html
    global.showSnackbar = jest.fn();
    global.vibrate = jest.fn();
    global.registerBackgroundSync = jest.fn();
    global.Utils = {
      sanitize: jest.fn((str) => str)
    };

    // Mock auth for userId
    global.window.auth = { userId: 'user-123', getUserName: jest.fn(() => 'Amanda') };

    // Load session-store.js
    const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'session-store.js'), 'utf8');
    const SessionStore = eval(`(function() { ${code}; return SessionStore; })()`);

    // Initialize SessionStore
    session = new SessionStore();
    global.session = session;
    localStorage.clear();
  });



  describe('Reading Management Flow', () => {
    beforeEach(() => {
      session._sessionId = 'test-id';
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      session._price = 40;
    });

    test('should render reading in DOM with delete button', async () => {
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      const readingsList = document.getElementById('readingsList');
      expect(readingsList.innerHTML).toContain('delete-btn');
      expect(readingsList.innerHTML).toContain('1.');
    });

    test('should render tip input with correct value', async () => {
      await session.addReading({ timestamp: new Date().toISOString(), tip: 7.5, price: 40 });
      const readingsList = document.getElementById('readingsList');
      expect(readingsList.innerHTML).toContain('value="7.5"');
    });

    test('should call global deleteReading function', async () => {
      global.readingsManager = { deleteReading: jest.fn() };
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      const readingsList = document.getElementById('readingsList');
      expect(readingsList.innerHTML).toContain('onclick="readingsManager.deleteReading(0)"');
    });
  });

  describe('Totals Display Flow', () => {
    beforeEach(() => {
      session._sessionId = 'test-id';
      session._price = 40;
    });

    test('should update all total elements in DOM', async () => {
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
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
      session._location = 'Test Location';
      session._sessionDate = '2025-01-15';
      session.updateUI();
      expect(document.querySelector('.buttons').style.display).toBe('flex');
      expect(document.querySelector('.totals').style.display).toBe('block');
      expect(document.querySelector('.readings-list').style.display).toBe('block');
    });
  });



  describe('localStorage Integration', () => {
    test('should save to user-specific localStorage key', () => {
      session._location = 'Test Location';
      session.saveToLocalStorage();
      const saved = localStorage.getItem('readingTracker_user-123');
      expect(saved).toBeTruthy();
      const data = JSON.parse(saved);
      expect(data.location).toBe('Test Location');
    });

    test('should load from user-specific localStorage key', () => {
      const state = {
        sessionId: 'test-id',
        location: 'Test Location',
        sessionDate: '2025-01-15',
        price: 40,
        readings: []
      };
      localStorage.setItem('readingTracker_user-123', JSON.stringify(state));
      session.loadFromStorage();
      expect(session.location).toBe('Test Location');
    });
  });

  describe('Global Function Calls', () => {
    test('should call registerBackgroundSync on save error', async () => {
      global.supabaseClient.from = jest.fn(() => ({
        update: jest.fn(() => ({ 
          eq: jest.fn(() => Promise.reject(new Error('Network error')))
        }))
      }));
      session._sessionId = 'test-id';
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

    test('hideUserSelection should call hideSheet', () => {
      session.hideUserSelection();
      expect(global.hideSheet).toHaveBeenCalledWith('overlay-user-selection', 'sheet-user-selection');
    });
  });

  describe('Session Management Functions (onclick handlers)', () => {
    test('startNewSession should call startOver on confirm', () => {
      global.confirm = jest.fn(() => true);
      global.window.timer = { reset: jest.fn() };
      global.window.settings = { get: jest.fn(() => 15) };
      session._sessionId = 'test-id';
      session.startNewSession();
      expect(session.sessionId).toBeNull();
    });

    test('showLoadSession should populate sessionsList', async () => {
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

    jest.clearAllMocks();
    global.Utils = {
      vibrate: jest.fn(),
      showSheet: jest.fn(),
      hideSheet: jest.fn(),
      showSnackbar: jest.fn(),
      sanitize: jest.fn((str) => str)
    };
    global.window.handleBackgroundBackup = jest.fn();

    // Supabase mock with readings table support — use global mock from jest.setup
    jest.clearAllMocks();

    const SessionStore = eval(`(function() { ${fs.readFileSync(path.join(__dirname, '..', 'modules', 'session-store.js'), 'utf8')}; return SessionStore; })()`);
    const ReadingsManager = eval(`(function() { ${fs.readFileSync(path.join(__dirname, '..', 'modules', 'readings-manager.js'), 'utf8')}; return ReadingsManager; })()`);

    session = new SessionStore();
    session._sessionId = 'test-id';
    session._location = 'Test';
    session._sessionDate = '2025-01-15';
    session._price = 40;
    global.window.auth = { userId: 'user-123', getUserName: jest.fn(() => 'Amanda') };
    global.window.session = session;
    global.window.session.type = 'event';
    global.window.settings = { get: jest.fn((key) => {
      if (key === 'sources') return [
        { name: 'Referral', scope: 'event' },
        { name: 'Repeat', scope: 'all' },
        { name: 'Phone', scope: 'private' }
      ];
      if (key === 'paymentMethods') return ['Cash', 'CC', 'Venmo'];
      return ['Cash', 'CC', 'Venmo'];
    }) };

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
      expect(options.innerHTML).toContain('Referral');
      expect(options.innerHTML).toContain('Repeat');
      expect(options.innerHTML).not.toContain('Phone');
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

    test('removeReading should prompt and remove last reading', async () => {
      global.confirm = jest.fn(() => true);
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      readingsManager.removeReading();
      // removeReading is async but confirm triggers it
      await new Promise(r => setTimeout(r, 0));
      expect(session.readings.length).toBe(0);
    });

    test('deleteReading should prompt and remove specific reading', async () => {
      global.confirm = jest.fn(() => true);
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      readingsManager.deleteReading(0);
      await new Promise(r => setTimeout(r, 0));
      expect(session.readings.length).toBe(0);
    });

    test('selectPaymentMethod should update reading payment', async () => {
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      readingsManager.currentPaymentIndex = 0;
      readingsManager.selectPaymentMethod('Venmo');
      expect(session.readings[0].payment).toBe('Venmo');
    });

    test('selectCustomPayment should prompt and update payment', async () => {
      global.prompt = jest.fn(() => 'Custom Payment');
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      readingsManager.currentPaymentIndex = 0;
      readingsManager.selectCustomPayment();
      expect(session.readings[0].payment).toBe('Custom Payment');
    });

    test('selectSource should update reading source', async () => {
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
      readingsManager.currentSourceIndex = 0;
      readingsManager.selectSource('Referral');
      expect(session.readings[0].source).toBe('Referral');
    });

    test('selectCustomSource should prompt and update source', async () => {
      global.prompt = jest.fn(() => 'Custom Source');
      await session.addReading({ timestamp: new Date().toISOString(), tip: 5, price: 40 });
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

    jest.clearAllMocks();
    global.vibrate = jest.fn();
    global.showSheet = jest.fn();
    global.hideSheet = jest.fn();
    global.showSnackbar = jest.fn();

    const SettingsStore = eval(`(function() { ${fs.readFileSync(path.join(__dirname, '..', 'modules', 'settings-store.js'), 'utf8')}; return SettingsStore; })()`);
    settings = new SettingsStore();
    global.window.settings = settings;
    global.window.session = { user: 'Amanda' };
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
      settings.updateSource(0, 'name', 'Updated Source');
      expect(settings.get('sources')[0].name).toBe('Updated Source');
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

describe('Integration: index.html + auth.js', () => {
  let auth;

  beforeEach(() => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    document.documentElement.innerHTML = html;

    global.showSnackbar = jest.fn();

    const Auth = eval(`(function() { ${fs.readFileSync(path.join(__dirname, '..', 'modules', 'auth.js'), 'utf8')}; return Auth; })()`);;
    auth = new Auth();
    global.window.auth = auth;
    // Auth calls window.session.updateUI - provide a stub
    global.window.session = { updateUI: jest.fn(), startOver: jest.fn(), loadFromStorage: jest.fn(), promptRestoreSession: jest.fn() };
  });

  describe('DOM Element Existence', () => {
    test('should find btn-app-settings element', () => {
      expect(document.getElementById('btn-app-settings')).toBeTruthy();
    });

    test('should find btn-user-profile element', () => {
      expect(document.getElementById('btn-user-profile')).toBeTruthy();
    });

    test('should find text-user-profile-name element', () => {
      expect(document.getElementById('text-user-profile-name')).toBeTruthy();
    });

    test('should find container-login-prompt element', () => {
      expect(document.getElementById('container-login-prompt')).toBeTruthy();
    });

    test('should find session-bar element (replaced event-settings)', () => {
      expect(document.getElementById('session-bar')).toBeTruthy();
    });

    test('should find container-readings-buttons element', () => {
      expect(document.getElementById('container-readings-buttons')).toBeTruthy();
    });
  });

  describe('Authentication Flow', () => {
    // Auth hides its own buttons; session controls are hidden via window.session.updateUI()
    test('should hide authenticated UI when not logged in', () => {
      auth.updateUI();

      expect(document.getElementById('btn-app-settings').style.display).toBe('none');
      expect(document.getElementById('btn-user-profile').style.display).toBe('none');
    });

    test('should show authenticated UI when logged in', () => {
      auth._user = { user_metadata: { full_name: 'Test User' }, email: 'test@example.com' };
      auth._userId = 'test-id';
      
      auth.updateUI();
      
      expect(document.getElementById('btn-app-settings').style.display).toBe('flex');
      expect(document.getElementById('btn-user-profile').style.display).toBe('flex');
      expect(document.getElementById('text-user-profile-name').textContent).toBe('Test User');
    });

    test('should update profile name in DOM', () => {
      auth._user = { user_metadata: { full_name: 'Amanda' }, email: 'amanda@example.com' };
      auth._userId = 'user-123';
      
      auth.updateUI();
      
      expect(document.getElementById('text-user-profile-name').textContent).toBe('Amanda');
    });
  });

  describe('Session Controls Visibility', () => {
    // Session controls visibility is managed by window.session.updateUI(), not auth directly
    test('should call window.session.updateUI when not authenticated', () => {
      auth.updateUI();
      expect(global.window.session.updateUI).toHaveBeenCalled();
    });

    test('should show session controls when authenticated', () => {
      auth._user = { user_metadata: { full_name: 'Test' } };
      auth._userId = 'test-id';
      
      auth.updateUI();
      
      expect(document.getElementById('session-bar').style.display).not.toBe('none');
      expect(document.getElementById('container-readings-buttons').style.display).not.toBe('none');
      expect(document.getElementById('container-readings-totals').style.display).not.toBe('none');
      expect(document.getElementById('container-readings-list').style.display).not.toBe('none');
    });
  });

  describe('Auth State Management', () => {
    test('should trigger updateUI when userId changes', () => {
      const spy = jest.spyOn(auth, 'updateUI');
      auth.userId = 'new-id';
      expect(spy).toHaveBeenCalled();
    });

    test('should clear all state on signOut', async () => {
      global.supabaseClient.auth.signOut.mockResolvedValue({ error: null });
      
      auth._user = { user_metadata: { full_name: 'Test' } };
      auth._userRole = 'admin';
      auth._userId = 'test-id';
      
      await auth.signOut();
      
      expect(auth.user).toBeNull();
      expect(auth.userId).toBeNull();
      expect(auth.userRole).toBeNull();
    });
  });

  describe('Profile Query Integration', () => {
    test('should query user_profiles table on checkAuth', async () => {
      global.supabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123', email: 'test@example.com', user_metadata: {} }
          }
        }
      });
      global.supabaseClient.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(() => Promise.resolve({ data: { role: 'user' }, error: null }))
          }))
        })),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }));

      await auth.checkAuth();

      expect(global.supabaseClient.from).toHaveBeenCalledWith('blacksheep_reading_tracker_user_profiles');
      expect(auth.userRole).toBe('user');
    });
  });
});
