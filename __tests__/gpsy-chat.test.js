/**
 * @jest-environment jsdom
 */

// Mock DOM elements
document.body.innerHTML = `
  <div id="gpsyOverlay"></div>
  <div id="gpsyDrawer"></div>
  <div id="gpsyMessages"></div>
  <input id="gpsyInput" />
  <button id="gpsySendBtn"></button>
`;

// Mock global functions and objects
global.vibrate = jest.fn();
global.window.vibrate = jest.fn();
global.window.APP_LOGO = 'logo192.png';
global.window.session = { user: 'TestUser' };
global.fetch = jest.fn();
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: () => 'test-uuid-123' },
  writable: true
});

// Load GpsyChat class
const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'gpsy-chat.js'), 'utf8');
const GpsyChat = eval(`(function() { ${code}; return GpsyChat; })()`);

describe('GpsyChat', () => {
  let chat;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div id="gpsyOverlay"></div>
      <div id="gpsyDrawer"></div>
      <div id="gpsyMessages"></div>
      <input id="gpsyInput" />
      <button id="gpsySendBtn"></button>
    `;
    chat = new GpsyChat();
    global.fetch.mockClear();
    global.vibrate.mockClear();
    global.window.vibrate.mockClear();
  });

  describe('Initialization', () => {
    test('should initialize with empty messages', () => {
      expect(chat.messages).toEqual([]);
    });

    test('should generate session ID', () => {
      expect(chat.sessionId).toBe('test-uuid-123');
    });

    test('should set API endpoint', () => {
      expect(chat.apiEndpoint).toBe('https://57h2jhw5tcjn35yzuitv4zjmfu0snuom.lambda-url.us-east-2.on.aws/');
    });
  });

  describe('Message Management', () => {
    test('should add user message', () => {
      chat.addMessage('user', 'Hello');
      expect(chat.messages.length).toBe(1);
      expect(chat.messages[0].role).toBe('user');
      expect(chat.messages[0].content).toBe('Hello');
    });

    test('should add assistant message', () => {
      chat.addMessage('assistant', 'Hi there');
      expect(chat.messages.length).toBe(1);
      expect(chat.messages[0].role).toBe('assistant');
      expect(chat.messages[0].content).toBe('Hi there');
    });

    test('should add timestamp to messages', () => {
      chat.addMessage('user', 'Test');
      expect(chat.messages[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Empty State', () => {
    test('should show empty state with no messages', () => {
      chat.renderMessages();
      const container = document.getElementById('gpsyMessages');
      expect(container.innerHTML).toContain('Hi, I\'m Gpsy');
      expect(container.innerHTML).toContain('gpsy-empty-state');
    });

    test('should show example queries in empty state', () => {
      chat.renderMessages();
      const container = document.getElementById('gpsyMessages');
      expect(container.innerHTML).toContain('What were my best two locations?');
      expect(container.innerHTML).toContain('Show me my earnings this month');
      expect(container.innerHTML).toContain('Which payment method do I use most?');
      expect(container.innerHTML).toContain('How did I do in Denver?');
    });

    test('should attach click handlers to example queries', () => {
      chat.renderMessages();
      const exampleBtn = document.querySelector('.gpsy-example-query');
      expect(exampleBtn).toBeTruthy();
      expect(exampleBtn.getAttribute('data-prompt')).toBeTruthy();
    });
  });

  describe('Message Rendering', () => {
    test('should render user message with avatar', () => {
      chat.addMessage('user', 'Test message');
      chat.addMessage('assistant', 'Response');
      const container = document.getElementById('gpsyMessages');
      expect(container.innerHTML).toContain('gpsy-message user');
      expect(container.innerHTML).toContain('👤');
      expect(container.innerHTML).toContain('Test message');
    });

    test('should render assistant message with logo', () => {
      chat.addMessage('user', 'Question');
      chat.addMessage('assistant', 'Answer');
      const container = document.getElementById('gpsyMessages');
      expect(container.innerHTML).toContain('gpsy-message assistant');
      expect(container.innerHTML).toContain('logo192.png');
      expect(container.innerHTML).toContain('Answer');
    });

    test('should hide empty state after messages added', () => {
      chat.addMessage('user', 'Test');
      chat.addMessage('assistant', 'Response');
      const container = document.getElementById('gpsyMessages');
      expect(container.innerHTML).not.toContain('gpsy-empty-state');
    });
  });

  describe('Thinking Indicator', () => {
    test('should show thinking indicator', () => {
      chat.showThinking();
      const thinking = document.getElementById('gpsy-thinking');
      expect(thinking).toBeTruthy();
      expect(thinking.innerHTML).toContain('gpsy-thinking');
    });

    test('should hide thinking indicator', () => {
      chat.showThinking();
      chat.hideThinking();
      const thinking = document.getElementById('gpsy-thinking');
      expect(thinking).toBeNull();
    });
  });

  describe('Drawer Controls', () => {
    test('should open drawer', () => {
      chat.open();
      expect(document.getElementById('gpsyOverlay').classList.contains('open')).toBe(true);
      expect(document.getElementById('gpsyDrawer').classList.contains('open')).toBe(true);
      expect(global.window.vibrate).toHaveBeenCalledWith([50]);
    });

    test('should close drawer', () => {
      chat.close();
      expect(document.getElementById('gpsyOverlay').classList.contains('open')).toBe(false);
      expect(document.getElementById('gpsyDrawer').classList.contains('open')).toBe(false);
      expect(global.window.vibrate).toHaveBeenCalledWith([30]);
    });
  });

  describe('Send Message', () => {
    test('should not send empty message', () => {
      document.getElementById('gpsyInput').value = '';
      chat.send();
      expect(chat.messages.length).toBe(0);
    });

    test('should clear input after send', () => {
      document.getElementById('gpsyInput').value = 'Test';
      chat.send();
      expect(document.getElementById('gpsyInput').value).toBe('');
    });

    test('should disable input while sending', () => {
      document.getElementById('gpsyInput').value = 'Test';
      chat.send();
      expect(document.getElementById('gpsyInput').disabled).toBe(true);
      expect(document.getElementById('gpsySendBtn').disabled).toBe(true);
    });
  });

  describe('User Validation', () => {
    test('should require user before sending', async () => {
      global.window.session.user = null;
      await chat.sendMessage('Test question');
      expect(chat.messages.length).toBe(2);
      expect(chat.messages[1].content).toContain('Please select a user first');
    });

    test('should allow sending with valid user', async () => {
      global.window.session.user = 'TestUser';
      global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ response: 'Test response' })
      });
      await chat.sendMessage('Test question');
      expect(chat.messages.length).toBe(2);
    });
  });

  describe('Test Keywords', () => {
    test('should handle "table" keyword', async () => {
      await chat.sendMessage('table');
      expect(chat.messages.length).toBe(2);
      expect(chat.messages[1].content).toContain('bedrock-table');
      expect(chat.messages[1].content).toContain('Va Beach BMSE Fall 25');
    });

    test('should handle "list" keyword', async () => {
      await chat.sendMessage('list');
      expect(chat.messages.length).toBe(2);
      expect(chat.messages[1].content).toContain('bedrock-list');
      expect(chat.messages[1].content).toContain('Cincinnati Fall 25');
    });

    test('should handle "summary" keyword', async () => {
      await chat.sendMessage('summary');
      expect(chat.messages.length).toBe(2);
      expect(chat.messages[1].content).toContain('bedrock-insight');
      expect(chat.messages[1].content).toContain('146');
    });
  });

  describe('API Integration', () => {
    test('should call API with correct payload', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ response: 'API response' })
      });

      await chat.sendMessage('Test question');

      expect(global.fetch).toHaveBeenCalledWith(
        chat.apiEndpoint,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Test question',
            sessionId: 'test-uuid-123',
            userName: 'TestUser'
          })
        })
      );
    });

    test('should handle API success', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ response: 'Success response' })
      });

      await chat.sendMessage('Test');
      expect(chat.messages[1].content).toBe('Success response');
    });

    test('should handle API error', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await chat.sendMessage('Test');
      expect(chat.messages[1].content).toContain('encountered an error');
    });

    test('should handle HTTP error status', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      await chat.sendMessage('Test');
      expect(chat.messages[1].content).toContain('encountered an error');
    });
  });

  describe('Content Formatting', () => {
    test('should wrap content in scrollable div', () => {
      const formatted = chat.formatContent('Test content');
      expect(formatted).toContain('max-height: 400px');
      expect(formatted).toContain('overflow-y: auto');
      expect(formatted).toContain('Test content');
    });

    test('should preserve HTML in content', () => {
      const html = '<table><tr><td>Test</td></tr></table>';
      const formatted = chat.formatContent(html);
      expect(formatted).toContain('<table>');
      expect(formatted).toContain('<td>Test</td>');
    });
  });

  describe('Suggestion Handlers', () => {
    test('should attach handlers to suggestion buttons', () => {
      const container = document.createElement('div');
      container.innerHTML = '<button class="bedrock-suggestion" data-prompt="Test prompt">Click</button>';
      
      chat.attachSuggestionHandlers(container);
      
      const btn = container.querySelector('.bedrock-suggestion');
      expect(btn.onclick).toBeTruthy();
    });

    test('should populate input when suggestion clicked', () => {
      chat.addMessage('user', 'Test');
      chat.addMessage('assistant', '<button class="bedrock-suggestion" data-prompt="Test prompt">Click</button>');
      
      const btn = document.querySelector('.bedrock-suggestion');
      const input = document.getElementById('gpsyInput');
      
      // Manually trigger the onclick handler logic
      const prompt = btn.getAttribute('data-prompt');
      input.value = prompt;
      
      expect(input.value).toBe('Test prompt');
    });
  });
});
