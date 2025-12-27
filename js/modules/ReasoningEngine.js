// ReasoningEngine - Advanced reasoning and problem decomposition
// Enables multi-step thinking, hypothesis generation, and self-reflection

class ReasoningEngine {
    constructor() {
        this.COMPLEXITY_THRESHOLD = 50; // Characters to consider "complex"
        this.MAX_SUBPROBLEMS = 5;
    }

    /**
     * Analyze a problem and determine if it needs decomposition
     */
    analyzeComplexity(text) {
        const indicators = {
            multiStep: /primero.*luego|después.*finalmente|paso \d|steps?/i.test(text),
            hasMultipleQuestions: (text.match(/\?/g) || []).length > 1,
            hasConditionals: /si.*entonces|cuando.*si|en caso de/i.test(text),
            hasMultipleNumbers: (text.match(/\d+/g) || []).length > 3,
            hasComparison: /comparar|diferencia entre|versus|vs|mejor.*peor/i.test(text),
            isLongProblem: text.length > this.COMPLEXITY_THRESHOLD * 3,
            hasMathKeywords: /ecuación|sistema|derivada|integral|optimiz/i.test(text),
            hasLogicKeywords: /todos.*algunos|si.*entonces|implica|por lo tanto/i.test(text)
        };

        const complexityScore = Object.values(indicators).filter(Boolean).length;

        return {
            isComplex: complexityScore >= 2,
            score: complexityScore,
            indicators,
            needsDecomposition: indicators.multiStep || indicators.hasMultipleQuestions || complexityScore >= 3,
            type: this.detectProblemType(text)
        };
    }

    /**
     * Detect the type of problem for specialized handling
     */
    detectProblemType(text) {
        const lower = text.toLowerCase();

        if (/deriv|integr|límite|lím|máximo|mínimo|optimiz/i.test(text)) return 'calculus';
        if (/ecuación|resolver.*x|despeja|sistema/i.test(text)) return 'algebra';
        if (/probabilidad|combinat|permuta|factorial/i.test(text)) return 'probability';
        if (/triángulo|círculo|área|perímetro|volumen|geometr/i.test(text)) return 'geometry';
        if (/porcentaje|descuento|interés|precio/i.test(text)) return 'percentage';
        if (/todos.*algunos|lógica|silogismo|implica/i.test(text)) return 'logic';
        if (/código|programa|función|algoritmo|bug/i.test(text)) return 'programming';
        if (/qué es|quién|cuándo|donde|historia/i.test(text)) return 'factual';

        return 'general';
    }

    /**
     * Decompose a complex problem into sub-problems
     */
    decompose(text) {
        const analysis = this.analyzeComplexity(text);
        if (!analysis.needsDecomposition) {
            return { decomposed: false, original: text };
        }

        const subproblems = [];

        // Split by question marks
        if (analysis.indicators.hasMultipleQuestions) {
            const questions = text.split('?').filter(q => q.trim().length > 10);
            questions.forEach((q, i) => {
                subproblems.push({
                    id: i + 1,
                    text: q.trim() + '?',
                    type: this.detectProblemType(q)
                });
            });
        }

        // Split by step indicators
        if (analysis.indicators.multiStep && subproblems.length === 0) {
            const stepPatterns = text.split(/(?:primero|luego|después|finalmente|paso \d)/i);
            stepPatterns.filter(s => s.trim().length > 15).forEach((step, i) => {
                subproblems.push({
                    id: i + 1,
                    text: step.trim(),
                    type: this.detectProblemType(step)
                });
            });
        }

        return {
            decomposed: subproblems.length > 1,
            original: text,
            subproblems: subproblems.slice(0, this.MAX_SUBPROBLEMS),
            analysis
        };
    }

    /**
     * Generate reasoning chain prompt for complex problems
     */
    generateChainOfThought(problemType) {
        const chains = {
            calculus: `
RAZONAMIENTO PARA CÁLCULO:
1. Identificar la función y variables
2. Determinar qué operación se necesita (derivar/integrar/límite)
3. Aplicar las reglas correspondientes
4. Simplificar el resultado
5. Verificar derivando/integrando el resultado`,

            algebra: `
RAZONAMIENTO PARA ÁLGEBRA:
1. Identificar la incógnita y lo que se busca
2. Ordenar y simplificar la ecuación
3. Aislar la variable paso a paso
4. Resolver (fórmula cuadrática si es necesario)
5. Verificar sustituyendo en la ecuación original`,

            percentage: `
RAZONAMIENTO PARA PORCENTAJES:
1. ¿Es problema DIRECTO o INVERSO?
   - DIRECTO: Tengo el original, calculo el resultado
   - INVERSO: Tengo el resultado, calculo el original
2. Plantear la ecuación correcta
3. Resolver la operación (multiplicar o dividir según corresponda)
4. VERIFICAR: aplicar la operación inversa`,

            geometry: `
RAZONAMIENTO PARA GEOMETRÍA:
1. Identificar la figura y propiedades conocidas
2. Dibujar mentalmente o esquematizar
3. Seleccionar las fórmulas aplicables
4. Sustituir valores conocidos
5. Calcular y verificar unidades`,

            logic: `
RAZONAMIENTO PARA LÓGICA:
1. Identificar premisas y conclusión buscada
2. Traducir a lenguaje formal si ayuda
3. Verificar validez de cada paso
4. ¿La conclusión se sigue necesariamente?
5. Buscar contraejemplos`,

            programming: `
RAZONAMIENTO PARA CÓDIGO:
1. Entender qué debe hacer el código
2. Identificar inputs y outputs esperados
3. Rastrear el flujo de ejecución
4. Buscar edge cases y errores comunes
5. Verificar con casos de prueba`,

            default: `
RAZONAMIENTO GENERAL:
1. ¿Qué se pregunta exactamente?
2. ¿Qué información tengo disponible?
3. ¿Qué pasos lógicos conectan la información con la respuesta?
4. Ejecutar los pasos
5. ¿Tiene sentido la respuesta?`
        };

        return chains[problemType] || chains.default;
    }

    /**
     * Generate self-reflection prompt
     */
    generateReflectionPrompt(originalQuestion, answer) {
        return `REFLEXIÓN CRÍTICA:

Pregunta original: "${originalQuestion}"

Mi respuesta fue: "${answer.substring(0, 500)}..."

PREGUNTAS DE VERIFICACIÓN:
1. ¿Respondí exactamente lo que se preguntaba?
2. ¿Mi razonamiento tiene saltos lógicos?
3. ¿Los números/cálculos son correctos?
4. ¿Hay interpretaciones alternativas que no consideré?
5. Nivel de confianza (1-10): ¿Cuánto apostaría por esta respuesta?

Si encuentro errores, debo corregir y explicar la corrección.`;
    }

    /**
     * Generate hypothesis for ambiguous problems
     */
    generateHypotheses(text, maxHypotheses = 3) {
        const analysis = this.analyzeComplexity(text);

        // For ambiguous problems, generate possible interpretations
        const hypotheses = [];

        if (analysis.type === 'percentage') {
            hypotheses.push({
                interpretation: 'Problema directo (calcular resultado)',
                formula: 'Resultado = Original × (1 ± porcentaje)'
            });
            hypotheses.push({
                interpretation: 'Problema inverso (calcular original)',
                formula: 'Original = Resultado ÷ (1 ± porcentaje)'
            });
        }

        return hypotheses.slice(0, maxHypotheses);
    }

    /**
     * Validate an answer against the problem type
     */
    validateAnswer(problemType, question, answer) {
        const validations = {
            percentage: () => {
                // Check if answer contains verification
                const hasVerification = /verific|comprob|sustitu/i.test(answer);
                const hasCorrectFormula = /÷|dividir|entre/i.test(answer) || /×|multiplicar|por/i.test(answer);
                return { valid: hasVerification && hasCorrectFormula, reason: 'Debe incluir verificación y fórmula correcta' };
            },
            algebra: () => {
                const hasSubstitution = /sustitu|x.*=|reemplaz/i.test(answer);
                return { valid: hasSubstitution, reason: 'Debe verificar sustituyendo en la ecuación original' };
            },
            calculus: () => {
                const hasDerivative = /f'|deriv|V'/i.test(answer);
                return { valid: hasDerivative, reason: 'Problemas de cálculo requieren derivadas/integrales' };
            }
        };

        const validator = validations[problemType];
        if (validator) {
            return validator();
        }

        return { valid: true, reason: 'Validación general pasada' };
    }
}

// Export for use in AIEngine
if (typeof module !== 'undefined') {
    module.exports = ReasoningEngine;
}
