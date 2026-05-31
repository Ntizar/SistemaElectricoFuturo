/**
 * ============================================================================
 *  HELPER DE CARGA DE MÓDULOS SEF PARA TESTS
 * ============================================================================
 *  Los módulos SEF usan IIFE con `window.SEF = SEF` y `window.SEF || {}`.
 *  En Node.js (sin DOM), necesitamos crear un namespace SEF global
 *  y ejecutar los módulos con `new Function()` para evitar problemas de scope.
 *
 *  Este helper carga los módulos en orden de dependencia y expone
 *  `globalThis.SEF` para que los tests puedan acceder a las funciones.
 * ============================================================================
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/**
 * Carga un módulo SEF individual en el entorno de Node.js.
 * @param {string} ruta - Ruta relativa desde la raíz del proyecto (ej: 'js/constants.js')
 */
export function cargarModulo(ruta) {
    const codigo = readFileSync(join(ROOT, ruta), 'utf-8');
    const SEF = globalThis.SEF || {};
    globalThis.SEF = SEF;
    if (!globalThis.window) {
        globalThis.window = { SEF: SEF };
    }
    const fn = new Function(codigo);
    fn();
}

/**
 * Carga TODOS los módulos SEF en orden de dependencia.
 */
export function cargarTodosLosModulos() {
    const modulos = [
        'js/constants.js',
        'js/weather.js',
        'js/demand.js',
        'js/storage.js',
        'js/policy.js',
        'js/nuclear.js',
        'js/simulator.js',
        'js/trajectory.js',
        'js/montecarlo.js',
        'js/scenarios.js',
    ];

    for (const mod of modulos) {
        cargarModulo(mod);
    }

    if (!globalThis.SEF) {
        throw new Error('SEF no se cargó correctamente');
    }
}

/**
 * Ejecuta una simulación y devuelve el resultado.
 * @param {Object} params - Parámetros de simulación (por defecto escenario 1 PNIEC Base)
 * @returns {Object} Resultado de la simulación
 */
export function ejecutarSimulacion(params = {}) {
    if (!globalThis.SEF) {
        cargarTodosLosModulos();
    }
    const simulador = new SEF.SimuladorElectrico(params);
    return simulador.simular();
}

/**
 * Parámetros por defecto para calibración (escenario PNIEC Base 2030).
 */
export const PARAMETROS_PNIEC = {
    anioObjetivo: 2030,
    nuclear: 7.0,
    solar: 76,
    eolica: 62,
    eolicaOffshore: 1,
    hidraulica: 17,
    ccgt: 26,
    bateriasPotencia: 14,
    bateriasCapacidad: 56,
    bombeo: 7,
    bombeoCapacidad: 50,
    precioGas: 45,
    precioCO2: 85,
    demandaAnual: 255,
    crecimientoDemanda: 0.8,
    electrificacionTWh: 3.2,
    eficienciaDemanda: 0.8,
    flexibilidadGW: 6,
    flexibilidadPct: 9,
    interconexion: 4.2,
    vePorcentajeParque: 18,
    smartChargingPct: 60,
    bombaCalorPct: 24,
    h2ObjetivoMt: 0.35,
    autoconsumoFV_GW: 14,
    semilla: 42,
};

/**
 * Parámetros para escenario de referencia 2025 (Datos Reales).
 */
export const PARAMETROS_2025 = {
    anioObjetivo: 2026,
    nuclear: 7.0,
    solar: 24.7,
    eolica: 31.6,
    eolicaOffshore: 0,
    hidraulica: 17.1,
    ccgt: 24.0,
    bateriasPotencia: 3.0,
    bateriasCapacidad: 10,
    precioGas: 42,
    precioCO2: 65,
    demandaAnual: 248,
    crecimientoDemanda: 0.2,
    electrificacionTWh: 1.0,
    eficienciaDemanda: 0.2,
    vePorcentajeParque: 2,
    bombaCalorPct: 8,
    h2ObjetivoMt: 0.05,
    autoconsumoFV_GW: 8,
    semilla: 42,
};
