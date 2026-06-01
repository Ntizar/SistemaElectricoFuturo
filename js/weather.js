/**
 * ============================================================================
 *  CLIMA Y METEOROLOGIA MULTI-ANIO
 * ============================================================================
 */

'use strict';

(function() {
    const U = SEF.Utils;
    const M = SEF.MODEL;

    function solarFactor(dia, hora, latitud, cloudiness, olaCalorFactor) {
        const lat = latitud * Math.PI / 180;
        const decl = 23.45 * Math.sin(2 * Math.PI * (284 + dia) / 365) * Math.PI / 180;
        const omega = (hora - 12) * 15 * Math.PI / 180;
        const sinElev = Math.sin(lat) * Math.sin(decl) +
            Math.cos(lat) * Math.cos(decl) * Math.cos(omega);
        if (sinElev <= 0.01) return 0;
        const airMass = 1 / Math.max(0.05, sinElev);
        const transmit = 0.75 * Math.pow(0.70, Math.pow(airMass, 0.678));
        const irradiance = sinElev * transmit;
        // Factor 1.35: compensa la simplificación del modelo de transmisión
        // atmosférica (Beer-Lambert con parámetros fijos). En un modelo completo,
        // este factor variaría con la masa de aire y la turbidez. Se mantiene
        // para que el perfil horario adimensional tenga amplitud realista antes
        // de la calibración en simulator.js (CF_SOLAR_REAL / cfSolarMedio).
        return U.clamp(irradiance * cloudiness * olaCalorFactor * 1.35, 0, 1);
    }

    function hidraulicidadAnual(anio, seed, params, previo = 1) {
        const rng = new U.SeededRNG(seed * 17 + anio * 31);
        const epsilon = rng.gauss(0, (params.variabilidadInteranualPct || 8) / 100);
        let raw = 0.4 * previo + 0.6 * 1.0 + epsilon;
        if (params.sequiaClusterAnios > 0 && anio < M.BASE_ANIO + params.sequiaClusterAnios) {
            raw -= 0.18;
        }
        return U.clamp(raw, 0.45, 1.35);
    }

    function serieAnual(anio, seed, params = {}) {
        const series = {
            solar: new Float64Array(M.HORAS_ANIO),
            viento: new Float64Array(M.HORAS_ANIO),
            demandaTemp: new Float64Array(M.HORAS_ANIO),
            hidraulicidad: new Float64Array(M.HORAS_ANIO),
            resumen: null,
        };

        const rngWind = new U.SeededRNG(seed * 7 + anio * 13);
        const rngCloud = new U.SeededRNG(seed * 11 + anio * 29);
        const rngTemp = new U.SeededRNG(seed * 3 + anio * 19);

        let estadoViento = 0.30 + rngWind.next() * 0.12;
        const hydroYear = hidraulicidadAnual(anio, seed, params, params._hidraulicidadPrev || 1);

        for (let i = 0; i < M.HORAS_ANIO; i++) {
            const dia = Math.floor(i / 24);
            const hora = i % 24;
            const mes = U.mesDelDia(dia);

            const olaCalor = params.olaCalorExtrema && dia >= 190 && dia < 204;
            const cloudiness = 0.62 + rngCloud.next() * 0.38;
            const solarPenalty = olaCalor ? 0.92 : 1;
            series.solar[i] = solarFactor(dia, hora, M.LATITUD_ESPANA, cloudiness, solarPenalty);
            series._solarSum = (series._solarSum || 0) + series.solar[i];

            const baseViento = 0.29 + 0.13 * Math.cos((mes - 0.5) * Math.PI / 6);
            const diurnoViento = 1 + 0.08 * Math.sin((hora - 6) * Math.PI / 12);
            estadoViento = 0.94 * estadoViento + (1 - 0.94) * baseViento + rngWind.gauss(0, 0.055);
            if (params.eventoApagonPct > 0 && dia >= 110 && dia < 117) {
                estadoViento *= 1 - params.eventoApagonPct / 100;
            }
            series.viento[i] = U.clamp(estadoViento * diurnoViento, 0.02, 0.92);
            series._vientoSum = (series._vientoSum || 0) + series.viento[i];

            const tempBase = SEF.TEMP_MENSUAL[mes] + rngTemp.gauss(0, 0.9);
            const diurnal = 4.5 * Math.sin((hora - 6) * Math.PI / 12);
            const heatwaveAdder = olaCalor ? 11 : 0;
            series.demandaTemp[i] = tempBase + diurnal + heatwaveAdder + rngTemp.gauss(0, 1.2);

            const hidroSeason = 0.82 + 0.18 * Math.cos((mes - 4) * Math.PI / 6);
            series.hidraulicidad[i] = U.clamp(hydroYear * hidroSeason, 0.3, 1.5);
        }

        series.resumen = {
            hidraulicidadAnual: hydroYear,
            olaCalor: !!params.olaCalorExtrema,
            eventoApagon: params.eventoApagonPct > 0,
            cfSolarMedio: (series._solarSum || 0) / M.HORAS_ANIO,
            cfEolicoMedio: (series._vientoSum || 0) / M.HORAS_ANIO,
        };
        // Limpiar acumuladores temporales
        delete series._solarSum;
        delete series._vientoSum;

        return series;
    }

    SEF.Weather = {
        serieAnual,
        hidraulicidadAnual,
    };
})();
