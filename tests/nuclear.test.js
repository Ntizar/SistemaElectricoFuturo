/**
 * ============================================================================
 *  TEST: Calendario nuclear ENRESA
 * ============================================================================
 *  Verifica que el calendario de cierres nucleares coincide con el
 *  protocolo oficial ENRESA 2019 y que las paradas de recarga se
 *  escalonan correctamente.
 *
 *  Fuente: ENRESA protocolo 2019
 *  https://www.enresa.es/central-nuclear/parques-nucleares/
 * ============================================================================
 */

'use strict';

import { describe, it, expect, beforeAll } from 'vitest';
import SEF from '../js/engine.js';

describe('Calendario nuclear', () => {
    describe('Cierres ENRESA', () => {
        it('7 reactores en 2025', () => {
            const disp = SEF.Nuclear.disponibleEnAnio(2025, {});
            expect(disp).toBeGreaterThan(6.5); // ~7 GW
        });

        it('Almaraz I cerrado en 2028 (cierre 2027)', () => {
            const disp2027 = SEF.Nuclear.disponibleEnAnio(2027, {});
            const disp2028 = SEF.Nuclear.disponibleEnAnio(2028, {});
            // Debe perder ~1 GW entre 2027 y 2028
            expect(disp2028).toBeLessThan(disp2027 - 0.9);
        });

        it('Almaraz II cerrado en 2029 (cierre 2028)', () => {
            const disp2028 = SEF.Nuclear.disponibleEnAnio(2028, {});
            const disp2029 = SEF.Nuclear.disponibleEnAnio(2029, {});
            expect(disp2029).toBeLessThan(disp2028 - 0.9);
        });

        it('Ascó I cerrado en 2031 (cierre 2030)', () => {
            const disp2030 = SEF.Nuclear.disponibleEnAnio(2030, {});
            const disp2031 = SEF.Nuclear.disponibleEnAnio(2031, {});
            expect(disp2031).toBeLessThan(disp2030 - 0.9);
        });

        it('Cofrentes cerrado en 2031 (cierre 2030)', () => {
            const disp2030 = SEF.Nuclear.disponibleEnAnio(2030, {});
            const disp2031 = SEF.Nuclear.disponibleEnAnio(2031, {});
            // Entre Ascó I y Cofrentes, se pierden ~2 GW
            expect(disp2031).toBeLessThan(disp2030 - 1.8);
        });

        it('Ascó II cerrado en 2033 (cierre 2032)', () => {
            const disp2032 = SEF.Nuclear.disponibleEnAnio(2032, {});
            const disp2033 = SEF.Nuclear.disponibleEnAnio(2033, {});
            expect(disp2033).toBeLessThan(disp2032 - 0.9);
        });

        it('Vandellós II y Trillo cerrados en 2036 (cierre 2035)', () => {
            const disp2035 = SEF.Nuclear.disponibleEnAnio(2035, {});
            const disp2036 = SEF.Nuclear.disponibleEnAnio(2036, {});
            // Se pierden ~2 GW (Vandellós II + Trillo)
            expect(disp2036).toBeLessThan(disp2035 - 1.8);
        });

        it('solo 2 reactores en 2036 (Vandellós II y Trillo cerrados)', () => {
            const disp2036 = SEF.Nuclear.disponibleEnAnio(2036, {});
            // 0 reactores = 0 GW
            expect(disp2036).toBe(0);
        });
    });

    describe('Prórroga nuclear', () => {
        it('prórroga +10 años extiende todos los reactores', () => {
            const sinProrroga = SEF.Nuclear.disponibleEnAnio(2035, {});
            const conProrroga = SEF.Nuclear.disponibleEnAnio(2035, {
                prorrogaNuclear: true,
                prorrogaGlobal: 10,
            });
            expect(conProrroga).toBeGreaterThan(sinProrroga);
            expect(conProrroga).toBeGreaterThan(6); // Todos activos
        });

        it('prórroga +20 años mantiene parque completo en 2045', () => {
            const disp2045 = SEF.Nuclear.disponibleEnAnio(2045, {
                prorrogaGlobal: 20,
            });
            expect(disp2045).toBeGreaterThan(6); // Todos activos
        });
    });

    describe('Paradas de recarga', () => {
        it('paradas escalonadas (no todos los reactores a la vez)', () => {
            // Verificar que en un momento dado, no todos los reactores están en parada
            const horaRef = 1000; // ~día 42 del año
            let enParadaCount = 0;
            const reactores = ['almaraz1', 'almaraz2', 'asco1', 'cofrentes', 'asco2', 'vandellos2', 'trillo'];

            for (const r of reactores) {
                if (SEF.Nuclear.enParada(r, horaRef, 2030)) {
                    enParadaCount++;
                }
            }
            // Debe haber máximo 2 reactores en parada simultáneamente
            expect(enParadaCount).toBeLessThanOrEqual(2);
        });

        it('reactor cerrado no tiene paradas de recarga', () => {
            // Almaraz I cierra en 2027, no debe tener paradas en 2028
            const enParada = SEF.Nuclear.enParada('almaraz1', 1000, 2028);
            expect(enParada).toBe(false);
        });
    });
});
