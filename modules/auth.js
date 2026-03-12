// Auth Module - Google OAuth authentication
class Auth {
    constructor() {
        this._user = null;
        this._userId = null;
        this._userRole = null;
    }

    get userId() {
        return this._userId;
    }

    set userId(value) {
        this._userId = value;
        this.updateUI();
    }

    get user() {
        return this._user;
    }

    set user(value) {
        this._user = value;
    }

    get userRole() {
        return this._userRole;
    }

    set userRole(value) {
        this._userRole = value;
    }

    get isAuthenticated() {
        return this._userId !== null;
    }

    getUserName() {
        return this._user?.user_metadata?.full_name || this._user?.email || 'User';
    }

    isAdmin() {
        return this._userRole === 'admin';
    }

    async setActiveUser(userId) {
        if (!this.isAdmin()) return;
        this._userId = userId;
        if (window.session) {
            window.session.loadFromStorage();
        }
        this.updateUI();
    }

    async signIn() {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) {
            showSnackbar('Sign in failed: ' + error.message, 'error');
        }
        // Note: OAuth redirects away, checkAuth() runs on return
    }

    async signOut() {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            showSnackbar('Sign out failed: ' + error.message, 'error');
        } else {
            this._user = null;
            this._userRole = null;
            this.userId = null; // Triggers updateUI
            if (window.session) {
                window.session.startOver();
            }
        }
    }

    async checkAuth() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            this._user = null;
            this._userRole = null;
            this.userId = null;
            return false;
        }

        this._user = session.user;
        this._userRole = null;

        const { data: profile } = await supabaseClient
            .from('blacksheep_reading_tracker_user_profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();

        this._userRole = profile?.role || 'user';

        if (!profile) {
            await supabaseClient
                .from('blacksheep_reading_tracker_user_profiles')
                .insert({ 
                    user_id: session.user.id, 
                    role: 'user',
                    user_name: session.user.user_metadata?.full_name || session.user.email
                });
        }

        this.userId = session.user.id;
        
        if (window.session) {
            window.session.loadFromStorage();
        }
        
        return true;
    }

    toggleProfileMenu() {
        const menu = document.getElementById('menu-user-profile');
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
    }

    updateUI() {
        const menu = document.getElementById('menu-user-profile');
        if (menu) menu.style.display = 'none';
        
        if (this.isAuthenticated) {
            const settingsBtn = document.getElementById('btn-app-settings');
            const profileBtn = document.getElementById('btn-user-profile');
            const profileName = document.getElementById('text-user-profile-name');
            const profilePic = document.getElementById('img-user-profile-pic');
            const profileIcon = document.getElementById('icon-user-profile');
            const loginPrompt = document.getElementById('container-login-prompt');
            const userBtn = document.getElementById('btn-session-user');
            
            if (settingsBtn) settingsBtn.style.setProperty('display', 'flex');
            if (profileBtn) profileBtn.style.setProperty('display', 'flex');
            if (profileName) profileName.textContent = this.getUserName();
            if (loginPrompt) loginPrompt.style.setProperty('display', 'none');
            
            const avatarUrl = this._user?.user_metadata?.avatar_url;
            if (avatarUrl && profilePic && profileIcon) {
                profilePic.src = avatarUrl;
                profilePic.style.display = 'block';
                profileIcon.style.display = 'none';
            } else if (profileIcon) {
                profileIcon.style.display = 'block';
                if (profilePic) profilePic.style.display = 'none';
            }

            if (userBtn) {
                userBtn.style.display = this.isAdmin() ? 'block' : 'none';
                if (this.isAdmin()) {
                    userBtn.textContent = this.getUserName();
                }
            }
        } else {
            const settingsBtn = document.getElementById('btn-app-settings');
            const profileBtn = document.getElementById('btn-user-profile');
            const loginPrompt = document.getElementById('container-login-prompt');
            const userBtn = document.getElementById('btn-session-user');
            
            if (settingsBtn) settingsBtn.style.setProperty('display', 'none');
            if (profileBtn) profileBtn.style.setProperty('display', 'none');
            if (loginPrompt) loginPrompt.style.removeProperty('display');
            if (userBtn) userBtn.style.display = 'none';
        }
        
        if (window.session) {
            window.session.updateUI();
        }
    }
}
