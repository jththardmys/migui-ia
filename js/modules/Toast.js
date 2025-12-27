// Toast Notification System - Replaces ugly browser alerts
// Usage: showToast('Message', 'success') or showToast('Error', 'error')

class Toast {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create container if it doesn't exist
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
        }
    }

    show(message, type = 'info', duration = 3000) {
        if (!this.container) this.init();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        this.container.appendChild(toast);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.add('hiding');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    }

    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 4000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 3500) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
}

// Custom Confirm Dialog - Replaces browser confirm()
class ConfirmDialog {
    constructor() {
        this.modal = null;
        this.resolvePromise = null;
    }

    show(message, title = 'Confirmar') {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;

            // Remove existing modal
            const existing = document.querySelector('.confirm-modal');
            if (existing) existing.remove();

            this.modal = document.createElement('div');
            this.modal.className = 'confirm-modal';
            this.modal.innerHTML = `
                <div class="confirm-content">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="confirm-buttons">
                        <button class="confirm-yes">Sí</button>
                        <button class="confirm-no">No</button>
                    </div>
                </div>
            `;

            document.body.appendChild(this.modal);

            // Add event listeners
            this.modal.querySelector('.confirm-yes').addEventListener('click', () => {
                this.close(true);
            });

            this.modal.querySelector('.confirm-no').addEventListener('click', () => {
                this.close(false);
            });

            // Close on backdrop click
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.close(false);
                }
            });

            // ESC key to close
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    this.close(false);
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    close(result) {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        if (this.resolvePromise) {
            this.resolvePromise(result);
        }
    }
}

// Global instances
const toast = new Toast();
const confirmDialog = new ConfirmDialog();

// Global function to replace alert()
function showToast(message, type = 'info', duration = 3000) {
    return toast.show(message, type, duration);
}

// Async confirm function
async function showConfirm(message, title = 'Confirmar') {
    return confirmDialog.show(message, title);
}
