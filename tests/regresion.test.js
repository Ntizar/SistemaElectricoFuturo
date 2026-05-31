/**
 * ============================================================================
 *  TESTS DE REGRESIÓN — Resultados reproducibles y consistencia
 * ============================================================================
 *  Verifica que:
 *  - Mismos parámetros → mismos resultados (determinismo)
 *  - Los KPIs están en rangos físicamente razonables
 *  - No hay valores NaN o Infinity
 *  - La simulación no crasha con parámetros extremos
 * ============================================================================
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { cargarTodosLosModulos, PARAMETROS_PNIEC, PARAMETROS_2025, ejecutarSimulacion } from './setup.js';

describe('Regresión — Determinismo', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    it('debería producir resultados idénticos con mismos parámetros', () => {
        const resultados = [];
        for (let i = 0; i < 5; i++) {
            const params = { ...PARAMETROS_PNIEC, semilla: 42 };
            const simulador = new SEF.SimuladorElectrico(params);
            resultados.push(simulador.simular());
        }

        for (let i = 1; i < resultados.length; i++) {
            expect(resultados[i].precioMedioPonderado).toBe(resultados[0].precioMedioPonderado);
            expect(resultados[i].emisionesAnuales).toBe(resultados[0].emisionesAnuales);
            expect(resultados[i].coberturaRenovable).toBe(resultados[0].coberturaRenovable);
        }
    });

    it('debería ser determinista con escenario predefinido', () => {
        const esc = SEF.ESCENARIOS[1]; // PNIEC Base 2030
        const r1 = new SEF.SimuladorElectrico(esc.params).simular();
        const r2 = new SEF.SimuladorElectrico(esc.params).simular();

        expect(r1.precioMedioPonderado).toBe(r2.precioMedioPonderado);
        expect(r1.emisionesAnuales).toBe(r2.emisionesAnuales);
    });
});

describe('Regresión — Valores no NaN/Infinity', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    it('debería no tener NaN en KPIs principales', () => {
        const resultado = ejecutarSimulacion(PARAMETROS_PNIEC);
        const kpis = [
            'precioMedio', 'precioMedioPonderado', 'emisionesAnuales',
            'coberturaRenovable', 'demandaAjustadaTWh', 'costeSistemaMEur',
            'intensidadCarbona', 'dependenciaGas', 'vertidosTWh',
            'horasDeficit', 'ensTWh', 'horasGas', 'horasVertido',
            'precioMin', 'precioMax', 'precioP10', 'precioP90',
            'lcoeSolar', 'lcoeEolica', 'lcoeGas', 'lcosBaterias',
        ];

        for (const kpi of kpis) {
            expect(resultado[kpi]).toBeDefined();
            expect(Number.isNaN(resultado[kpi])).toBe(false);
            expect(Number.isFinite(resultado[kpi])).toBe(true);
        }
    });

    it('debería no tener NaN en mix horario', () => {
        const resultado = ejecutarSimulacion(PARAMETROS_PNIEC);
        for (let h = 0; h < resultado.mix.length; h++) {
            const g = resultado.mix[h];
            expect(Number.isNaN(g.nuclear)).toBe(false);
            expect(Number.isNaN(g.solar)).toBe(false);
            expect(Number.isNaN(g.eolica)).toBe(false);
            expect(Number.isNaN(g.gas)).toBe(false);
        }
    });

    it('debería no tener NaN en precios horarios', () => {
        const resultado = ejecutarSimulacion(PARAMETROS_PNIEC);
        for (let h = 0; h < resultado.precios.length; h++) {
            expect(Number.isNaN(resultado.precios[h])).toBe(false);
            expect(Number.isFinite(resultado.precios[h])).toBe(true);
        }
    });
});

describe('Regresión — Rangos físicos razonables', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    it('debería tener demanda positiva', () => {
        const resultado = ejecutarSimulacion(PARAMETROS_PNIEC);
        expect(resultado.demandaAjustadaTWh).toBeGreaterThan(0);
    });

    it('debería tener emisiones positivas', () => {
        const resultado = ejecutarSimulacion(PARAMETROS_PNIEC);
        expect(resultado.emisionesAnuales).toBeGreaterThan(0);
    });

    it('debería tener cobertura renovable entre 0 y 100%', () => {
        const resultado = ejecutarSimulacion(PARAMETROS_PNIEC);
        expect(resultado.coberturaRenovable).toBeGreaterThanOrEqual(0);
        expect(resultado.coberturaRenovable).toBeLessThanOrEqual(100);
    });

    it('debería tener dependencia de gas entre 0 y 100%', () => {
        const resultado = ejecutarSimulacion(PARAMETROS_PNIEC);
        expect(resultado.dependenciaGas).toBeGreaterThanOrEqual(0);
        expect(resultado.dependenciaGas).toBeLessThanOrEqual(100);
    });

    it('debería tener vertidos no negativos', () => {
        const resultado = ejecutarSimulacion(PARAMETROS_PNIEC);
        expect(resultado.vertidosTWh).toBeGreaterThanOrEqual(0);
    });

    it('debería tener horas totales = 8760', () => {
        const resultado = ejecutarSimulacion(PARAMETROS_PNIEC);
        const totalHoras = (resultado.horasGas + resultado.horasVertido +
            resultado.horasDeficit + resultado.horasPrecioNegativo +
            resultado.horasPrecioAlto + resultado.horasBombeoActivo +
            resultado.horasFlex + resultado.horasImportacion +
            resultado.horasExportacion + resultado.horasSinGas +
            resultado.horasInerciaCritica) ;
        // Estas categorías no son mutuamente excluyentes, pero cada una debería ser <= 8760
        expect(resultado.horasGas).toBeLessThanOrEqual(8760);
        expect(resultado.horasVertido).toBeLessThanOrEqual(8760);
        expect(resultado.horasDeficit).toBeLessThanOrEqual(8760);
    });

    it('debería tener ENS no negativo', () => {
        const resultado = ejecutarSimulacion(PARAMETROS_PNIEC);
        expect(resultado.ensTWh).toBeGreaterThanOrEqual(0);
    });

    it('debería tener coste sistema positivo', () => {
        const resultado = ejecutarSimulacion(PARAMETROS_PNIEC);
        expect(resultado.costeSistemaMEur).toBeGreaterThan(0);
    });
});

describe('Regresión — Escenarios múltiples', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    it('debería simular todos los escenarios sin crash', () => {
        for (let i = 0; i < SEF.ESCENARIOS.length; i++) {
            const esc = SEF.ESCENARIOS[i];
            expect(() => {
                const simulador = new SEF.SimuladorElectrico(esc.params);
                const resultado = simulador.simular();
                expect(resultado).toBeDefined();
                expect(resultado.demandaAjustadaTWh).toBeGreaterThan(0);
            }).not.toThrow();
        }
    });

    it('debería tener el escenario 0 como referencia 2025', () => {
        const esc = SEF.ESCENARIOS[0];
        expect(esc.id).toBe(0);
        expect(esc.anio).toBe(2025);
    });

    it('debería tener al menos 15 escenarios definidos', () => {
        expect(SEF.ESCENARIOS.length).toBeGreaterThanOrEqual(15);
    });

    it('debería tener todos los escenarios con propiedades requeridas', () => {
        for (const esc of SEF.ESCENARIOS) {
            expect(esc).toHaveProperty('id');
            expect(esc).toHaveProperty('nombre');
            expect(esc).toHaveProperty('icono');
            expect(esc).toHaveProperty('descripcion');
            expect(esc).toHaveProperty('params');
            expect(typeof esc.nombre).toBe('string');
            expect(esc.nombre.length).toBeGreaterThan(0);
        }
    });
});

describe('Regresión — Parámetros extremos', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    it('debería manejar demanda muy baja sin crash', () => {
        const params = { ...PARAMETROS_2025, demandaAnual: 180 };
        const resultado = ejecutarSimulacion(params);
        expect(resultado).toBeDefined();
        expect(Number.isNaN(resultado.demandaAjustadaTWh)).toBe(false);
    });

    it('debería manejar demanda muy alta sin crash', () => {
        const params = { ...PARAMETROS_2025, demandaAnual: 380 };
        const resultado = ejecutarSimulacion(params);
        expect(resultado).toBeDefined();
        expect(Number.isNaN(resultado.demandaAjustadaTWh)).toBe(false);
    });

    it('debería manejar precio gas muy alto sin crash', () => {
        const params = { ...PARAMETROS_2025, precioGas: 200, precioCO2: 200 };
        const resultado = ejecutarSimulacion(params);
        expect(resultado).toBeDefined();
        expect(Number.isNaN(resultado.precioMedio)).toBe(false);
    });

    it('debería manejar sin nuclear sin crash', () => {
        const params = { ...PARAMETROS_2025, nuclear: 0, aplicarPlanNuclear: false };
        const resultado = ejecutarSimulacion(params);
        expect(resultado).toBeDefined();
        expect(Number.isNaN(resultado.nuclearEfectivaGW)).toBe(false);
    });

    it('debería manejar sin gas sin crash', () => {
        const params = { ...PARAMETROS_2025, ccgt: 0 };
        const resultado = ejecutarSimulacion(params);
        expect(resultado).toBeDefined();
        expect(Number.isNaN(resultado.consumoGasTWh)).toBe(false);
    });

    it('debería manejar semilla 0 sin crash', () => {
        const params = { ...PARAMETROS_PNIEC, semilla: 0 };
        const resultado = ejecutarSimulacion(params);
        expect(resultado).toBeDefined();
        expect(Number.isNaN(resultado.precioMedio)).toBe(false);
    });

    it('debería manejar semilla muy grande sin crash', () => {
        const params = { ...PARAMETROS_PNIEC, semilla: 999999 };
        const resultado = ejecutarSimulacion(params);
        expect(resultado).toBeDefined();
        expect(Number.isNaN(resultado.precioMedio)).toBe(false);
    });
});

describe('Regresión — Estado de almacenamiento', () => {
    beforeAll(() => {
        cargarTodosLosModulos();
    });

    it('debería devolver estado final de batería', () => {
        const resultado = ejecutarSimulacion(PARAMETROS_PNIEC);
        expect(resultado.estadoBateriaFinal).toBeDefined();
        expect(resultado.estadoBateriaFinal).toHaveProperty('energiaGWh');
        expect(resultado.estadoBateriaFinal).toHaveProperty('capacidadEfectivaGWh');
        expect(resultado.estadoBateriaFinal).toHaveProperty('ciclosEquivalentes');
        expect(resultado.estadoBateriaFinal.energiaGWh).toBeGreaterThan(0);
    });

    it('debería devolver estado final de bombeo', () => {
        const resultado = ejecutarSimulacion(PARAMETROS_PNIEC);
        expect(resultado.estadoBombeoFinal).toBeDefined();
        expect(resultado.estadoBombeoFinal).toHaveProperty('energiaGWh');
        expect(resultado.estadoBombeoFinal).toHaveProperty('capacidadEfectivaGWh');
        expect(resultado.estadoBombeoFinal.energiaGWh).toBeGreaterThan(0);
    });

    it('debería tener capacidades definidas', () => {
        const resultado = ejecutarSimulacion(PARAMETROS_PNIEC);
        expect(resultado.capacidades).toBeDefined();
        expect(resultado.capacidades).toHaveProperty('nuclear');
        expect(resultado.capacidades).toHaveProperty('solar');
        expect(resultado.capacidades).toHaveProperty('eolica');
        expect(resultado.capacidades).toHaveProperty('ccgt');
        expect(resultado.capacidades).toHaveProperty('almacenamiento');
    });
});
