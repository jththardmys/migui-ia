class MathCore {
    isMath(text) {
        const hasNumbers = /\d/.test(text);
        const hasMathWords = /porcentaje|porciento|%|aumento|disminuir|aumentar|multiplicar|dividir|sumar|restar|raiz|calcul|resuelve/.test(text.toLowerCase());
        const hasOp = /[\+\-\*\/\^]/.test(text);
        return hasNumbers && (hasMathWords || hasOp);
    }

    solve(text) {
        try {
            const lower = text.toLowerCase();

            // Handle percentage increase/decrease
            if (lower.includes('aument') || lower.includes('disminuir') || lower.includes('disminuye')) {
                return this.solvePercentageChange(lower, text);
            }

            // Handle percentage calculation
            if (lower.includes('%') || lower.includes('porciento') || lower.includes('porcentaje')) {
                return this.solvePercentage(lower, text);
            }

            // Handle índice de variación questions
            if (lower.includes('indice') || lower.includes('índice') || lower.includes('multiplicar')) {
                return this.solveVariationIndex(lower, text);
            }

            // Handle square root
            if (lower.includes('raiz') || lower.includes('raíz')) {
                return this.solveSqrt(lower);
            }

            // Standard arithmetic
            let expr = lower
                .replace(/cuanto es/g, '')
                .replace(/calcula/g, '')
                .replace(/resuelve/g, '')
                .replace(/por/g, '*')
                .replace(/entre/g, '/')
                .replace(/pi/g, 'Math.PI')
                .replace(/\^/g, '**')
                .replace(/x/g, '*');

            const safeExpr = expr.replace(/[^0-9\.\+\-\*\/\(\)\sMath\.PI]/g, '').trim();

            if (safeExpr.length < 1) throw new Error("No detecté números");

            const result = eval(safeExpr);

            if (isNaN(result) || !isFinite(result)) throw new Error("Resultado inválido");

            return {
                success: true,
                result: result,
                steps: `${safeExpr} = **${result}**`
            };

        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    solvePercentageChange(text, original) {
        // Extract: "30 euros" + "aumento del 20%"
        const baseMatch = text.match(/(\d+(?:\.\d+)?)\s*euros?|de\s+(\d+(?:\.\d+)?)/);
        const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);

        if (baseMatch && percentMatch) {
            const base = parseFloat(baseMatch[1] || baseMatch[2]);
            const percent = parseFloat(percentMatch[1]);

            const isIncrease = text.includes('aument');
            const change = (base * percent) / 100;
            const result = isIncrease ? base + change : base - change;

            const steps = isIncrease
                ? `Paso 1: Calcular ${percent}% de ${base} = ${change}\nPaso 2: Sumar al original: ${base} + ${change} = **${result} euros**`
                : `Paso 1: Calcular ${percent}% de ${base} = ${change}\nPaso 2: Restar del original: ${base} - ${change} = **${result} euros**`;

            return {
                success: true,
                result: result,
                steps: steps
            };
        }

        return { success: false, error: "No detecté los números correctamente" };
    }

    solvePercentage(text, original) {
        const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
        const totalMatch = text.match(/de\s+(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s+estudiantes|(\d+(?:\.\d+)?)\s+alumnos/);

        if (percentMatch) {
            const percent = parseFloat(percentMatch[1]);

            if (totalMatch) {
                const total = parseFloat(totalMatch[1] || totalMatch[2] || totalMatch[3]);
                const result = (total * percent) / 100;

                return {
                    success: true,
                    result: result,
                    steps: `Cálculo: (${total} × ${percent}) ÷ 100 = **${result}**`
                };
            }

            // Just asking for the decimal/multiplier
            const decimal = percent / 100;
            return {
                success: true,
                result: decimal,
                steps: `Índice de variación: ${percent}% = ${percent}/100 = **${decimal}**`
            };
        }

        return { success: false, error: "No detecté el porcentaje" };
    }

    solveVariationIndex(text, original) {
        // Questions like "por qué número multiplicar para hacer el 43%"
        const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);

        if (percentMatch) {
            const percent = parseFloat(percentMatch[1]);
            const decimal = percent / 100;

            let explanation = "";
            if (text.includes('aument')) {
                const multiplier = 1 + decimal;
                explanation = `Para aumentar un ${percent}%: 1 + ${decimal} = **${multiplier}**`;
                return { success: true, result: multiplier, steps: explanation };
            } else if (text.includes('disminuir')) {
                const multiplier = 1 - decimal;
                explanation = `Para disminuir un ${percent}%: 1 - ${decimal} = **${multiplier}**`;
                return { success: true, result: multiplier, steps: explanation };
            } else {
                // Just calculate the percentage
                explanation = `Para calcular el ${percent}%: ${percent}/100 = **${decimal}**`;
                return { success: true, result: decimal, steps: explanation };
            }
        }

        return { success: false, error: "No entendí la pregunta" };
    }

    solveSqrt(text) {
        const match = text.match(/raí?z(?:\s+cuadrada)?\s+de\s+(\d+(?:\.\d+)?)/);
        if (match) {
            const num = parseFloat(match[1]);
            const result = Math.sqrt(num);
            return {
                success: true,
                result: result,
                steps: `√${num} = **${result}**`
            };
        }
        return { success: false, error: "No detecté el número" };
    }
}
