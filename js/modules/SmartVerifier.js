class SmartVerifier {
    constructor() {
        this.ERROR_PATTERNS = {
            inverseProblem: {
                wrongPattern: /multiplica.*por.*\d+%|×.*0\.\d+.*=/i,
                correctPattern: /divid|÷|\//i,
                hint: "En problemas inversos, debes DIVIDIR el precio final entre (1 - descuento%), no multiplicar."
            },
            percentageOfTotal: {
                wrongPattern: /directamente|simplemente.*\d+%/i,
                correctPattern: /\(.*\/.*\).*×.*100/i,
                hint: "Para obtener un porcentaje: (parte ÷ total) × 100"
            }
        };
    }

    /**
     * Verificación multi-etapa completa
     * @param {string} question - Pregunta original
     * @param {string} answer - Respuesta del AI
     * @returns {Object} - { needsCorrection, errorType, suggestedPrompt, confidence }
     */
    async verify(question, answer) {
        const problemType = this.detectProblemType(question);

        console.log(`🔍 SmartVerifier: Detected type = ${problemType}`);

        // ETAPA 1: Detección de tipo y patterns
        const typeCheck = this.checkProblemTypeLogic(problemType, question, answer);
        if (typeCheck.hasError) {
            return {
                needsCorrection: true,
                errorType: typeCheck.errorType,
                suggestedPrompt: typeCheck.correctionPrompt,
                confidence: 0.9,
                stage: 1
            };
        }

        // ETAPA 2: Verificación numérica
        const numCheck = this.numericalVerification(problemType, question, answer);
        if (numCheck.hasError) {
            return {
                needsCorrection: true,
                errorType: 'numerical_inconsistency',
                suggestedPrompt: numCheck.correctionPrompt,
                confidence: 0.85,
                stage: 2
            };
        }

        // ETAPA 3: Verificación de respuesta inversa
        if (problemType === 'inverse_problem') {
            const reverseCheck = this.reverseCalculationCheck(question, answer);
            if (reverseCheck.hasError) {
                return {
                    needsCorrection: true,
                    errorType: 'reverse_calculation_failed',
                    suggestedPrompt: reverseCheck.correctionPrompt,
                    confidence: 0.95,
                    stage: 3
                };
            }
        }

        // Todo bien
        return {
            needsCorrection: false,
            confidence: 0.95,
            stage: 'all_passed'
        };
    }

    /**
     * Detecta el tipo de problema matemático
     */
    detectProblemType(text) {
        const lower = text.toLowerCase();

        // Problema de optimización: "maximizar", "volumen máximo", "área mínima"
        if (/maxim|minim|optimiz|mayor volumen|menor costo|máximo|mínimo/i.test(text) &&
            /volumen|área|costo|función|deriva/i.test(text)) {
            return 'optimization_problem';
        }

        // Problema inverso: "cuesta X con Y% descuento, ¿cuánto costaba?"
        if (/cuesta|vale|precio.*con.*%|con.*\d+%.*descuento|con.*\d+%.*rebaja/i.test(text) &&
            /costaba|valía|antes|precio original|sin descuento/i.test(text)) {
            return 'inverse_problem';
        }

        // Porcentaje de un total: "5 de 29, ¿qué porcentaje?"
        if (/qué porcentaje|que porcentaje|cuál es el porcentaje/i.test(text) &&
            /\d+.*de.*\d+|\d+.*total/i.test(text)) {
            return 'percentage_of_total';
        }

        // Aumento/descuento directo: "30€ con aumento del 20%"
        if (/aument|disminuir|disminuye|increment|decrece/i.test(text)) {
            return 'percentage_change';
        }

        // Cálculo con recargo: "multa con recargo"
        if (/recargo|multa|sanción/i.test(text)) {
            return 'penalty_calculation';
        }

        // === NUEVOS TIPOS ===

        // Ecuaciones cuadráticas
        if (/x²|x\^2|ecuación cuadrática|ax².*bx.*c|formula.*cuadrática/i.test(text)) {
            return 'quadratic_equation';
        }

        // Sistemas de ecuaciones
        if (/sistema.*ecuacion|ecuaciones simultáneas|despeja.*sustituye/i.test(text)) {
            return 'equation_system';
        }

        // Probabilidad
        if (/probabilidad|dado|moneda|baraja|combinatoria|permutación/i.test(text)) {
            return 'probability';
        }

        // Geometría
        if (/triángulo|círculo|cuadrado|rectángulo|perímetro|área|hipotenusa|pitágoras/i.test(text)) {
            return 'geometry';
        }

        // Lógica proposicional
        if (/todos.*son|algunos.*son|ningún.*es|si.*entonces|implica|silogismo/i.test(text)) {
            return 'propositional_logic';
        }

        // Programación/Código
        if (/código|programa|función.*retorna|algoritmo|bug|error.*código/i.test(text)) {
            return 'programming';
        }

        // Sucesiones y series
        if (/sucesión|serie|término.*n|fibonacci|aritmética|geométrica/i.test(text)) {
            return 'sequences';
        }

        // Derivadas e integrales
        if (/deriva|integral|\∫|d\/dx|f'\(x\)/i.test(text)) {
            return 'calculus';
        }

        return 'general_math';
    }

    /**
     * ETAPA 1: Verifica que la lógica del tipo de problema sea correcta
     */
    checkProblemTypeLogic(problemType, question, answer) {
        switch (problemType) {
            case 'inverse_problem':
                return this.checkInverseProblemLogic(question, answer);

            case 'percentage_of_total':
                return this.checkPercentageOfTotalLogic(question, answer);

            case 'optimization_problem':
                return this.checkOptimizationLogic(question, answer);

            case 'quadratic_equation':
                return this.checkQuadraticLogic(question, answer);

            case 'probability':
                return this.checkProbabilityLogic(question, answer);

            case 'geometry':
                return this.checkGeometryLogic(question, answer);

            case 'propositional_logic':
                return this.checkLogicLogic(question, answer);

            case 'calculus':
                return this.checkCalculusLogic(question, answer);

            default:
                return { hasError: false };
        }
    }

    /**
     * Verifica ecuaciones cuadráticas
     */
    checkQuadraticLogic(question, answer) {
        const hasFormula = /\(-b.*±.*√|fórmula.*cuadrática|x.*=.*-b/i.test(answer);
        const hasDiscriminant = /discriminant|b².*-.*4ac|Δ/i.test(answer);
        const hasVerification = /verific|comprob|sustitu/i.test(answer);

        if (!hasFormula && /cuadrática|x²/i.test(question)) {
            return {
                hasError: true,
                errorType: 'quadratic_missing_formula',
                correctionPrompt: `Para ecuaciones cuadráticas ax² + bx + c = 0, usa la fórmula:

x = (-b ± √(b² - 4ac)) / 2a

Muestra los pasos: identificar a, b, c → calcular discriminante → aplicar fórmula → verificar soluciones.`
            };
        }

        return { hasError: false };
    }

    /**
     * Verifica problemas de probabilidad
     */
    checkProbabilityLogic(question, answer) {
        const hasFraction = /\/|÷|entre/i.test(answer);
        const hasTotal = /total|posibles|favorables/i.test(answer);

        if (/probabilidad/i.test(question) && !hasFraction) {
            return {
                hasError: true,
                errorType: 'probability_missing_calculation',
                correctionPrompt: `Para problemas de probabilidad, usa:

P(evento) = Casos favorables / Casos totales

Identifica claramente cuántos casos favorables hay y cuál es el total de casos posibles.`
            };
        }

        return { hasError: false };
    }

    /**
     * Verifica problemas de geometría
     */
    checkGeometryLogic(question, answer) {
        const hasFormula = /π|pi|²|área.*=|perímetro.*=/i.test(answer);
        const hasUnits = /cm|m|metros|centímetros|unidades/i.test(answer);

        if (/área|perímetro|volumen/i.test(question) && !hasFormula) {
            return {
                hasError: true,
                errorType: 'geometry_missing_formula',
                correctionPrompt: `Para problemas de geometría, recuerda las fórmulas básicas:
- Círculo: A = πr², P = 2πr
- Rectángulo: A = base × altura, P = 2(base + altura)
- Triángulo: A = (base × altura) / 2

Muestra la fórmula usada y los cálculos.`
            };
        }

        return { hasError: false };
    }

    /**
     * Verifica problemas de lógica
     */
    checkLogicLogic(question, answer) {
        const hasReasoning = /por lo tanto|entonces|implica|se deduce|concluimos/i.test(answer);
        const hasPremises = /premisa|dado que|sabemos que/i.test(answer);

        if (/todos.*son|si.*entonces/i.test(question) && !hasReasoning) {
            return {
                hasError: true,
                errorType: 'logic_missing_reasoning',
                correctionPrompt: `Para problemas de lógica:
1. Identifica las premisas (lo que se afirma como verdadero)
2. Analiza las relaciones lógicas
3. Deriva la conclusión paso a paso
4. Verifica si la conclusión es válida o hay contraejemplos`
            };
        }

        return { hasError: false };
    }

    /**
     * Verifica problemas de cálculo (derivadas/integrales)
     */
    checkCalculusLogic(question, answer) {
        const hasDerivative = /f'|deriv|d\/dx|'/i.test(answer);
        const hasRules = /regla|cadena|producto|cociente|potencia/i.test(answer);

        if (/deriva/i.test(question) && !hasDerivative) {
            return {
                hasError: true,
                errorType: 'calculus_missing_derivative',
                correctionPrompt: `Para derivadas, aplica las reglas:
- Potencia: d/dx(x^n) = n·x^(n-1)
- Cadena: d/dx(f(g(x))) = f'(g(x))·g'(x)
- Producto: d/dx(f·g) = f'·g + f·g'

Muestra cada paso de la derivación.`
            };
        }

        return { hasError: false };
    }

    /**
     * Verifica lógica de problemas inversos
     */
    checkInverseProblemLogic(question, answer) {
        // Extrae el porcentaje del descuento
        const discountMatch = question.match(/(\d+)%/);
        if (!discountMatch) return { hasError: false };

        const discount = parseInt(discountMatch[1]);

        // PATRÓN DE ERROR: Si la respuesta multiplica el precio final por el descuento
        const wrongMultiplication = new RegExp(`\\d+\\s*[×\\*]\\s*0?\\.?${discount}|${discount}%.*=.*\\d+`, 'i');

        if (wrongMultiplication.test(answer)) {
            return {
                hasError: true,
                errorType: 'inverse_problem_wrong_operation',
                correctionPrompt: `¡ALTO! Este es un problema INVERSO.

Te dan: Precio FINAL con descuento = X€
Te preguntan: ¿Cuál era el precio ORIGINAL?

❌ ERROR DETECTADO: Estás multiplicando el precio final por el descuento.
✅ DEBES: Dividir el precio final entre (1 - descuento%)

Fórmula correcta:
Precio Original = Precio Final ÷ (1 - ${discount}%)
Precio Original = Precio Final ÷ ${(100 - discount) / 100}

Reformula tu respuesta usando la fórmula correcta.`
            };
        }

        // Verifica que mencione división o el factor correcto
        const hasDivision = /divid|÷|divide|entre/i.test(answer);
        const correctFactor = new RegExp(`0\\.${100 - discount}|${(100 - discount) / 100}`, 'i');
        const hasCorrectFactor = correctFactor.test(answer);

        if (!hasDivision && !hasCorrectFactor) {
            return {
                hasError: true,
                errorType: 'inverse_problem_missing_correct_operation',
                correctionPrompt: `Este es un problema INVERSO. Debes usar la fórmula:

Precio Original = Precio Final ÷ (1 - ${discount}%)

Asegúrate de DIVIDIR, no multiplicar.`
            };
        }

        return { hasError: false };
    }

    /**
     * Verifica lógica de porcentaje de un total
     */
    checkPercentageOfTotalLogic(question, answer) {
        // Extrae "X de Y"
        const match = question.match(/(\d+).*(?:de|total).*(\d+)|(\d+).*total/i);
        if (!match) return { hasError: false };

        // Verifica que la respuesta use división y multiplicación por 100
        const hasCorrectFormula = /\(.*÷.*\).*×.*100|\/.*\*.*100/i.test(answer);

        if (!hasCorrectFormula) {
            return {
                hasError: true,
                errorType: 'percentage_formula_missing',
                correctionPrompt: `Para calcular un porcentaje de un total, usa:

Porcentaje = (Parte ÷ Total) × 100

Asegúrate de dividir primero y luego multiplicar por 100.`
            };
        }

        return { hasError: false };
    }

    /**
     * Verifica lógica de problemas de optimización
     */
    checkOptimizationLogic(question, answer) {
        // Verifica que la respuesta mencione derivada
        const hasDerivative = /deriva|V'|f'|dV\/dx|df\/dx/i.test(answer);

        // Verifica que iguale a cero
        const setsToZero = /=\s*0|igual.*cero/i.test(answer);

        // Verifica que mencione verificación o segunda derivada
        const hasVerification = /verific|comprob|sustitu|segunda derivada|V''|f''/i.test(answer);

        if (!hasDerivative) {
            return {
                hasError: true,
                errorType: 'optimization_missing_derivative',
                correctionPrompt: `Para problemas de optimización (máximos/mínimos):

1. Primero expresa la función a optimizar
2. Calcula la DERIVADA de la función
3. Iguala la derivada a cero y resuelve
4. Verifica que el resultado sea válido

¿Puedes mostrar el desarrollo completo con la derivada?`
            };
        }

        if (!setsToZero) {
            return {
                hasError: true,
                errorType: 'optimization_missing_critical_point',
                correctionPrompt: `En problemas de optimización, después de calcular la derivada debes:

1. Igualar la derivada a CERO: f'(x) = 0
2. Resolver la ecuación resultante
3. Verificar que el punto crítico sea máximo o mínimo

Completa el desarrollo igualando a cero.`
            };
        }

        return { hasError: false };
    }

    /**
     * ETAPA 2: Verificación numérica - extrae números y verifica coherencia
     */
    numericalVerification(problemType, question, answer) {
        if (problemType === 'inverse_problem') {
            return this.verifyInverseProblemNumbers(question, answer);
        }

        if (problemType === 'percentage_of_total') {
            return this.verifyPercentageNumbers(question, answer);
        }

        return { hasError: false };
    }

    /**
     * Verifica números en problemas inversos
     */
    verifyInverseProblemNumbers(question, answer) {
        // Extrae precio final y descuento
        const priceMatch = question.match(/(\d+(?:\.\d+)?)[€\s]*con/i);
        const discountMatch = question.match(/(\d+)%/);

        if (!priceMatch || !discountMatch) return { hasError: false };

        const finalPrice = parseFloat(priceMatch[1]);
        const discount = parseInt(discountMatch[1]);

        // Extrae la respuesta numérica
        const answerMatch = answer.match(/(?:=|resultado|respuesta|costaba).*?(\d+(?:\.\d+)?)\s*€/i);
        if (!answerMatch) return { hasError: false };

        const claimedOriginal = parseFloat(answerMatch[1]);

        // Verificación inversa: Original × (1 - discount%) debe dar el precio final
        const calculatedFinal = claimedOriginal * (1 - discount / 100);
        const tolerance = 0.5; // 50 céntimos de tolerancia

        if (Math.abs(calculatedFinal - finalPrice) > tolerance) {
            const correctOriginal = finalPrice / (1 - discount / 100);
            return {
                hasError: true,
                correctionPrompt: `❌ ERROR NUMÉRICO DETECTADO:

Tu respuesta dice ${claimedOriginal}€, pero verificación:
${claimedOriginal}€ × (1 - ${discount}%) = ${calculatedFinal.toFixed(2)}€ ≠ ${finalPrice}€

La respuesta correcta es:
Precio Original = ${finalPrice}€ ÷ (1 - ${discount}%)
Precio Original = ${finalPrice}€ ÷ ${(100 - discount) / 100}
Precio Original = ${correctOriginal.toFixed(2)}€

Reformula con el cálculo correcto.`
            };
        }

        return { hasError: false };
    }

    /**
     * Verifica números en porcentaje de total
     */
    verifyPercentageNumbers(question, answer) {
        const match = question.match(/(\d+).*de.*(\d+)/i);
        if (!match) return { hasError: false };

        const part = parseInt(match[1]);
        const total = parseInt(match[2]);

        // Extrae el porcentaje de la respuesta
        const percentMatch = answer.match(/(\d+(?:\.\d+)?)\s*%/);
        if (!percentMatch) return { hasError: false };

        const claimedPercent = parseFloat(percentMatch[1]);
        const correctPercent = (part / total) * 100;

        if (Math.abs(claimedPercent - correctPercent) > 0.5) {
            return {
                hasError: true,
                correctionPrompt: `❌ ERROR NUMÉRICO:

Cálculo: (${part} ÷ ${total}) × 100 = ${correctPercent.toFixed(2)}%

Tu respuesta de ${claimedPercent}% es incorrecta. Usa la fórmula correcta.`
            };
        }

        return { hasError: false };
    }

    /**
     * ETAPA 3: Verificación de cálculo inverso
     */
    reverseCalculationCheck(question, answer) {
        // Ya verificado en numericalVerification
        return { hasError: false };
    }

    /**
     * Genera un prompt de corrección genérico
     */
    generateCorrectionPrompt(question, errorType) {
        const prompts = {
            'inverse_problem_wrong_operation': `ANALIZA CUIDADOSAMENTE:

Esta pregunta: "${question}"

Te da el precio FINAL con descuento y pregunta el precio ORIGINAL.

Fórmula: Original = Final ÷ (1 - descuento%)

Responde correctamente usando esta fórmula.`,

            'default': `Verifica tu respuesta para: "${question}"

Piensa paso a paso y asegúrate de usar la fórmula correcta.`
        };

        return prompts[errorType] || prompts['default'];
    }
}
