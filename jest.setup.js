// Suppress noisy console output from expected error paths
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Polyfill TextEncoder/TextDecoder for JSDOM
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock browser APIs
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

global.navigator.vibrate = jest.fn();

// Mock Supabase - Comprehensive mock to prevent any live DB calls
const mockSupabaseClient = {
  auth: {
    signInWithOAuth: jest.fn(() => Promise.resolve({ error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null } }))
  },
  from: jest.fn((table) => {
    const eqChain = () => ({
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      eq: jest.fn(() => eqChain())
    });
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => eqChain()),
        not: jest.fn(() => Promise.resolve({ data: [], error: null })),
        ilike: jest.fn(() => ({ order: jest.fn(() => Promise.resolve({ data: [], error: null })) })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [{ id: 'mock-id' }], error: null }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
        in: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    };
  })
};

// Mock the Supabase library
global.window = global.window || {};
global.window.supabase = {
  createClient: jest.fn(() => mockSupabaseClient)
};

// Set the mock client globally
global.supabaseClient = mockSupabaseClient;

// Mock Audio Context
global.AudioContext = jest.fn(() => ({
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { setValueAtTime: jest.fn() },
    type: 'square'
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { 
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn()
    }
  })),
  destination: {},
  currentTime: 0
}));

// Mock canvas
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  stroke: jest.fn(),
  fillText: jest.fn(),
  setValueAtTime: jest.fn(),
  imageSmoothingEnabled: false,
  strokeStyle: '',
  lineWidth: 0,
  lineCap: '',
  fillStyle: '',
  font: '',
  textAlign: '',
  textBaseline: ''
}));

// Mock service worker
global.navigator.serviceWorker = {
  register: jest.fn(() => Promise.resolve({
    addEventListener: jest.fn(),
    periodicSync: {
      register: jest.fn(() => Promise.resolve())
    }
  })),
  ready: Promise.resolve({
    showNotification: jest.fn(() => Promise.resolve()),
    periodicSync: {
      register: jest.fn(() => Promise.resolve())
    }
  }),
  addEventListener: jest.fn()
};

// Mock Notification API
global.Notification = {
  permission: 'default',
  requestPermission: jest.fn(() => Promise.resolve('granted'))
};

// Prevent actual network calls
global.fetch = jest.fn(() => Promise.reject(new Error('Network calls are not allowed in tests')));
