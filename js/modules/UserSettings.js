// User Settings Module
// Handles user profile settings, stats display, and profile changes

class UserSettings {
    constructor() {
        this.CHANGES_LOG_KEY = 'migui_profile_changes';
        this.modal = null;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        setTimeout(() => this.setupSettingsButton(), 500);
    }

    setupSettingsButton() {
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
    }

    showSettings() {
        // Get user stats
        const profile = this.getProfileData();
        const stats = this.getUserStats();

        this.modal = document.createElement('div');
        this.modal.id = 'settings-modal';
        this.modal.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif;
        `;

        this.modal.innerHTML = `
            <div id="settings-modal-content" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 1px solid #667eea; border-radius: 16px; width: 450px; max-width: 95%; max-height: 85vh; overflow-y: auto;">
                <!-- Header -->
                <div style="padding: 20px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; color: #fff; font-size: 18px;">⚙️ Ajustes</h2>
                    <button id="close-settings" style="background: none; border: none; color: #888; font-size: 32px; cursor: pointer; line-height: 1; padding: 5px 10px;">&times;</button>
                </div>
                
                <!-- Profile Section -->
                <div style="padding: 20px; border-bottom: 1px solid #333;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                        <div style="position: relative;">
                            <img id="settings-avatar" src="${profile.avatar}" style="width: 70px; height: 70px; border-radius: 50%; border: 3px solid #667eea; object-fit: cover;">
                            <button id="change-avatar-btn" style="position: absolute; bottom: -5px; right: -5px; width: 28px; height: 28px; background: #667eea; border: none; border-radius: 50%; cursor: pointer; font-size: 12px;" title="Cambiar foto">📷</button>
                            <input type="file" id="avatar-file-input" accept="image/*" style="display: none;">
                        </div>
                        <div style="flex: 1;">
                            <div style="color: #fff; font-size: 18px; font-weight: 600; margin-bottom: 4px;">${profile.username}</div>
                            <div style="color: #888; font-size: 12px;">${profile.email || 'Sin email'}</div>
                        </div>
                    </div>
                    
                    <!-- Change Name -->
                    <div style="margin-bottom: 15px;">
                        <label style="color: #ccc; font-size: 12px; display: block; margin-bottom: 6px;">📝 Cambiar nombre:</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="new-username-input" value="${profile.username}" 
                                style="flex: 1; background: #16213e; border: 1px solid #333; color: #fff; padding: 10px 12px; border-radius: 8px; font-size: 14px;">
                            <button id="save-name-btn" style="background: #10a37f; border: none; color: #fff; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 13px;">Guardar</button>
                        </div>
                    </div>
                </div>
                
                <!-- Customization Section -->
                <div style="padding: 20px; border-bottom: 1px solid #333;">
                    <h3 style="margin: 0 0 15px 0; color: #fff; font-size: 14px;">🎨 Personalización</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="color: #ccc; font-size: 12px; display: block; margin-bottom: 10px;">Color del fondo:</label>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="position: relative;">
                                <input type="color" id="sidebar-color-picker" value="${this.getSavedSidebarColor()}" 
                                    style="width: 55px; height: 55px; border: none; border-radius: 50%; cursor: pointer; background: transparent; padding: 0;">
                                <div style="position: absolute; inset: 0; border-radius: 50%; border: 3px solid #667eea; pointer-events: none;"></div>
                            </div>
                            <button id="save-color-btn" style="background: linear-gradient(135deg, #667eea, #764ba2); border: none; color: #fff; padding: 12px 20px; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 600;">💾 Guardar</button>
                            <div style="flex: 1;">
                                <div style="color: #fff; font-size: 12px;">Color: <span id="current-color-hex" style="font-family: monospace; color: #667eea;">${this.getSavedSidebarColor()}</span></div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="color: #888; font-size: 11px; display: block; margin-bottom: 8px;">Colores rápidos:</label>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <button class="preset-color-btn" data-color="#667eea" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #888; cursor: pointer; background: linear-gradient(135deg, #667eea, #764ba2);" title="Azul violeta"></button>
                            <button class="preset-color-btn" data-color="#10a37f" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #888; cursor: pointer; background: linear-gradient(135deg, #10a37f, #059669);" title="Verde esmeralda"></button>
                            <button class="preset-color-btn" data-color="#ef4444" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #888; cursor: pointer; background: linear-gradient(135deg, #ef4444, #dc2626);" title="Rojo brillante"></button>
                            <button class="preset-color-btn" data-color="#f59e0b" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #888; cursor: pointer; background: linear-gradient(135deg, #f59e0b, #d97706);" title="Naranja"></button>
                            <button class="preset-color-btn" data-color="#8b5cf6" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #888; cursor: pointer; background: linear-gradient(135deg, #8b5cf6, #7c3aed);" title="Púrpura"></button>
                            <button class="preset-color-btn" data-color="#ec4899" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #888; cursor: pointer; background: linear-gradient(135deg, #ec4899, #db2777);" title="Rosa"></button>
                            <button class="preset-color-btn" data-color="#06b6d4" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #888; cursor: pointer; background: linear-gradient(135deg, #06b6d4, #0891b2);" title="Cian"></button>
                            <button class="preset-color-btn" data-color="#1a1a2e" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #888; cursor: pointer; background: #1a1a2e;" title="Oscuro (default)"></button>
                        </div>
                    </div>
                    
                    <button id="reset-color-btn" style="background: #333; border: 1px solid #444; color: #888; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 12px;">🔄 Restaurar original</button>
                </div>
                
                <!-- Stats Section -->
                <div style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #fff; font-size: 14px;">📊 Tu actividad</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div style="background: rgba(102,126,234,0.1); border: 1px solid #667eea44; border-radius: 10px; padding: 15px; text-align: center;">
                            <div style="font-size: 24px; color: #667eea; font-weight: 700;">${stats.totalQuestions}</div>
                            <div style="color: #888; font-size: 11px;">Preguntas</div>
                        </div>
                        <div style="background: rgba(16,163,127,0.1); border: 1px solid #10a37f44; border-radius: 10px; padding: 15px; text-align: center;">
                            <div style="font-size: 24px; color: #10a37f; font-weight: 700;">${stats.totalTimeFormatted}</div>
                            <div style="color: #888; font-size: 11px;">Tiempo total</div>
                        </div>
                        <div style="background: rgba(255,165,0,0.1); border: 1px solid #ffa50044; border-radius: 10px; padding: 15px; text-align: center;">
                            <div style="font-size: 24px; color: #ffa500; font-weight: 700;">${stats.avgPerDay}</div>
                            <div style="color: #888; font-size: 11px;">Preguntas/día</div>
                        </div>
                        <div style="background: rgba(255,77,77,0.1); border: 1px solid #ff4d4d44; border-radius: 10px; padding: 15px; text-align: center;">
                            <div style="font-size: 24px; color: #ff6666; font-weight: 700;">${stats.daysActive}</div>
                            <div style="color: #888; font-size: 11px;">Días activo</div>
                        </div>
                    </div>
                    
                    <!-- Account Info -->
                    <div style="margin-top: 20px; background: rgba(0,0,0,0.3); border-radius: 10px; padding: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #888; font-size: 12px;">📅 Cuenta creada:</span>
                            <span style="color: #fff; font-size: 12px;">${profile.createdAtFormatted}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #888; font-size: 12px;">📧 Email:</span>
                            <span style="color: #fff; font-size: 12px;">${profile.email || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Backup Section -->
                <div style="padding: 20px; border-top: 1px solid #333;">
                    <h3 style="margin: 0 0 15px 0; color: #fff; font-size: 14px;">💾 Respaldo de datos</h3>
                    <p style="color: #888; font-size: 11px; margin-bottom: 15px;">
                        Exporta tus datos para hacer una copia de seguridad. Incluye: perfil, chats, configuraciones y todo el historial.
                    </p>
                    
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button id="export-data-btn" style="flex: 1; background: linear-gradient(135deg, #10a37f, #059669); border: none; color: #fff; padding: 12px 16px; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 600;">
                            📥 Exportar mis datos
                        </button>
                        <button id="import-data-btn" style="flex: 1; background: linear-gradient(135deg, #667eea, #764ba2); border: none; color: #fff; padding: 12px 16px; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 600;">
                            📤 Importar datos
                        </button>
                    </div>
                    
                    <div style="margin-top: 12px; background: rgba(255,165,0,0.1); border: 1px solid #ffa50044; border-radius: 8px; padding: 10px;">
                        <div style="color: #ffa500; font-size: 11px; display: flex; align-items: center; gap: 6px;">
                            <span>⚠️</span>
                            <span>Usa el backup si limpias la caché del navegador o cambias de dispositivo.</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.setupModalEvents();
    }

    setupModalEvents() {
        // Close ONLY with X button
        document.getElementById('close-settings').addEventListener('click', () => this.closeSettings());

        // Change avatar button
        document.getElementById('change-avatar-btn').addEventListener('click', () => {
            document.getElementById('avatar-file-input').click();
        });

        // Avatar file selected
        document.getElementById('avatar-file-input').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.changeAvatar(e.target.files[0]);
            }
        });

        // Save name button
        document.getElementById('save-name-btn').addEventListener('click', () => {
            const newName = document.getElementById('new-username-input').value.trim();
            if (newName.length > 0) {
                this.changeName(newName);
            }
        });

        // Color picker - only update HEX display (NO preview)
        const colorPicker = document.getElementById('sidebar-color-picker');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                document.getElementById('current-color-hex').textContent = e.target.value;
            });
        }

        // SAVE COLOR BUTTON - Apply and save
        document.getElementById('save-color-btn').addEventListener('click', () => {
            const color = document.getElementById('sidebar-color-picker').value;
            this.applyBackgroundColor(color, true);
            this.saveBackgroundColor(color);
            showToast('Color guardado correctamente', 'success');
        });

        // Preset color buttons - only update picker (NO preview)
        document.querySelectorAll('.preset-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.getAttribute('data-color');
                document.getElementById('sidebar-color-picker').value = color;
                document.getElementById('current-color-hex').textContent = color;
            });
        });

        // Reset color button - apply immediately (this is intentional)
        document.getElementById('reset-color-btn').addEventListener('click', () => {
            const defaultColor = '#1a1a2e';
            this.applyBackgroundColor(defaultColor, true);
            this.saveBackgroundColor(defaultColor);
            document.getElementById('sidebar-color-picker').value = defaultColor;
            document.getElementById('current-color-hex').textContent = defaultColor;
            showToast('Color restaurado', 'info');
        });

        // Export data button
        document.getElementById('export-data-btn').addEventListener('click', () => {
            if (typeof persistentStorage !== 'undefined') {
                persistentStorage.exportData();
            } else {
                showToast('Sistema de backup no disponible', 'error');
            }
        });

        // Import data button
        document.getElementById('import-data-btn').addEventListener('click', () => {
            if (typeof persistentStorage !== 'undefined') {
                persistentStorage.showImportDialog();
            } else {
                showToast('Sistema de backup no disponible', 'error');
            }
        });
    }

    // Get saved background color from localStorage
    getSavedSidebarColor() {
        return localStorage.getItem('migui_bg_color') || '#1a1a2e';
    }

    // Save background color to localStorage
    saveBackgroundColor(color) {
        localStorage.setItem('migui_bg_color', color);
    }

    // Apply background color to the main chat area (desaturated, subtle gradient)
    applyBackgroundColor(color, includeMessages = true) {
        // Desaturate and darken the color significantly for a subtle look
        const subtleColor = this.desaturateColor(color, 70); // 70% less saturation
        const darkBase = this.darkenColor(subtleColor, 40);   // Very dark base
        const midColor = this.darkenColor(subtleColor, 25);   // Mid-dark

        // Apply to main chat area with smooth gradient
        const chatArea = document.querySelector('.chat-area');
        if (chatArea) {
            chatArea.style.background = `linear-gradient(135deg, ${darkBase} 0%, ${midColor} 50%, ${subtleColor} 100%)`;
        }

        // Sidebar with vertical gradient
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            const sidebarDark = this.darkenColor(subtleColor, 50);
            sidebar.style.background = `linear-gradient(180deg, ${sidebarDark} 0%, ${midColor} 100%)`;
        }
    }

    // Helper function to desaturate a hex color (mix with gray)
    desaturateColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        let R = (num >> 16);
        let G = ((num >> 8) & 0x00FF);
        let B = (num & 0x0000FF);

        // Calculate luminance (gray value)
        const gray = Math.round(R * 0.3 + G * 0.59 + B * 0.11);

        // Mix with gray based on percent
        const factor = percent / 100;
        R = Math.round(R + (gray - R) * factor);
        G = Math.round(G + (gray - G) * factor);
        B = Math.round(B + (gray - B) * factor);

        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    // Helper function to lighten a hex color
    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    // Helper function to darken a hex color
    darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    // Apply saved color on page load (desaturated, subtle)
    static applySavedColor() {
        const savedColor = localStorage.getItem('migui_bg_color');
        if (savedColor && savedColor !== '#1a1a2e') {
            // Desaturate helper (inline for static context)
            const desaturate = (hex, percent) => {
                const num = parseInt(hex.replace('#', ''), 16);
                let R = (num >> 16);
                let G = ((num >> 8) & 0x00FF);
                let B = (num & 0x0000FF);
                const gray = Math.round(R * 0.3 + G * 0.59 + B * 0.11);
                const factor = percent / 100;
                R = Math.round(R + (gray - R) * factor);
                G = Math.round(G + (gray - G) * factor);
                B = Math.round(B + (gray - B) * factor);
                return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
            };

            const darken = (hex, percent) => {
                const num = parseInt(hex.replace('#', ''), 16);
                const amt = Math.round(2.55 * percent);
                const R = Math.max(0, (num >> 16) - amt);
                const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
                const B = Math.max(0, (num & 0x0000FF) - amt);
                return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
            };

            const subtleColor = desaturate(savedColor, 70);
            const darkBase = darken(subtleColor, 40);
            const midColor = darken(subtleColor, 25);

            const chatArea = document.querySelector('.chat-area');
            if (chatArea) {
                chatArea.style.background = `linear-gradient(135deg, ${darkBase} 0%, ${midColor} 50%, ${subtleColor} 100%)`;
            }

            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                const sidebarDark = darken(subtleColor, 50);
                sidebar.style.background = `linear-gradient(180deg, ${sidebarDark} 0%, ${midColor} 100%)`;
            }
        }
    }

    closeSettings() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }

    getProfileData() {
        try {
            const data = JSON.parse(localStorage.getItem('migui_user_profile')) || {};
            const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();

            return {
                username: data.username || 'Usuario',
                email: data.email || null,
                avatar: data.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='35' r='25' fill='%2310a37f'/%3E%3Ccircle cx='50' cy='110' r='45' fill='%2310a37f'/%3E%3C/svg%3E",
                createdAt: data.createdAt,
                createdAtFormatted: createdAt.toLocaleDateString('es-ES', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                })
            };
        } catch (e) {
            return { username: 'Usuario', email: null, avatar: null, createdAtFormatted: 'N/A' };
        }
    }

    getUserStats() {
        try {
            const activity = JSON.parse(localStorage.getItem('migui_user_activity')) || {};
            let totalQuestions = 0;
            let totalTimeMs = 0;
            let daysActive = 0;

            for (const date in activity) {
                if (activity[date].questions > 0) daysActive++;
                totalQuestions += activity[date].questions || 0;
                totalTimeMs += activity[date].totalTime || 0;
            }

            const totalHours = totalTimeMs / (1000 * 60 * 60);
            const totalMinutes = totalTimeMs / (1000 * 60);

            return {
                totalQuestions,
                totalTimeFormatted: totalHours >= 1 ? `${totalHours.toFixed(1)}h` : `${Math.round(totalMinutes)}m`,
                avgPerDay: daysActive > 0 ? (totalQuestions / daysActive).toFixed(1) : '0',
                daysActive
            };
        } catch (e) {
            return { totalQuestions: 0, totalTimeFormatted: '0m', avgPerDay: '0', daysActive: 0 };
        }
    }

    changeName(newName) {
        const oldData = JSON.parse(localStorage.getItem('migui_user_profile')) || {};
        const oldName = oldData.username;
        const email = oldData.email || 'N/A';

        // Update profile
        oldData.username = newName;
        localStorage.setItem('migui_user_profile', JSON.stringify(oldData));

        // Update userProfile instance
        if (typeof userProfile !== 'undefined') {
            userProfile.username = newName;
        }

        // Update UI
        document.getElementById('sidebar-username').textContent = newName;

        // Log the change for admin with full details
        this.logProfileChange('name', oldName, newName, null, null);

        // Register in ActivityTracker (shows in queries tab)
        if (typeof activityTracker !== 'undefined') {
            activityTracker.trackQuestion(`📝 [CAMBIO DE NOMBRE] ${oldName} → ${newName} (${email})`);
        }

        // Update admin registry
        this.updateAdminRegistry({ username: newName });

        showToast('Nombre actualizado', 'success');
        this.closeSettings();
    }

    changeAvatar(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Por favor selecciona una imagen', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const newAvatar = e.target.result;
            const oldData = JSON.parse(localStorage.getItem('migui_user_profile')) || {};
            const username = oldData.username || 'Usuario';
            const email = oldData.email || 'N/A';
            const oldAvatar = oldData.avatar || null;

            // Update profile
            oldData.avatar = newAvatar;
            localStorage.setItem('migui_user_profile', JSON.stringify(oldData));

            // Update userProfile instance
            if (typeof userProfile !== 'undefined') {
                userProfile.avatar = newAvatar;
            }

            // Update UI
            document.getElementById('sidebar-avatar').src = newAvatar;
            document.getElementById('settings-avatar').src = newAvatar;

            // Log the change for admin with images
            this.logProfileChange('avatar', oldAvatar, newAvatar, username, email);

            // Register in ActivityTracker (shows in queries tab)
            if (typeof activityTracker !== 'undefined') {
                activityTracker.trackQuestion(`📷 [CAMBIO DE FOTO] ${username} (${email}) cambió su foto de perfil`);
            }

            // Update admin registry
            this.updateAdminRegistry({ avatar: newAvatar });

            showToast('Foto de perfil actualizada', 'success');
        };
        reader.readAsDataURL(file);
    }

    logProfileChange(type, oldValue, newValue, username = null, emailParam = null) {
        try {
            const profileData = this.getProfileData();
            const email = emailParam || profileData.email;
            const user = username || profileData.username;
            const changes = JSON.parse(localStorage.getItem(this.CHANGES_LOG_KEY)) || [];

            const changeEntry = {
                email,
                username: user,
                type, // 'name' or 'avatar'
                timestamp: new Date().toISOString()
            };

            if (type === 'avatar') {
                // Store actual images for avatar changes (limited to last 20 to save space)
                changeEntry.oldAvatar = oldValue;
                changeEntry.newAvatar = newValue;
            } else {
                changeEntry.oldValue = oldValue;
                changeEntry.newValue = newValue;
            }

            changes.push(changeEntry);

            // Keep only last 50 changes (reduced for storage with images)
            if (changes.length > 50) {
                changes.splice(0, changes.length - 50);
            }

            localStorage.setItem(this.CHANGES_LOG_KEY, JSON.stringify(changes));
        } catch (e) {
            console.error('Error logging profile change:', e);
        }
    }

    updateAdminRegistry(updates) {
        try {
            const users = JSON.parse(localStorage.getItem('migui_users_registry')) || [];
            const email = this.getProfileData().email;

            const userIndex = users.findIndex(u => u.email === email);
            if (userIndex >= 0) {
                if (updates.username) users[userIndex].username = updates.username;
                if (updates.avatar) users[userIndex].avatar = updates.avatar;
                users[userIndex].lastModified = new Date().toISOString();
                localStorage.setItem('migui_users_registry', JSON.stringify(users));
            }
        } catch (e) {
            console.error('Error updating admin registry:', e);
        }
    }

    // Get profile changes for admin panel
    static getProfileChanges(limit = 50) {
        try {
            const changes = JSON.parse(localStorage.getItem('migui_profile_changes')) || [];
            return changes.slice(-limit).reverse();
        } catch (e) {
            return [];
        }
    }
}

// Global instance
const userSettings = new UserSettings();
