// Admin Panel System with Analytics and User Management
// Only the creator can access this panel

class AdminPanel {
    constructor() {
        this.ADMIN_PASSWORD = 'HollowK11';
        this.ADMIN_IP = '79.117.235.136'; // Auto-admin for this IP
        this.STORAGE_KEY = 'migui_admin_auth';
        this.USERS_KEY = 'migui_users_registry';

        this.isAdmin = false;
        this.panel = null;
        this.button = null;
        this.currentTab = 'users';
        this.selectedUser = null;
        this.currentIP = null;
        this.userFilter = ''; // Filter for queries/changes by email
        this.cachedUsers = []; // Cache users from DB for modal access

        this.init();
    }

    async init() {
        // Check if already admin from localStorage
        this.isAdmin = localStorage.getItem(this.STORAGE_KEY) === 'true';

        // Auto-detect admin by IP
        await this.checkAdminIP();

        this.createAdminButton();
        this.registerCurrentUser();

        if (this.isAdmin) {
            this.showAdminButton();
        }
    }

    async checkAdminIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            this.currentIP = data.ip;

            // Auto-grant admin if IP matches
            if (this.currentIP === this.ADMIN_IP) {
                console.log('👑 Admin access granted automatically (IP authorized)');
                this.isAdmin = true;
                localStorage.setItem(this.STORAGE_KEY, 'true');
            }
        } catch (e) {
            console.log('Could not detect IP for auto-admin');
        }
    }

    createAdminButton() {
        this.button = document.createElement('div');
        this.button.id = 'admin-btn';
        this.button.innerHTML = '👑';
        this.button.title = 'Panel de Administrador';
        this.button.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%; display: none; align-items: center; justify-content: center;
            cursor: pointer; font-size: 28px; z-index: 9999;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: transform 0.2s;
        `;
        this.button.addEventListener('mouseenter', () => this.button.style.transform = 'scale(1.1)');
        this.button.addEventListener('mouseleave', () => this.button.style.transform = 'scale(1)');
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePanel();
        });
        document.body.appendChild(this.button);

        // Secret entrance - 5 clicks on "Migui IA" title in less than 5 seconds
        this.setupSecretEntrance();
    }

    setupSecretEntrance() {
        let clickCount = 0;
        let firstClickTime = null;

        const titleElement = document.getElementById('app-title');
        if (!titleElement) {
            // Retry after DOM loads
            setTimeout(() => this.setupSecretEntrance(), 500);
            return;
        }

        titleElement.style.cursor = 'pointer';
        titleElement.addEventListener('click', () => {
            const now = Date.now();

            // Reset if more than 10 seconds since first click (more forgiving)
            if (firstClickTime && (now - firstClickTime) > 10000) {
                clickCount = 0;
                firstClickTime = null;
            }

            // Start counting
            if (clickCount === 0) {
                firstClickTime = now;
            }

            clickCount++;

            // Visual feedback - subtle scale animation
            titleElement.style.transform = 'scale(1.05)';
            setTimeout(() => titleElement.style.transform = 'scale(1)', 100);

            // 5 clicks in less than 10 seconds
            if (clickCount >= 5) {
                clickCount = 0;
                firstClickTime = null;

                if (this.isAdmin) {
                    // Already admin - just toggle the panel
                    this.togglePanel();
                } else {
                    // Not admin - show login prompt
                    this.showLoginPrompt();
                }
            }
        });
    }

    showAdminButton() {
        this.button.style.display = 'flex';
    }
    hideAdminButton() {
        this.button.style.display = 'none';
    }

    showLoginPrompt() {
        const password = prompt('🔐 Contraseña de administrador:');
        if (password === this.ADMIN_PASSWORD) {
            this.isAdmin = true;
            localStorage.setItem(this.STORAGE_KEY, 'true');
            this.showAdminButton();
            showToast('Acceso de administrador concedido', 'success');
        } else if (password !== null) {
            showToast('Contraseña incorrecta', 'error');
        }
    }

    async registerCurrentUser() {
        const profile = localStorage.getItem('migui_user_profile');
        if (!profile) return;
        const userData = JSON.parse(profile);
        const users = this.getUsers();
        const existingIndex = users.findIndex(u => u.username === userData.username);

        let ip = 'N/A';
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            ip = (await response.json()).ip;
        } catch (e) { }

        const userEntry = {
            username: userData.username,
            email: userData.email || 'N/A',
            registeredAt: userData.createdAt || new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            ip: ip,
            visits: 1
        };

        if (existingIndex >= 0) {
            users[existingIndex].lastSeen = userEntry.lastSeen;
            users[existingIndex].ip = ip;
            users[existingIndex].visits = (users[existingIndex].visits || 0) + 1;
            if (userData.email) users[existingIndex].email = userData.email;
        } else {
            users.push(userEntry);
        }
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    }

    getUsers() {
        try { return JSON.parse(localStorage.getItem(this.USERS_KEY)) || []; }
        catch (e) { return []; }
    }

    getBackendUrl() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001/api';
        }
        return 'https://migui-ia.onrender.com/api';
    }

    async fetchUsersFromDB() {
        try {
            const adminEmail = googleAuth?.user?.email || '';
            const response = await fetch(`${this.getBackendUrl()}/admin/users`, {
                headers: { 'X-Admin-Email': adminEmail }
            });
            if (response.ok) {
                const data = await response.json();
                return data.users || [];
            }
        } catch (e) {
            console.warn('Could not fetch users from DB:', e.message);
        }
        return null;
    }

    deleteUser(index) {
        const users = this.getUsers();
        if (index >= 0 && index < users.length) {
            users.splice(index, 1);
            localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
            return true;
        }
        return false;
    }

    formatTimeAgo(dateString) {
        const diffMs = new Date() - new Date(dateString);
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays > 0) return `${diffDays}d`;
        if (diffHours > 0) return `${diffHours}h`;
        if (diffMins > 0) return `${diffMins}m`;
        return 'ahora';
    }

    togglePanel() {
        if (this.panel) this.closePanel();
        else this.openPanel();
    }

    openPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'admin-panel';
        this.panel.style.cssText = `
            position: fixed; bottom: 90px; right: 20px; width: 600px; max-height: 700px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 1px solid #667eea; border-radius: 18px; z-index: 9999;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); overflow: hidden;
        `;
        this.renderPanel();
        document.body.appendChild(this.panel);
    }

    renderPanel() {
        const users = this.getUsers();
        const bans = typeof userModeration !== 'undefined' ? userModeration.getBannedUsers() : [];

        this.panel.innerHTML = `
            <div style="padding: 16px 20px; border-bottom: 1px solid #667eea; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; color: #fff; font-size: 20px;">👑 Admin Panel</h3>
                <button id="close-admin-panel" style="background: none; border: none; color: #888; font-size: 26px; cursor: pointer;">×</button>
            </div>
            
            <div style="display: flex; border-bottom: 1px solid #333;">
                ${['users', 'bans', 'chats', 'stats', 'queries', 'changes'].map(tab => `
                    <button class="admin-tab" data-tab="${tab}" style="flex:1; padding: 14px; 
                        background: ${this.currentTab === tab ? '#667eea22' : 'transparent'}; 
                        border: none; color: ${this.currentTab === tab ? '#667eea' : '#888'}; 
                        cursor: pointer; font-size: 16px;">
                        ${{ users: `👥`, bans: `🚫`, chats: `🗑️`, stats: '📊', queries: '🔍', changes: '📝' }[tab]}
                    </button>
                `).join('')}
            </div>
            
            <div id="admin-content" style="max-height: 520px; overflow-y: auto; padding: 16px;">
                ${this.renderTabContent()}
            </div>
            
            <div style="padding: 12px 16px; border-top: 1px solid #333; display: flex; flex-direction: column; gap: 10px;">
                <button id="admin-test-mode" style="width: 100%; background: ${typeof userModeration !== 'undefined' && userModeration.isTestAsUserMode() ? 'rgba(16,163,127,0.3)' : 'rgba(255,165,0,0.2)'}; border: 1px solid ${typeof userModeration !== 'undefined' && userModeration.isTestAsUserMode() ? '#10a37f' : '#ffa500'}; color: ${typeof userModeration !== 'undefined' && userModeration.isTestAsUserMode() ? '#10a37f' : '#ffa500'}; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                    🧪 ${typeof userModeration !== 'undefined' && userModeration.isTestAsUserMode() ? 'Modo Test ACTIVO - Clic para desactivar' : 'Probar como Usuario (sin exención admin)'}
                </button>
                <div style="display: flex; gap: 10px;">
                    <button id="admin-logout" style="flex:1; background: rgba(255,77,77,0.2); border: 1px solid #ff4d4d; color: #ff4d4d; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;">🚪 Salir</button>
                    <button id="admin-refresh" style="flex:1; background: rgba(102,126,234,0.2); border: 1px solid #667eea; color: #667eea; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;">🔄 Actualizar</button>
                </div>
            </div>
        `;

        // Add event listeners after DOM is updated
        setTimeout(() => {
            const closeBtn = document.getElementById('close-admin-panel');
            const logoutBtn = document.getElementById('admin-logout');
            const refreshBtn = document.getElementById('admin-refresh');
            const testModeBtn = document.getElementById('admin-test-mode');

            if (closeBtn) closeBtn.addEventListener('click', () => this.closePanel());
            if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
            if (refreshBtn) refreshBtn.addEventListener('click', () => this.renderPanel());

            if (testModeBtn) testModeBtn.addEventListener('click', () => {
                if (typeof userModeration !== 'undefined') {
                    const newState = !userModeration.isTestAsUserMode();
                    userModeration.setTestAsUserMode(newState);
                    showToast(newState ? '🧪 Modo test activado - Los límites ahora te afectan' : '👑 Modo admin restaurado - Límites desactivados para ti', newState ? 'warning' : 'success');
                    // Refresh limit status in the app
                    if (typeof app !== 'undefined' && app.checkLimitStatus) {
                        app.checkLimitStatus();
                    }
                    this.renderPanel();
                }
            });

            document.querySelectorAll('.admin-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    this.currentTab = e.target.dataset.tab;
                    this.renderPanel();
                });
            });
        }, 0);
    }

    renderTabContent() {
        switch (this.currentTab) {
            case 'users': return this.renderUsersTab();
            case 'bans': return this.renderBansTab();
            case 'chats': return this.renderChatsTab();
            case 'stats': return this.renderStatsTab();
            case 'queries': return this.renderQueriesTab();
            case 'changes': return this.renderChangesTab();
            default: return '';
        }
    }

    renderUsersTab() {
        // Fetch from backend then render
        this.fetchUsersFromDB().then(dbUsers => {
            // Re-query DOM element inside callback (panel may have been recreated)
            const contentDiv = document.querySelector('#admin-content');
            if (!contentDiv) return;

            let users = dbUsers;
            let fromDB = true;

            // Fallback to localStorage if DB unavailable
            if (!users || users.length === 0) {
                users = this.getUsers();
                fromDB = false;
            }

            if (users.length === 0) {
                contentDiv.innerHTML = '<div style="text-align: center; color: #888; padding: 30px; font-size: 16px;">No hay usuarios</div>';
                return;
            }

            const limits = typeof userModeration !== 'undefined' ? userModeration.getUserLimits() : {};
            const bans = typeof userModeration !== 'undefined' ? userModeration.getBannedUsers() : [];

            const html = `
                <div style="margin-bottom: 10px; color: #888; font-size: 12px;">${fromDB ? '📡 Datos desde servidor' : '💾 Datos locales'} (${users.length})</div>
                ${users.map((user, i) => {
                const email = user.email || '';
                const customName = user.customName; // Name they set in AI settings
                const googleName = user.name || user.username || email.split('@')[0];
                const displayName = customName || googleName; // Prefer custom name
                const isBanned = user.isBanned || bans.some(b => b.email === email);
                const limit = user.dailyLimit !== -1 ? user.dailyLimit : limits[email];
                const registeredDate = this.formatDate(user.firstLogin || user.registeredAt);
                const lastSeenDate = this.formatDate(user.lastLogin || user.lastSeen);
                const visits = user.loginCount || user.visits || 1;
                return `
                    <div class="user-card" data-index="${i}" data-email="${email}" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 10px; border: 1px solid ${isBanned ? '#ff4d4d44' : '#667eea22'}; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                            ${user.picture ? `<img src="${user.picture}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid ${isBanned ? '#ff4d4d' : '#10a37f'};">` :
                        `<div style="width: 44px; height: 44px; background: ${isBanned ? '#ff4d4d' : 'linear-gradient(135deg, #10a37f 0%, #0d8a6a 100%)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 18px;">
                                ${isBanned ? '🚫' : displayName.charAt(0).toUpperCase()}
                            </div>`}
                            <div style="flex: 1;">
                                <div style="color: ${isBanned ? '#ff6666' : '#fff'}; font-weight: 600; font-size: 16px;">${displayName} ${customName ? `<span style="color: #667eea; font-size: 11px; font-weight: normal;">(${googleName})</span>` : ''} ${isBanned ? '(Baneado)' : ''}</div>
                                <div style="color: #666; font-size: 13px;">${email}</div>
                            </div>
                            <div style="text-align: right; font-size: 13px;">
                                <div style="color: #888;">${visits} visitas</div>
                                ${limit ? `<div style="color: #ffa500;">${limit} msg/día</div>` : ''}
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px; color: #666; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px;">
                            <div>📅 <span style="color: #10a37f;">Registro:</span> ${registeredDate}</div>
                            <div>🕐 <span style="color: #667eea;">Última vez:</span> ${lastSeenDate}</div>
                            <div>📊 Mensajes: ${user.messageCount || 0}</div>
                            <div>⏱️ Hace: ${this.formatTimeAgo(user.lastLogin || user.lastSeen)}</div>
                        </div>
                    </div>
                `}).join('')}`;

            contentDiv.innerHTML = html;

            // Cache users for modal access
            this.cachedUsers = users;

            // Add click handlers
            document.querySelectorAll('.user-card').forEach(card => {
                card.addEventListener('click', () => this.showUserModal(parseInt(card.dataset.index)));
            });
        }).catch(err => {
            console.error('Error loading users:', err);
            const contentDiv = document.querySelector('#admin-content');
            if (contentDiv) {
                contentDiv.innerHTML = `<div style="text-align: center; color: #ff4d4d; padding: 30px;">Error: ${err.message}</div>`;
            }
        });

        return '<div style="text-align: center; color: #667eea; padding: 30px;">Cargando usuarios...</div>';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'N/A';
        }
    }

    showUserModal(userIndex) {
        // Use cached users from DB fetch, fallback to localStorage
        const users = this.cachedUsers.length > 0 ? this.cachedUsers : this.getUsers();
        const user = users[userIndex];
        if (!user) return;

        // Normalize user fields for DB users
        const googleName = user.name || user.username || user.email?.split('@')[0] || 'Usuario';
        const customName = user.customName; // Name they set in AI settings
        const displayName = customName || googleName;
        const userIP = user.ip || 'No disponible';

        // Get ban/limit status - prefer DB data, fallback to local
        const localBans = typeof userModeration !== 'undefined' ? userModeration.getBannedUsers() : [];
        const isBanned = user.isBanned || localBans.some(b => b.email === user.email);

        // Get limit from DB user first (-1 means no limit), then fallback to local
        let currentLimit = null;
        if (user.dailyLimit !== undefined && user.dailyLimit !== -1) {
            currentLimit = user.dailyLimit;
        } else if (typeof userModeration !== 'undefined') {
            currentLimit = userModeration.getUserLimit(user.email);
        }

        const modal = document.createElement('div');
        modal.id = 'user-modal';
        modal.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
        `;
        modal.innerHTML = `
            <div style="background: #1a1a2e; border: 1px solid #667eea; border-radius: 16px; padding: 24px; width: 500px; max-width: 95%; max-height: 85vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
                    <h3 style="margin: 0; color: #fff; font-size: 20px;">⚙️ ${displayName} ${customName ? `<span style="color: #667eea; font-size: 13px; font-weight: normal;">(${googleName})</span>` : ''}</h3>
                    <button id="close-modal-btn" style="background: none; border: none; color: #888; font-size: 28px; cursor: pointer;">×</button>
                </div>
                
                <div style="background: rgba(0,0,0,0.3); border-radius: 10px; padding: 14px; margin-bottom: 18px; font-size: 14px;">
                    <div style="color: #888;">📧 ${user.email}</div>
                    <div style="color: #888;">🌐 ${userIP}</div>
                    ${customName ? `<div style="color: #667eea; margin-top: 4px;">🏷️ Nombre IA: ${customName}</div>` : ''}
                </div>
                
                <!-- Tabs -->
                <div style="display: flex; gap: 8px; margin-bottom: 18px;">
                    <button class="user-modal-tab active" data-tab="settings" style="flex: 1; padding: 12px; background: #667eea22; border: 1px solid #667eea; color: #667eea; border-radius: 8px; cursor: pointer; font-size: 14px;">⚙️ Ajustes</button>
                    <button class="user-modal-tab" data-tab="queries" style="flex: 1; padding: 12px; background: transparent; border: 1px solid #444; color: #888; border-radius: 8px; cursor: pointer; font-size: 14px;">🔍 Búsquedas</button>
                </div>
                
                <!-- Settings Tab -->
                <div id="settings-tab">
                    <div style="margin-bottom: 18px;">
                        <label style="color: #ccc; font-size: 15px; display: block; margin-bottom: 8px;">📝 Límite mensajes/día:</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="number" id="limit-input" placeholder="Sin límite" value="${currentLimit || ''}" 
                                style="flex: 1; background: #16213e; border: 1px solid #333; color: #fff; padding: 14px; border-radius: 10px; font-size: 16px;">
                            <button id="save-limit-btn" style="background: #10a37f; border: none; color: #fff; padding: 14px 20px; border-radius: 10px; cursor: pointer; font-size: 15px;">Guardar</button>
                        </div>
                    </div>
                    
                    ${user.ip === this.ADMIN_IP ? `
                        <div style="border-top: 1px solid #333; padding-top: 18px;">
                            <div style="background: rgba(102,126,234,0.1); border: 1px solid #667eea44; border-radius: 10px; padding: 20px; text-align: center;">
                                <div style="font-size: 32px; margin-bottom: 8px;">👑</div>
                                <div style="color: #667eea; font-size: 16px; font-weight: 600;">Creador</div>
                                <div style="color: #666; font-size: 14px;">Esta cuenta está protegida</div>
                            </div>
                        </div>
                    ` : `
                        <div style="border-top: 1px solid #333; padding-top: 18px; display: flex; flex-direction: column; gap: 12px;">
                            ${isBanned ? `
                                <button id="unban-btn" style="width: 100%; background: #10a37f; border: none; color: #fff; padding: 14px; border-radius: 10px; cursor: pointer; font-size: 15px;">
                                    ✅ Desbanear usuario
                                </button>
                            ` : `
                                <button id="ban-btn" style="width: 100%; background: #ff4d4d; border: none; color: #fff; padding: 14px; border-radius: 10px; cursor: pointer; font-size: 15px;">
                                    🚫 Banear usuario
                                </button>
                            `}
                            <button id="delete-user-btn" style="width: 100%; background: rgba(255,165,0,0.2); border: 1px solid #ffa500; color: #ffa500; padding: 14px; border-radius: 10px; cursor: pointer; font-size: 15px;">
                                🗑️ Eliminar cuenta (puede volver a registrarse)
                            </button>
                        </div>
                    `}
                </div>
                
                <!-- Queries Tab -->
                <div id="queries-tab" style="display: none;">
                    <div style="max-height: 350px; overflow-y: auto;">
                        ${this.renderUserQueries(user.email)}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('close-modal-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        document.getElementById('save-limit-btn').addEventListener('click', async () => {
            const limit = document.getElementById('limit-input').value;
            const limitValue = limit === '' ? -1 : parseInt(limit);

            // Sync to backend
            try {
                await fetch(`${this.getBackendUrl()}/admin/limit`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Email': googleAuth?.user?.email || ''
                    },
                    body: JSON.stringify({ email: user.email, limit: limitValue })
                });
            } catch (e) {
                console.warn('Could not sync limit to backend:', e.message);
            }

            // Also update local
            if (typeof userModeration !== 'undefined') {
                userModeration.setUserLimit(user.email, limit === '' ? null : parseInt(limit));
            }
            showToast('Límite actualizado', 'success');
            modal.remove();
            this.renderPanel();
        });

        // Only add event listeners if user is NOT the admin (buttons don't exist for admin)
        if (user.ip !== this.ADMIN_IP) {
            if (isBanned) {
                document.getElementById('unban-btn').addEventListener('click', async () => {
                    // Sync to backend
                    try {
                        await fetch(`${this.getBackendUrl()}/admin/ban`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Admin-Email': googleAuth?.user?.email || ''
                            },
                            body: JSON.stringify({ email: user.email, ban: false })
                        });
                    } catch (e) {
                        console.warn('Could not sync unban to backend:', e.message);
                    }

                    if (typeof userModeration !== 'undefined') {
                        userModeration.unbanByIdentifier(user.email, user.ip);
                    }
                    showToast('Usuario desbaneado', 'success');
                    modal.remove();
                    this.renderPanel();
                });
            } else {
                document.getElementById('ban-btn').addEventListener('click', async () => {
                    // Sync to backend
                    try {
                        await fetch(`${this.getBackendUrl()}/admin/ban`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Admin-Email': googleAuth?.user?.email || ''
                            },
                            body: JSON.stringify({ email: user.email, ban: true })
                        });
                    } catch (e) {
                        console.warn('Could not sync ban to backend:', e.message);
                    }

                    if (typeof userModeration !== 'undefined') {
                        const success = userModeration.banUser(username, user.email, user.ip);
                        if (success) {
                            showToast('Usuario baneado correctamente', 'success');
                        } else {
                            showToast('No puedes banearte a ti mismo (admin protegido)', 'warning');
                        }
                    } else {
                        showToast('Usuario baneado correctamente', 'success');
                    }
                    modal.remove();
                    this.renderPanel();
                });
            }

            // Delete user button - works directly without confirm
            document.getElementById('delete-user-btn').addEventListener('click', () => {
                this.deleteUser(userIndex);
                showToast('Cuenta eliminada', 'success');
                modal.remove();
                this.renderPanel();
            });
        }

        // Tab switching
        document.querySelectorAll('.user-modal-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.user-modal-tab').forEach(t => {
                    t.style.background = 'transparent';
                    t.style.border = '1px solid #444';
                    t.style.color = '#888';
                });
                tab.style.background = '#667eea22';
                tab.style.border = '1px solid #667eea';
                tab.style.color = '#667eea';

                const settingsTab = document.getElementById('settings-tab');
                const queriesTab = document.getElementById('queries-tab');

                if (tab.dataset.tab === 'settings') {
                    settingsTab.style.display = 'block';
                    queriesTab.style.display = 'none';
                } else {
                    settingsTab.style.display = 'none';
                    queriesTab.style.display = 'block';
                }
            });
        });
    }

    renderUserQueries(email) {
        // Show loading state first, then fetch async
        setTimeout(async () => {
            const container = document.getElementById('user-queries-container');
            if (!container) return;

            // Try backend first
            try {
                const response = await fetch(`${this.getBackendUrl()}/admin/activity?email=${encodeURIComponent(email)}&limit=30`, {
                    headers: { 'X-Admin-Email': googleAuth?.user?.email || '' }
                });
                if (response.ok) {
                    const data = await response.json();
                    const queries = (data.activity || []).filter(a => a.type === 'query');

                    if (queries.length === 0) {
                        container.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No hay búsquedas registradas</div>';
                        return;
                    }

                    container.innerHTML = queries.map(q => `
                        <div style="background: rgba(255,255,255,0.03); border-radius: 5px; padding: 8px; margin-bottom: 4px; border-left: 2px solid #667eea;">
                            <div style="color: #ccc; font-size: 11px; line-height: 1.3;">${this.escapeHtml(q.query || q.text || '')}</div>
                            <div style="color: #555; font-size: 9px; margin-top: 3px;">
                                ${new Date(q.timestamp || q.time).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    `).join('');
                    return;
                }
            } catch (e) {
                console.warn('Could not fetch queries from backend:', e.message);
            }

            // Fallback to local
            if (typeof activityTracker !== 'undefined') {
                const queries = activityTracker.getQueriesByUser(email, 30);
                if (queries.length === 0) {
                    container.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No hay búsquedas registradas</div>';
                    return;
                }
                container.innerHTML = queries.map(q => `
                    <div style="background: rgba(255,255,255,0.03); border-radius: 5px; padding: 8px; margin-bottom: 4px; border-left: 2px solid #667eea;">
                        <div style="color: #ccc; font-size: 11px; line-height: 1.3;">${this.escapeHtml(q.text)}</div>
                        <div style="color: #555; font-size: 9px; margin-top: 3px;">
                            ${new Date(q.time).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No disponible</div>';
            }
        }, 100);

        return '<div id="user-queries-container"><div style="color: #667eea; text-align: center; padding: 20px;">Cargando búsquedas...</div></div>';
    }

    renderBansTab() {
        if (typeof userModeration === 'undefined') {
            return '<div style="text-align: center; color: #888; padding: 20px;">Sistema no disponible</div>';
        }

        const bans = userModeration.getBannedUsers();
        if (bans.length === 0) {
            return '<div style="text-align: center; color: #888; padding: 20px;">🎉 No hay usuarios baneados</div>';
        }

        setTimeout(() => {
            document.querySelectorAll('.unban-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const index = parseInt(btn.dataset.index);
                    const confirmed = await showConfirm('¿Desbanear este usuario?', 'Confirmar Desbaneo');
                    if (confirmed) {
                        userModeration.unbanUser(index);
                        this.renderPanel();
                    }
                });
            });
        }, 0);

        return bans.map((ban, i) => `
            <div style="background: rgba(255,77,77,0.1); border-radius: 8px; padding: 10px; margin-bottom: 6px; border: 1px solid #ff4d4d44;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <div style="color: #ff6666; font-weight: 600; font-size: 12px;">🚫 ${ban.username}</div>
                    <button class="unban-btn" data-index="${i}" style="background: #10a37f; border: none; color: #fff; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 10px;">Desbanear</button>
                </div>
                <div style="font-size: 9px; color: #888;">
                    <div>📧 ${ban.email}</div>
                    <div>🌐 ${ban.ip}</div>
                    <div>📅 Baneado: ${this.formatTimeAgo(ban.bannedAt)}</div>
                </div>
            </div>
        `).join('');
    }

    renderStatsTab() {
        if (typeof activityTracker === 'undefined') {
            return '<div style="text-align: center; color: #888; padding: 20px;">Tracker no disponible</div>';
        }

        const stats = activityTracker.getStats(7);
        const averages = activityTracker.getAverages(7);
        const maxQ = Math.max(...stats.map(s => s.questions), 1);
        const maxT = Math.max(...stats.map(s => s.totalTimeMinutes), 1);

        return `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px;">
                <div style="background: #667eea22; border: 1px solid #667eea44; border-radius: 6px; padding: 8px; text-align: center;">
                    <div style="color: #667eea; font-size: 18px; font-weight: bold;">${averages.totalQuestions}</div>
                    <div style="color: #888; font-size: 9px;">Total preguntas</div>
                </div>
                <div style="background: #10a37f22; border: 1px solid #10a37f44; border-radius: 6px; padding: 8px; text-align: center;">
                    <div style="color: #10a37f; font-size: 18px; font-weight: bold;">${averages.avgQuestionsPerDay}</div>
                    <div style="color: #888; font-size: 9px;">Media/día</div>
                </div>
                <div style="background: #ffa50022; border: 1px solid #ffa50044; border-radius: 6px; padding: 8px; text-align: center;">
                    <div style="color: #ffa500; font-size: 18px; font-weight: bold;">${averages.totalTimeHours}h</div>
                    <div style="color: #888; font-size: 9px;">Tiempo total</div>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                <div style="color: #888; font-size: 10px; margin-bottom: 8px;">📊 Preguntas/día</div>
                <div style="display: flex; align-items: flex-end; gap: 4px; height: 70px;">
                    ${stats.map(day => `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                            <div style="color: #667eea; font-size: 9px;">${day.questions}</div>
                            <div style="width: 100%; background: linear-gradient(to top, #667eea, #764ba2); border-radius: 3px 3px 0 0; height: ${Math.max((day.questions / maxQ) * 50, 3)}px;"></div>
                            <div style="color: #555; font-size: 8px; margin-top: 2px;">${day.dayName}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); border-radius: 6px; padding: 10px;">
                <div style="color: #888; font-size: 10px; margin-bottom: 8px;">⏱️ Tiempo/día (min)</div>
                <div style="display: flex; align-items: flex-end; gap: 4px; height: 60px;">
                    ${stats.map(day => `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                            <div style="color: #10a37f; font-size: 8px;">${day.totalTimeMinutes}</div>
                            <div style="width: 100%; background: linear-gradient(to top, #10a37f, #0d8a6a); border-radius: 3px 3px 0 0; height: ${Math.max((day.totalTimeMinutes / maxT) * 40, 3)}px;"></div>
                            <div style="color: #555; font-size: 8px; margin-top: 2px;">${day.dayName}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderQueriesTab() {
        if (typeof activityTracker === 'undefined') {
            return '<div style="text-align: center; color: #888; padding: 20px;">Tracker no disponible</div>';
        }

        let queries = activityTracker.getRecentQueries(100);
        const users = this.getUsers();

        // Filter by user if selected
        if (this.userFilter) {
            queries = queries.filter(q => q.email === this.userFilter);
        }

        // Header with filter and clear button
        const headerControls = `
            <div style="display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;">
                <select id="query-filter-select" style="flex: 1; min-width: 150px; background: #16213e; border: 1px solid #333; color: #fff; padding: 6px 10px; border-radius: 5px; font-size: 11px;">
                    <option value="">👥 Todos los usuarios</option>
                    ${users.map(u => `<option value="${u.email}" ${this.userFilter === u.email ? 'selected' : ''}>${u.username}</option>`).join('')}
                </select>
                <button id="clear-queries-btn" style="background: rgba(255,77,77,0.2); border: 1px solid #ff4d4d; color: #ff4d4d; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-size: 10px;">
                    🗑️ Borrar todo
                </button>
            </div>
        `;

        setTimeout(() => {
            // Filter select
            const filterSelect = document.getElementById('query-filter-select');
            if (filterSelect) {
                filterSelect.addEventListener('change', (e) => {
                    this.userFilter = e.target.value;
                    this.renderPanel();
                });
            }

            // Clear button
            const clearBtn = document.getElementById('clear-queries-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    activityTracker.clearAllQueries();
                    showToast('Historial borrado', 'success');
                    this.renderPanel();
                });
            }
        }, 0);

        if (queries.length === 0) {
            return headerControls + '<div style="text-align: center; color: #888; padding: 20px;">No hay búsquedas' + (this.userFilter ? ' para este usuario' : '') + '</div>';
        }

        return headerControls + `<div style="font-size: 10px; color: #888; margin-bottom: 8px;">${queries.length} resultados</div>` + queries.map(q => `
            <div style="background: rgba(255,255,255,0.03); border-radius: 5px; padding: 8px; margin-bottom: 4px; border-left: 2px solid #667eea;">
                <div style="color: #ccc; font-size: 11px; line-height: 1.3;">${this.escapeHtml(q.text)}</div>
                <div style="color: #555; font-size: 9px; margin-top: 3px;">
                    ${q.email ? `<span style="color: #667eea;">${q.email}</span> • ` : ''}
                    ${new Date(q.time).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        `).join('');
    }

    renderChangesTab() {
        // Get profile changes from UserSettings
        let changes = [];
        const users = this.getUsers();

        try {
            changes = JSON.parse(localStorage.getItem('migui_profile_changes')) || [];
            changes = changes.slice(-100).reverse(); // Last 100 changes, newest first
        } catch (e) {
            return '<div style="text-align: center; color: #888; padding: 20px;">Error al cargar cambios</div>';
        }

        // Filter by user if selected
        if (this.userFilter) {
            changes = changes.filter(c => c.email === this.userFilter);
        }

        // Header with filter and clear button
        const headerControls = `
            <div style="display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;">
                <select id="changes-filter-select" style="flex: 1; min-width: 150px; background: #16213e; border: 1px solid #333; color: #fff; padding: 6px 10px; border-radius: 5px; font-size: 11px;">
                    <option value="">👥 Todos los usuarios</option>
                    ${users.map(u => `<option value="${u.email}" ${this.userFilter === u.email ? 'selected' : ''}>${u.username}</option>`).join('')}
                </select>
                <button id="clear-changes-btn" style="background: rgba(255,77,77,0.2); border: 1px solid #ff4d4d; color: #ff4d4d; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-size: 10px;">
                    🗑️ Borrar todo
                </button>
            </div>
        `;

        setTimeout(() => {
            // Filter select
            const filterSelect = document.getElementById('changes-filter-select');
            if (filterSelect) {
                filterSelect.addEventListener('change', (e) => {
                    this.userFilter = e.target.value;
                    this.renderPanel();
                });
            }

            // Clear button
            const clearBtn = document.getElementById('clear-changes-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    localStorage.removeItem('migui_profile_changes');
                    showToast('Historial de cambios borrado', 'success');
                    this.renderPanel();
                });
            }
        }, 0);

        if (changes.length === 0) {
            return headerControls + '<div style="text-align: center; color: #888; padding: 20px;">No hay cambios' + (this.userFilter ? ' para este usuario' : '') + '</div>';
        }

        return headerControls + `<div style="font-size: 10px; color: #888; margin-bottom: 8px;">${changes.length} cambios</div>` + changes.map(change => {
            const date = new Date(change.timestamp).toLocaleString('es-ES', {
                day: '2-digit', month: '2-digit', year: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });

            if (change.type === 'name') {
                return `
                    <div style="background: rgba(102,126,234,0.1); border-radius: 8px; padding: 10px; margin-bottom: 8px; border-left: 3px solid #667eea;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <span style="font-size: 16px;">📝</span>
                            <span style="color: #667eea; font-weight: 600; font-size: 12px;">Cambio de nombre</span>
                        </div>
                        <div style="color: #fff; font-size: 13px; margin-bottom: 4px;">
                            <span style="color: #ff6666; text-decoration: line-through;">${this.escapeHtml(change.oldValue || 'N/A')}</span>
                            <span style="color: #888;"> → </span>
                            <span style="color: #10a37f; font-weight: 600;">${this.escapeHtml(change.newValue || 'N/A')}</span>
                        </div>
                        <div style="color: #888; font-size: 10px;">
                            📧 ${change.email || 'N/A'} • 🕐 ${date}
                        </div>
                    </div>
                `;
            } else if (change.type === 'avatar') {
                const oldAvatar = change.oldAvatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='35' r='25' fill='%23888'/%3E%3Ccircle cx='50' cy='110' r='45' fill='%23888'/%3E%3C/svg%3E";
                const newAvatar = change.newAvatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='35' r='25' fill='%2310a37f'/%3E%3Ccircle cx='50' cy='110' r='45' fill='%2310a37f'/%3E%3C/svg%3E";

                return `
                    <div style="background: rgba(255,165,0,0.1); border-radius: 8px; padding: 10px; margin-bottom: 8px; border-left: 3px solid #ffa500;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="font-size: 16px;">📷</span>
                            <span style="color: #ffa500; font-weight: 600; font-size: 12px;">Cambio de foto</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <div style="text-align: center;">
                                <img src="${oldAvatar}" style="width: 45px; height: 45px; border-radius: 50%; border: 2px solid #ff6666; object-fit: cover;">
                                <div style="color: #888; font-size: 8px; margin-top: 2px;">Anterior</div>
                            </div>
                            <span style="color: #888; font-size: 20px;">→</span>
                            <div style="text-align: center;">
                                <img src="${newAvatar}" style="width: 45px; height: 45px; border-radius: 50%; border: 2px solid #10a37f; object-fit: cover;">
                                <div style="color: #888; font-size: 8px; margin-top: 2px;">Nueva</div>
                            </div>
                        </div>
                        <div style="color: #888; font-size: 10px;">
                            👤 ${this.escapeHtml(change.username || 'N/A')} • 📧 ${change.email || 'N/A'} • 🕐 ${date}
                        </div>
                    </div>
                `;
            }
            return '';
        }).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    closePanel() {
        if (this.panel) { this.panel.remove(); this.panel = null; }
    }

    logout() {
        this.isAdmin = false;
        localStorage.removeItem(this.STORAGE_KEY);
        this.hideAdminButton();
        this.closePanel();
        showToast('Sesión cerrada', 'info');
    }

    // Render deleted chats tab
    renderChatsTab() {
        if (typeof chatManager === 'undefined') {
            return '<div style="text-align: center; color: #888; padding: 20px;">ChatManager no disponible</div>';
        }

        const deletedChats = chatManager.getDeletedChats();
        if (deletedChats.length === 0) {
            return '<div style="text-align: center; color: #888; padding: 20px;">🎉 No hay chats eliminados</div>';
        }

        setTimeout(() => {
            document.querySelectorAll('.deleted-chat-card').forEach(card => {
                card.addEventListener('dblclick', () => {
                    const chatId = card.dataset.chatId;
                    const chat = deletedChats.find(c => c.id === chatId);
                    if (chat) this.showChatViewer(chat);
                });
            });
        }, 0);

        return deletedChats.slice().reverse().map(chat => {
            const deletedDate = new Date(chat.deletedAt).toLocaleString('es-ES', {
                day: '2-digit', month: '2-digit', year: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
            const msgCount = chat.messages ? chat.messages.length : 0;

            return `
                <div class="deleted-chat-card" data-chat-id="${chat.id}" style="background: rgba(255,165,0,0.1); border: 1px solid #ffa50044; border-radius: 8px; padding: 12px; margin-bottom: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,165,0,0.2)'" onmouseout="this.style.background='rgba(255,165,0,0.1)'">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <img src="${chat.userAvatar || ''}" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #ffa500; object-fit: cover;" onerror="this.style.display='none'">
                        <div style="flex: 1;">
                            <div style="color: #ffa500; font-weight: 600; font-size: 13px;">${this.escapeHtml(chat.name)}</div>
                            <div style="color: #888; font-size: 10px;">${chat.userName || 'N/A'} • ${chat.userEmail || 'N/A'}</div>
                        </div>
                        <div style="text-align: right; font-size: 10px; color: #888;">
                            <div>💬 ${msgCount} msgs</div>
                            <div>🗑️ ${deletedDate}</div>
                        </div>
                    </div>
                    <div style="font-size: 10px; color: #666; font-style: italic;">Doble-click para ver chat completo</div>
                </div>
            `;
        }).join('');
    }

    // Show full chat viewer modal
    showChatViewer(chat) {
        const modal = document.createElement('div');
        modal.id = 'chat-viewer-modal';
        modal.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10001;
            display: flex; align-items: center; justify-content: center;
        `;

        const messagesHtml = chat.messages.map(msg => {
            if (msg.type === 'user') {
                return `
                    <div style="background: #667eea22; border-left: 3px solid #667eea; border-radius: 8px; padding: 10px; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <img src="${chat.userAvatar || ''}" style="width: 24px; height: 24px; border-radius: 50%;" onerror="this.style.display='none'">
                            <span style="color: #667eea; font-weight: 600; font-size: 12px;">${this.escapeHtml(chat.userName || 'Usuario')}</span>
                            <span style="color: #555; font-size: 9px;">${new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style="color: #ccc; font-size: 13px;">${msg.html || this.escapeHtml(msg.content)}</div>
                    </div>
                `;
            } else {
                return `
                    <div style="background: #10a37f22; border-left: 3px solid #10a37f; border-radius: 8px; padding: 10px; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <span style="font-size: 16px;">🤖</span>
                            <span style="color: #10a37f; font-weight: 600; font-size: 12px;">Migui</span>
                            <span style="color: #555; font-size: 9px;">${new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style="color: #ccc; font-size: 13px; line-height: 1.4;">${this.escapeHtml(msg.content).substring(0, 500)}${msg.content.length > 500 ? '...' : ''}</div>
                    </div>
                `;
            }
        }).join('');

        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 1px solid #667eea; border-radius: 12px; width: 600px; max-width: 95%; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
                <div style="padding: 15px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0; color: #fff; font-size: 16px;">💬 ${this.escapeHtml(chat.name)}</h3>
                        <div style="color: #888; font-size: 11px; margin-top: 3px;">${chat.userName} • ${chat.userEmail}</div>
                    </div>
                    <button id="close-chat-viewer" style="background: none; border: none; color: #888; font-size: 24px; cursor: pointer; padding: 5px;">×</button>
                </div>
                <div style="flex: 1; overflow-y: auto; padding: 15px;">
                    ${messagesHtml || '<div style="text-align: center; color: #666; padding: 20px;">Sin mensajes</div>'}
                </div>
                <div style="padding: 10px; border-top: 1px solid #333; background: rgba(0,0,0,0.2);">
                    <div style="display: flex; gap: 15px; font-size: 10px; color: #666;">
                        <span>📅 Creado: ${new Date(chat.createdAt).toLocaleDateString('es-ES')}</span>
                        <span>🗑️ Eliminado: ${new Date(chat.deletedAt).toLocaleDateString('es-ES')}</span>
                        <span>💬 ${chat.messages.length} mensajes</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('close-chat-viewer').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    // Safe reset - clear temporary data but preserve accounts
    safeReset() {
        // Keys to PRESERVE (user accounts and important data)
        const preserveKeys = [
            'migui_users_registry',      // User accounts
            'migui_user_profile',        // Current user profile
            'migui_google_auth',         // Google authentication
            'migui_admin_auth',          // Admin authentication
            'migui_user_bans',           // Ban list
            'migui_user_limits',         // User message limits
            'migui_profile_changes',     // Profile change history
            'migui_bg_color'             // User's preferred background color
        ];

        // Keys to DELETE (temporary/resettable data)
        const deleteKeys = [
            'migui_api_exhausted',
            'migui_current_api_index',
            'migui_api_reset_time',
            'migui_chats',
            'migui_deleted_chats',
            'migui_current_chat',
            'migui_daily_counts',
            'migui_user_activity'
        ];

        // Delete only the temporary keys
        deleteKeys.forEach(key => {
            localStorage.removeItem(key);
        });

        console.log('✅ Reset seguro completado:');
        console.log('   - APIs reseteadas');
        console.log('   - Chats borrados');
        console.log('   - Cuentas preservadas');

        showToast('Reset completado - Cuentas preservadas', 'success');

        // Reload to apply changes
        setTimeout(() => location.reload(), 1000);
    }
}

let adminPanel;
window.addEventListener('load', () => { adminPanel = new AdminPanel(); });

// Global helper function for console use
window.miguiReset = function () {
    console.log('🔧 Reset Seguro de Migui IA');
    console.log('============================');

    // Keys to preserve
    const preserveKeys = [
        'migui_users_registry',
        'migui_user_profile',
        'migui_google_auth',
        'migui_admin_auth',
        'migui_user_bans',
        'migui_user_limits',
        'migui_profile_changes',
        'migui_bg_color'
    ];

    // Save preserved data
    const preserved = {};
    preserveKeys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) preserved[key] = data;
    });

    // Clear all
    localStorage.clear();

    // Restore preserved data
    Object.entries(preserved).forEach(([key, value]) => {
        localStorage.setItem(key, value);
    });

    console.log('✅ Reset completado!');
    console.log('   Datos preservados:', Object.keys(preserved).length, 'claves');
    console.log('   Recargando página...');

    setTimeout(() => location.reload(), 500);
};

// Short alias
window.miReset = window.miguiReset;
