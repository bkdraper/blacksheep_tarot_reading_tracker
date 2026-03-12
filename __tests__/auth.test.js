/**
 * @jest-environment jsdom
 */

// Mock DOM elements
document.body.innerHTML = `
  <div id="btn-app-settings"></div>
  <div id="btn-user-profile"></div>
  <div id="text-user-profile-name"></div>
  <div id="event-settings"></div>
  <div id="container-readings-buttons"></div>
  <div id="container-readings-totals"></div>
  <div id="container-readings-list"></div>
  <div id="container-login-prompt"></div>
`;

// Mock global functions
global.showSnackbar = jest.fn();

// Load Auth class
const fs = require('fs');
const path = require('path');
const authCode = fs.readFileSync(path.join(__dirname, '..', 'modules', 'auth.js'), 'utf8');
const Auth = eval(`(function() { ${authCode}; return Auth; })()`);

describe('Auth', () => {
  let auth;

  beforeEach(() => {
    jest.clearAllMocks();
    auth = new Auth();
  });

  describe('Initial State', () => {
    test('should initialize with null values', () => {
      expect(auth.userId).toBeNull();
      expect(auth.user).toBeNull();
      expect(auth.userRole).toBeNull();
      expect(auth.isAuthenticated).toBe(false);
    });
  });

  describe('Getters and Setters', () => {
    test('should set and get userId', () => {
      auth._user = { user_metadata: { full_name: 'Test' }, email: 'test@example.com' };
      auth.userId = 'test-id';
      expect(auth.userId).toBe('test-id');
      expect(auth.isAuthenticated).toBe(true);
    });

    test('should set userId to null', () => {
      auth.userId = 'test-id';
      auth.userId = null;
      expect(auth.userId).toBeNull();
      expect(auth.isAuthenticated).toBe(false);
    });

    test('should set user without triggering updateUI', () => {
      const spy = jest.spyOn(auth, 'updateUI');
      auth.user = { user_metadata: { full_name: 'Test' } };
      expect(auth.user.user_metadata.full_name).toBe('Test');
      expect(spy).not.toHaveBeenCalled();
    });

    test('should set userRole without triggering updateUI', () => {
      const spy = jest.spyOn(auth, 'updateUI');
      auth.userRole = 'admin';
      expect(auth.userRole).toBe('admin');
      expect(spy).not.toHaveBeenCalled();
    });

    test('should trigger updateUI when userId changes', () => {
      const spy = jest.spyOn(auth, 'updateUI');
      auth.userId = 'test-id';
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getUserName', () => {
    test('should return "User" when no user', () => {
      expect(auth.getUserName()).toBe('User');
    });

    test('should return full_name when available', () => {
      auth._user = { user_metadata: { full_name: 'John Doe' }, email: 'john@example.com' };
      expect(auth.getUserName()).toBe('John Doe');
    });

    test('should return email when no full_name', () => {
      auth._user = { user_metadata: {}, email: 'john@example.com' };
      expect(auth.getUserName()).toBe('john@example.com');
    });
  });

  describe('isAdmin', () => {
    test('should return false for user role', () => {
      auth._userRole = 'user';
      expect(auth.isAdmin()).toBe(false);
    });

    test('should return true for admin role', () => {
      auth._userRole = 'admin';
      expect(auth.isAdmin()).toBe(true);
    });
  });

  describe('signIn', () => {
    test('should call Supabase signInWithOAuth', async () => {
      global.supabaseClient.auth.signInWithOAuth.mockResolvedValue({ error: null });
      
      await auth.signIn();
      
      expect(global.supabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
    });

    test('should show error snackbar on failure', async () => {
      global.supabaseClient.auth.signInWithOAuth.mockResolvedValue({ 
        error: { message: 'Auth failed' } 
      });
      
      await auth.signIn();
      
      expect(global.showSnackbar).toHaveBeenCalledWith('Sign in failed: Auth failed', 'error');
    });
  });

  describe('signOut', () => {
    test('should clear auth state on success', async () => {
      global.supabaseClient.auth.signOut.mockResolvedValue({ error: null });
      
      auth._user = { user_metadata: { full_name: 'Test' } };
      auth._userRole = 'admin';
      auth.userId = 'test-id';
      
      await auth.signOut();
      
      expect(auth.user).toBeNull();
      expect(auth.userId).toBeNull();
      expect(auth.userRole).toBeNull();
    });

    test('should show error snackbar on failure', async () => {
      global.supabaseClient.auth.signOut.mockResolvedValue({ 
        error: { message: 'Signout failed' } 
      });
      
      await auth.signOut();
      
      expect(global.showSnackbar).toHaveBeenCalledWith('Sign out failed: Signout failed', 'error');
    });
  });

  describe('checkAuth', () => {
    test('should return false when no session', async () => {
      global.supabaseClient.auth.getSession.mockResolvedValue({ 
        data: { session: null } 
      });
      
      const result = await auth.checkAuth();
      
      expect(result).toBe(false);
      expect(auth.userId).toBeNull();
      expect(auth.user).toBeNull();
      expect(auth.userRole).toBeNull();
    });

    test('should set auth state when session exists', async () => {
      global.supabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              user_metadata: { full_name: 'Test User' }
            }
          }
        }
      });
      
      global.supabaseClient.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { role: 'admin' }, error: null })
          })
        }),
        insert: async () => ({ data: null, error: null })
      });
      
      const result = await auth.checkAuth();
      
      expect(result).toBe(true);
      expect(auth.userId).toBe('user-123');
      expect(auth.user.email).toBe('test@example.com');
      expect(auth.userRole).toBe('admin');
    });

    test('should create profile when none exists', async () => {
      const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
      
      global.supabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              user_metadata: {}
            }
          }
        }
      });
      
      global.supabaseClient.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null })
          })
        }),
        insert: insertMock
      });
      
      await auth.checkAuth();
      
      expect(insertMock).toHaveBeenCalledWith({ user_id: 'user-123', role: 'user' });
      expect(auth.userRole).toBe('user');
    });
  });

  describe('updateUI', () => {
    test('should show authenticated UI when logged in', () => {
      auth._user = { user_metadata: { full_name: 'Test User' }, email: 'test@example.com' };
      auth._userId = 'test-id';
      
      auth.updateUI();
      
      expect(document.getElementById('btn-app-settings').style.display).toBe('flex');
      expect(document.getElementById('btn-user-profile').style.display).toBe('flex');
      expect(document.getElementById('text-user-profile-name').textContent).toBe('Test User');
      expect(document.getElementById('container-login-prompt').style.display).toBe('none');
    });

    test('should show unauthenticated UI when logged out', () => {
      auth._userId = null;
      
      auth.updateUI();
      
      expect(document.getElementById('btn-app-settings').style.display).toBe('none');
      expect(document.getElementById('btn-user-profile').style.display).toBe('none');
      expect(document.getElementById('event-settings').style.display).toBe('none');
      expect(document.getElementById('container-login-prompt').style.display).not.toBe('none');
    });

    test('should hide session controls when not authenticated', () => {
      auth._userId = null;
      
      auth.updateUI();
      
      expect(document.getElementById('event-settings').style.display).toBe('none');
      expect(document.getElementById('container-readings-buttons').style.display).toBe('none');
      expect(document.getElementById('container-readings-totals').style.display).toBe('none');
      expect(document.getElementById('container-readings-list').style.display).toBe('none');
    });

    test('should show session controls when authenticated', () => {
      auth._user = { user_metadata: { full_name: 'Test' } };
      auth._userId = 'test-id';
      
      auth.updateUI();
      
      expect(document.getElementById('event-settings').style.display).not.toBe('none');
      expect(document.getElementById('container-readings-buttons').style.display).not.toBe('none');
      expect(document.getElementById('container-readings-totals').style.display).not.toBe('none');
      expect(document.getElementById('container-readings-list').style.display).not.toBe('none');
    });
  });

  describe('Integration with index.html', () => {
    test('should be instantiable', () => {
      const authInstance = new Auth();
      expect(authInstance).toBeInstanceOf(Auth);
    });

    test('should expose required methods', () => {
      expect(typeof auth.signIn).toBe('function');
      expect(typeof auth.signOut).toBe('function');
      expect(typeof auth.checkAuth).toBe('function');
      expect(typeof auth.updateUI).toBe('function');
      expect(typeof auth.getUserName).toBe('function');
      expect(typeof auth.isAdmin).toBe('function');
    });

    test('should expose required getters', () => {
      expect(auth.hasOwnProperty('userId')).toBe(false); // It's a getter
      expect(auth.hasOwnProperty('user')).toBe(false);
      expect(auth.hasOwnProperty('userRole')).toBe(false);
      expect(auth.hasOwnProperty('isAuthenticated')).toBe(false);
    });
  });
});
