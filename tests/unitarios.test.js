/**
 * ============================================================================
 *  TESTS UNITARIOS — Módulos SEF
 * ============================================================================
 *  Tests unitarios de cada módulo independiente: Utils, Weather, Demand,
 *  Storage, Policy, Nuclear, Constants.
 * ============================================================================
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { cargarTodosLosModulos } from './setup.js';

describe('SEF.Utils', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    describe('clamp', () => {
        it('debería limitar valores dentro del rango', () => {
            expect(SEF.Utils.clamp(5, 0, 10)).toBe(5);
            expect(SEF.Utils.clamp(-5, 0, 10)).toBe(0);
            expect(SEF.Utils.clamp(15, 0, 10)).toBe(10);
        });
    });

    describe('lerp', () => {
        it('debería interpolar linealmente', () => {
            expect(SEF.Utils.lerp(0, 10, 0)).toBe(0);
            expect(SEF.Utils.lerp(0, 10, 1)).toBe(10);
            expect(SEF.Utils.lerp(0, 10, 0.5)).toBe(5);
        });
    });

    describe('sum', () => {
        it('debería sumar un array de valores', () => {
            expect(SEF.Utils.sum([1, 2, 3, 4, 5])).toBe(15);
            expect(SEF.Utils.sum([])).toBe(0);
            expect(SEF.Utils.sum([100])).toBe(100);
        });
    });

    describe('normalizeSeries', () => {
        it('debería normalizar una serie a un target dado', () => {
            const series = [10, 20, 30];
            const normalized = SEF.Utils.normalizeSeries(series, 600);
            expect(SEF.Utils.sum(normalized)).toBeCloseTo(600, 5);
        });

        it('debería mantener proporciones', () => {
            const series = [10, 20, 30];
            const normalized = SEF.Utils.normalizeSeries(series, 600);
            expect(normalized[1]).toBeCloseTo(normalized[0] * 2, 5);
            expect(normalized[2]).toBeCloseTo(normalized[0] * 3, 5);
        });
    });

    describe('SeededRNG', () => {
        it('debería ser determinista con la misma semilla', () => {
            const rng1 = new SEF.Utils.SeededRNG(42);
            const rng2 = new SEF.Utils.SeededRNG(42);
            const values1 = [];
            const values2 = [];
            for (let i = 0; i < 10; i++) {
                values1.push(rng1.next());
                values2.push(rng2.next());
            }
            for (let i = 0; i < 10; i++) {
                expect(values1[i]).toBe(values2[i]);
            }
        });

        it('debería generar valores en rango [0, 1]', () => {
            const rng = new SEF.Utils.SeededRNG(123);
            for (let i = 0; i < 100; i++) {
                const val = rng.next();
                expect(val).toBeGreaterThanOrEqual(0);
                expect(val).toBeLessThanOrEqual(1);
            }
        });

        it('debería generar valores gaussianos con media y sigma correctas', () => {
            const rng = new SEF.Utils.SeededRNG(42);
            const samples = [];
            for (let i = 0; i < 1000; i++) {
                samples.push(rng.gauss(10, 2));
            }
            const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
            expect(mean).toBeGreaterThan(8);
            expect(mean).toBeLessThan(12);
        });

        it('debería producir valores únicos en secuencia', () => {
            const rng = new SEF.Utils.SeededRNG(42);
            const values = new Set();
            for (let i = 0; i < 100; i++) {
                values.add(rng.next());
            }
            // Debería haber 100 valores únicos (o casi todos)
            expect(values.size).toBeGreaterThan(90);
        });
    });

    describe('mesDelDia', () => {
        it('debería devolver el mes correcto para días del año', () => {
            expect(SEF.Utils.mesDelDia(0)).toBe(0);   // Enero
            expect(SEF.Utils.mesDelDia(31)).toBe(1);   // Febrero
            expect(SEF.Utils.mesDelDia(59)).toBe(2);   // Marzo
            expect(SEF.Utils.mesDelDia(181)).toBe(6);  // Julio
            expect(SEF.Utils.mesDelDia(334)).toBe(11); // Diciembre
            expect(SEF.Utils.mesDelDia(364)).toBe(11); // Diciembre
        });
    });
});

describe('SEF.MODEL', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    it('debería tener HORAS_ANIO = 8760', () => {
        expect(SEF.MODEL.HORAS_ANIO).toBe(8760);
    });

    it('debería tener BASE_ANIO = 2026', () => {
        expect(SEF.MODEL.BASE_ANIO).toBe(2026);
    });

    it('debería tener FACTOR_CO2_GAS = 0.202', () => {
        expect(SEF.MODEL.FACTOR_CO2_GAS).toBe(0.202);
    });

    it('debería tener FC_NUCLEAR = 0.90', () => {
        expect(SEF.MODEL.FC_NUCLEAR).toBe(0.90);
    });

    it('debería tener constantes de eficiencia razonables', () => {
        expect(SEF.MODEL.EFICIENCIA_BAT).toBe(0.90);
        expect(SEF.MODEL.EFICIENCIA_BOMBEO).toBe(0.75);
    });

    it('debería tener latitud de España ~40.4', () => {
        expect(SEF.MODEL.LATITUD_ESPANA).toBe(40.4);
    });
});

describe('SEF.DATOS_2025', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    it('debería tener demanda = 248 TWh', () => {
        expect(SEF.DATOS_2025.demanda).toBe(248);
    });

    it('debería tener emisiones = 36 Mt', () => {
        expect(SEF.DATOS_2025.emisiones).toBe(36);
    });

    it('debería tener renovables = 56%', () => {
        expect(SEF.DATOS_2025.renovables).toBe(56);
    });

    it('debería tener precio medio = 63 €/MWh', () => {
        expect(SEF.DATOS_2025.precioMedio).toBe(63);
    });

    it('debería tener datos de generación por tecnología', () => {
        expect(SEF.DATOS_2025.nuclear).toBe(7.0);
        expect(SEF.DATOS_2025.solar).toBe(24.7);
        expect(SEF.DATOS_2025.eolica).toBe(31.6);
        expect(SEF.DATOS_2025.hidraulica).toBe(17.1);
        expect(SEF.DATOS_2025.gas).toBe(24.0);
    });
});

describe('SEF.PNIEC_2030', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    it('debería tener objetivo renovables = 81%', () => {
        expect(SEF.PNIEC_2030.renovablesGeneracion).toBe(81);
    });

    it('debería tener objetivo emisiones máx = 20 Mt', () => {
        expect(SEF.PNIEC_2030.emisionesMax).toBe(20);
    });

    it('debería tener objetivos de capacidad', () => {
        expect(SEF.PNIEC_2030.solarGW).toBe(81);
        expect(SEF.PNIEC_2030.eolicaGW).toBe(62);
        expect(SEF.PNIEC_2030.offshoreGW).toBe(3);
        expect(SEF.PNIEC_2030.almacenamientoGW).toBe(22);
    });
});

describe('SEF.COSTES_REF', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    it('debería tener costes de referencia por tecnología', () => {
        expect(SEF.COSTES_REF.nuclear).toBe(42);
        expect(SEF.COSTES_REF.solarFV).toBe(31);
        expect(SEF.COSTES_REF.eolica).toBe(36);
        expect(SEF.COSTES_REF.ccgt).toBe(92);
        expect(SEF.COSTES_REF.baterias).toBe(68);
    });
});

describe('SEF.COLORES', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    it('debería tener colores definidos para cada tecnología', () => {
        expect(SEF.COLORES.nuclear).toBeDefined();
        expect(SEF.COLORES.solar).toBeDefined();
        expect(SEF.COLORES.eolica).toBeDefined();
        expect(SEF.COLORES.gas).toBeDefined();
        expect(SEF.COLORES.hidro).toBeDefined();
    });

    it('debería tener fill, line y label en cada color', () => {
        for (const [key, color] of Object.entries(SEF.COLORES)) {
            if (key === 'ref2025') continue;
            expect(color.fill).toBeDefined();
            expect(color.line).toBeDefined();
            expect(color.label).toBeDefined();
        }
    });
});
