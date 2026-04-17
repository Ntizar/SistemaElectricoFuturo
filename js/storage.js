/**
 * ============================================================================
 *  ALMACENAMIENTO, DEGRADACIÓN Y V2G
 * ============================================================================
 *  Baterías: eficiencia round-trip dependiente del C-rate.
 *  - 4 h (cRate 0,25): 92%
 *  - 2 h (cRate 0,50): 90%
 *  - 1 h (cRate 1,00): 87%
 *  Degradación: 2% por cada 365 ciclos equivalentes + 1,5%/año calendario.
 *  SoC útil: 10-95%.
 *
 *  Bombeo: reserva estacional realista del embalse. Lleno tras lluvias
 *  de primavera y otoño, mínimo técnico en estiaje de verano e invierno seco.
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
            energiaGWh: state.energiaGWh ?? params.bombeoCapacidad * 0.6,
            ciclosEquivalentes: state.ciclosEquivalentes ?? 0,
        };
    }

    // Eficiencia round-trip: η(cRate) = 0,94 − 0,07·cRate, acotada [0,82; 0,93].
    // 4 h → 0,925 | 2 h → 0,905 | 1 h → 0,870.
    function batteryEfficiency(battery) {
        const duration = Math.max(1, battery.capacidadEfectivaGWh / Math.max(0.1, battery.potenciaGW));
        const cRate = 1 / duration;
        return U.clamp(0.94 - cRate * 0.07, 0.82, 0.93);
    }

    // Degradación: 2% por 365 ciclos equivalentes + 1,5% calendario/año.
    function degradeBattery(battery, yearIndex) {
        const cycleLoss = battery.ciclosEquivalentes * (0.02 / 365);
        const calendarLoss = yearIndex * 0.015;
        const factor = U.clamp(1 - cycleLoss - calendarLoss, 0.68, 1);
        battery.capacidadEfectivaGWh = battery.capacidadNominalGWh * factor;
        battery.energiaGWh = Math.min(battery.energiaGWh, battery.capacidadEfectivaGWh);
        return factor;
    }

    // Reserva estacional del embalse de bombeo (fracción mínima).
    // Abr-Jun: lleno tras deshielo y lluvias de primavera.
    // Sep-Oct: recarga tras lluvias de otoño.
    // Jul-Ago: estiaje duro.
    // Ene-Feb: invierno seco, reserva técnica.
    function reserveTarget(storage, mes) {
        if (storage.tipo === 'bombeo') {
            if (mes >= 3 && mes <= 5) return 0.60;  // abril-junio
            if (mes === 8 || mes === 9) return 0.55; // septiembre-octubre
            if (mes === 6 || mes === 7) return 0.28; // julio-agosto (estiaje)
            if (mes === 0 || mes === 1) return 0.35; // enero-febrero
            return 0.45;
        }
        // Baterías: 10% técnico (SoC útil 10-95%).
        return 0.10;
    }

    // Capacidad útil máxima (95% SoC para baterías, 100% para bombeo).
    function maxUsableFraction(storage) {
        return storage.tipo === 'bateria' ? 0.95 : 1.0;
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
        const maximo = storage.capacidadEfectivaGWh * maxUsableFraction(storage);
        const respuesta = {
            chargeGW: 0,
            dischargeGW: 0,
            energiaGWh: storage.energiaGWh,
            capacidadEfectivaGWh: storage.capacidadEfectivaGWh,
        };

        if (signal.excesoGW > 0) {
            const espacio = Math.max(0, maximo - storage.energiaGWh);
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

        // Ciclo equivalente = 1 cuando se completa carga y descarga de capacidad nominal.
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
        maxUsableFraction,
        v2gDisponible,
        despachar,
    };
})();
