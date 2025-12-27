class Brain {
    constructor(app) {
        this.app = app;
        this.search = new WebSearch();
        this.math = new MathCore();
        this.context = new ContextManager();
        this.ai = new AIEngine();
        this.ocr = new OCRProcessor(); // OCR instead of vision

        this.state = 'IDLE';
    }

    async process(input, imageData = null) {
        this.state = 'THINKING';
        const lower = input.toLowerCase();

        this.context.add('user', input);

        // If there's an image, extract text with OCR first
        if (imageData) {
            try {
                console.log('Processing image with OCR...');

                const ocrResult = await this.ocr.extractText(imageData);

                if (!ocrResult.success) {
                    throw new Error(ocrResult.error || 'OCR falló');
                }

                // Combine user message with extracted text
                const combinedInput = input
                    ? `${input}\n\n[Texto extraído de la imagen]:\n${ocrResult.text}`
                    : `Resuelve este problema:\n\n${ocrResult.text}`;

                console.log('OCR extracted text:', ocrResult.text);
                console.log('Confidence:', ocrResult.confidence);

                // Process the extracted text with AI
                const aiResult = await this.ai.generate(combinedInput, []);

                if (aiResult && aiResult.success) {
                    const response = `📸 *Texto extraído:*\n"${ocrResult.text}"\n\n---\n\n${aiResult.response}`;
                    this.context.add('ai', response);
                    this.state = 'IDLE';
                    return response;
                } else {
                    throw new Error('AI no pudo procesar el texto extraído');
                }
            } catch (error) {
                console.error('Image processing error:', error);
                const errorMsg = `❌ Error al procesar imagen: ${error.message}\n\nIntenta:\n1. Imagen más clara\n2. Mejor iluminación\n3. Texto más grande\n4. Escribir el problema manualmente`;
                this.context.add('ai', errorMsg);
                this.state = 'IDLE';
                return errorMsg;
            }
        }

        const intent = this.decideIntent(lower, input);
        let response = "";

        // Try MathCore for simple operations
        if (intent.type === 'MATH' && intent.isSimple) {
            const result = this.math.solve(lower);
            if (result.success) {
                response = `📊 ${result.steps}`;
                this.context.add('ai', response);
                this.state = 'IDLE';
                return response;
            }
        }

        // Search for factual queries
        let searchContext = "";
        if (intent.type === 'SEARCH_QUERY') {
            const topic = this.context.getTopic();
            let query = input;

            if (topic && this.isFollowUp(lower)) {
                query = `${topic} ${input}`;
            }

            const searchResult = await this.search.resolve(query);

            if (searchResult.found) {
                searchContext = `\n\n[Info: "${searchResult.title}"]\n${searchResult.snippet}`;
                this.context.setTopic(searchResult.title);
            }
        }

        // Use AI for everything else
        try {
            const conversationHistory = this.buildConversationHistory();
            let augmentedInput = searchContext ? input + searchContext : input;

            // AUTO-ENHANCE inverse problems
            if (this.isInverseProblem(input)) {
                augmentedInput = `${input}\n\n[CONTEXTO OBLIGATORIO: Este es un problema INVERSO. Me dan el precio FINAL con descuento y debo calcular el precio ORIGINAL. Debo usar: Original = Final / (1 - descuento%). NO multiplicar el final por el descuento.]`;
            }

            const aiResult = await this.ai.generate(augmentedInput, conversationHistory);

            if (aiResult.success) {
                response = aiResult.response;
            } else {
                throw new Error('AI falló');
            }
        } catch (error) {
            console.error('Brain error:', error);
            response = '❌ Error al procesar. Reformula tu pregunta.';
        }

        this.context.add('ai', response);
        this.state = 'IDLE';
        return response;
    }

    isInverseProblem(text) {
        const lower = text.toLowerCase();
        const hasDiscountPrice = /cuesta|vale|pagado|precio.*con|con.*descuento|con.*rebaja|con el \d+%/i.test(text);
        const asksOriginal = /costaba|valía|antes|precio original|sin descuento|cuanto.*antes/i.test(text);

        return hasDiscountPrice && asksOriginal;
    }

    buildConversationHistory() {
        const recentHistory = this.context.history.slice(-8);
        return recentHistory.map(h => ({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.text
        }));
    }


    decideIntent(text, originalText) {
        if (this.math.isMath(text)) {
            const wordCount = originalText.split(' ').length;
            const hasContext = wordCount > 12;

            // NEVER consider these as simple - they need SmartVerifier
            const isInverseProblem = this.isInverseProblem(originalText);
            const isPercentageQuestion = /qué porcentaje|cuál.*porcentaje|representan/i.test(originalText);
            const isDiscountProblem = /descuento|rebaja|aument|disminuir|recargo|multa/i.test(originalText);
            const needsAI = isInverseProblem || isPercentageQuestion || isDiscountProblem;

            return {
                type: 'MATH',
                isSimple: !hasContext && !needsAI  // Only simple if short AND not complex type
            };
        }

        const casualPhrases = ['hola', 'hey', 'como estas', 'que tal', 'gracias', 'adios'];
        if (text.length < 50 && casualPhrases.some(p => text.includes(p))) {
            return { type: 'CHAT' };
        }

        const questionWords = ['que es', 'cual es', 'cuando', 'donde', 'quien es', 'dime', 'explica'];
        if (text.includes('?') || questionWords.some(q => text.includes(q))) {
            return { type: 'SEARCH_QUERY' };
        }

        return { type: 'CHAT' };
    }

    isFollowUp(text) {
        return ['su', 'el', 'ella', 'eso'].some(p => text.startsWith(p + ' '));
    }
}
