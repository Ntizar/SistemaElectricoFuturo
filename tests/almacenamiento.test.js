/**
 * ============================================================================
 *  TEST: Almacenamiento (baterías, bombeo, degradación)
 * ============================================================================
 *  Verifica que el modelo de almacenamiento produce resultados consistentes
 *  con la física real: degradación, eficiencia dependiente de C-rate,
 *  reserva estacional de bombeo y V2G.
 * ============================================================================
 */

'use strict';

import { describe, it, expect, beforeAll } from 'vitest';
import SEF from '../js/engine.js';

describe('Almacenamiento', () => {
    describe('Baterías', () => {
        it('eficiencia round-trip depende de C-rate', () => {
            // 4h (cRate 0.25) → η ≈ 0.92
            const bat4h = { tipo: 'bateria', capacidadEfectivaGWh: 4, potenciaGW: 1 };
            const eff4h = SEF.Storage.batteryEfficiency(bat4h);
            expect(eff4h).toBeGreaterThan(0.90);
            expect(eff4h).toBeLessThan(0.94);

            // 2h (cRate 0.50) → η ≈ 0.90
            const bat2h = { tipo: 'bateria', capacidadEfectivaGWh: 2, potenciaGW: 1 };
            const eff2h = SEF.Storage.batteryEfficiency(bat2h);
            expect(eff2h).toBeGreaterThan(0.88);
            expect(eff2h).toBeLessThan(0.92);

            // 1h (cRate 1.00) → η ≈ 0.87
            const bat1h = { tipo: 'bateria', capacidadEfectivaGWh: 1, potenciaGW: 1 };
            const eff1h = SEF.Storage.batteryEfficiency(bat1h);
            expect(eff1h).toBeGreaterThan(0.85);
            expect(eff1h).toBeLessThan(0.90);
        });

        it('degradación: 2% por 365 ciclos + 1.5% calendario/año', () => {
            const bat = SEF.Storage.createBattery({
                bateriasPotencia: 1,
                bateriasCapacidad: 4,
            });
            bat.ciclosEquivalentes = 365;

            const factor = SEF.Storage.degradeBattery(bat, 1);
            // Pérdida por ciclos: 365 * (0.02/365) = 0.02
            // Pérdida calendario: 1 * 0.015 = 0.015
            // Total: 1 - 0.02 - 0.015 = 0.965
            expect(factor).toBeCloseTo(0.965, 2);
        });

        it('capacidad degradada no supera la nominal', () => {
            const bat = SEF.Storage.createBattery({
                bateriasPotencia: 1,
                bateriasCapacidad: 4,
            });
            bat.ciclosEquivalentes = 1000;

            SEF.Storage.degradeBattery(bat, 5);
            expect(bat.capacidadEfectivaGWh).toBeLessThanOrEqual(bat.capacidadNominalGWh);
            expect(bat.capacidadEfectivaGWh).toBeGreaterThan(0);
        });

        it('reserva técnica = 10% de capacidad', () => {
            const reserva = SEF.Storage.reserveTarget({ tipo: 'bateria' }, 0);
            expect(reserva).toBe(0.10);
        });
    });

    describe('Bombeo', () => {
        it('reserva estacional: mínimo en julio-agosto (estiaje)', () => {
            const storage = { tipo: 'bombeo' };
            const reservaJul = SEF.Storage.reserveTarget(storage, 6);  // julio
            const reservaAgo = SEF.Storage.reserveTarget(storage, 7);  // agosto
            const reservaJun = SEF.Storage.reserveTarget(storage, 5);  // junio

            expect(reservaJul).toBeLessThan(reservaJun);
            expect(reservaAgo).toBeLessThan(reservaJun);
        });

        it('reserva estacional: máximo en primavera (post-deshielo)', () => {
            const storage = { tipo: 'bombeo' };
            const reservaAbr = SEF.Storage.reserveTarget(storage, 3);  // abril
            const reservaMay = SEF.Storage.reserveTarget(storage, 4);  // mayo
            const reservaJul = SEF.Storage.reserveTarget(storage, 6);  // julio

            expect(reservaAbr).toBeGreaterThan(reservaJul);
            expect(reservaMay).toBeGreaterThan(reservaJul);
        });

        it('eficiencia bombeo = 75%', () => {
            expect(SEF.MODEL.EFICIENCIA_BOMBEO).toBe(0.75);
        });
    });

    describe('V2G', () => {
        it('V2G disponible solo de noche (20:00-06:00)', () => {
            const params = {
                vePorcentajeParque: 20,
                v2gPct: 10,
            };
            const v2gNoche = SEF.Storage.v2gDisponible(params, 23);  // 23:00
            const v2gManana = SEF.Storage.v2gDisponible(params, 12); // 12:00

            expect(v2gNoche).toBeGreaterThan(0);
            expect(v2gManana).toBe(0);
        });
    });

    describe('Despacho', () => {
        it('batería carga con exceso y descarga con déficit', () => {
            const bat = SEF.Storage.createBattery({
                bateriasPotencia: 1,
                bateriasCapacidad: 4,
            });

            // Carga con exceso
            const carga = SEF.Storage.despachar(bat, { excesoGW: 2, deficitGW: 0 }, { mes: 5, hora: 12 });
            expect(carga.chargeGW).toBeGreaterThan(0);
            expect(carga.dischargeGW).toBe(0);

            // Descarga con déficit
            const descarga = SEF.Storage.despachar(bat, { excesoGW: 0, deficitGW: 2 }, { mes: 5, hora: 20 });
            expect(descarga.dischargeGW).toBeGreaterThan(0);
            expect(descarga.chargeGW).toBe(0);
        });

        it('batería no descarga bajo reserva técnica', () => {
            const bat = SEF.Storage.createBattery({
                bateriasPotencia: 1,
                bateriasCapacidad: 4,
            });
            bat.energiaGWh = 0.5; // Cerca del mínimo (10% de 4 = 0.4)

            const descarga = SEF.Storage.despachar(bat, { excesoGW: 0, deficitGW: 2 }, { mes: 5, hora: 20 });
            // No debe descargar por debajo de la reserva
            expect(bat.energiaGWh).toBeGreaterThanOrEqual(0.4);
        });
    });
});
