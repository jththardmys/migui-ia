// AIEngine - Frontend (Calls secure backend)
// API keys are now stored securely on the server

class AIEngine {
    constructor() {
        // Backend URL - change this when you deploy
        this.backendUrl = this.getBackendUrl();

        this.textModel = 'llama-3.3-70b-versatile';
        this.visionModel = 'llama-3.2-90b-vision-preview';

        this.smartVerifier = typeof SmartVerifier !== 'undefined' ? new SmartVerifier() : null;
        this.loopDetector = typeof LoopDetector !== 'undefined' ? new LoopDetector() : null;
        this.reasoningEngine = typeof ReasoningEngine !== 'undefined' ? new ReasoningEngine() : null;

        this.isReady = true; // Backend handles keys

        console.log('🚀 AIEngine initialized - Backend:', this.backendUrl);
    }

    getBackendUrl() {
        // Check if we're in production (not localhost)
        const hostname = window.location.hostname;

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Development - backend runs on port 3001
            return 'http://localhost:3001/api';
        } else {
            // Production - backend runs on same domain or specified URL
            // Update this URL when you deploy your backend
            return window.BACKEND_URL || '/api';
        }
    }

    async callBackend(endpoint, data) {
        try {
            const response = await fetch(`${this.backendUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.status === 429) {
                throw new Error('Todas las APIs han alcanzado su límite diario. Por favor, espera unas horas.');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed')) {
                throw new Error('No se pudo conectar al servidor. Asegúrate de que el backend esté corriendo.');
            }
            throw error;
        }
    }

    detectMathComplexity(text) {
        const isNumberTheory = /primo|primalidad|divisor|factoriza|entero.*tal que|determina.*enteros/i.test(text);
        const isProof = /demuestra|prueba|demostración|para todo.*n/i.test(text);
        const hasAdvancedNotation = /[²³⁴⁵⁶⁷⁸⁹]|\^|∑|∏|∫/i.test(text);

        const isAdvanced = isNumberTheory || isProof || hasAdvancedNotation;

        return {
            isAdvanced,
            isNumberTheory,
            requiresProof: isProof,
            needsVerification: isAdvanced,
            needsLowTemp: isAdvanced,
            needsMoreTokens: isProof || isNumberTheory
        };
    }

    async generate(userMessage, conversationHistory = [], imageData = null) {
        try {
            const isMathProblem = /calcul|resuelve|cuanto|cuánto|porcentaje|%|descuento|precio|dividid|multiplicad|elevado|notacion|científica|primo|factoriza|determina/i.test(userMessage);

            const complexity = this.detectMathComplexity(userMessage);
            const temperature = complexity.needsLowTemp ? 0.1 : 0.2;
            const maxTokens = complexity.needsMoreTokens ? 3500 : 2048;

            console.log(`📊 Problem complexity:`, complexity);

            // Vision path - call vision endpoint
            if (imageData) {
                console.log('🖼️ Sending image to backend vision endpoint...');

                const result = await this.callBackend('/vision', {
                    userMessage: userMessage || 'Extrae TODO el texto de esta imagen y resuelve el problema paso a paso.',
                    imageData: imageData,
                    conversationHistory: conversationHistory
                });

                return {
                    success: true,
                    response: result.response
                };
            }

            // Text-only path
            const messages = [
                ...conversationHistory,
                { role: 'user', content: userMessage }
            ];

            const result = await this.callBackend('/chat', {
                messages: messages,
                model: this.textModel,
                temperature: temperature,
                maxTokens: maxTokens
            });

            const primaryAnswer = result.response;

            // SMART VERIFICATION - Only for complex inverse/optimization problems
            const isComplexMathProblem = /descuento.*precio|precio.*original|costaba.*antes|coste.*inicial|optimiza|máximo.*área|mínimo.*cost|mayor.*beneficio/i.test(userMessage);

            if (this.smartVerifier && isComplexMathProblem && userMessage.length > 40) {
                console.log('🔍 Complex problem detected - Starting SmartVerifier...');

                try {
                    const verifyResult = await this.smartVerifier.verify(userMessage, primaryAnswer);

                    if (verifyResult.needsCorrection && verifyResult.confidence > 0.7) {
                        console.log(`❌ Error detected: ${verifyResult.errorType}`);
                        console.log('🔄 Auto-correcting...');

                        const correctionMessages = [
                            ...conversationHistory,
                            { role: 'user', content: userMessage },
                            { role: 'assistant', content: primaryAnswer },
                            { role: 'user', content: verifyResult.suggestedPrompt }
                        ];

                        const correctedResult = await this.callBackend('/chat', {
                            messages: correctionMessages,
                            model: this.textModel,
                            temperature: 0.1,
                            maxTokens: maxTokens
                        });

                        console.log('✅ Correction applied');
                        return { success: true, response: correctedResult.response };
                    } else {
                        console.log(`✅ Answer OK (confidence: ${verifyResult.confidence})`);
                    }

                } catch (verifyError) {
                    console.warn('Verification skipped:', verifyError.message);
                }
            } else if (isMathProblem) {
                console.log('📝 Simple math problem - skipping verification');
            }

            return { success: true, response: primaryAnswer };

        } catch (error) {
            console.error('AI Engine Error:', error);
            throw error;
        }
    }
}
