/**
 * ============================================================================
 *  POLITICA ENERGETICA Y AJUSTES DE MERCADO
 * ============================================================================
 */

'use strict';

(function() {
    function peajesDinamicos(hora, params) {
        if (!params.peajesDinamicosActivos) return params.cargosSistema;
        if (hora >= 10 && hora <= 14) return params.peajeP1;
        if (hora >= 18 && hora <= 22) return params.peajeP1;
        if (hora >= 8 && hora <= 9) return params.peajeP2;
        if (hora >= 15 && hora <= 17) return params.peajeP2;
        return params.peajeP3;
    }

    function aplicarTopeIberico(precioMarginal, contexto, params) {
        if (!params.topeIbericoActivo) return { precioSpot: precioMarginal, compensacion: 0 };
        const techo = 65 + contexto.yearIndex * 6;
        if (contexto.genGasGW <= 0.2) return { precioSpot: precioMarginal, compensacion: 0 };
        const precioSpot = Math.min(precioMarginal, techo);
        const compensacion = Math.max(0, precioMarginal - precioSpot) * 0.72;
        return { precioSpot, compensacion };
    }

    function mecanismoCapacidad(params) {
        const bateriasKW = params.bateriasPotencia * 1000000;
        const ccgtKW = params.ccgt * 1000000;
        return {
            baterias: (params.mecanismoCapacidad_euro_kW || 0) * bateriasKW,
            ccgt: (params.mecanismoCapacidad_euro_kW || 0) * 0.6 * ccgtKW,
        };
    }

    function CfD(tecnologia, precioSpot, params) {
        if (!params.cfdActivo) {
            return { strike: null, ajusteConsumidor: 0, ingresoProductor: precioSpot };
        }
        const strikeBase = params.cfdRenovables_strike || 58;
        const strike = tecnologia === 'offshore' ? strikeBase + 18 : strikeBase;
        const ingresoProductor = Math.max(precioSpot, strike);
        const ajusteConsumidor = ingresoProductor - precioSpot;
        return { strike, ajusteConsumidor, ingresoProductor };
    }

    function precioFinal(precioMarginal, contexto, params) {
        const capped = aplicarTopeIberico(precioMarginal, contexto, params);
        const peaje = peajesDinamicos(contexto.hora, params);
        let precio = capped.precioSpot * (1 + params.perdidasRed) + peaje + capped.compensacion;

        if (params.pvpcActivo) {
            precio += 2.5;
        }

        return {
            precioFinal: Math.min(500, Math.max(-25, precio)),
            compensacion: capped.compensacion,
            peaje,
        };
    }

    SEF.Policy = {
        aplicarTopeIberico,
        mecanismoCapacidad,
        CfD,
        peajesDinamicos,
        precioFinal,
    };
})();
