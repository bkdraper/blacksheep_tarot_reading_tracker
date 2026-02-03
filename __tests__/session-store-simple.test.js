// Mock DOM and globals before importing
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

// Load and execute SessionStore
const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'session-store.js'), 'utf8');
const SessionStore = eval(`(function() { ${code}; return SessionStore; })()`);

describe('SessionStore - Simple', () => {
  test('should create instance', () => {
    const session = new SessionStore();
    expect(session).toBeDefined();
    expect(session.user).toBe('');
  });
});
