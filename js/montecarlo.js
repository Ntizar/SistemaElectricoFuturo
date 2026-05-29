/**
 * ============================================================================
 *  SIMULACION MONTE CARLO — MÚLTIPLES SEMILLAS METEOROLÓGICAS
 * ============================================================================
 *  Ejecuta el motor de simulación con distintas semillas climáticas para
 *  explorar la variabilidad interanual de los KPIs del sistema eléctrico.
 *  Calcula percentiles P5, P50 y P95 para cuantificar incertidumbre.
 *
 *  Uso:
 *    const mc = SEF.MonteCarlo.simularMultiSemilla(params);
 *    mc.resultados  // array con un resultado por semilla
 *    mc.percentiles // { kpi: { p5, p50, p95 }, ... }
 *
 *  Dependencias: constants.js, simulator.js
 * ============================================================================
 */
'use strict';

(function() {
    const SEMILLAS_DEFAULT = [1, 42, 100, 500, 1000, 2000, 5000, 7777, 9999];

    const KPI_A_EXTRAER = [
        'precioMedioPonderado',
        'emisionesAnuales',
        'consumoGasTWh',
        'coberturaRenovable',
        'horasDeficit',
        'horasInerciaCritica',
        'vertidosTWh',
        'horasGas',
    ];

    /**
     * Calcula el percentil p (0-100) sobre un array ordenado ascendentemente.
     * Usa interpolación lineal entre puntos adyacentes (tipo R-7, estándar).
     */
    function percentil(arrOrdenado, p) {
        if (!arrOrdenado || arrOrdenado.length === 0) return NaN;
        const n = arrOrdenado.length;
        const k = (n - 1) * (p / 100);
        const f = Math.floor(k);
        const c = Math.ceil(k);
        if (f === c) return arrOrdenado[f];
        return arrOrdenado[f] + (arrOrdenado[c] - arrOrdenado[f]) * (k - f);
    }

    /**
     * Extrae solo los KPIs relevantes de un resultado completo de simulación.
     */
    function extraerKPIs(R) {
        const kpis = {};
        for (const key of KPI_A_EXTRAER) {
            kpis[key] = R[key] !== undefined ? R[key] : null;
        }
        kpis._semilla = R._semilla;
        kpis._anio = R._anio;
        return kpis;
    }

    /**
     * SEF.MonteCarlo.calcularPercentiles(resultados)
     *
     * Para cada KPI en la lista, ordena sus valores y calcula
     * los percentiles P5, P50 (mediana) y P95.
     *
     * @param {Array<Object>} resultados - Array de objetos con KPIs por semilla
     * @returns {Object} Mapa: kpi -> { p5, p50, p95 }
     */
    function calcularPercentiles(resultados) {
        const percentiles = {};
        for (const key of KPI_A_EXTRAER) {
            const valores = resultados
                .map(r => r[key])
                .filter(v => v !== null && v !== undefined && Number.isFinite(v));
            if (valores.length === 0) {
                percentiles[key] = { p5: NaN, p50: NaN, p95: NaN };
                continue;
            }
            valores.sort((a, b) => a - b);
            percentiles[key] = {
                p5:  percentil(valores, 5),
                p50: percentil(valores, 50),
                p95: percentil(valores, 95),
            };
        }
        return percentiles;
    }

    /**
     * SEF.MonteCarlo.simularMultiSemilla(params, semillas)
     *
     * Ejecuta la simulación para cada semilla climática especificada,
     * clonando los parámetros base y asignando la semilla correspondiente.
     * Cada ejecución usa su propio SeededRNG independiente (semilla única
     * para generación climática y semilla derivada para demanda), lo que
     * garantiza reproducibilidad total.
     *
     * @param {Object} params - Parámetros base del escenario (SEF.PARAMS_DEFAULT + ajustes)
     * @param {number[]} [semillas] - Array de semillas a probar. Por defecto SEMILLAS_DEFAULT.
     * @returns {Object} { resultados: Array<Object>, percentiles: Object }
     */
    function simularMultiSemilla(params, semillas) {
        semillas = semillas || SEMILLAS_DEFAULT.slice();

        const resultados = [];

        for (const semilla of semillas) {
            // Clonar parámetros base y asignar semilla única
            const paramsClone = { ...params, semilla };

            // Añadir metadatos para trazabilidad
            paramsClone._semilla = semilla;
            paramsClone._anio = paramsClone.anioObjetivo;

            // Crear simulador independiente y ejecutar
            const simulador = new SEF.SimuladorElectrico(paramsClone);
            const R = simulador.simular();

            // Etiquetar el resultado con la semilla
            R._semilla = semilla;
            R._anio = paramsClone.anioObjetivo;

            // Extraer solo KPIs relevantes
            resultados.push(extraerKPIs(R));
        }

        // Calcular percentiles sobre el conjunto de resultados
        const percentilesResult = calcularPercentiles(resultados);

        return {
            resultados,
            percentiles: percentilesResult,
            nSemillas: semillas.length,
            semillasUsadas: semillas,
        };
    }

    // Exponer en el namespace SEF
    SEF.MonteCarlo = {
        simularMultiSemilla,
        calcularPercentiles,
        SEMILLAS_DEFAULT,
        KPI_A_EXTRAER,
    };
})();
