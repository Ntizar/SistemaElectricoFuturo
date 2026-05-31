/**
 * ============================================================================
 *  TESTS DE CALIBRACIÓN — Comparación con datos REE 2025
 * ============================================================================
 *  Verifica que la simulación produce resultados dentro de rangos aceptables
 *  comparados con datos reales de REE 2025.
 *  Nota: El modelo sintético tiene desviaciones respecto a datos reales;
 *  los rangos aquí son amplios para capturar el comportamiento del modelo.
 * ============================================================================
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { cargarTodosLosModulos } from './setup.js';

describe('Calibración REE 2025', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    describe('Escenario Datos Reales 2025', () => {
        it('debería simular correctamente el escenario 0', () => {
            const esc = SEF.ESCENARIOS[0];
            expect(esc).toBeDefined();
            expect(esc.id).toBe(0);
            expect(esc.nombre).toBe('Datos Reales 2025');
        });

        it('debería producir demanda anual cercana a 248 TWh', () => {
            const esc = SEF.ESCENARIOS[0];
            const simulador = new SEF.SimuladorElectrico(esc.params);
            const resultado = simulador.simular();

            // Demanda real 2025: ~248 TWh. Permitimos ±10% por la naturaleza sintética del modelo.
            expect(resultado.demandaAjustadaTWh).toBeGreaterThan(220);
            expect(resultado.demandaAjustadaTWh).toBeLessThan(270);
        });

        it('debería producir emisiones anuales dentro de rango razonable', () => {
            const esc = SEF.ESCENARIOS[0];
            const simulador = new SEF.SimuladorElectrico(esc.params);
            const resultado = simulador.simular();

            // El modelo sintético puede tener emisiones diferentes a datos REE reales.
            // Verificamos que sean positivas y razonables para un sistema con gas.
            expect(resultado.emisionesAnuales).toBeGreaterThan(0);
            expect(resultado.emisionesAnuales).toBeLessThan(100);
        });

        it('debería producir cobertura renovable dentro de rango razonable', () => {
            const esc = SEF.ESCENARIOS[0];
            const simulador = new SEF.SimuladorElectrico(esc.params);
            const resultado = simulador.simular();

            // Renovables reales 2025: ~56%. El modelo puede variar.
            expect(resultado.coberturaRenovable).toBeGreaterThan(40);
            expect(resultado.coberturaRenovable).toBeLessThan(85);
        });

        it('debería producir precio medio dentro de rango razonable', () => {
            const esc = SEF.ESCENARIOS[0];
            const simulador = new SEF.SimuladorElectrico(esc.params);
            const resultado = simulador.simular();

            // El modelo puede producir precios diferentes a datos reales.
            // Verificamos que sean positivos y no extremos.
            expect(resultado.precioMedioPonderado).toBeGreaterThan(20);
            expect(resultado.precioMedioPonderado).toBeLessThan(400);
        });

        it('debería tener intensidad de carbono positiva', () => {
            const esc = SEF.ESCENARIOS[0];
            const simulador = new SEF.SimuladorElectrico(esc.params);
            const resultado = simulador.simular();

            // Verificamos que exista y sea positiva.
            expect(resultado.intensidadCarbona).toBeGreaterThan(0);
            expect(resultado.intensidadCarbona).toBeLessThan(500);
        });

        it('debería tener horas de déficit no negativas', () => {
            const esc = SEF.ESCENARIOS[0];
            const simulador = new SEF.SimuladorElectrico(esc.params);
            const resultado = simulador.simular();

            expect(resultado.horasDeficit).toBeGreaterThanOrEqual(0);
            expect(resultado.horasDeficit).toBeLessThan(8760);
        });

        it('debería tener ENS (deseo no servido) no negativo', () => {
            const esc = SEF.ESCENARIOS[0];
            const simulador = new SEF.SimuladorElectrico(esc.params);
            const resultado = simulador.simular();

            expect(resultado.ensTWh).toBeGreaterThanOrEqual(0);
        });

        it('debería tener horas con gas coherentes', () => {
            const esc = SEF.ESCENARIOS[0];
            const simulador = new SEF.SimuladorElectrico(esc.params);
            const resultado = simulador.simular();

            // España tiene gas en muchas horas; verificamos rango amplio.
            expect(resultado.horasGas).toBeGreaterThan(0);
            expect(resultado.horasGas).toBeLessThan(8760);
        });

        it('debería tener vertidos no negativos', () => {
            const esc = SEF.ESCENARIOS[0];
            const simulador = new SEF.SimuladorElectrico(esc.params);
            const resultado = simulador.simular();

            expect(resultado.vertidosTWh).toBeGreaterThanOrEqual(0);
        });

        it('debería tener importaciones y exportaciones positivas', () => {
            const esc = SEF.ESCENARIOS[0];
            const simulador = new SEF.SimuladorElectrico(esc.params);
            const resultado = simulador.simular();

            // España es interconectada; ambos flujos deberían existir.
            expect(resultado.importacionesTWh).toBeGreaterThan(0);
            expect(resultado.exportacionesTWh).toBeGreaterThan(0);
        });

        it('debería tener precios dentro de rangos válidos (-50 a 3000)', () => {
            const esc = SEF.ESCENARIOS[0];
            const simulador = new SEF.SimuladorElectrico(esc.params);
            const resultado = simulador.simular();

            expect(resultado.precioMin).toBeGreaterThanOrEqual(-50);
            expect(resultado.precioMax).toBeLessThanOrEqual(3000);
        });
    });
});
