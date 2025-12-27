// Persistent Storage Module V2
// Ultra-robust storage with IndexedDB backup and automatic restoration
// NEVER LOSE DATA AGAIN

class PersistentStorage {
    constructor() {
        // All keys that should be backed up
        this.backupKeys = [
            'migui_user_profile',
            'migui_google_auth',
            'migui_users_registry',
            'migui_chats',
            'migui_deleted_chats',
            'migui_current_chat',
            'migui_user_bans',
            'migui_user_limits',
            'migui_user_activity',
            'migui_user_queries',
            'migui_profile_changes',
            'migui_bg_color',
            'migui_admin_auth',
            'migui_daily_counts',
            'migui_banned_users'
        ];

        // Critical keys that MUST always be restored if missing
        this.criticalKeys = [
            'migui_user_profile',
            'migui_google_auth',
            'migui_chats',
            'migui_admin_auth'
        ];

        this.AUTOSAVE_KEY = 'migui_autosave_backup';
        this.LAST_AUTOSAVE_KEY = 'migui_last_autosave';
        this.DB_NAME = 'MiguiPermanentStorage';
        this.DB_VERSION = 1;
        this.STORE_NAME = 'appData';

        this.autoSaveEnabled = true;
        this.db = null;
        this.isInitialized = false;

        // Initialize storage system
        this.initStorage();
    }

    // ===== INITIALIZATION =====

    async initStorage() {
        console.log('🔐 Inicializando sistema de almacenamiento permanente...');

        try {
            // 1. Initialize IndexedDB
            await this.initIndexedDB();

            // 2. Check and restore any missing critical data
            await this.checkAndRestoreMissingData();

            // 3. Setup autosave listener
            this.setupAutoSaveListener();

            // 4. Start periodic sync
            this.startPeriodicSync();

            this.isInitialized = true;
            console.log('✅ Sistema de almacenamiento permanente inicializado');

        } catch (error) {
            console.error('❌ Error inicializando almacenamiento:', error);
            // Fallback: at least try to restore from localStorage backup
            this.restoreFromAutoSave();
        }
    }

    // ===== INDEXEDDB LAYER =====

    initIndexedDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                console.warn('⚠️ IndexedDB no disponible, usando solo localStorage');
                resolve(null);
                return;
            }

            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = (event) => {
                console.error('Error abriendo IndexedDB:', event.target.error);
                resolve(null); // Don't reject, just continue without IndexedDB
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('📦 IndexedDB conectado');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME, { keyPath: 'key' });
                    console.log('📦 IndexedDB store creado');
                }
            };
        });
    }

    async saveToIndexedDB(key, value) {
        if (!this.db) return false;

        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.STORE_NAME);

                const data = {
                    key: key,
                    value: value,
                    updatedAt: new Date().toISOString()
                };

                const request = store.put(data);

                request.onsuccess = () => resolve(true);
                request.onerror = () => resolve(false);
            } catch (error) {
                console.error('Error saving to IndexedDB:', error);
                resolve(false);
            }
        });
    }

    async loadFromIndexedDB(key) {
        if (!this.db) return null;

        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
                const store = transaction.objectStore(this.STORE_NAME);
                const request = store.get(key);

                request.onsuccess = () => {
                    const result = request.result;
                    resolve(result ? result.value : null);
                };
                request.onerror = () => resolve(null);
            } catch (error) {
                console.error('Error loading from IndexedDB:', error);
                resolve(null);
            }
        });
    }

    async loadAllFromIndexedDB() {
        if (!this.db) return {};

        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
                const store = transaction.objectStore(this.STORE_NAME);
                const request = store.getAll();

                request.onsuccess = () => {
                    const result = {};
                    for (const item of request.result) {
                        result[item.key] = item.value;
                    }
                    resolve(result);
                };
                request.onerror = () => resolve({});
            } catch (error) {
                console.error('Error loading all from IndexedDB:', error);
                resolve({});
            }
        });
    }

    // ===== AUTOMATIC DATA RESTORATION =====

    async checkAndRestoreMissingData() {
        console.log('🔍 Verificando integridad de datos...');

        let restoredCount = 0;

        // First, try to restore from IndexedDB
        const indexedDBData = await this.loadAllFromIndexedDB();

        // Then get localStorage backup
        let backupData = {};
        try {
            const backup = JSON.parse(localStorage.getItem(this.AUTOSAVE_KEY));
            if (backup && backup.data) {
                backupData = backup.data;
            }
        } catch (e) {
            // No backup available
        }

        // Check each critical key
        for (const key of this.backupKeys) {
            const localValue = localStorage.getItem(key);

            // If key is missing from localStorage
            if (localValue === null || localValue === 'null' || localValue === '') {
                // Try to restore from IndexedDB first
                if (indexedDBData[key]) {
                    const value = typeof indexedDBData[key] === 'string'
                        ? indexedDBData[key]
                        : JSON.stringify(indexedDBData[key]);
                    localStorage.setItem(key, value);
                    console.log(`✅ Restaurado desde IndexedDB: ${key}`);
                    restoredCount++;
                }
                // Otherwise try backup
                else if (backupData[key]) {
                    const value = typeof backupData[key] === 'string'
                        ? backupData[key]
                        : JSON.stringify(backupData[key]);
                    localStorage.setItem(key, value);
                    console.log(`✅ Restaurado desde backup: ${key}`);
                    restoredCount++;
                }
            }
            // If key exists in localStorage but not in IndexedDB, sync it
            else if (this.db && !indexedDBData[key]) {
                await this.saveToIndexedDB(key, localValue);
            }
        }

        if (restoredCount > 0) {
            console.log(`🔄 ${restoredCount} elementos restaurados automáticamente`);
        } else {
            console.log('✅ Todos los datos están íntegros');
        }

        return restoredCount;
    }

    // ===== AUTOSAVE SYSTEM =====

    setupAutoSaveListener() {
        // Override localStorage.setItem to trigger autosave
        const originalSetItem = localStorage.setItem.bind(localStorage);
        const self = this;

        localStorage.setItem = function (key, value) {
            originalSetItem(key, value);

            // Auto-save if the key is one we care about
            if (self.autoSaveEnabled && self.backupKeys.includes(key)) {
                // Also save to IndexedDB
                self.saveToIndexedDB(key, value);

                // Trigger autosave
                self.autoSave();
            }
        };

        // Also override removeItem to sync deletions
        const originalRemoveItem = localStorage.removeItem.bind(localStorage);
        localStorage.removeItem = function (key) {
            originalRemoveItem(key);

            // But NEVER remove critical keys from IndexedDB (they serve as backup)
            // Only sync non-critical removals
            if (!self.criticalKeys.includes(key)) {
                self.removeFromIndexedDB(key);
            }
        };
    }

    async removeFromIndexedDB(key) {
        if (!this.db) return;

        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.STORE_NAME);
                store.delete(key);
                resolve(true);
            } catch (error) {
                resolve(false);
            }
        });
    }

    // Auto-save backup to localStorage (debounced)
    autoSave() {
        // Debounce: only save if last save was more than 3 seconds ago
        const lastSave = localStorage.getItem(this.LAST_AUTOSAVE_KEY);
        const now = Date.now();

        if (lastSave && (now - parseInt(lastSave)) < 3000) {
            return; // Skip if too recent
        }

        // Create backup object
        const backup = {
            version: '2.0',
            exportedAt: new Date().toISOString(),
            autoSave: true,
            data: {}
        };

        // Temporarily disable autosave to prevent recursion
        this.autoSaveEnabled = false;

        // Collect all data
        for (const key of this.backupKeys) {
            const value = localStorage.getItem(key);
            if (value !== null && value !== 'null') {
                try {
                    backup.data[key] = JSON.parse(value);
                } catch {
                    backup.data[key] = value;
                }
            }
        }

        // Store backup in localStorage
        localStorage.setItem(this.AUTOSAVE_KEY, JSON.stringify(backup));
        localStorage.setItem(this.LAST_AUTOSAVE_KEY, now.toString());

        // Re-enable autosave
        this.autoSaveEnabled = true;

        console.log('💾 Auto-guardado completado');
    }

    // ===== PERIODIC SYNC =====

    startPeriodicSync() {
        // Sync every 30 seconds
        setInterval(() => {
            this.syncAllToIndexedDB();
        }, 30000);

        // Also sync on page visibility change (when user returns to tab)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.checkAndRestoreMissingData();
            }
        });

        // Sync before page unload
        window.addEventListener('beforeunload', () => {
            this.forceSyncAll();
        });
    }

    async syncAllToIndexedDB() {
        if (!this.db) return;

        for (const key of this.backupKeys) {
            const value = localStorage.getItem(key);
            if (value !== null && value !== 'null') {
                await this.saveToIndexedDB(key, value);
            }
        }
        console.log('🔄 Sincronización periódica completada');
    }

    forceSyncAll() {
        // Synchronous version for beforeunload
        this.autoSaveEnabled = false;

        const backup = {
            version: '2.0',
            exportedAt: new Date().toISOString(),
            autoSave: true,
            data: {}
        };

        for (const key of this.backupKeys) {
            const value = localStorage.getItem(key);
            if (value !== null && value !== 'null') {
                try {
                    backup.data[key] = JSON.parse(value);
                } catch {
                    backup.data[key] = value;
                }
            }
        }

        localStorage.setItem(this.AUTOSAVE_KEY, JSON.stringify(backup));
        this.autoSaveEnabled = true;
    }

    // ===== RESTORE FROM AUTOSAVE =====

    restoreFromAutoSave() {
        try {
            const backup = JSON.parse(localStorage.getItem(this.AUTOSAVE_KEY));
            if (!backup || !backup.data) {
                return false;
            }

            // Restore all data
            this.autoSaveEnabled = false;
            let restoredCount = 0;

            for (const [key, value] of Object.entries(backup.data)) {
                if (this.backupKeys.includes(key)) {
                    const currentValue = localStorage.getItem(key);
                    // Only restore if current value is missing
                    if (currentValue === null || currentValue === 'null' || currentValue === '') {
                        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                        localStorage.setItem(key, stringValue);
                        restoredCount++;
                    }
                }
            }

            this.autoSaveEnabled = true;
            console.log(`✅ Restaurados ${restoredCount} elementos desde auto-backup`);
            return true;
        } catch (e) {
            console.error('Error restoring autosave:', e);
            return false;
        }
    }

    // ===== EXPORT/IMPORT =====

    exportData() {
        const backup = {
            version: '2.0',
            exportedAt: new Date().toISOString(),
            data: {}
        };

        // Collect all data
        for (const key of this.backupKeys) {
            const value = localStorage.getItem(key);
            if (value !== null) {
                try {
                    backup.data[key] = JSON.parse(value);
                } catch {
                    backup.data[key] = value;
                }
            }
        }

        // Create and download file
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `migui_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('✅ Datos exportados correctamente');
        if (typeof showToast !== 'undefined') {
            showToast('Datos exportados correctamente', 'success');
        }

        return true;
    }

    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const backup = JSON.parse(event.target.result);

                    // Validate backup structure
                    if (!backup.data || typeof backup.data !== 'object') {
                        throw new Error('Archivo de backup inválido');
                    }

                    // Disable autosave during import
                    this.autoSaveEnabled = false;

                    // Restore all data
                    let restoredCount = 0;
                    for (const [key, value] of Object.entries(backup.data)) {
                        if (this.backupKeys.includes(key)) {
                            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                            localStorage.setItem(key, stringValue);
                            await this.saveToIndexedDB(key, stringValue);
                            restoredCount++;
                        }
                    }

                    // Re-enable autosave
                    this.autoSaveEnabled = true;

                    console.log(`✅ ${restoredCount} elementos restaurados`);

                    if (typeof showToast !== 'undefined') {
                        showToast(`Datos restaurados (${restoredCount} elementos). Recargando...`, 'success');
                    }

                    // Reload page to apply changes
                    setTimeout(() => {
                        location.reload();
                    }, 1500);

                    resolve(true);
                } catch (error) {
                    console.error('Error importing data:', error);
                    if (typeof showToast !== 'undefined') {
                        showToast('Error al importar: ' + error.message, 'error');
                    }
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };

            reader.readAsText(file);
        });
    }

    // ===== STORAGE STATISTICS =====

    async getStats() {
        let localStorageSize = 0;
        let itemCount = 0;

        for (const key of this.backupKeys) {
            const value = localStorage.getItem(key);
            if (value) {
                localStorageSize += value.length * 2; // UTF-16 = 2 bytes per char
                itemCount++;
            }
        }

        // Get IndexedDB count
        let indexedDBCount = 0;
        if (this.db) {
            const allData = await this.loadAllFromIndexedDB();
            indexedDBCount = Object.keys(allData).length;
        }

        return {
            itemCount,
            indexedDBCount,
            totalSizeBytes: localStorageSize,
            totalSizeKB: (localStorageSize / 1024).toFixed(2),
            totalSizeMB: (localStorageSize / (1024 * 1024)).toFixed(2),
            hasBackup: localStorage.getItem(this.AUTOSAVE_KEY) !== null,
            hasIndexedDB: this.db !== null
        };
    }

    // Show file picker for import
    showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            if (e.target.files.length > 0) {
                await this.importData(e.target.files[0]);
            }
        };

        input.click();
    }

    // Force trigger autosave (for external calls)
    triggerSave() {
        // Reset debounce to force save
        localStorage.removeItem(this.LAST_AUTOSAVE_KEY);
        this.autoSave();
        this.syncAllToIndexedDB();
    }

    // ===== DIAGNOSTIC TOOLS =====

    async diagnose() {
        console.log('🔬 Diagnóstico de almacenamiento:');
        console.log('================================');

        const stats = await this.getStats();
        console.log(`📊 Elementos en localStorage: ${stats.itemCount}`);
        console.log(`📊 Elementos en IndexedDB: ${stats.indexedDBCount}`);
        console.log(`📊 Tamaño total: ${stats.totalSizeKB} KB`);
        console.log(`📊 Backup disponible: ${stats.hasBackup ? 'Sí' : 'No'}`);
        console.log(`📊 IndexedDB activo: ${stats.hasIndexedDB ? 'Sí' : 'No'}`);

        console.log('\n🔑 Estado de claves críticas:');
        for (const key of this.criticalKeys) {
            const localValue = localStorage.getItem(key);
            const hasLocal = localValue !== null && localValue !== 'null' && localValue !== '';
            const hasIndexed = this.db ? await this.loadFromIndexedDB(key) !== null : false;

            const status = hasLocal && hasIndexed ? '✅' : hasLocal ? '⚠️ (solo localStorage)' : hasIndexed ? '🔄 (solo IndexedDB)' : '❌';
            console.log(`  ${key}: ${status}`);
        }

        return stats;
    }
}

// Global instance
const persistentStorage = new PersistentStorage();
