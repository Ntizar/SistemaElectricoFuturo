/**
 * ============================================================================
 *  ENGINE.JS — Punto de entrada ESM para tests headless (Node.js)
 * ============================================================================
 *  Carga todos los módulos del simulador en orden y exporta SEF completo.
 *  Funciona tanto en Node (vitest) como en navegador (index.html).
 * ============================================================================
 */

'use strict';

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simular window global para IIFEs que usan window.SEF
if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
}
if (!globalThis.window.SEF) {
    globalThis.window.SEF = {};
}

// Orden de carga crítico (mismo que index.html)
const MODULOS = [
    'constants.js',
    'nuclear.js',
    'weather.js',
    'demand.js',
    'storage.js',
    'policy.js',
    'scenarios.js',
    'simulator.js',
    'trajectory.js',
    'montecarlo.js',
];

for (const mod of MODULOS) {
    const filePath = join(__dirname, mod);
    const code = readFileSync(filePath, 'utf-8');
    // Evaluar IIFE en contexto global para que window.SEF se registre
    const fn = new Function(code);
    fn();
}

// Exportar SEF completo
const SEF = globalThis.window.SEF;
export default SEF;
export { SEF };
