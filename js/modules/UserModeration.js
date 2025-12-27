// User Moderation Module
// Handles bans, limits, and user restrictions

class UserModeration {
    constructor() {
        this.BANS_KEY = 'migui_banned_users';
        this.LIMITS_KEY = 'migui_user_limits';
        this.DAILY_COUNT_KEY = 'migui_daily_message_count';
        this.testAsUserMode = false; // When true, admin exemption is disabled for testing
    }

    // Toggle test as user mode
    setTestAsUserMode(enabled) {
        this.testAsUserMode = enabled;
        console.log(`🧪 Test as user mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    isTestAsUserMode() {
        return this.testAsUserMode;
    }

    // Get banned users list
    getBannedUsers() {
        try {
            return JSON.parse(localStorage.getItem(this.BANS_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    // Save banned users list
    saveBannedUsers(bans) {
        localStorage.setItem(this.BANS_KEY, JSON.stringify(bans));
    }

    // Check if current user is banned (by IP or email)
    async isCurrentUserBanned() {
        const bans = this.getBannedUsers();
        if (bans.length === 0) return false;

        // Get current user info
        const profile = localStorage.getItem('migui_user_profile');
        const googleAuth = localStorage.getItem('migui_google_auth');

        let currentEmail = null;
        let currentIP = null;

        if (profile) {
            try {
                const data = JSON.parse(profile);
                currentEmail = data.email;
            } catch (e) { }
        }

        if (googleAuth) {
            try {
                const data = JSON.parse(googleAuth);
                currentEmail = currentEmail || data.email;
            } catch (e) { }
        }

        // Get current IP
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            currentIP = data.ip;
        } catch (e) { }

        // Check if banned
        return bans.some(ban =>
            (ban.ip && ban.ip === currentIP) ||
            (ban.email && currentEmail && ban.email.toLowerCase() === currentEmail.toLowerCase())
        );
    }

    // Ban a user
    banUser(username, email, ip, reason = '') {
        // PROTECT ADMIN: Cannot ban the creator's IP
        const ADMIN_IP = '79.117.235.136';
        if (ip === ADMIN_IP) {
            console.log('⚠️ Cannot ban the admin IP');
            return false;
        }

        const bans = this.getBannedUsers();

        // Check if already banned
        const existingIndex = bans.findIndex(b => b.email === email || b.ip === ip);
        if (existingIndex >= 0) {
            return false; // Already banned
        }

        bans.push({
            username,
            email,
            ip,
            reason,
            bannedAt: new Date().toISOString()
        });

        this.saveBannedUsers(bans);
        return true;
    }

    // Unban a user by index
    unbanUser(index) {
        const bans = this.getBannedUsers();
        if (index >= 0 && index < bans.length) {
            bans.splice(index, 1);
            this.saveBannedUsers(bans);
            return true;
        }
        return false;
    }

    // Unban by email or IP
    unbanByIdentifier(email, ip) {
        const bans = this.getBannedUsers();
        const newBans = bans.filter(b =>
            !(b.email === email || b.ip === ip)
        );
        this.saveBannedUsers(newBans);
        return bans.length !== newBans.length;
    }

    // Get user limits
    getUserLimits() {
        try {
            return JSON.parse(localStorage.getItem(this.LIMITS_KEY)) || {};
        } catch (e) {
            return {};
        }
    }

    // Save user limits
    saveUserLimits(limits) {
        localStorage.setItem(this.LIMITS_KEY, JSON.stringify(limits));
    }

    // Set limit for a user (email is the key)
    setUserLimit(email, limit) {
        const limits = this.getUserLimits();
        if (limit === null || limit === 'unlimited' || limit === 0) {
            delete limits[email]; // No limit
        } else {
            limits[email] = parseInt(limit);
        }
        this.saveUserLimits(limits);
    }

    // Get limit for a specific user
    getUserLimit(email) {
        const limits = this.getUserLimits();
        return limits[email] || null; // null = no limit
    }

    // Get daily message count
    getDailyCount(email) {
        try {
            const counts = JSON.parse(localStorage.getItem(this.DAILY_COUNT_KEY)) || {};
            const today = new Date().toISOString().split('T')[0];

            if (counts.date !== today) {
                // New day, reset counts
                return 0;
            }

            return counts[email] || 0;
        } catch (e) {
            return 0;
        }
    }

    // Increment daily message count
    incrementDailyCount(email) {
        try {
            let counts = JSON.parse(localStorage.getItem(this.DAILY_COUNT_KEY)) || {};
            const today = new Date().toISOString().split('T')[0];

            if (counts.date !== today) {
                // New day, reset all counts
                counts = { date: today };
            }

            counts[email] = (counts[email] || 0) + 1;
            localStorage.setItem(this.DAILY_COUNT_KEY, JSON.stringify(counts));

            return counts[email];
        } catch (e) {
            return 0;
        }
    }

    // Check if user can send message (returns { canSend, remaining, limit })
    canSendMessage(email) {
        // ADMIN EXEMPTION: Creator is never limited (unless in test mode)
        const ADMIN_EMAIL = 'chicopro777xd@gmail.com';
        if (!this.testAsUserMode && email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            return { canSend: true, remaining: 'unlimited', limit: null };
        }

        // Get user-specific limit, or use default of 10 for regular users
        const DEFAULT_LIMIT = 10;
        const userLimit = this.getUserLimit(email);
        const limit = userLimit !== null ? userLimit : DEFAULT_LIMIT;

        const count = this.getDailyCount(email);
        const remaining = limit - count;

        return {
            canSend: remaining > 0,
            remaining: remaining,
            limit: limit
        };
    }
}

// Global instance
const userModeration = new UserModeration();
