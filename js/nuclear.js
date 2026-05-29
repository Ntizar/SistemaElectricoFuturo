/**
 * ============================================================================
 *  CALENDARIO NUCLEAR REALISTA
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

    SEF.Nuclear = {
        CALENDARIO,
        disponibleEnAnio,
        resumen,
    };
})();
