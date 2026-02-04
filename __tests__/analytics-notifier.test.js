// Mock DOM and globals
global.document = {
  getElementById: jest.fn(() => ({ 
    value: '', 
    classList: { add: jest.fn(), remove: jest.fn() },
    style: { display: '' },
    textContent: '',
    innerHTML: ''
  })),
  querySelector: jest.fn(() => ({ style: { display: '' } })),
  querySelectorAll: jest.fn(() => []),
  createElement: jest.fn(() => ({
    className: '',
    textContent: '',
    style: {},
    remove: jest.fn()
  })),
  body: {
    appendChild: jest.fn()
  }
};

global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

global.supabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      gte: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }))
};

global.window = {
  Notification: { permission: 'default' },
  navigator: { serviceWorker: { ready: Promise.resolve({ showNotification: jest.fn() }) } }
};

const fs = require('fs');
const path = require('path');

describe('AnalyticsNotifier', () => {
  let AnalyticsNotifier;
  let notifier;

  beforeAll(() => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'analytics-notifier.js'), 'utf8');
    AnalyticsNotifier = eval(`(function() { ${code}; return AnalyticsNotifier; })()`);
  });

  beforeEach(() => {
    notifier = new AnalyticsNotifier();
  });

  test('should instantiate', () => {
    expect(notifier).toBeDefined();
  });

  test('should have checkAndSendNotifications method', () => {
    expect(typeof notifier.checkAndSendNotifications).toBe('function');
  });

  test('should have checkDailySummary method', () => {
    expect(typeof notifier.checkDailySummary).toBe('function');
  });

  test('should have checkWeekendGoals method', () => {
    expect(typeof notifier.checkWeekendGoals).toBe('function');
  });

  test('should have checkBestDay method', () => {
    expect(typeof notifier.checkBestDay).toBe('function');
  });

  test('should have checkTipTrends method', () => {
    expect(typeof notifier.checkTipTrends).toBe('function');
  });

  test('should have checkPeakTimes method', () => {
    expect(typeof notifier.checkPeakTimes).toBe('function');
  });

  test('calculateAverageTip should return 0 for empty array', () => {
    const avg = notifier.calculateAverageTip([]);
    expect(avg).toBe(0);
  });

  test('calculateAverageTip should calculate correctly', () => {
    const sessions = [
      { readings: [{ tip: 10 }] },
      { readings: [{ tip: 20 }] },
      { readings: [{ tip: 30 }] }
    ];
    const avg = notifier.calculateAverageTip(sessions);
    expect(avg).toBe(20);
  });
});
