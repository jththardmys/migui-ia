// Chat Manager Module
// Handles persistent chat storage, AI-generated names, and chat lifecycle

class ChatManager {
    constructor() {
        this.CHATS_KEY = 'migui_chats';
        this.DELETED_KEY = 'migui_deleted_chats';
        this.CURRENT_KEY = 'migui_current_chat';

        this.currentChatId = null;
        this.onChatChange = null; // Callback when chat changes
    }

    // Initialize - load current chat or create new one
    init() {
        this.currentChatId = localStorage.getItem(this.CURRENT_KEY);

        // If no current chat or it doesn't exist, create new one
        if (!this.currentChatId || !this.getChat(this.currentChatId)) {
            this.currentChatId = this.createNewChat();
        }

        this.renderChatList();
        return this.currentChatId;
    }

    // Create a new empty chat
    createNewChat() {
        const chats = this.getAllChats();
        const newChat = {
            id: 'chat_' + Date.now(),
            name: 'Nuevo chat',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userEmail: typeof googleAuth !== 'undefined' ? googleAuth.getEmail() : null,
            userName: typeof userProfile !== 'undefined' ? userProfile.getUsername() : 'Usuario',
            userAvatar: typeof userProfile !== 'undefined' ? userProfile.getAvatar() : null,
            isFirstMessage: true
        };

        chats.push(newChat);
        this.saveAllChats(chats);
        this.setCurrentChat(newChat.id);
        this.renderChatList();

        return newChat.id;
    }

    // Get all active chats
    getAllChats() {
        try {
            return JSON.parse(localStorage.getItem(this.CHATS_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    // Save all chats
    saveAllChats(chats) {
        localStorage.setItem(this.CHATS_KEY, JSON.stringify(chats));
    }

    // Get specific chat by ID
    getChat(chatId) {
        const chats = this.getAllChats();
        return chats.find(c => c.id === chatId);
    }

    // Set current active chat
    setCurrentChat(chatId) {
        this.currentChatId = chatId;
        localStorage.setItem(this.CURRENT_KEY, chatId);
    }

    // Add message to current chat
    addMessage(type, content, html = null) {
        const chats = this.getAllChats();
        const chatIndex = chats.findIndex(c => c.id === this.currentChatId);

        if (chatIndex >= 0) {
            chats[chatIndex].messages.push({
                type, // 'user' or 'ai'
                content,
                html,
                timestamp: new Date().toISOString()
            });
            chats[chatIndex].updatedAt = new Date().toISOString();
            this.saveAllChats(chats);
        }
    }

    // Check if this is the first user message (for AI naming)
    isFirstUserMessage() {
        const chat = this.getChat(this.currentChatId);
        return chat && chat.isFirstMessage;
    }

    // Mark that first message has been sent
    markFirstMessageSent() {
        const chats = this.getAllChats();
        const chatIndex = chats.findIndex(c => c.id === this.currentChatId);
        if (chatIndex >= 0) {
            chats[chatIndex].isFirstMessage = false;
            this.saveAllChats(chats);
        }
    }

    // Check if message is too short/generic to generate a good name
    isGenericMessage(text) {
        const genericPatterns = [
            /^hola$/i, /^hey$/i, /^hi$/i, /^buenas$/i, /^buenos dias$/i,
            /^buenas tardes$/i, /^buenas noches$/i, /^que tal$/i, /^como estas$/i,
            /^hola\s*[!.,?]*$/i, /^gracias$/i, /^ok$/i, /^vale$/i, /^si$/i, /^no$/i
        ];
        const cleanText = text.trim().toLowerCase();
        return cleanText.length < 10 || genericPatterns.some(p => p.test(cleanText));
    }

    // Check if chat needs a name update (has generic name or "Nuevo chat")
    needsNameUpdate() {
        const chat = this.getChat(this.currentChatId);
        if (!chat) return false;
        const genericNames = ['Nuevo chat', 'Chat', 'Hola', 'Hey', 'Buenas'];
        return genericNames.some(n => chat.name.toLowerCase().startsWith(n.toLowerCase()))
            || chat.name.length < 8;
    }

    // Generate or update chat name based on user message
    async generateChatName(userMessage, forceUpdate = false) {
        // Skip if message is too short/generic and we're not forcing update
        if (this.isGenericMessage(userMessage) && !forceUpdate) {
            // Set a temporary generic name
            const chat = this.getChat(this.currentChatId);
            if (chat && chat.name === 'Nuevo chat') {
                this.renameChat(this.currentChatId, userMessage.substring(0, 15) || 'Chat');
            }
            return null;
        }

        try {
            // Use the AIEngine if available
            if (typeof aiEngine !== 'undefined' && aiEngine.callModel) {
                const prompt = `Genera un título CORTO (máximo 3-4 palabras) para este chat. Solo responde con el título, sin explicaciones:
"${userMessage.substring(0, 150)}"`;

                const messages = [
                    { role: 'system', content: 'Eres un asistente que genera títulos cortos. Transforma peticiones en títulos descriptivos. Ejemplo: "hazme un resumen de la edad media" → "Resumen Edad Media". Responde SOLO con el título.' },
                    { role: 'user', content: prompt }
                ];

                const response = await aiEngine.callModel(messages, 'llama-3.3-70b-versatile', 0.3, 50);
                const name = response.trim().replace(/["'.]/g, '').substring(0, 30);

                if (name.length > 0) {
                    this.renameChat(this.currentChatId, name);
                    // Mark that we have a good name now
                    this.markGoodName();
                    return name;
                }
            }
        } catch (e) {
            console.error('Error generating chat name:', e);
        }

        // Fallback: transform common patterns and shorten
        const fallbackName = this.createShortName(userMessage);
        this.renameChat(this.currentChatId, fallbackName);
        return fallbackName;
    }

    // Create a short, clean name from user message (fallback)
    createShortName(text) {
        let name = text.trim();

        // Transform common patterns
        const patterns = [
            { match: /^(hazme|haz|dame|dime|genera|crea|escribe)\s+(un|una|el|la)?\s*(resumen|explicación|explicacion|análisis|analisis)\s+(de|del|sobre)\s+(.+)/i, replace: 'Resumen de $5' },
            { match: /^(explícame|explicame|explica)\s+(que|qué|como|cómo)?\s*(.+)/i, replace: 'Explicación $3' },
            { match: /^(que|qué)\s+(es|son|fue|fueron)\s+(.+)/i, replace: '$3' },
            { match: /^(como|cómo)\s+(hago|hacer|puedo|se)\s+(.+)/i, replace: 'Cómo $3' },
            { match: /^(ayúdame|ayudame|ayuda)\s+(a|con)\s+(.+)/i, replace: 'Ayuda $3' },
            { match: /^(cuál|cual|cuáles|cuales)\s+(es|son|fue|fueron)\s+(.+)/i, replace: '$3' },
            { match: /^(traduce|traducir|traducción)\s+(.+)/i, replace: 'Traducción $2' },
            { match: /^(resuelve|resolver|soluciona)\s+(.+)/i, replace: 'Resolver $2' },
        ];

        for (const p of patterns) {
            if (p.match.test(name)) {
                name = name.replace(p.match, p.replace);
                break;
            }
        }

        // Remove leading articles and clean up
        name = name.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '');

        // Capitalize first letter
        name = name.charAt(0).toUpperCase() + name.slice(1);

        // Limit to 25 characters max, try to cut at word boundary
        if (name.length > 25) {
            name = name.substring(0, 25);
            const lastSpace = name.lastIndexOf(' ');
            if (lastSpace > 15) {
                name = name.substring(0, lastSpace);
            }
        }

        return name || 'Chat';
    }

    // Mark that chat has a good descriptive name (no need to update anymore)
    markGoodName() {
        const chats = this.getAllChats();
        const chatIndex = chats.findIndex(c => c.id === this.currentChatId);
        if (chatIndex >= 0) {
            chats[chatIndex].hasGoodName = true;
            this.saveAllChats(chats);
        }
    }

    // Check if we should try to update the name with this message
    shouldUpdateName(userMessage) {
        const chat = this.getChat(this.currentChatId);
        if (!chat) return false;

        // Already has a good AI-generated name
        if (chat.hasGoodName) return false;

        // Message is too generic to generate a good name
        if (this.isGenericMessage(userMessage)) return false;

        // Chat still has generic name - try to update it
        return this.needsNameUpdate();
    }

    // Rename a chat
    renameChat(chatId, newName) {
        const chats = this.getAllChats();
        const chatIndex = chats.findIndex(c => c.id === chatId);

        if (chatIndex >= 0) {
            chats[chatIndex].name = newName;
            chats[chatIndex].updatedAt = new Date().toISOString();
            this.saveAllChats(chats);
            this.renderChatList();
        }
    }

    // Delete chat (move to deleted)
    deleteChat(chatId) {
        const chats = this.getAllChats();
        const chatIndex = chats.findIndex(c => c.id === chatId);

        if (chatIndex >= 0) {
            const deletedChat = chats[chatIndex];
            deletedChat.deletedAt = new Date().toISOString();

            // Add to deleted chats
            const deletedChats = this.getDeletedChats();
            deletedChats.push(deletedChat);
            localStorage.setItem(this.DELETED_KEY, JSON.stringify(deletedChats));

            // Remove from active chats
            chats.splice(chatIndex, 1);
            this.saveAllChats(chats);

            // If deleted current chat, switch to another or create new
            if (chatId === this.currentChatId) {
                if (chats.length > 0) {
                    this.setCurrentChat(chats[0].id);
                    if (this.onChatChange) this.onChatChange(chats[0]);
                } else {
                    const newId = this.createNewChat();
                    if (this.onChatChange) this.onChatChange(this.getChat(newId));
                }
            }

            this.renderChatList();
            showToast('Chat eliminado', 'info');
        }
    }

    // Get deleted chats (for admin)
    getDeletedChats() {
        try {
            return JSON.parse(localStorage.getItem(this.DELETED_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    // Load a specific chat
    loadChat(chatId) {
        const chat = this.getChat(chatId);
        if (chat) {
            this.setCurrentChat(chatId);
            this.renderChatList();
            if (this.onChatChange) this.onChatChange(chat);
        }
    }

    // Get current chat messages
    getCurrentMessages() {
        const chat = this.getChat(this.currentChatId);
        return chat ? chat.messages : [];
    }

    // Render chat list in sidebar
    renderChatList() {
        const container = document.getElementById('history-list');
        if (!container) return;

        const chats = this.getAllChats().sort((a, b) =>
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        container.innerHTML = chats.map(chat => `
            <div class="history-item ${chat.id === this.currentChatId ? 'active' : ''}" 
                 data-chat-id="${chat.id}">
                <span class="chat-name">${this.escapeHtml(chat.name)}</span>
                <div class="chat-menu-btn" data-chat-id="${chat.id}">⋮</div>
                <div class="chat-dropdown hidden" data-chat-id="${chat.id}">
                    <div class="chat-dropdown-item delete" data-chat-id="${chat.id}">🗑️ Eliminar</div>
                </div>
            </div>
        `).join('');

        this.setupChatListEvents();
    }

    // Setup event listeners for chat list
    setupChatListEvents() {
        const container = document.getElementById('history-list');
        if (!container) return;

        // Click to load chat
        container.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.chat-menu-btn') || e.target.closest('.chat-dropdown')) return;
                this.loadChat(item.dataset.chatId);
            });

            // Double-click to rename
            const nameSpan = item.querySelector('.chat-name');
            nameSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.startRenaming(item.dataset.chatId, nameSpan);
            });
        });

        // Menu button click
        container.querySelectorAll('.chat-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(btn.dataset.chatId);
            });
        });

        // Delete button
        container.querySelectorAll('.chat-dropdown-item.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteChat(btn.dataset.chatId);
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => this.closeAllDropdowns());
    }

    // Toggle dropdown menu
    toggleDropdown(chatId) {
        this.closeAllDropdowns();
        const dropdown = document.querySelector(`.chat-dropdown[data-chat-id="${chatId}"]`);
        if (dropdown) dropdown.classList.remove('hidden');
    }

    // Close all dropdowns
    closeAllDropdowns() {
        document.querySelectorAll('.chat-dropdown').forEach(d => d.classList.add('hidden'));
    }

    // Start inline renaming
    startRenaming(chatId, element) {
        const chat = this.getChat(chatId);
        if (!chat) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = chat.name;
        input.className = 'chat-rename-input';
        input.style.cssText = 'background: #16213e; border: 1px solid #667eea; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 13px; width: 100%;';

        element.replaceWith(input);
        input.focus();
        input.select();

        const finishRename = () => {
            const newName = input.value.trim() || 'Chat';
            this.renameChat(chatId, newName);
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                this.renderChatList(); // Cancel rename
            }
        });
    }

    // Helper: escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global instance
const chatManager = new ChatManager();
