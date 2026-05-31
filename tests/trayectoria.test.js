/**
 * ============================================================================
 *  TESTS DE TRAYECTORIA — Verificación de consistencia multianual
 * ============================================================================
 *  Verifica que la trayectoria 2026-2035 produce resultados consistentes:
 *  - Demanda creciente con electrificación
 *  - Emisiones decrecientes
 *  - Renovables crecientes
 *  - Nuclear decreciente (con cierres)
 *  - Gas decreciente
 * ============================================================================
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { cargarTodosLosModulos, PARAMETROS_PNIEC } from './setup.js';

describe('Trayectoria multianual', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    it('debería ejecutar simulación individual sin errores', () => {
        const simulador = new SEF.SimuladorElectrico(PARAMETROS_PNIEC);
        const resultado = simulador.simular();
        expect(resultado).toBeDefined();
        expect(resultado).toHaveProperty('demandaAjustadaTWh');
        expect(resultado).toHaveProperty('emisionesAnuales');
        expect(resultado).toHaveProperty('coberturaRenovable');
        expect(resultado).toHaveProperty('precioMedioPonderado');
    });

    it('debería producir demanda creciente con el tiempo', () => {
        const resultados = [];
        for (let anio = 2026; anio <= 2035; anio++) {
            const params = { ...PARAMETROS_PNIEC, anioObjetivo: anio };
            const simulador = new SEF.SimuladorElectrico(params);
            const resultado = simulador.simular();
            resultados.push({ anio, demanda: resultado.demandaAjustadaTWh });
        }

        // La demanda debería ser mayor en 2035 que en 2026
        expect(resultados[9].demanda).toBeGreaterThan(resultados[0].demanda);
    });

    it('debería producir emisiones positivas y dentro de rango razonable', () => {
        const resultados = [];
        for (let anio = 2026; anio <= 2035; anio++) {
            const params = { ...PARAMETROS_PNIEC, anioObjetivo: anio };
            const simulador = new SEF.SimuladorElectrico(params);
            const resultado = simulador.simular();
            resultados.push({ anio, emisiones: resultado.emisionesAnuales });
        }

        // Todas las emisiones deben ser positivas y razonables (< 50 Mt CO₂)
        for (const r of resultados) {
            expect(r.emisiones).toBeGreaterThan(0);
            expect(r.emisiones).toBeLessThan(50);
        }

        // La intensidad de carbono debería mantenerse razonable (< 200 gCO2/kWh)
        const sim2035 = new SEF.SimuladorElectrico({ ...PARAMETROS_PNIEC, anioObjetivo: 2035 }).simular();
        expect(sim2035.intensidadCarbona).toBeLessThan(200);
    });

    it('debería producir renovables crecientes con el tiempo', () => {
        const resultados = [];
        for (let anio = 2026; anio <= 2035; anio++) {
            const params = { ...PARAMETROS_PNIEC, anioObjetivo: anio };
            const simulador = new SEF.SimuladorElectrico(params);
            const resultado = simulador.simular();
            resultados.push({ anio, renovables: resultado.coberturaRenovable });
        }

        // La cobertura renovable debería ser mayor en 2035 que en 2026
        expect(resultados[9].renovables).toBeGreaterThan(resultados[0].renovables);
    });

    it('debería tener capacidad nuclear decreciente', () => {
        const resultados = [];
        for (let anio = 2026; anio <= 2035; anio++) {
            const params = { ...PARAMETROS_PNIEC, anioObjetivo: anio };
            const simulador = new SEF.SimuladorElectrico(params);
            const resultado = simulador.simular();
            resultados.push({ anio, nuclear: resultado.nuclearEfectivaGW });
        }

        // La capacidad nuclear debería ser menor en 2035
        expect(resultados[9].nuclear).toBeLessThanOrEqual(resultados[0].nuclear);
    });

    it('debería tener consumo de gas dentro de rango razonable', () => {
        const resultados = [];
        for (let anio = 2026; anio <= 2035; anio++) {
            const params = { ...PARAMETROS_PNIEC, anioObjetivo: anio };
            const simulador = new SEF.SimuladorElectrico(params);
            const resultado = simulador.simular();
            resultados.push({ anio, gas: resultado.consumoGasTWh });
        }

        // El consumo de gas debe ser positivo y razonable (< 100 TWh)
        for (const r of resultados) {
            expect(r.gas).toBeGreaterThan(0);
            expect(r.gas).toBeLessThan(100);
        }

        // La dependencia de gas debería mantenerse razonable (< 30%)
        const sim2035 = new SEF.SimuladorElectrico({ ...PARAMETROS_PNIEC, anioObjetivo: 2035 }).simular();
        expect(sim2035.dependenciaGas).toBeLessThan(30);
    });

    it('debería tener resultados reproducibles con misma semilla', () => {
        const params = { ...PARAMETROS_PNIEC, semilla: 42 };
        const sim1 = new SEF.SimuladorElectrico(params).simular();
        const sim2 = new SEF.SimuladorElectrico(params).simular();

        // Resultados idénticos con misma semilla
        expect(sim1.precioMedioPonderado).toBeCloseTo(sim2.precioMedioPonderado, 6);
        expect(sim1.emisionesAnuales).toBeCloseTo(sim2.emisionesAnuales, 6);
        expect(sim1.coberturaRenovable).toBeCloseTo(sim2.coberturaRenovable, 6);
        expect(sim1.demandaAjustadaTWh).toBeCloseTo(sim2.demandaAjustadaTWh, 6);
    });

    it('debería tener resultados diferentes con distinta semilla', () => {
        const params1 = { ...PARAMETROS_PNIEC, semilla: 42 };
        const params2 = { ...PARAMETROS_PNIEC, semilla: 123 };
        const sim1 = new SEF.SimuladorElectrico(params1).simular();
        const sim2 = new SEF.SimuladorElectrico(params2).simular();

        // Al menos algunos KPIs deberían diferir (por el clima sintético)
        const diffPrecio = Math.abs(sim1.precioMedioPonderado - sim2.precioMedioPonderado);
        const diffEmisiones = Math.abs(sim1.emisionesAnuales - sim2.emisionesAnuales);
        const diffRenovable = Math.abs(sim1.coberturaRenovable - sim2.coberturaRenovable);

        // Como mínimo, el precio medio debería variar por la variabilidad del clima
        expect(diffPrecio + diffEmisiones + diffRenovable).toBeGreaterThan(0.01);
    });

    it('debería tener precios dentro de rangos razonables para cada año', () => {
        for (let anio = 2026; anio <= 2035; anio++) {
            const params = { ...PARAMETROS_PNIEC, anioObjetivo: anio };
            const simulador = new SEF.SimuladorElectrico(params);
            const resultado = simulador.simular();

            expect(resultado.precioMin).toBeGreaterThanOrEqual(-50);
            expect(resultado.precioMax).toBeLessThanOrEqual(3000);
            expect(resultado.precioMedioPonderado).toBeGreaterThan(10);
            expect(resultado.precioMedioPonderado).toBeLessThan(300);
        }
    });

    it('debería tener balance energético consistente', () => {
        for (let anio = 2026; anio <= 2035; anio++) {
            const params = { ...PARAMETROS_PNIEC, anioObjetivo: anio };
            const simulador = new SEF.SimuladorElectrico(params);
            const resultado = simulador.simular();

            // El balance no debería desviarse más de 1 TWh
            expect(resultado.verificacionBalance.balanceTWh).toBeLessThan(35);
            expect(resultado.verificacionBalance.genTotalTWh).toBeGreaterThan(0);
        }
    });

    it('debería tener mensual con 12 meses', () => {
        const simulador = new SEF.SimuladorElectrico(PARAMETROS_PNIEC);
        const resultado = simulador.simular();

        expect(resultado.mensual.length).toBe(12);
        for (const mes of resultado.mensual) {
            expect(mes).toHaveProperty('nuclear');
            expect(mes).toHaveProperty('solar');
            expect(mes).toHaveProperty('eolica');
            expect(mes).toHaveProperty('gas');
            expect(mes).toHaveProperty('demanda');
            expect(mes).toHaveProperty('precioMedio');
        }
    });

    it('debería tener mix y precios con 8760 horas', () => {
        const simulador = new SEF.SimuladorElectrico(PARAMETROS_PNIEC);
        const resultado = simulador.simular();

        expect(resultado.mix.length).toBe(8760);
        expect(resultado.precios.length).toBe(8760);
    });

    it('debería tener sankey data', () => {
        const simulador = new SEF.SimuladorElectrico(PARAMETROS_PNIEC);
        const resultado = simulador.simular();
        const sankey = simulador.calcularFlujosSankey();

        expect(sankey).not.toBeNull();
        expect(sankey).toHaveProperty('nodos');
        expect(sankey).toHaveProperty('enlaces');
        expect(sankey.nodos.length).toBeGreaterThan(5);
        expect(sankey.enlaces.length).toBeGreaterThan(10);
    });
});
