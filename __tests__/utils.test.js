// Mock DOM and globals
global.document = {
  getElementById: jest.fn(() => ({ 
    value: '', 
    classList: { add: jest.fn(), remove: jest.fn() },
    style: { display: '' },
    textContent: ''
  })),
  querySelector: jest.fn(() => ({ style: { display: '' } })),
  querySelectorAll: jest.fn(() => [])
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
      not: jest.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: [{ id: 'test-id' }], error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  }))
};

const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'session-store.js'), 'utf8');
const SessionStore = eval(`(function() { ${code}; return SessionStore; })()`);

describe('SessionStore Unit Tests', () => {
  let session;

  beforeEach(() => {
    session = new SessionStore();
  });

  test('should initialize with default values', () => {
    expect(session.sessionId).toBeNull();
    expect(session.user).toBe('');
    expect(session.location).toBe('');
    expect(session.sessionDate).toBe('');
    expect(session.price).toBe(40);
    expect(session.readings).toEqual([]);
  });

  test('should calculate canCreateSession correctly', () => {
    expect(session.canCreateSession).toBeFalsy();
    
    session._user = 'Amanda';
    session._location = 'Test Location';
    session._sessionDate = '2026-01-11';
    session._price = 40;
    
    expect(session.canCreateSession).toBeTruthy();
  });

  test('should calculate sessionPhase correctly', () => {
    expect(session.sessionPhase).toBe('SETUP');
    
    session._user = 'Amanda';
    session._location = 'Test Location';
    session._sessionDate = '2026-01-11';
    session._price = 40;
    
    expect(session.sessionPhase).toBe('READY_TO_CREATE');
    
    session._sessionId = 'test-id';
    
    expect(session.sessionPhase).toBe('ACTIVE');
  });
});
