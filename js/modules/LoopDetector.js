class LoopDetector {
    constructor() {
        this.minRepetitionsForLoop = 3;
    }

    /**
     * Detecta loops, repeticiones y razonamiento circular en una respuesta
     */
    detectLoop(text) {
        if (!text || text.length < 50) {
            return { hasLoop: false };
        }

        // 1. Detectar repeticiones exactas de frases
        const phraseLoop = this.detectRepeatingPhrases(text);
        if (phraseLoop.detected) {
            return {
                hasLoop: true,
                type: 'repeating_phrases',
                pattern: phraseLoop.phrase,
                count: phraseLoop.count,
                message: `Detecté que estoy repitiendo "${phraseLoop.phrase}" ${phraseLoop.count} veces. Necesito cambiar de enfoque.`
            };
        }

        // 2. Detectar patrones circulares como "Pero si... Pero si..."
        const circularPattern = this.detectCircularReasoning(text);
        if (circularPattern.detected) {
            return {
                hasLoop: true,
                type: 'circular_reasoning',
                pattern: circularPattern.pattern,
                message: 'Estoy en un razonamiento circular sin llegar a una conclusión. Debo usar otro método.'
            };
        }

        // 3. Detectar respuestas truncadas o cortadas abruptamente
        const truncated = this.detectTruncation(text);
        if (truncated.detected) {
            return {
                hasLoop: true,
                type: 'truncated_response',
                message: 'Mi respuesta parece estar incompleta o cortada. Necesito reformular más concisamente.'
            };
        }

        // 4. Detectar argumentos repetitivos sin progreso
        const repetitiveArgs = this.detectRepetitiveArguments(text);
        if (repetitiveArgs.detected) {
            return {
                hasLoop: true,
                type: 'repetitive_arguments',
                message: 'Estoy repitiendo argumentos similares sin avanzar en la solución.'
            };
        }

        return { hasLoop: false };
    }

    /**
     * Detecta frases que se repiten exactamente
     */
    detectRepeatingPhrases(text) {
        const sentences = text.split(/[.!?]\n/).filter(s => s.trim().length > 10);
        const sentenceCounts = {};

        for (const sentence of sentences) {
            const normalized = sentence.trim().toLowerCase();
            if (normalized.length > 15) {
                sentenceCounts[normalized] = (sentenceCounts[normalized] || 0) + 1;
            }
        }

        for (const [phrase, count] of Object.entries(sentenceCounts)) {
            if (count >= this.minRepetitionsForLoop) {
                return {
                    detected: true,
                    phrase: phrase.substring(0, 50) + '...',
                    count: count
                };
            }
        }

        return { detected: false };
    }

    /**
     * Detecta patrones como "Pero si X... Pero si X... Pero si X..."
     */
    detectCircularReasoning(text) {
        // Patrón: mismo inicio de frase repetido muchas veces
        const patterns = [
            /(?:Pero si|Sin embargo|Por lo tanto|Entonces)\s+[^.]{10,50}/gi,
            /Si\s+n\s*=\s*[^.]{5,30}/gi
        ];

        for (const pattern of patterns) {
            const matches = text.match(pattern) || [];

            if (matches.length >= 5) {
                // Verificar si son muy similares
                const uniqueMatches = new Set(matches.map(m => m.toLowerCase()));
                if (uniqueMatches.size <= 3) {
                    return {
                        detected: true,
                        pattern: Array.from(uniqueMatches)[0]
                    };
                }
            }
        }

        return { detected: false };
    }

    /**
     * Detecta si la respuesta fue truncada
     */
    detectTruncation(text) {
        const lastLines = text.split('\n').slice(-5).join('\n');

        // Señales de truncamiento
        const truncationSignals = [
            /Pero si n = [^.]*$/i,  // Termina abruptamente
            /[^.!?]\s*$/,            // No termina con puntuación
            lastLines.length < 20    // Últimas líneas muy cortas
        ];

        // Verificar si hay repeticiones antes del final
        const hasRepetitionsBeforeEnd = /(.{20,})\1{2,}[^.]*$/.test(text);

        if (hasRepetitionsBeforeEnd || truncationSignals.some(signal =>
            typeof signal === 'boolean' ? signal : signal.test(lastLines)
        )) {
            return { detected: true };
        }

        return { detected: false };
    }

    /**
     * Detecta argumentos repetitivos (misma estructura, diferente contenido)
     */
    detectRepetitiveArguments(text) {
        // Buscar estructuras como "Si n = X, entonces... Si n = Y, entonces..."
        const argPattern = /Si\s+n\s*=\s*(-?\d+)[^.]{20,}/gi;
        const matches = text.match(argPattern) || [];

        if (matches.length > 5) {
            // Si hay muchos casos similares, probablemente es repetitivo
            return {
                detected: true,
                count: matches.length
            };
        }

        return { detected: false };
    }

    /**
     * Genera un prompt de corrección basado en el tipo de loop detectado
     */
    generateCorrectionPrompt(loopInfo, question) {
        const basePrompt = `❌ LOOP DETECTADO: ${loopInfo.message}

Pregunta original: ${question}

INSTRUCCIONES PARA CORREGIR:
1. NO repitas frases ni argumentos
2. Usa un enfoque matemático diferente
3. Sé directo: máximo 3 ejemplos
4. Llega a una CONCLUSIÓN CLARA

`;

        if (loopInfo.type === 'circular_reasoning') {
            return basePrompt + `
Estrategias alternativas:
- Si el problema es sobre primos, considera factorización
- Si es sobre enteros, prueba casos pequeños (n = 0, ±1, ±2)
- Si estás atascado, reformula el problema

Responde de forma CONCISA y DIRECTA.`;
        }

        if (loopInfo.type === 'repetitive_arguments') {
            return basePrompt + `
En vez de probar cada valor manualmente:
- Busca un PATRÓN general
- Usa FACTORIZACIÓN o identidades algebraicas
- Llega a una conclusión matemática rigurosa

Máximo 300 palabras.`;
        }

        return basePrompt + `
Reformula tu respuesta de forma:
- CONCISA (máximo 400 palabras)
- DIRECTA (ve al grano)
- CONCLUYENTE (termina con la respuesta clara)`;
    }
}
