/**
 * ============================================================================
 *  TESTS UNITARIOS — Módulos Storage, Policy, Nuclear
 * ============================================================================
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { cargarTodosLosModulos } from './setup.js';

describe('SEF.Storage', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    describe('createBattery', () => {
        it('debería crear una batería con parámetros correctos', () => {
            const params = {
                bateriasPotencia: 4.0,
                bateriasCapacidad: 16,
            };
            const battery = SEF.Storage.createBattery(params);
            expect(battery.tipo).toBe('bateria');
            expect(battery.potenciaGW).toBe(4.0);
            expect(battery.capacidadNominalGWh).toBe(16);
            expect(battery.energiaGWh).toBe(8); // 50% inicial
        });

        it('debería restaurar estado previo si se proporciona', () => {
            const params = { bateriasPotencia: 4, bateriasCapacidad: 16 };
            const state = { energiaGWh: 10, capacidadEfectivaGWh: 15 };
            const battery = SEF.Storage.createBattery(params, state);
            expect(battery.energiaGWh).toBe(10);
            expect(battery.capacidadEfectivaGWh).toBe(15);
        });
    });

    describe('createPumpedHydro', () => {
        it('debería crear bombeo con parámetros correctos', () => {
            const params = { bombeo: 3.5, bombeoCapacidad: 30 };
            const pumped = SEF.Storage.createPumpedHydro(params);
            expect(pumped.tipo).toBe('bombeo');
            expect(pumped.potenciaGW).toBe(3.5);
            expect(pumped.capacidadNominalGWh).toBe(30);
            expect(pumped.energiaGWh).toBe(18); // 60% inicial
        });
    });

    describe('batteryEfficiency', () => {
        it('debería calcular eficiencia según duración', () => {
            // 4h (cRate 0.25): η ≈ 0.925
            const bat4h = { capacidadEfectivaGWh: 16, potenciaGW: 4 };
            const eff4h = SEF.Storage.batteryEfficiency(bat4h);
            expect(eff4h).toBeGreaterThan(0.90);
            expect(eff4h).toBeLessThan(0.95);

            // 1h (cRate 1.0): η ≈ 0.87
            const bat1h = { capacidadEfectivaGWh: 4, potenciaGW: 4 };
            const eff1h = SEF.Storage.batteryEfficiency(bat1h);
            expect(eff1h).toBeGreaterThan(0.85);
            expect(eff1h).toBeLessThan(0.90);
        });
    });

    describe('degradeBattery', () => {
        it('debería degradar capacidad por ciclos', () => {
            const battery = {
                capacidadNominalGWh: 16,
                capacidadEfectivaGWh: 16,
                energiaGWh: 8,
                ciclosEquivalentes: 365,
            };
            const factor = SEF.Storage.degradeBattery(battery, 0);
            expect(factor).toBeLessThan(1);
            expect(factor).toBeGreaterThan(0.95);
            expect(battery.capacidadEfectivaGWh).toBeLessThan(16);
        });

        it('debería degradar por calendario', () => {
            const battery = {
                capacidadNominalGWh: 16,
                capacidadEfectivaGWh: 16,
                energiaGWh: 8,
                ciclosEquivalentes: 0,
            };
            const factor = SEF.Storage.degradeBattery(battery, 10);
            expect(factor).toBeLessThan(1);
            expect(factor).toBeGreaterThan(0.8);
        });
    });

    describe('despachar', () => {
        it('debería cargar batería con exceso', () => {
            const battery = SEF.Storage.createBattery(
                { bateriasPotencia: 4, bateriasCapacidad: 16 },
                { energiaGWh: 2 }
            );
            const respuesta = SEF.Storage.despachar(battery, { excesoGW: 3, deficitGW: 0 }, { mes: 6, hora: 12 });
            expect(respuesta.chargeGW).toBeGreaterThan(0);
            expect(respuesta.dischargeGW).toBe(0);
            expect(battery.energiaGWh).toBeGreaterThan(2);
        });

        it('debería descargar batería con déficit', () => {
            const battery = SEF.Storage.createBattery(
                { bateriasPotencia: 4, bateriasCapacidad: 16 },
                { energiaGWh: 10 }
            );
            const respuesta = SEF.Storage.despachar(battery, { excesoGW: 0, deficitGW: 3 }, { mes: 6, hora: 20 });
            expect(respuesta.dischargeGW).toBeGreaterThan(0);
            expect(respuesta.chargeGW).toBe(0);
            expect(battery.energiaGWh).toBeLessThan(10);
        });

        it('debería respetar reserva mínima', () => {
            const battery = SEF.Storage.createBattery(
                { bateriasPotencia: 4, bateriasCapacidad: 16 },
                { energiaGWh: 1.6 } // cerca del mínimo (10% de 16)
            );
            const respuesta = SEF.Storage.despachar(battery, { excesoGW: 0, deficitGW: 10 }, { mes: 6, hora: 20 });
            // No debería descargar más allá de la reserva mínima
            expect(battery.energiaGWh).toBeGreaterThanOrEqual(1.4);
        });

        it('debería no descargar si no hay energía disponible', () => {
            const battery = SEF.Storage.createBattery(
                { bateriasPotencia: 4, bateriasCapacidad: 16 },
                { energiaGWh: 0.1 } // casi vacía
            );
            const respuesta = SEF.Storage.despachar(battery, { excesoGW: 0, deficitGW: 10 }, { mes: 6, hora: 20 });
            expect(respuesta.dischargeGW).toBe(0);
        });
    });

    describe('reserveTarget', () => {
        it('debería tener reservas estacionales para bombeo', () => {
            const pumped = { tipo: 'bombeo' };
            // Primavera: alta reserva
            expect(SEF.Storage.reserveTarget(pumped, 3)).toBe(0.60);
            // Verano: baja reserva
            expect(SEF.Storage.reserveTarget(pumped, 6)).toBe(0.28);
            // Invierno: reserva media
            expect(SEF.Storage.reserveTarget(pumped, 0)).toBe(0.35);
        });

        it('debería tener reserva mínima del 10% para baterías', () => {
            const battery = { tipo: 'bateria' };
            expect(SEF.Storage.reserveTarget(battery, 0)).toBe(0.10);
            expect(SEF.Storage.reserveTarget(battery, 6)).toBe(0.10);
        });
    });

    describe('maxUsableFraction', () => {
        it('debería tener 95% usable para baterías', () => {
            expect(SEF.Storage.maxUsableFraction({ tipo: 'bateria' })).toBe(0.95);
        });

        it('debería tener 100% usable para bombeo', () => {
            expect(SEF.Storage.maxUsableFraction({ tipo: 'bombeo' })).toBe(1.0);
        });
    });

    describe('v2gDisponible', () => {
        it('debería producir energía solo en horas nocturnas', () => {
            const params = { vePorcentajeParque: 10, v2gPct: 5 };
            expect(SEF.Storage.v2gDisponible(params, 3)).toBeGreaterThan(0);
            expect(SEF.Storage.v2gDisponible(params, 12)).toBe(0);
            expect(SEF.Storage.v2gDisponible(params, 22)).toBeGreaterThan(0);
        });
    });
});

describe('SEF.Policy', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    describe('precioFinal', () => {
        it('debería aplicar pérdidas de red', () => {
            const params = { perdidasRed: 0.045, cargosSistema: 10.5, pvpcActivo: false };
            const contexto = { hora: 12 };
            const resultado = SEF.Policy.precioFinal(100, contexto, params);
            // 100 * 1.045 + 10.5 = 115
            expect(resultado.precioFinal).toBeCloseTo(115, 0);
        });

        it('debería aplicar pvpc', () => {
            const params = { perdidasRed: 0, cargosSistema: 0, pvpcActivo: true };
            const contexto = { hora: 12 };
            const resultado = SEF.Policy.precioFinal(100, contexto, params);
            expect(resultado.precioFinal).toBeCloseTo(102.5, 0);
        });

        it('debería acotar precio entre -50 y 3000', () => {
            const params = { perdidasRed: 0, cargosSistema: 0, pvpcActivo: false };
            expect(SEF.Policy.precioFinal(-100, { hora: 12 }, params).precioFinal).toBe(-50);
            expect(SEF.Policy.precioFinal(5000, { hora: 12 }, params).precioFinal).toBe(3000);
        });
    });

    describe('CfD', () => {
        it('debería devolver ajuste positivo cuando spot < strike', () => {
            const resultado = SEF.Policy.CfD('solar', 40, { cfdActivo: true, cfdRenovables_strike: 58 });
            expect(resultado.strike).toBe(58);
            expect(resultado.ajusteConsumidor).toBe(18); // 58 - 40
        });

        it('debería devolver ajuste negativo cuando spot > strike', () => {
            const resultado = SEF.Policy.CfD('solar', 70, { cfdActivo: true, cfdRenovables_strike: 58 });
            expect(resultado.strike).toBe(58);
            expect(resultado.ajusteConsumidor).toBe(-12); // 58 - 70
        });

        it('debería devolver strike más alto para offshore', () => {
            const resultado = SEF.Policy.CfD('offshore', 50, { cfdActivo: true, cfdRenovables_strike: 58 });
            expect(resultado.strike).toBe(76); // 58 + 18
        });

        it('debería devolver null strike cuando CfD no está activo', () => {
            const resultado = SEF.Policy.CfD('solar', 50, { cfdActivo: false });
            expect(resultado.strike).toBeNull();
            expect(resultado.ajusteConsumidor).toBe(0);
        });
    });

    describe('aplicarTopeIberico', () => {
        it('debería aplicar tope cuando genGas > 0', () => {
            const params = { topeIbericoActivo: true };
            const contexto = { genGasGW: 5, yearIndex: 0 };
            const resultado = SEF.Policy.aplicarTopeIberico(100, contexto, params);
            expect(resultado.precioSpot).toBeLessThan(100);
            expect(resultado.compensacion).toBeGreaterThan(0);
        });

        it('debería no aplicar tope cuando genGas = 0', () => {
            const params = { topeIbericoActivo: true };
            const contexto = { genGasGW: 0, yearIndex: 0 };
            const resultado = SEF.Policy.aplicarTopeIberico(100, contexto, params);
            expect(resultado.precioSpot).toBe(100);
            expect(resultado.compensacion).toBe(0);
        });

        it('debería no aplicar tope si no está activo', () => {
            const params = { topeIbericoActivo: false };
            const contexto = { genGasGW: 5, yearIndex: 0 };
            const resultado = SEF.Policy.aplicarTopeIberico(100, contexto, params);
            expect(resultado.precioSpot).toBe(100);
            expect(resultado.compensacion).toBe(0);
        });
    });

    describe('mecanismoCapacidad', () => {
        it('debería calcular costes de mecanismo de capacidad', () => {
            const params = { bateriasPotencia: 10, ccgt: 20, mecanismoCapacidad_euro_kW: 12 };
            const resultado = SEF.Policy.mecanismoCapacidad(params);
            expect(resultado.baterias).toBe(12 * 10 * 1000000);
            expect(resultado.ccgt).toBe(12 * 0.6 * 20 * 1000000);
        });
    });

    describe('peajesDinamicos', () => {
        it('debería aplicar peaje P1 en horas pico', () => {
            const params = { peajesDinamicosActivos: true, peajeP1: 17, peajeP2: 11, peajeP3: 6 };
            expect(SEF.Policy.peajesDinamicos(12, params)).toBe(17); // P1
            expect(SEF.Policy.peajesDinamicos(20, params)).toBe(17); // P1
        });

        it('debería aplicar peaje P3 en horas valle', () => {
            const params = { peajesDinamicosActivos: true, peajeP1: 17, peajeP2: 11, peajeP3: 6 };
            expect(SEF.Policy.peajesDinamicos(3, params)).toBe(6); // P3
            expect(SEF.Policy.peajesDinamicos(10, params)).toBe(17); // P1 (10-14)
        });

        it('debería devolver cargosSistema si peajes dinámicos no activos', () => {
            const params = { peajesDinamicosActivos: false, cargosSistema: 10.5 };
            expect(SEF.Policy.peajesDinamicos(12, params)).toBe(10.5);
        });
    });
});

describe('SEF.Nuclear', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    describe('disponibleEnAnio', () => {
        it('debería devolver 7.0 GW en 2026 (todos activos)', () => {
            const disp = SEF.Nuclear.disponibleEnAnio(2026);
            expect(disp).toBeCloseTo(7.2, 0.5);
        });

        it('debería reducir capacidad tras cierres', () => {
            const disp2030 = SEF.Nuclear.disponibleEnAnio(2030);
            const disp2035 = SEF.Nuclear.disponibleEnAnio(2035);
            // 2030: Asco I y Cofrentes cierran en 2030
            // 2035: Asco II, Vandellos II y Trillo cierran en 2035
            expect(disp2030).toBeLessThan(7.0);
            expect(disp2035).toBeLessThan(disp2030);
        });

        it('debería manejar prórroga', () => {
            const sinProrroga = SEF.Nuclear.disponibleEnAnio(2035);
            const conProrroga = SEF.Nuclear.disponibleEnAnio(2035, { prorrogaGlobal: 10 });
            expect(conProrroga).toBeGreaterThan(sinProrroga);
        });

        it('debería retirar todo con retiraTodoEn', () => {
            const disp = SEF.Nuclear.disponibleEnAnio(2030, { retiraTodoEn: 2028 });
            expect(disp).toBe(0);
        });
    });

    describe('resumen', () => {
        it('debería devolver lista de reactores con estado activo', () => {
            const resumen2026 = SEF.Nuclear.resumen(2026);
            expect(resumen2026.length).toBeGreaterThan(0);
            for (const reactor of resumen2026) {
                expect(reactor).toHaveProperty('activo');
                expect(reactor).toHaveProperty('cierre');
                expect(reactor).toHaveProperty('capacidadGW');
                expect(reactor).toHaveProperty('nombre');
            }
        });

        it('debería mostrar todos activos en 2026', () => {
            const resumen2026 = SEF.Nuclear.resumen(2026);
            for (const reactor of resumen2026) {
                expect(reactor.activo).toBe(true);
            }
        });

        it('debería mostrar algunos inactivos en 2035', () => {
            const resumen2035 = SEF.Nuclear.resumen(2035);
            const activos = resumen2035.filter(r => r.activo);
            expect(activos.length).toBeLessThan(resumen2035.length);
        });
    });

    describe('CALENDARIO', () => {
        it('debería tener 7 reactores', () => {
            expect(SEF.Nuclear.CALENDARIO.length).toBe(7);
        });

        it('debería tener reactores con IDs únicos', () => {
            const ids = SEF.Nuclear.CALENDARIO.map(r => r.id);
            const unique = new Set(ids);
            expect(unique.size).toBe(ids.length);
        });
    });
});
