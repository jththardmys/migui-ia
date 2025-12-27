class App {
    constructor() {
        this.brain = new Brain(this);
        this.ui = {
            input: document.getElementById('user-input'),
            sendBtn: document.getElementById('send-btn'),
            attachBtn: document.getElementById('attach-btn'),
            fileInput: document.getElementById('file-input'),
            filePreview: document.getElementById('file-preview'),
            messages: document.getElementById('messages-container'),
            newChatBtn: document.getElementById('new-chat-btn'),
            historyList: document.getElementById('history-list'),
            limitWarning: document.getElementById('limit-warning'),
            inputWrapper: document.querySelector('.input-wrapper'),
            // Google login elements
            googleLoginModal: document.getElementById('google-login-modal'),
            googleSigninButton: document.getElementById('google-signin-button'),
            googleUserName: document.getElementById('google-user-name'),
            // User profile elements
            usernameModal: document.getElementById('username-modal'),
            usernameInput: document.getElementById('username-input'),
            saveUsernameBtn: document.getElementById('save-username-btn'),
            sidebarUsername: document.getElementById('sidebar-username'),
            sidebarAvatar: document.getElementById('sidebar-avatar')
        };

        this.currentFile = null;
        this.isFirstMessage = true; // Track if we need to generate chat name
        this.init();
    }

    async init() {
        // Check if user is banned FIRST before anything else
        const isBanned = await this.checkIfBanned();
        if (isBanned) return; // Stop initialization if banned

        // Setup Google Auth callback
        googleAuth.onAuth((user) => this.handleGoogleAuth(user));

        // Check authentication state - PRIORITIZE saved profile for persistence across restarts
        // This allows users to stay logged in even if Google token expires
        if (userProfile.hasProfile()) {
            // User has saved profile - go straight to chat (no Google re-auth needed)
            console.log('✅ Profile restored from localStorage');
            userProfile.load();
            this.updateUIWithProfile();
            // Initialize ChatManager and load current chat
            this.initChatManager();
            // Ensure both modals are hidden
            this.hideGoogleLoginModal();
            this.hideUsernameModal();

            // Try to refresh Google auth in background (non-blocking)
            if (!googleAuth.isAuthenticated) {
                console.log('ℹ️ Google session expired, but profile exists - continuing without re-auth');
            }
        } else if (googleAuth.isAuthenticated) {
            // Google logged in but no profile saved - need to set username
            this.hideGoogleLoginModal();
            this.showUsernameModal();
            if (googleAuth.user?.name) {
                this.ui.googleUserName.textContent = googleAuth.user.name.split(' ')[0];
                this.ui.usernameInput.value = googleAuth.user.name.split(' ')[0];
            }
        } else {
            // Neither profile nor Google auth - show Google login
            this.showGoogleLoginModal();
        }

        // Setup event listeners
        this.setupEventListeners();

        // Check message limit on load
        this.checkLimitStatus();
    }

    // Check and display limit warning if user has reached their daily limit
    checkLimitStatus() {
        if (typeof userModeration === 'undefined') return;

        const email = googleAuth.getEmail();
        if (!email) return;

        const limitStatus = userModeration.canSendMessage(email);

        if (!limitStatus.canSend && limitStatus.limit !== null) {
            // Show warning and disable input
            this.ui.limitWarning?.classList.remove('hidden');
            this.ui.inputWrapper?.classList.add('disabled');
            this.ui.input.disabled = true;
            this.ui.input.placeholder = 'Límite de mensajes alcanzado';
        } else {
            // Hide warning and enable input
            this.ui.limitWarning?.classList.add('hidden');
            this.ui.inputWrapper?.classList.remove('disabled');
            this.ui.input.disabled = false;
            this.ui.input.placeholder = 'Pregunta o pega una imagen (Ctrl+V)...';
        }
    }

    async checkIfBanned() {
        if (typeof userModeration === 'undefined') return false;

        const isBanned = await userModeration.isCurrentUserBanned();
        if (isBanned) {
            this.showBannedScreen();
            return true;
        }
        return false;
    }

    showBannedScreen() {
        // Hide everything and show error screen
        document.body.innerHTML = `
            <div style="
                position: fixed; inset: 0; 
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                display: flex; align-items: center; justify-content: center;
                font-family: 'Inter', sans-serif;
            ">
                <div style="
                    text-align: center; 
                    background: rgba(255,77,77,0.1);
                    border: 1px solid #ff4d4d44;
                    border-radius: 20px;
                    padding: 40px 60px;
                    max-width: 500px;
                ">
                    <div style="font-size: 60px; margin-bottom: 20px;">⚠️</div>
                    <h1 style="color: #ff6666; margin: 0 0 15px 0; font-size: 24px;">
                        Ops, ha habido un error
                    </h1>
                    <p style="color: #888; margin: 0 0 20px 0; line-height: 1.6;">
                        Ha ocurrido un error al intentar conectarte.<br>
                        Por favor, inténtalo más tarde.
                    </p>
                    <div style="color: #555; font-size: 12px;">
                        Código de error: ERR_CONNECTION_REFUSED
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Username modal save button
        this.ui.saveUsernameBtn.addEventListener('click', () => this.saveUsername());

        // Enter key in username input
        this.ui.usernameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.saveUsername();
            }
        });

        // Send button
        this.ui.sendBtn.addEventListener('click', () => this.handleInput());

        // Enter key
        this.ui.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleInput();
            }
        });

        // Auto-resize textarea
        this.ui.input.addEventListener('input', () => {
            this.ui.input.style.height = 'auto';
            this.ui.input.style.height = this.ui.input.scrollHeight + 'px';
        });

        // File upload button
        this.ui.attachBtn.addEventListener('click', () => {
            this.ui.fileInput.click();
        });

        // File selected
        this.ui.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });

        // Paste image (Ctrl+V)
        this.ui.input.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    this.handleFile(file);
                    break;
                }
            }
        });

        // New chat - create new without reloading
        this.ui.newChatBtn.addEventListener('click', () => {
            this.startNewChat();
        });

        // Old setupRenaming removed - handled by ChatManager
    }

    handleGoogleAuth(user) {
        console.log('Google auth received:', user.email);

        // Hide Google login modal
        this.hideGoogleLoginModal();

        // Show username modal with Google name pre-filled
        this.ui.googleUserName.textContent = user.name.split(' ')[0];
        this.ui.usernameInput.value = user.name.split(' ')[0];
        this.showUsernameModal();
    }

    showGoogleLoginModal() {
        this.ui.googleLoginModal.classList.remove('hidden');
        // Render Google Sign-In button
        setTimeout(() => {
            googleAuth.showSignInButton(this.ui.googleSigninButton);
        }, 500);
    }

    hideGoogleLoginModal() {
        this.ui.googleLoginModal.classList.add('hidden');
    }

    showUsernameModal() {
        this.ui.usernameModal.classList.remove('hidden');
        this.ui.usernameInput.focus();
    }

    hideUsernameModal() {
        this.ui.usernameModal.classList.add('hidden');
    }

    saveUsername() {
        const username = this.ui.usernameInput.value.trim();
        if (username.length < 1) {
            this.ui.usernameInput.style.borderColor = '#ff4444';
            this.ui.usernameInput.placeholder = '¡Escribe un nombre!';
            return;
        }

        // Save with Google email if available
        const googleEmail = googleAuth.getEmail();
        userProfile.save(username, googleEmail);
        this.updateUIWithProfile();
        this.hideUsernameModal();
    }

    updateUIWithProfile() {
        // Update sidebar
        this.ui.sidebarUsername.textContent = userProfile.getUsername();
        this.ui.sidebarAvatar.src = userProfile.getAvatar();

        // Update welcome message with username
        const welcomeUsername = document.getElementById('welcome-username');
        if (welcomeUsername) {
            welcomeUsername.textContent = userProfile.getUsername();
        }
    }

    // Initialize ChatManager and set up callbacks
    initChatManager() {
        if (typeof chatManager === 'undefined') return;

        // Set callback for when chat changes
        chatManager.onChatChange = (chat) => this.loadChatMessages(chat);

        // Initialize and load current chat
        chatManager.init();
        const currentChat = chatManager.getChat(chatManager.currentChatId);
        if (currentChat && currentChat.messages.length > 0) {
            this.loadChatMessages(currentChat);
        }

        // Track if this is first message for AI naming
        this.isFirstMessage = currentChat ? currentChat.isFirstMessage : true;
    }

    // Start a new chat without reloading page
    startNewChat() {
        if (typeof chatManager === 'undefined') {
            window.location.reload();
            return;
        }

        // Create new chat
        chatManager.createNewChat();

        // Clear messages container (except welcome)
        const welcomeMsg = document.getElementById('welcome-message');
        this.ui.messages.innerHTML = '';
        if (welcomeMsg) {
            this.ui.messages.appendChild(welcomeMsg.cloneNode(true));
        } else {
            // Recreate welcome message
            this.ui.messages.innerHTML = `
                <div class="message ai" id="welcome-message">
                    <div class="message-content">
                        <div class="message-header">
                            <span class="ai-name">🤖 Migui</span>
                        </div>
                        <div class="message-text">
                            <p>¡Hola <strong>${userProfile.getUsername()}</strong>! Soy <strong>Migui</strong>.</p>
                            <p>Estoy diseñado para ayudarte con tus estudios, resolver problemas matemáticos y buscar información compleja.</p>
                            <p>¿En qué materia trabajamos hoy?</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Reset first message flag
        this.isFirstMessage = true;
    }

    // Load messages from a saved chat
    loadChatMessages(chat) {
        if (!chat) return;

        // Clear messages and add welcome
        this.ui.messages.innerHTML = `
            <div class="message ai" id="welcome-message">
                <div class="message-content">
                    <div class="message-header">
                        <span class="ai-name">🤖 Migui</span>
                    </div>
                    <div class="message-text">
                        <p>¡Hola <strong>${userProfile.getUsername()}</strong>! Soy <strong>Migui</strong>.</p>
                        <p>Estoy diseñado para ayudarte con tus estudios, resolver problemas matemáticos y buscar información compleja.</p>
                        <p>¿En qué materia trabajamos hoy?</p>
                    </div>
                </div>
            </div>
        `;

        // Add saved messages
        for (const msg of chat.messages) {
            const div = document.createElement('div');
            div.className = `message ${msg.type}`;

            if (msg.type === 'user') {
                div.innerHTML = `
                    <div class="message-content">
                        <div class="message-header">
                            <img class="avatar-img" src="${chat.userAvatar || userProfile.getAvatar()}" alt="Avatar">
                            <span class="username">${chat.userName || userProfile.getUsername()}</span>
                        </div>
                        <div class="message-text">${msg.html || msg.content}</div>
                    </div>
                `;
            } else {
                div.innerHTML = `
                    <div class="message-content">
                        <div class="message-header">
                            <span class="ai-name">🤖 Migui</span>
                        </div>
                        <div class="message-text">${this.parseMarkdown(msg.content)}</div>
                    </div>
                `;
            }

            this.ui.messages.appendChild(div);
        }

        this.scrollToBottom();
        this.isFirstMessage = chat.isFirstMessage;
    }

    handleFile(file) {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            showToast('Solo se aceptan imágenes y PDFs', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentFile = {
                type: file.type,
                data: e.target.result,
                name: file.name
            };
            this.showFilePreview();
        };
        reader.readAsDataURL(file);
    }

    showFilePreview() {
        if (!this.currentFile) return;

        let previewHTML = '';
        if (this.currentFile.type.startsWith('image/')) {
            previewHTML = `
                <img src="${this.currentFile.data}" alt="Preview" />
                <div class="file-info">
                    <strong>${this.currentFile.name}</strong>
                    <p>Imagen adjuntada - Lista para enviar</p>
                </div>
                <button class="remove-file" onclick="app.removeFile()">✕</button>
            `;
        } else {
            previewHTML = `
                <div class="file-info">
                    <strong>📄 ${this.currentFile.name}</strong>
                    <p>PDF adjuntado - Será analizado</p>
                </div>
                <button class="remove-file" onclick="app.removeFile()">✕</button>
            `;
        }

        this.ui.filePreview.innerHTML = previewHTML;
        this.ui.filePreview.classList.remove('hidden');
    }

    removeFile() {
        this.currentFile = null;
        this.ui.filePreview.classList.add('hidden');
        this.ui.fileInput.value = '';
    }

    setupRenaming() {
        const items = document.querySelectorAll('.history-item');
        items.forEach(item => {
            item.addEventListener('dblclick', () => {
                item.contentEditable = true;
                item.focus();
            });

            item.addEventListener('blur', () => {
                item.contentEditable = false;
            });

            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    item.blur();
                }
            });
        });
    }

    async handleInput() {
        const text = this.ui.input.value.trim();
        const hasFile = this.currentFile !== null;

        if (!text && !hasFile) return;

        // Check if user is banned
        if (typeof userModeration !== 'undefined') {
            const isBanned = await userModeration.isCurrentUserBanned();
            if (isBanned) {
                this.showBannedScreen();
                return;
            }

            // Check message limit
            const email = googleAuth.getEmail();
            if (email) {
                const limitStatus = userModeration.canSendMessage(email);
                if (!limitStatus.canSend) {
                    showToast(`Has alcanzado tu límite de ${limitStatus.limit} mensajes por día. Vuelve mañana.`, 'warning');
                    return;
                }
                // Increment count
                userModeration.incrementDailyCount(email);

                // Check if limit reached after this message
                setTimeout(() => this.checkLimitStatus(), 100);
            }
        }

        // Clear input
        this.ui.input.value = '';
        this.ui.input.style.height = 'auto';

        // Add user message
        let userMsgHTML = text;
        if (hasFile && this.currentFile.type.startsWith('image/')) {
            userMsgHTML = `<img src="${this.currentFile.data}" style="max-width: 300px; border-radius: 8px;" /><br>${text || '(Analiza esta imagen)'}`;
        } else if (hasFile) {
            userMsgHTML = `📄 ${this.currentFile.name}<br>${text || '(Analiza este PDF)'}`;
        }

        this.addMessage(userMsgHTML, 'user');

        // Save user message to ChatManager and handle dynamic naming
        if (typeof chatManager !== 'undefined') {
            chatManager.addMessage('user', text || 'Análisis de archivo', userMsgHTML);

            // Dynamic chat naming:
            // 1. Generate name on first message
            // 2. Update name if later message is more substantial and current name is generic
            if (text) {
                if (this.isFirstMessage) {
                    this.isFirstMessage = false;
                    chatManager.markFirstMessageSent();
                    // Generate name (will skip if message is too generic)
                    chatManager.generateChatName(text);
                } else if (chatManager.shouldUpdateName(text)) {
                    // Update name with this better message
                    chatManager.generateChatName(text);
                }
            }
        }

        // Track this question for analytics
        if (typeof activityTracker !== 'undefined') {
            activityTracker.trackQuestion(text || 'Análisis de archivo');
        }

        // Store file data for brain
        const fileData = hasFile ? this.currentFile.data : null;

        // Clear file preview
        this.removeFile();

        // Show appropriate thinking message
        const thinkingMsg = fileData ? '🧠 Extrayendo texto de la imagen...' : '🧠 Pensando...';
        const thinkingId = this.addMessage(thinkingMsg, 'ai');

        try {
            const response = await this.brain.process(text, fileData);
            this.updateMessage(thinkingId, response);

            // Save AI response to ChatManager
            if (typeof chatManager !== 'undefined') {
                chatManager.addMessage('ai', response, null);
            }
        } catch (error) {
            console.error('Error:', error);
            this.updateMessage(thinkingId, '❌ Error al procesar. Intenta de nuevo.');
        }
    }

    addMessage(html, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.id = 'msg-' + Date.now() + '-' + Math.random();

        if (type === 'user') {
            // User message with avatar and username
            div.innerHTML = `
                <div class="message-content">
                    <div class="message-header">
                        <img class="avatar-img" src="${userProfile.getAvatar()}" alt="Avatar">
                        <span class="username">${userProfile.getUsername()}</span>
                    </div>
                    <div class="message-text">${html}</div>
                </div>
            `;
        } else {
            // AI message with Migui branding
            div.innerHTML = `
                <div class="message-content">
                    <div class="message-header">
                        <span class="ai-name">🤖 Migui</span>
                    </div>
                    <div class="message-text">${html}</div>
                </div>
            `;
        }

        this.ui.messages.appendChild(div);
        this.scrollToBottom();
        return div.id;
    }

    updateMessage(id, html) {
        const el = document.getElementById(id);
        if (el) {
            const content = el.querySelector('.message-text');
            if (content) {
                content.innerHTML = this.parseMarkdown(html);
            } else {
                // Fallback for old structure
                const msgContent = el.querySelector('.message-content');
                msgContent.innerHTML = this.parseMarkdown(html);
            }
        }
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.ui.messages.scrollTop = this.ui.messages.scrollHeight;
    }

    parseMarkdown(text) {
        let html = text
            .replace(/### (.*?)(\n|$)/g, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
        return html;
    }
}

// Global instance
let app;
window.addEventListener('load', () => {
    app = new App();
    // Apply saved sidebar color
    UserSettings.applySavedColor();
});
