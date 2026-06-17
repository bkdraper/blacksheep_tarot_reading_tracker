// Auth Module - Google OAuth authentication
class Auth {
    constructor() {
        this._user = null;
        this._userId = null;
        this._userRole = null;
        this._activeUserName = null;
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

    async setActiveUser(userId, userName) {
        if (!this.isAdmin()) return;
        localStorage.removeItem(`readingTracker_${userId}`);
        this._userId = userId;
        this._activeUserName = userName || userId;
        if (window.session) window.session.startOver();
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
            // Clear localStorage on explicit logout
            if (this._userId) localStorage.removeItem(`readingTracker_${this._userId}`);
            this._user = null;
            this._userRole = null;
            this._activeUserName = null;
            this.userId = null;
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
            .maybeSingle();

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
            window.session.promptRestoreSession();
        }
        
        return true;
    }

    toggleProfileMenu() {
        const menu = document.getElementById('menu-user-profile');
        if (menu) {
            const isOpen = menu.style.display === 'block';
            if (isOpen) {
                menu.style.display = 'none';
                document.removeEventListener('click', this._closeProfileMenuHandler);
            } else {
                menu.style.display = 'block';
                // Close on outside click (defer so this click doesn't immediately close it)
                setTimeout(() => {
                    this._closeProfileMenuHandler = (e) => {
                        const profileBtn = document.getElementById('btn-user-profile');
                        if (!menu.contains(e.target) && !profileBtn.contains(e.target)) {
                            menu.style.display = 'none';
                            document.removeEventListener('click', this._closeProfileMenuHandler);
                        }
                    };
                    document.addEventListener('click', this._closeProfileMenuHandler);
                }, 0);
            }
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
            const switchUserItem = document.getElementById('menu-switch-user');
            const impersonatedLabel = document.getElementById('text-impersonated-user');

            if (settingsBtn) settingsBtn.style.setProperty('display', 'flex');
            if (profileBtn) profileBtn.style.setProperty('display', 'flex');
            if (profileName) profileName.textContent = this.getUserName();
            if (loginPrompt) loginPrompt.style.setProperty('display', 'none');
            
            // Show impersonated user label when admin is viewing as another user
            if (impersonatedLabel) {
                const isImpersonating = this.isAdmin() && this._user && this._user.id !== this._userId;
                if (isImpersonating && this._activeUserName) {
                    impersonatedLabel.textContent = `(as ${this._activeUserName})`;
                    impersonatedLabel.style.display = 'inline';
                } else {
                    impersonatedLabel.textContent = '';
                    impersonatedLabel.style.display = 'none';
                }
            }
            
            const avatarUrl = this._user?.user_metadata?.avatar_url;
            if (avatarUrl && profilePic && profileIcon) {
                if (profilePic.src !== avatarUrl) {
                    profilePic.onerror = () => {
                        profilePic.style.display = 'none';
                        profileIcon.style.display = 'block';
                    };
                    profilePic.src = avatarUrl;
                }
                profilePic.style.display = 'block';
                profileIcon.style.display = 'none';
            } else if (profileIcon) {
                profileIcon.style.display = 'block';
                if (profilePic) profilePic.style.display = 'none';
            }

            if (switchUserItem) switchUserItem.style.display = this.isAdmin() ? 'flex' : 'none';
        } else {
            const settingsBtn = document.getElementById('btn-app-settings');
            const profileBtn = document.getElementById('btn-user-profile');
            const loginPrompt = document.getElementById('container-login-prompt');
            const switchUserItem = document.getElementById('menu-switch-user');
            
            if (settingsBtn) settingsBtn.style.setProperty('display', 'none');
            if (profileBtn) profileBtn.style.setProperty('display', 'none');
            if (loginPrompt) loginPrompt.style.removeProperty('display');
            if (switchUserItem) switchUserItem.style.display = 'none';
        }
        
        if (window.session) {
            window.session.updateUI();
        }
    }
}
