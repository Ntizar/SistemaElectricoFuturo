/**
 * ============================================================================
 *  TRAYECTORIA 2026-2035
 * ============================================================================
 */

'use strict';

(function() {
    function paramsForYear(baseParams, anio, state) {
        const yearIndex = anio - SEF.MODEL.BASE_ANIO;
        const p = { ...baseParams };
        p.anioObjetivo = anio;
        p.solar = baseParams.solar + yearIndex * baseParams.solarRampaGW_anio;
        p.eolica = baseParams.eolica + yearIndex * baseParams.eolicaTerrestreRampa;
        p.eolicaOffshore = baseParams.eolicaOffshore + yearIndex * baseParams.eolicaOffshoreRampa;
        p.bateriasPotencia = baseParams.bateriasPotencia + yearIndex * baseParams.bateriasRampaGW_anio;
        p.bateriasCapacidad = p.bateriasPotencia * baseParams.bateriasDuracionH;
        p.interconexion = baseParams.interconexion + yearIndex * baseParams.interconexionRampaGW_anio + (anio >= baseParams.nuevaLineaFrancia_anio ? 1.0 : 0);
        p.vePorcentajeParque = Math.min(45, baseParams.vePorcentajeParque + yearIndex * 2.4);
        p.bombaCalorPct = Math.min(55, baseParams.bombaCalorPct + yearIndex * 1.8);
        p.h2ObjetivoMt = Math.max(baseParams.h2ObjetivoMt, baseParams.h2ObjetivoMt + yearIndex * 0.12);
        p.autoconsumoFV_GW = baseParams.autoconsumoFV_GW + yearIndex * 1.8;
        p._batteryState = state?.batteryState;
        p._pumpedState = state?.pumpedState;
        p._hidraulicidadPrev = state?.hidraulicidadPrev;
        p._trajectoryYearIndex = yearIndex;
        return p;
    }

    function summarize(resultsByYear) {
        const years = Object.keys(resultsByYear).map(Number).sort((a, b) => a - b);
        const summary = {
            years,
            precio: [],
            precioP90: [],
            emisiones: [],
            renovables: [],
            gas: [],
            nuclear: [],
            vertidos: [],
            horasDeficit: [],
        };

        years.forEach(year => {
            const result = resultsByYear[year];
            summary.precio.push(result.precioMedioPonderado);
            summary.precioP90.push(result.precioP90);
            summary.emisiones.push(result.emisionesAnuales);
            summary.renovables.push(result.coberturaRenovable);
            summary.gas.push(result.consumoGasTWh);
            summary.nuclear.push(result.nuclearEfectivaGW);
            summary.vertidos.push(result.vertidosTWh);
            summary.horasDeficit.push(result.horasDeficit);
        });

        return summary;
    }

    async function simularTrayectoria(paramsBase, hooks = {}) {
        const years = [];
        for (let anio = SEF.MODEL.BASE_ANIO; anio <= 2035; anio++) years.push(anio);

        const porAnio = {};
        let state = {
            batteryState: paramsBase._batteryState,
            pumpedState: paramsBase._pumpedState,
            hidraulicidadPrev: paramsBase.hidraulicidad,
        };

        for (let i = 0; i < years.length; i++) {
            const anio = years[i];
            const params = paramsForYear(paramsBase, anio, state);
            const sim = new SEF.SimuladorElectrico(params);
            const result = sim.simular();
            porAnio[anio] = result;

            state = {
                batteryState: result.estadoBateriaFinal,
                pumpedState: result.estadoBombeoFinal,
                hidraulicidadPrev: result.hidraulicidadMedia || params.hidraulicidad,
            };

            if (typeof hooks.onProgress === 'function') {
                hooks.onProgress({ year: anio, index: i + 1, total: years.length });
            }

            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return {
            porAnio,
            resumen: summarize(porAnio),
        };
    }

    SEF.Trajectory = {
        paramsForYear,
        simularTrayectoria,
    };
})();
