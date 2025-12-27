class OCRProcessor {
    constructor() {
        this.worker = null;
        this.isReady = false;
        this.initialize();
    }

    async initialize() {
        try {
            // Create Tesseract worker
            this.worker = await Tesseract.createWorker('spa'); // Spanish
            this.isReady = true;
            console.log('OCR initialized successfully');
        } catch (error) {
            console.error('OCR initialization failed:', error);
        }
    }

    async extractText(imageData) {
        if (!this.isReady || !this.worker) {
            throw new Error('OCR no está listo. Espera unos segundos.');
        }

        try {
            console.log('Starting OCR extraction...');

            const result = await this.worker.recognize(imageData);
            const extractedText = result.data.text.trim();

            console.log('OCR extracted:', extractedText);

            if (!extractedText || extractedText.length < 3) {
                throw new Error('No se pudo extraer texto de la imagen. Verifica que sea clara y legible.');
            }

            return {
                success: true,
                text: extractedText,
                confidence: result.data.confidence
            };
        } catch (error) {
            console.error('OCR extraction error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.isReady = false;
        }
    }
}
