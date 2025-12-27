class CryptoHelper {
    async encryptKey(apiKey, password) {
        const encoder = new TextEncoder();
        const keyMaterial = await this.getKeyMaterial(password);
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await this.deriveKey(keyMaterial, salt);
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encoder.encode(apiKey)
        );

        // Combine salt + iv + encrypted data
        const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encrypted), salt.length + iv.length);

        return btoa(String.fromCharCode(...combined));
    }

    async decryptKey(encryptedData, password) {
        try {
            const decoder = new TextDecoder();
            const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encrypted = combined.slice(28);

            const keyMaterial = await this.getKeyMaterial(password);
            const key = await this.deriveKey(keyMaterial, salt);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );

            return decoder.decode(decrypted);
        } catch (e) {
            return null; // Wrong password
        }
    }

    async getKeyMaterial(password) {
        const encoder = new TextEncoder();
        return crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );
    }

    async deriveKey(keyMaterial, salt) {
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }
}
