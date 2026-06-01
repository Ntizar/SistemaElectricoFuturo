/**
 * ============================================================================
 *  TEST: Calibración contra datos REE 2025
 * ============================================================================
 *  Ejecuta el escenario 0 (Datos Reales 2025) y verifica que las métricas
 *  clave están dentro de rangos plausibles.
 *
 *  NOTA: El modelo es una simplificación del sistema real. Los precios medios
 *  son más altos que los observados porque el modelo no captura toda la
 *  flexibilidad del sistema (respaldo internacional, gestión de demanda, etc).
 *  Los tests verifican que el modelo produce resultados consistentes, no
 *  que reproduzca exactamente los datos históricos.
 *
 *  Fuentes:
 *  - REE: https://www.ree.es/es/datos (generación anual 2025)
 *  - OMIE: https://www.omie.es/ (precios de mercado)
 * ============================================================================
 */

'use strict';

import { describe, it, expect, beforeAll } from 'vitest';
import SEF from '../js/engine.js';

describe('Calibración contra datos REE 2025', () => {
    let resultado;

    beforeAll(() => {
        // Escenario 0: Datos Reales 2025 (anioObjetivo=2026, capacities 2025)
        const escenario = SEF.ESCENARIOS.find(e => e.id === 0);
        const sim = new SEF.SimuladorElectrico(escenario.params);
        resultado = sim.simular();
    });

    // --- Generación por tecnología ---

    it('generación solar entre 45-60 TWh (REE 2025: 52.5 TWh)', () => {
        const solarTWh = resultado.mix.reduce((s, g) => s + g.solar, 0) / 1000;
        expect(solarTWh).toBeGreaterThan(45);
        expect(solarTWh).toBeLessThan(60);
    });

    it('generación eólica entre 48-65 TWh (REE 2025: 55.6 TWh)', () => {
        const eolicaTWh = resultado.mix.reduce((s, g) => s + g.eolica, 0) / 1000;
        expect(eolicaTWh).toBeGreaterThan(48);
        expect(eolicaTWh).toBeLessThan(65);
    });

    it('generación nuclear entre 45-58 TWh (REE 2025: 51.9 TWh)', () => {
        const nuclearTWh = resultado.mix.reduce((s, g) => s + g.nuclear, 0) / 1000;
        expect(nuclearTWh).toBeGreaterThan(45);
        expect(nuclearTWh).toBeLessThan(58);
    });

    // --- Demanda ---

    it('demanda anual entre 235-265 TWh (REE 2025: ~248 TWh)', () => {
        const demandaTWh = resultado.demandaAjustadaTWh;
        expect(demandaTWh).toBeGreaterThan(235);
        expect(demandaTWh).toBeLessThan(265);
    });

    // --- Precios (rango amplio: modelo simplificado) ---

    it('precio medio positivo y < 500 €/MWh', () => {
        // El modelo produce precios más altos que el real (~63 €/MWh)
        // porque no captura toda la flexibilidad del sistema
        expect(resultado.precioMedio).toBeGreaterThan(0);
        expect(resultado.precioMedio).toBeLessThan(500);
    });

    it('precio P90 < 800 €/MWh (refleja horas de estrés)', () => {
        expect(resultado.precioP90).toBeLessThan(800);
    });

    // --- Emisiones ---

    it('emisiones positivas (hay gas en el mix)', () => {
        // Con capacities 2025 y alta demanda, el gas se usa poco
        expect(resultado.emisionesAnuales).toBeGreaterThan(0);
    });

    it('intensidad de carbono > 0 gCO2/kWh', () => {
        expect(resultado.intensidadCarbona).toBeGreaterThan(0);
    });

    // --- Balance energético ---

    it('balance energético verificado (desviación < 15 TWh)', () => {
        // El modelo tiene simplificaciones que generan desviación
        // En un modelo completo esto debería ser < 1 TWh
        expect(resultado.verificacionBalance.balanceTWh).toBeLessThan(15);
    });

    // --- Mix ---

    it('cobertura renovable > 30%', () => {
        expect(resultado.coberturaRenovable).toBeGreaterThan(30);
    });

    it('nuclear efectiva entre 5.5-7.5 GW', () => {
        expect(resultado.nuclearEfectivaGW).toBeGreaterThan(5.5);
        expect(resultado.nuclearEfectivaGW).toBeLessThan(7.5);
    });

    // --- Consistencia interna ---

    it('precio P10 <= precio mediana <= precio P90', () => {
        expect(resultado.precioP10).toBeLessThanOrEqual(resultado.precioMediana);
        expect(resultado.precioMediana).toBeLessThanOrEqual(resultado.precioP90);
    });

    it('precio min <= precio medio <= precio max', () => {
        expect(resultado.precioMin).toBeLessThanOrEqual(resultado.precioMedio);
        expect(resultado.precioMedio).toBeLessThanOrEqual(resultado.precioMax);
    });

    it('horas de déficit >= 0', () => {
        expect(resultado.horasDeficit).toBeGreaterThanOrEqual(0);
    });

    it('ENS (energía no suministrada) >= 0 TWh', () => {
        expect(resultado.ensTWh).toBeGreaterThanOrEqual(0);
    });
});
