/**
 * ============================================================================
 *  ALMACENAMIENTO, DEGRADACION Y V2G
 * ============================================================================
 */

'use strict';

(function() {
    const U = SEF.Utils;

    function createBattery(params, state = {}) {
        return {
            tipo: 'bateria',
            potenciaGW: params.bateriasPotencia,
            capacidadNominalGWh: params.bateriasCapacidad,
            capacidadEfectivaGWh: state.capacidadEfectivaGWh ?? params.bateriasCapacidad,
            energiaGWh: state.energiaGWh ?? params.bateriasCapacidad * 0.5,
            ciclosEquivalentes: state.ciclosEquivalentes ?? 0,
        };
    }

    function createPumpedHydro(params, state = {}) {
        return {
            tipo: 'bombeo',
            potenciaGW: params.bombeo,
            capacidadNominalGWh: params.bombeoCapacidad,
            capacidadEfectivaGWh: state.capacidadEfectivaGWh ?? params.bombeoCapacidad,
            energiaGWh: state.energiaGWh ?? params.bombeoCapacidad * 0.5,
            ciclosEquivalentes: state.ciclosEquivalentes ?? 0,
        };
    }

    function batteryEfficiency(battery) {
        const duration = Math.max(1, battery.capacidadEfectivaGWh / Math.max(0.1, battery.potenciaGW));
        const cRate = 1 / duration;
        return U.clamp(0.94 - cRate * 0.08, 0.82, 0.93);
    }

    function degradeBattery(battery, yearIndex) {
        const cycleLoss = battery.ciclosEquivalentes * 0.0002;
        const calendarLoss = yearIndex * 0.015;
        const factor = U.clamp(1 - cycleLoss - calendarLoss, 0.68, 1);
        battery.capacidadEfectivaGWh = battery.capacidadNominalGWh * factor;
        battery.energiaGWh = Math.min(battery.energiaGWh, battery.capacidadEfectivaGWh);
        return factor;
    }

    function reserveTarget(storage, mes) {
        if (storage.tipo === 'bombeo') {
            return mes >= 2 && mes <= 4 ? 0.58 : 0.42;
        }
        return 0.15;
    }

    function v2gDisponible(params, hora) {
        if (hora >= 20 || hora <= 6) {
            return params.vePorcentajeParque * (params.v2gPct / 100) * 0.012;
        }
        return 0;
    }

    function despachar(storage, signal, contexto) {
        const eficiencia = storage.tipo === 'bateria' ? batteryEfficiency(storage) : SEF.MODEL.EFICIENCIA_BOMBEO;
        const reserva = reserveTarget(storage, contexto.mes);
        const minimo = storage.capacidadEfectivaGWh * reserva;
        const respuesta = {
            chargeGW: 0,
            dischargeGW: 0,
            energiaGWh: storage.energiaGWh,
            capacidadEfectivaGWh: storage.capacidadEfectivaGWh,
        };

        if (signal.excesoGW > 0) {
            const espacio = Math.max(0, storage.capacidadEfectivaGWh - storage.energiaGWh);
            const chargeGW = Math.min(signal.excesoGW, storage.potenciaGW, espacio / eficiencia);
            storage.energiaGWh += chargeGW * eficiencia;
            respuesta.chargeGW = chargeGW;
        }

        if (signal.deficitGW > 0) {
            const disponible = Math.max(0, storage.energiaGWh - minimo);
            const dischargeGW = Math.min(signal.deficitGW, storage.potenciaGW, disponible);
            storage.energiaGWh -= dischargeGW;
            respuesta.dischargeGW = dischargeGW;
        }

        const throughput = respuesta.chargeGW + respuesta.dischargeGW;
        storage.ciclosEquivalentes += throughput / Math.max(1, storage.capacidadNominalGWh * 2);
        respuesta.energiaGWh = storage.energiaGWh;
        return respuesta;
    }

    SEF.Storage = {
        createBattery,
        createPumpedHydro,
        batteryEfficiency,
        degradeBattery,
        reserveTarget,
        v2gDisponible,
        despachar,
    };
})();
