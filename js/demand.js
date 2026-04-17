/**
 * ============================================================================
 *  DEMANDA SECTORIAL Y FLEXIBILIDAD
 * ============================================================================
 */

'use strict';

(function() {
    const M = SEF.MODEL;
    const U = SEF.Utils;

    function baseProfiles() {
        return {
            residencial: new Float64Array(M.HORAS_ANIO),
            servicios: new Float64Array(M.HORAS_ANIO),
            industrial: new Float64Array(M.HORAS_ANIO),
            ve: new Float64Array(M.HORAS_ANIO),
            bombasCalor: new Float64Array(M.HORAS_ANIO),
            h2: new Float64Array(M.HORAS_ANIO),
            autoconsumo: new Float64Array(M.HORAS_ANIO),
        };
    }

    function repartoTWh(params) {
        const totalBase = params.demandaAnual;
        const residencial = totalBase * 0.29;
        const servicios = totalBase * 0.24;
        const industrial = totalBase * 0.38;

        const veTWh = (M.VEHICULOS_PARC_TOTAL_M * (params.vePorcentajeParque / 100) *
            M.VEHICULO_KM_ANIO * M.VEHICULO_KWH_KM) / 1000000;
        const bombasCalorTWh = M.BOMBAS_CALOR_TWH_MAX * (params.bombaCalorPct / 100);
        const industriaExtra = params.industriaElectrificacionTWh || 0;
        const h2TWh = (params.h2ObjetivoMt || 0) * M.TWH_POR_MT_H2;

        return {
            residencial,
            servicios,
            industrial: industrial + industriaExtra,
            ve: veTWh,
            bombasCalor: bombasCalorTWh,
            h2: h2TWh,
        };
    }

    function generarSeries(params, rng, weather) {
        const out = baseProfiles();
        const reparto = repartoTWh(params);
        const flex = new Float64Array(M.HORAS_ANIO);
        const rawAutoconsumo = new Float64Array(M.HORAS_ANIO);

        for (let i = 0; i < M.HORAS_ANIO; i++) {
            const dia = Math.floor(i / 24);
            const hora = i % 24;
            const diaSemana = dia % 7;
            const temperatura = weather.demandaTemp[i];
            const laboral = diaSemana < 5 ? 1.04 : 0.87;
            const homeMorning = Math.exp(-Math.pow((hora - 8) / 2.5, 2)) * 0.23;
            const homeEvening = Math.exp(-Math.pow((hora - 21) / 2.7, 2)) * 0.42;
            const officeProfile = diaSemana < 5 ? (hora >= 8 && hora <= 19 ? 1.1 : 0.42) : 0.38;
            const industrialProfile = diaSemana < 5 ? (hora >= 6 && hora <= 22 ? 1.02 : 0.82) : 0.76;

            let tempLoad = 1;
            if (temperatura < 15) tempLoad += (15 - temperatura) * 0.013;
            if (temperatura > 25) tempLoad += (temperatura - 25) * 0.018;

            out.residencial[i] = (0.62 + homeMorning + homeEvening) * tempLoad * (0.96 + rng.next() * 0.08);
            out.servicios[i] = officeProfile * laboral * (0.95 + rng.next() * 0.06);
            out.industrial[i] = industrialProfile * (0.97 + rng.next() * 0.05);

            const smartPct = params.smartChargingPct / 100;
            const v2gPct = params.v2gPct / 100;
            const chargeNight = hora >= 0 && hora <= 6 ? 1.0 : 0.26;
            const chargeEvening = hora >= 19 && hora <= 23 ? 0.82 : 0.18;
            out.ve[i] = U.clamp((chargeNight * (0.55 + smartPct * 0.35)) + (chargeEvening * (0.45 - smartPct * 0.18)), 0.05, 1.25);

            const heating = temperatura < 15 ? 1 + (15 - temperatura) * 0.04 : 0.18;
            const cooling = temperatura > 25 ? 0.22 + (temperatura - 25) * 0.03 : 0;
            out.bombasCalor[i] = U.clamp(heating + cooling, 0.05, 2.2);

            const h2Preferred = hora >= 11 && hora <= 17 ? 1.0 : (hora >= 1 && hora <= 5 ? 0.62 : 0.25);
            out.h2[i] = h2Preferred;

            rawAutoconsumo[i] = weather.solar[i];

            const h2Flex = params.h2ObjetivoMt > 0 ? 0.22 + h2Preferred * Math.min(0.55, params.h2FlexibilidadHoras / 20) : 0.12;
            const veFlex = smartPct * 0.32 + v2gPct * 0.45;
            flex[i] = U.clamp(h2Flex + veFlex, 0.12, 1);
        }

        const residencial = U.normalizeSeries(out.residencial, reparto.residencial * 1000);
        const servicios = U.normalizeSeries(out.servicios, reparto.servicios * 1000);
        const industrial = U.normalizeSeries(out.industrial, reparto.industrial * 1000);
        const ve = U.normalizeSeries(out.ve, reparto.ve * 1000);
        const bombasCalor = U.normalizeSeries(out.bombasCalor, reparto.bombasCalor * 1000);
        const h2 = U.normalizeSeries(out.h2, reparto.h2 * 1000);
        const autoconsumoTWh = params.autoconsumoFV_GW * SEF.FC_HISTORICOS.solar * 8760 / 1000 * 0.82;
        const autoconsumo = U.normalizeSeries(rawAutoconsumo, autoconsumoTWh * 1000);

        const total = new Float64Array(M.HORAS_ANIO);
        for (let i = 0; i < M.HORAS_ANIO; i++) {
            total[i] = Math.max(0, residencial[i] + servicios[i] + industrial[i] + ve[i] + bombasCalor[i] + h2[i] - autoconsumo[i]);
        }

        return {
            total,
            porSector: {
                residencial,
                servicios,
                industrial,
                ve,
                bombasCalor,
                h2,
                autoconsumo,
            },
            flexibilidad: flex,
            reparto,
        };
    }

    SEF.Demand = {
        generarSeries,
    };
})();
