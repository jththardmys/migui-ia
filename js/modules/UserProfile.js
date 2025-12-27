// Default avatar SVG as data URI
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='35' r='25' fill='%2310a37f'/%3E%3Ccircle cx='50' cy='110' r='45' fill='%2310a37f'/%3E%3C/svg%3E";

class UserProfile {
    constructor() {
        this.username = null;
        this.email = null;
        this.avatar = DEFAULT_AVATAR;
        this.storageKey = 'migui_user_profile';
    }

    // Check if user profile exists
    hasProfile() {
        return localStorage.getItem(this.storageKey) !== null;
    }

    // Load profile from localStorage
    load() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.username = data.username;
                this.email = data.email || null;
                this.avatar = data.avatar || DEFAULT_AVATAR;
                return true;
            } catch (e) {
                console.error('Error loading profile:', e);
                return false;
            }
        }
        return false;
    }

    // Save profile to localStorage (with optional email from Google)
    save(username, email = null) {
        this.username = username.trim();
        this.email = email;
        this.avatar = DEFAULT_AVATAR;

        const data = {
            username: this.username,
            email: this.email,
            avatar: this.avatar,
            createdAt: new Date().toISOString()
        };

        localStorage.setItem(this.storageKey, JSON.stringify(data));
        return true;
    }

    // Get username
    getUsername() {
        return this.username || 'Usuario';
    }

    // Get email
    getEmail() {
        return this.email || null;
    }

    // Get avatar URL
    getAvatar() {
        return this.avatar || DEFAULT_AVATAR;
    }

    // Get first letter of username for fallback
    getInitial() {
        return this.username ? this.username.charAt(0).toUpperCase() : 'U';
    }
}

// Global instance
const userProfile = new UserProfile();
