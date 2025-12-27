// Activity Tracker Module
// Tracks user questions, session time, and usage statistics PER USER

class ActivityTracker {
    constructor() {
        this.ACTIVITY_KEY = 'migui_user_activity';
        this.USER_QUERIES_KEY = 'migui_user_queries';
        this.SESSION_KEY = 'migui_current_session';
        this.sessionStart = null;

        this.init();
    }

    init() {
        this.startSession();
        window.addEventListener('beforeunload', () => this.endSession());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.endSession();
            else this.startSession();
        });
    }

    startSession() {
        this.sessionStart = Date.now();
        localStorage.setItem(this.SESSION_KEY, this.sessionStart.toString());
    }

    endSession() {
        if (!this.sessionStart) return;
        const duration = Date.now() - this.sessionStart;
        if (duration > 5000) this.addSessionTime(duration);
        this.sessionStart = null;
        localStorage.removeItem(this.SESSION_KEY);
    }

    getTodayKey() {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    getCurrentUserEmail() {
        try {
            const auth = localStorage.getItem('migui_google_auth');
            if (auth) return JSON.parse(auth).email;
            const profile = localStorage.getItem('migui_user_profile');
            if (profile) return JSON.parse(profile).email;
        } catch (e) { }
        return null;
    }

    getAllActivity() {
        try {
            return JSON.parse(localStorage.getItem(this.ACTIVITY_KEY)) || {};
        } catch (e) { return {}; }
    }

    saveActivity(data) {
        localStorage.setItem(this.ACTIVITY_KEY, JSON.stringify(data));
    }

    // Get all user queries
    getAllUserQueries() {
        try {
            return JSON.parse(localStorage.getItem(this.USER_QUERIES_KEY)) || {};
        } catch (e) { return {}; }
    }

    saveUserQueries(data) {
        localStorage.setItem(this.USER_QUERIES_KEY, JSON.stringify(data));
    }

    addSessionTime(durationMs) {
        const activity = this.getAllActivity();
        const today = this.getTodayKey();
        if (!activity[today]) activity[today] = { totalTime: 0, questions: 0, queries: [] };
        activity[today].totalTime += durationMs;
        this.saveActivity(activity);
    }

    // Track a question with user identifier
    trackQuestion(query) {
        const activity = this.getAllActivity();
        const today = this.getTodayKey();
        const now = new Date().toISOString();
        const email = this.getCurrentUserEmail();

        if (!activity[today]) activity[today] = { totalTime: 0, questions: 0, queries: [] };

        activity[today].questions += 1;
        activity[today].queries.push({
            text: query.substring(0, 200),
            time: now,
            email: email
        });

        if (activity[today].queries.length > 100) {
            activity[today].queries = activity[today].queries.slice(-100);
        }
        this.saveActivity(activity);

        // Also save to per-user queries storage
        if (email) {
            const userQueries = this.getAllUserQueries();
            if (!userQueries[email]) userQueries[email] = [];

            userQueries[email].push({
                text: query.substring(0, 200),
                time: now
            });

            // Keep only last 100 queries per user
            if (userQueries[email].length > 100) {
                userQueries[email] = userQueries[email].slice(-100);
            }
            this.saveUserQueries(userQueries);
        }
    }

    // Get queries for a specific user
    getQueriesByUser(email, limit = 50) {
        const userQueries = this.getAllUserQueries();
        const queries = userQueries[email] || [];
        return queries.slice(-limit).reverse();
    }

    // Get all queries with user info
    getRecentQueriesWithUsers(limit = 30) {
        const stats = this.getStats(7);
        const allQueries = [];

        stats.forEach(day => {
            day.queries.forEach(q => {
                allQueries.push({ ...q, date: day.date });
            });
        });

        return allQueries
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, limit);
    }

    getStats(days = 7) {
        const activity = this.getAllActivity();
        const stats = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const dayData = activity[key] || { totalTime: 0, questions: 0, queries: [] };

            stats.push({
                date: key,
                dayName: date.toLocaleDateString('es-ES', { weekday: 'short' }),
                totalTimeMs: dayData.totalTime,
                totalTimeMinutes: Math.round(dayData.totalTime / (1000 * 60)),
                questions: dayData.questions,
                queries: dayData.queries || []
            });
        }
        return stats;
    }

    getAverages(days = 7) {
        const stats = this.getStats(days);
        const activeDays = stats.filter(s => s.questions > 0).length || 1;
        const totalTime = stats.reduce((sum, s) => sum + s.totalTimeMs, 0);
        const totalQuestions = stats.reduce((sum, s) => sum + s.questions, 0);

        return {
            avgQuestionsPerDay: (totalQuestions / activeDays).toFixed(1),
            totalQuestions: totalQuestions,
            totalTimeHours: (totalTime / (1000 * 60 * 60)).toFixed(1)
        };
    }

    getRecentQueries(limit = 30) {
        const stats = this.getStats(7);
        const allQueries = [];
        stats.forEach(day => {
            day.queries.forEach(q => allQueries.push({ ...q, date: day.date }));
        });
        return allQueries.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, limit);
    }

    // Borrar SOLO los registros de preguntas (queries), sin afectar otros datos
    clearAllQueries() {
        // Limpiar queries del activity tracker manteniendo tiempo y contadores
        const activity = this.getAllActivity();
        for (const date in activity) {
            if (activity[date].queries) {
                activity[date].queries = [];
            }
            activity[date].questions = 0;
        }
        this.saveActivity(activity);

        // Limpiar queries por usuario
        localStorage.setItem(this.USER_QUERIES_KEY, JSON.stringify({}));

        return true;
    }
}

const activityTracker = new ActivityTracker();
