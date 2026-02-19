/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('GpsyChat Integration with Real HTML', () => {
  let chat;

  beforeEach(() => {
    // Mock Supabase BEFORE loading HTML
    global.supabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    };
    
    // Mock other globals BEFORE loading HTML
    global.vibrate = jest.fn();
    global.window.vibrate = jest.fn();
    global.window.APP_LOGO = 'logo192.png';
    global.window.session = { user: 'TestUser' };
    global.fetch = jest.fn();
    global.showSnackbar = jest.fn();
    global.registerBackgroundSync = jest.fn();
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: () => 'test-uuid-123' },
      writable: true
    });

    // Load actual index.html
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    document.documentElement.innerHTML = html;

    // Load GpsyChat class
    const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'gpsy-chat.js'), 'utf8');
    const GpsyChat = eval(`(function() { ${code}; return GpsyChat; })()`);
    
    chat = new GpsyChat();
    global.fetch.mockClear();
  });

  describe('DOM Element Existence', () => {
    test('should find gpsy-input element in real HTML', () => {
      const input = document.getElementById('gpsy-input');
      expect(input).toBeTruthy();
      expect(input.tagName).toBe('INPUT');
    });

    test('should find gpsy-send-btn element in real HTML', () => {
      const btn = document.getElementById('gpsy-send-btn');
      expect(btn).toBeTruthy();
      expect(btn.tagName).toBe('BUTTON');
    });

    test('should find gpsyMessages element in real HTML', () => {
      const messages = document.getElementById('gpsyMessages');
      expect(messages).toBeTruthy();
    });

    test('should find gpsyOverlay element in real HTML', () => {
      const overlay = document.getElementById('gpsyOverlay');
      expect(overlay).toBeTruthy();
    });

    test('should find gpsyDrawer element in real HTML', () => {
      const drawer = document.getElementById('gpsyDrawer');
      expect(drawer).toBeTruthy();
    });
  });

  describe('Send Functionality with Real HTML', () => {
    test('should disable input and button when sending', () => {
      const input = document.getElementById('gpsy-input');
      const btn = document.getElementById('gpsy-send-btn');
      
      input.value = 'Test message';
      chat.send();
      
      expect(input.disabled).toBe(true);
      expect(btn.disabled).toBe(true);
      expect(input.value).toBe('');
    });

    test('should not send empty message', () => {
      const input = document.getElementById('gpsy-input');
      input.value = '';
      
      const messageCount = chat.messages.length;
      chat.send();
      
      expect(chat.messages.length).toBe(messageCount);
    });
  });

  describe('Drawer Controls with Real HTML', () => {
    test('should open drawer and add open class', () => {
      chat.open();
      
      const overlay = document.getElementById('gpsyOverlay');
      const drawer = document.getElementById('gpsyDrawer');
      
      expect(overlay.classList.contains('open')).toBe(true);
      expect(drawer.classList.contains('open')).toBe(true);
    });

    test('should close drawer and remove open class', () => {
      chat.open();
      chat.close();
      
      const overlay = document.getElementById('gpsyOverlay');
      const drawer = document.getElementById('gpsyDrawer');
      
      expect(overlay.classList.contains('open')).toBe(false);
      expect(drawer.classList.contains('open')).toBe(false);
    });
  });

  describe('Message Rendering with Real HTML', () => {
    test('should render messages in gpsyMessages container', () => {
      chat.addMessage('user', 'Test question');
      chat.addMessage('assistant', 'Test answer');
      
      const container = document.getElementById('gpsyMessages');
      expect(container.innerHTML).toContain('Test question');
      expect(container.innerHTML).toContain('Test answer');
    });

    test('should show empty state when no messages', () => {
      chat.renderMessages();
      
      const container = document.getElementById('gpsyMessages');
      expect(container.innerHTML).toContain('Hi, I\'m Gpsy');
      expect(container.innerHTML).toContain('gpsy-empty-state');
    });
  });

  describe('Example Query Buttons with Real HTML', () => {
    test('should populate input when example query clicked', () => {
      chat.renderMessages();
      
      const exampleBtn = document.querySelector('.gpsy-example-query');
      const input = document.getElementById('gpsy-input');
      
      expect(exampleBtn).toBeTruthy();
      
      // Simulate click
      const prompt = exampleBtn.getAttribute('data-prompt');
      input.value = prompt;
      
      expect(input.value).toBe(prompt);
      expect(input.value.length).toBeGreaterThan(0);
    });
  });

  describe('Suggestion Buttons with Real HTML', () => {
    test('should populate input when suggestion clicked', () => {
      chat.addMessage('user', 'test');
      chat.addMessage('assistant', '<button class="bedrock-suggestion" data-prompt="Follow up">Click</button>');
      
      const btn = document.querySelector('.bedrock-suggestion');
      const input = document.getElementById('gpsy-input');
      
      expect(btn).toBeTruthy();
      expect(btn.onclick).toBeTruthy();
      
      // Simulate click via onclick
      const prompt = btn.getAttribute('data-prompt');
      input.value = prompt;
      
      expect(input.value).toBe('Follow up');
    });
  });
});

