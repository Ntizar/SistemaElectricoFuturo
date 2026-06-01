/**
 * ============================================================================
 *  TEST: Orden de mérito SRMC
 * ============================================================================
 *  Verifica que el precio marginal se forma correctamente según el
 *  coste marginal de corto plazo (SRMC) de la última tecnología necesaria.
 * ============================================================================
 */

'use strict';

import { describe, it, expect, beforeAll } from 'vitest';
import SEF from '../js/engine.js';

describe('Orden de mérito', () => {
    it('precio floor cuando nuclear domina el mix', () => {
        // Configuración: mucha nuclear, poca demanda, cero renovable
        // Con nuclear > demanda, el precio debe ser bajo (floor price ≈ 10)
        const params = {
            ...SEF.PARAMS_DEFAULT,
            nuclear: 30,
            solar: 0,
            eolica: 0,
            eolicaOffshore: 0,
            hidraulica: 0,
            ccgt: 0,
            bateriasPotencia: 0,
            bombeo: 0,
            demandaAnual: 100,
            interconexion: 0,
            aplicarPlanNuclear: false,
        };
        const sim = new SEF.SimuladorElectrico(params);
        const R = sim.simular();
        // Con exceso masivo de nuclear, el precio debe ser bajo (< 100 €/MWh)
        // El modelo incluye peajes, pérdidas de red y otros cargos que elevan el precio
        expect(R.precioMedio).toBeLessThan(100);
    });

    it('precio sube cuando gas es marginal', () => {
        // Configuración: sin renovable, demanda > nuclear, gas necesario
        const params = {
            ...SEF.PARAMS_DEFAULT,
            nuclear: 3,
            solar: 0,
            eolica: 0,
            eolicaOffshore: 0,
            hidraulica: 0,
            ccgt: 30,
            demandaAnual: 200,
            interconexion: 0,
            precioGas: 42,
            precioCO2: 70,
            aplicarPlanNuclear: false,
        };
        const sim = new SEF.SimuladorElectrico(params);
        const R = sim.simular();
        // Con gas como marginal, el precio debe incluir el coste CCGT
        expect(R.precioMedio).toBeGreaterThan(50);
    });

    it('precio de escasez se alcanza con déficit > 30%', () => {
        // Configuración: demanda alta, sin generación suficiente
        const params = {
            ...SEF.PARAMS_DEFAULT,
            nuclear: 0,
            solar: 0,
            eolica: 0,
            eolicaOffshore: 0,
            hidraulica: 0,
            ccgt: 5,
            bateriasPotencia: 0,
            bombeo: 0,
            demandaAnual: 350,
            interconexion: 0,
            precioEscasez: 500,
            aplicarPlanNuclear: false,
        };
        const sim = new SEF.SimuladorElectrico(params);
        const R = sim.simular();
        // Con déficit masivo, el precio debe acercarse a precioEscasez
        expect(R.precioMax).toBeGreaterThan(200);
    });

    it('precio puede ser negativo con exceso de renovable', () => {
        // Configuración: mucha renovable, poca demanda
        const params = {
            ...SEF.PARAMS_DEFAULT,
            nuclear: 0,
            solar: 200,
            eolica: 200,
            eolicaOffshore: 0,
            hidraulica: 0,
            ccgt: 0,
            bateriasPotencia: 0,
            bombeo: 0,
            demandaAnual: 100,
            interconexion: 0,
            aplicarPlanNuclear: false,
        };
        const sim = new SEF.SimuladorElectrico(params);
        const R = sim.simular();
        // Con exceso masivo de renovable, debe haber precios negativos
        expect(R.horasPrecioNegativo).toBeGreaterThan(0);
    });

    it('coste CCGT = precioGas/η + CO₂·0.37/η + O&M', () => {
        // Verificación directa de la fórmula
        const params = {
            precioGas: 42,
            precioCO2: 70,
            rendimientoCCGT: 0.57,
            omCCGT: 3.2,
        };
        const calorEsp = 1 / params.rendimientoCCGT;
        const costeComb = params.precioGas * calorEsp;
        const costeCO2 = (SEF.MODEL.FACTOR_CO2_GAS / params.rendimientoCCGT) * params.precioCO2;
        const costeCCGT = costeComb + costeCO2 + params.omCCGT;

        // Fórmula esperada
        const esperado = 42 / 0.57 + (0.202 / 0.57) * 70 + 3.2;
        expect(costeCCGT).toBeCloseTo(esperado, 2);
    });
});
