/**
 * ============================================================================
 *  CALENDARIO NUCLEAR REALISTA
 * ============================================================================
 *  Incluye: calendario de cierre ENRESA, paradas de recarga escalonadas
 *  (~30 días cada 18 meses por reactor) y cálculo horario de disponibilidad.
 * ============================================================================
 */

'use strict';

(function() {
    const CALENDARIO = Object.freeze([
        { id: 'almaraz1', nombre: 'Almaraz I', capacidadGW: 1.049, cierre: 2027 },
        { id: 'almaraz2', nombre: 'Almaraz II', capacidadGW: 1.044, cierre: 2028 },
        { id: 'asco1', nombre: 'Asco I', capacidadGW: 0.995, cierre: 2030 },
        { id: 'cofrentes', nombre: 'Cofrentes', capacidadGW: 1.064, cierre: 2030 },
        { id: 'asco2', nombre: 'Asco II', capacidadGW: 0.997, cierre: 2032 },
        { id: 'vandellos2', nombre: 'Vandellos II', capacidadGW: 1.027, cierre: 2035 },
        { id: 'trillo', nombre: 'Trillo', capacidadGW: 1.066, cierre: 2035 },
    ]);

    // Paradas de recarga: ~30 días cada 18 meses por reactor.
    // Se escalonan para no afectar todos los reactores simultáneamente.
    // FASE: 0 = inicio año, 6 = mitad año. Cada reactor tiene fase distinta.
    const PARADAS_REF = Object.freeze({
        duracionDias: 30,
        intervaloMeses: 18,
        fases: {
            almaraz1: 0,    // Enero
            almaraz2: 1.5,  // Marzo
            asco1: 3,       // Junio
            cofrentes: 4.5, // Septiembre
            asco2: 6,       // Enero (siguiente año)
            vandellos2: 7.5,// Marzo (siguiente año)
            trillo: 9,      // Junio (siguiente año)
        },
    });

    function cierreReactores(base, overrides) {
        return base.map(item => {
            const byReactor = overrides.prorrogaPorReactor?.[item.id] || 0;
            const retirada = overrides.retiradaAnticipada?.[item.id] || 0;
            return {
                ...item,
                cierre: item.cierre + (overrides.prorrogaGlobal || 0) + byReactor - retirada,
            };
        });
    }

    function disponibleEnAnio(anio, override = {}) {
        const anioObjetivo = Number.isFinite(anio) ? anio : SEF.MODEL.BASE_ANIO;
        const reactores = cierreReactores(CALENDARIO, override);
        return reactores.reduce((total, reactor) => {
            if (override.retiraTodoEn && anioObjetivo >= override.retiraTodoEn) return total;
            return anioObjetivo <= reactor.cierre ? total + reactor.capacidadGW : total;
        }, 0);
    }

    function resumen(anio, override = {}) {
        const anioObjetivo = Number.isFinite(anio) ? anio : SEF.MODEL.BASE_ANIO;
        return cierreReactores(CALENDARIO, override).map(reactor => ({
            ...reactor,
            activo: anioObjetivo <= reactor.cierre,
        }));
    }

    /**
     * Verifica si un reactor está en parada de recarga en una hora concreta.
     * @param {string} reactorId - ID del reactor (ej: 'almaraz1')
     * @param {number} horaAnio - Hora del año (0-8759)
     * @param {number} anio - Año de simulación
     * @returns {boolean} true si el reactor está en parada
     */
    function enParada(reactorId, horaAnio, anio) {
        const reactor = CALENDARIO.find(r => r.id === reactorId);
        if (!reactor) return false;
        // Si el reactor ya está cerrado, no hay paradas
        if (anio > reactor.cierre) return false;

        const dia = Math.floor(horaAnio / 24);
        const meses = dia / 30.44; // promedio
        const fase = PARADAS_REF.fases[reactorId];
        const duracionMeses = PARADAS_REF.duracionDias / 30.44;

        // Calcular en qué ciclo estamos (cada 18 meses)
        const cicloActual = Math.floor(meses / PARADAS_REF.intervaloMeses);
        const inicioParada = fase + cicloActual * PARADAS_REF.intervaloMeses;
        const finParada = inicioParada + duracionMeses;

        return meses >= inicioParada && meses < finParada;
    }

    /**
     * Calcula la capacidad nuclear efectiva a nivel horario,
     * restando las paradas de recarga de los reactores activos.
     * @param {Object} params - Parámetros del simulador
     * @returns {number} GW nuclear efectivo para la hora actual
     */
    function capacidadNuclearHoraria(params, horaAnio, override = {}) {
        if (!params.aplicarPlanNuclear) return params.nuclear;

        const anio = params.anioObjetivo || SEF.MODEL.BASE_ANIO;
        const reactores = cierreReactores(CALENDARIO, override);
        let total = 0;

        for (const reactor of reactores) {
            // Si el reactor está cerrado, no cuenta
            if (override.retiraTodoEn && anio >= override.retiraTodoEn) continue;
            if (anio > reactor.cierre) continue;

            // Si está en parada de recarga, su capacidad es 0
            if (enParada(reactor.id, horaAnio, anio)) continue;

            total += reactor.capacidadGW;
        }

        return total;
    }

    SEF.Nuclear = {
        CALENDARIO,
        PARADAS_REF,
        disponibleEnAnio,
        resumen,
        enParada,
        capacidadNuclearHoraria,
    };
})();
