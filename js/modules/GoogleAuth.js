// Google Authentication Module
// Handles Google Sign-In and session management

class GoogleAuth {
    constructor() {
        // Google OAuth Client ID
        this.CLIENT_ID = '188932150998-sabslcm9s58vb37vinrgt80hrorb13qe.apps.googleusercontent.com';
        this.STORAGE_KEY = 'migui_google_auth';

        this.user = null;
        this.isAuthenticated = false;
        this.onAuthCallback = null;

        this.init();
    }

    init() {
        // Wait a moment for PersistentStorage to restore any missing data
        // Then check if user is already authenticated
        this.tryLoadSession();

        // Load Google Identity Services script
        this.loadGoogleScript();
    }

    // Try to load session with retry for when PersistentStorage restores data
    tryLoadSession(attempts = 0) {
        const loaded = this.loadSession();

        // If not loaded and we haven't tried too many times, retry
        // This gives PersistentStorage time to restore from IndexedDB
        if (!loaded && attempts < 5) {
            setTimeout(() => this.tryLoadSession(attempts + 1), 200);
        }
    }

    loadGoogleScript() {
        if (document.getElementById('google-gsi-script')) return;

        const script = document.createElement('script');
        script.id = 'google-gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => this.initializeGoogleSignIn();
        document.head.appendChild(script);
    }

    initializeGoogleSignIn() {
        if (!window.google) {
            console.error('Google Identity Services not loaded');
            return;
        }

        google.accounts.id.initialize({
            client_id: this.CLIENT_ID,
            callback: (response) => this.handleCredentialResponse(response),
            auto_select: false,
            cancel_on_tap_outside: true
        });
    }

    handleCredentialResponse(response) {
        try {
            // Decode JWT token
            const payload = this.parseJwt(response.credential);

            this.user = {
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                googleId: payload.sub,
                authenticatedAt: new Date().toISOString()
            };

            this.isAuthenticated = true;
            this.saveSession();

            // Track login to central database
            this.trackLogin();

            console.log('✅ Google Sign-In successful:', this.user.email);

            // Trigger callback
            if (this.onAuthCallback) {
                this.onAuthCallback(this.user);
            }
        } catch (error) {
            console.error('Error processing Google credential:', error);
        }
    }

    async trackLogin() {
        try {
            const backendUrl = this.getBackendUrl();
            await fetch(`${backendUrl}/track/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: this.user.email,
                    name: this.user.name,
                    picture: this.user.picture
                })
            });
        } catch (e) {
            console.warn('Could not track login:', e.message);
        }
    }

    getBackendUrl() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001/api';
        }
        return 'https://migui-ia.onrender.com/api';
    }

    parseJwt(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    }

    saveSession() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.user));
    }

    loadSession() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.user = JSON.parse(stored);
                this.isAuthenticated = true;
                return true;
            }
        } catch (e) {
            console.error('Error loading session:', e);
        }
        return false;
    }

    showSignInButton(containerElement) {
        if (!window.google) {
            // Retry after script loads
            setTimeout(() => this.showSignInButton(containerElement), 500);
            return;
        }

        google.accounts.id.renderButton(containerElement, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 300
        });
    }

    promptSignIn() {
        if (!window.google) {
            console.error('Google Identity Services not ready');
            return;
        }

        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
                console.log('One Tap not displayed:', notification.getNotDisplayedReason());
            }
        });
    }

    signOut() {
        this.user = null;
        this.isAuthenticated = false;
        localStorage.removeItem(this.STORAGE_KEY);

        if (window.google) {
            google.accounts.id.disableAutoSelect();
        }
    }

    getUser() {
        return this.user;
    }

    getEmail() {
        return this.user?.email || null;
    }

    onAuth(callback) {
        this.onAuthCallback = callback;

        // If already authenticated, trigger callback immediately
        if (this.isAuthenticated && this.user) {
            callback(this.user);
        }
    }
}

// Global instance
const googleAuth = new GoogleAuth();
