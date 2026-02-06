/**
 * ============================================================================
 *  ESCENARIOS PREDEFINIDOS
 * ============================================================================
 *  Configuraciones de escenarios basados en planes oficiales, hipótesis
 *  de política energética y eventos de mercado.
 *
 *  Cada escenario define todos los parámetros del simulador para reflejar
 *  una situación concreta y coherente del sistema eléctrico español.
 *
 *  Autor: David Antizar
 * ============================================================================
 */

'use strict';

(function() {

    SEF.ESCENARIOS = [
        // ── 0. Datos Reales 2025 ─────────────────────────────────────────
        {
            id: 0,
            nombre: 'Datos Reales 2025',
            icono: '📅',
            estilo: 'reference',
            descripcion: 'Configuración basada en datos reales de 2025. Nuclear 7 GW (51.9 TWh), Solar 24 GW (52.5 TWh), Eólica 31 GW (55.6 TWh), Gas CCGT 24 GW (52.1 TWh). Precio medio OMIE ~65 €/MWh.',
            params: {
                nuclear: 7.0, solar: 24.0, eolica: 31.0, hidraulica: 17.0, ccgt: 24.0,
                bateriasPotencia: 3.0, bateriasCapacidad: 10, bombeo: 3.5, bombeoCapacidad: 30,
                precioGas: 42, precioCO2: 65, rendimientoCCGT: 0.55, omCCGT: 3.0,
                cargosSistema: 12.0, perdidasRed: 0.05, semilla: 42,
                demandaAnual: 260, hidraulicidad: 1.0,
                anioObjetivo: 2026, crecimientoDemanda: 0.2, electrificacionTWh: 1.0,
                eficienciaDemanda: 0.3, aplicarPlanNuclear: true, cierreNuclear: 2035,
                flexibilidadGW: 3.0, flexibilidadPct: 5,
                interconexion: 3.0, precioImport: 90, precioExport: 5, precioEscasez: 350
            }
        },

        // ── 1. PNIEC Base 2030 ───────────────────────────────────────────
        {
            id: 1,
            nombre: 'PNIEC Base 2030',
            icono: '📊',
            estilo: 'default',
            descripcion: 'Escenario del Plan Nacional Integrado de Energía y Clima 2030: cierre progresivo nuclear, fuerte expansión solar (76 GW) y eólica (62 GW), almacenamiento 22 GW. Objetivo: 74% renovables en generación eléctrica.',
            params: {
                nuclear: 3.0, solar: 76.0, eolica: 62.0, hidraulica: 17.0, ccgt: 26.0,
                bateriasPotencia: 15.0, bateriasCapacidad: 60, bombeo: 7.0, bombeoCapacidad: 50,
                precioGas: 45, precioCO2: 85, rendimientoCCGT: 0.57, omCCGT: 3.5,
                cargosSistema: 11.5, perdidasRed: 0.045, semilla: 123,
                demandaAnual: 270, hidraulicidad: 1.0,
                anioObjetivo: 2030, crecimientoDemanda: 0.7, electrificacionTWh: 3.0,
                eficienciaDemanda: 0.8, aplicarPlanNuclear: true, cierreNuclear: 2035,
                flexibilidadGW: 6.0, flexibilidadPct: 8,
                interconexion: 4.0, precioImport: 95, precioExport: 6, precioEscasez: 350
            }
        },

        // ── 2. Prórroga Nuclear ──────────────────────────────────────────
        {
            id: 2,
            nombre: 'Prórroga Nuclear',
            icono: '⚛️',
            estilo: 'default',
            descripcion: 'Extensión de la vida útil de las centrales nucleares más allá de 2035. Mantiene 7 GW de base firme, reduciendo la necesidad de gas y almacenamiento a corto plazo. Menor presión inversora.',
            params: {
                nuclear: 7.0, solar: 55.0, eolica: 45.0, hidraulica: 17.0, ccgt: 24.0,
                bateriasPotencia: 10.0, bateriasCapacidad: 40, bombeo: 5.0, bombeoCapacidad: 40,
                precioGas: 45, precioCO2: 80, rendimientoCCGT: 0.55, omCCGT: 3.0,
                cargosSistema: 11.0, perdidasRed: 0.05, semilla: 321,
                demandaAnual: 265, hidraulicidad: 1.0,
                anioObjetivo: 2030, crecimientoDemanda: 0.5, electrificacionTWh: 2.0,
                eficienciaDemanda: 0.6, aplicarPlanNuclear: false, cierreNuclear: 2035,
                flexibilidadGW: 5.0, flexibilidadPct: 7,
                interconexion: 4.0, precioImport: 90, precioExport: 5, precioEscasez: 330
            }
        },

        // ── 3. Cierre Nuclear Total ──────────────────────────────────────
        {
            id: 3,
            nombre: 'Sin Nuclear',
            icono: '🚀',
            estilo: 'default',
            descripcion: 'Cierre total nuclear para 2028. ESCENARIO CRÍTICO: requiere máxima expansión renovable (95 GW solar, 70 GW eólica), abundante almacenamiento y gas de respaldo. Mayor volatilidad de precios.',
            params: {
                nuclear: 0, solar: 95.0, eolica: 70.0, hidraulica: 18.0, ccgt: 30.0,
                bateriasPotencia: 25.0, bateriasCapacidad: 100, bombeo: 10.0, bombeoCapacidad: 60,
                precioGas: 50, precioCO2: 90, rendimientoCCGT: 0.56, omCCGT: 3.5,
                cargosSistema: 13.5, perdidasRed: 0.05, semilla: 888,
                demandaAnual: 270, hidraulicidad: 1.0,
                anioObjetivo: 2030, crecimientoDemanda: 0.8, electrificacionTWh: 3.5,
                eficienciaDemanda: 0.6, aplicarPlanNuclear: true, cierreNuclear: 2028,
                flexibilidadGW: 7.0, flexibilidadPct: 10,
                interconexion: 4.5, precioImport: 110, precioExport: 8, precioEscasez: 420
            }
        },

        // ── 4. Almacenamiento Masivo ─────────────────────────────────────
        {
            id: 4,
            nombre: 'Almacenamiento Masivo',
            icono: '🔋',
            estilo: 'default',
            descripcion: 'Inversión masiva en baterías (40 GW / 160 GWh) y bombeo (12 GW / 80 GWh). Reduce drásticamente vertidos y dependencia del gas en horas pico. Escenario de madurez renovable.',
            params: {
                nuclear: 5.0, solar: 80.0, eolica: 60.0, hidraulica: 17.0, ccgt: 22.0,
                bateriasPotencia: 40.0, bateriasCapacidad: 160, bombeo: 12.0, bombeoCapacidad: 80,
                precioGas: 45, precioCO2: 85, rendimientoCCGT: 0.58, omCCGT: 3.2,
                cargosSistema: 11.0, perdidasRed: 0.04, semilla: 2026,
                demandaAnual: 268, hidraulicidad: 1.0,
                anioObjetivo: 2032, crecimientoDemanda: 0.7, electrificacionTWh: 3.0,
                eficienciaDemanda: 0.9, aplicarPlanNuclear: true, cierreNuclear: 2035,
                flexibilidadGW: 8.0, flexibilidadPct: 12,
                interconexion: 5.0, precioImport: 90, precioExport: 4, precioEscasez: 320
            }
        },

        // ── 5. Crisis del Gas ────────────────────────────────────────────
        {
            id: 5,
            nombre: 'Crisis del Gas',
            icono: '💨',
            estilo: 'default',
            descripcion: 'Escenario de crisis en el mercado del gas natural: precio TTF a 95 €/MWh, CO₂ a 100 €/ton. Precios eléctricos elevados. Fuerte incentivo para acelerar transición renovable.',
            params: {
                nuclear: 7.0, solar: 30.0, eolica: 35.0, hidraulica: 17.0, ccgt: 24.0,
                bateriasPotencia: 5.0, bateriasCapacidad: 20, bombeo: 4.0, bombeoCapacidad: 35,
                precioGas: 95, precioCO2: 100, rendimientoCCGT: 0.53, omCCGT: 4.0,
                cargosSistema: 13.0, perdidasRed: 0.055, semilla: 451,
                demandaAnual: 255, hidraulicidad: 0.9,
                anioObjetivo: 2027, crecimientoDemanda: 0.4, electrificacionTWh: 1.2,
                eficienciaDemanda: 0.2, aplicarPlanNuclear: true, cierreNuclear: 2035,
                flexibilidadGW: 4.0, flexibilidadPct: 6,
                interconexion: 3.0, precioImport: 140, precioExport: 8, precioEscasez: 500
            }
        },

        // ── 6. Hidrógeno Verde ───────────────────────────────────────────
        {
            id: 6,
            nombre: 'Hidrógeno Verde',
            icono: '🟢',
            estilo: 'default',
            descripcion: 'Desarrollo masivo de electrolizadores para producción de H₂ verde. Alta flexibilidad de demanda (12 GW), absorbe excedentes renovables. Requiere exceso de capacidad solar/eólica para alimentar electrólisis.',
            params: {
                nuclear: 3.0, solar: 90.0, eolica: 65.0, hidraulica: 17.0, ccgt: 20.0,
                bateriasPotencia: 12.0, bateriasCapacidad: 50, bombeo: 6.0, bombeoCapacidad: 40,
                precioGas: 48, precioCO2: 90, rendimientoCCGT: 0.57, omCCGT: 3.0,
                cargosSistema: 10.5, perdidasRed: 0.045, semilla: 777,
                demandaAnual: 285, hidraulicidad: 1.0,
                anioObjetivo: 2033, crecimientoDemanda: 1.0, electrificacionTWh: 5.0,
                eficienciaDemanda: 0.7, aplicarPlanNuclear: true, cierreNuclear: 2035,
                flexibilidadGW: 12.0, flexibilidadPct: 15,
                interconexion: 5.0, precioImport: 85, precioExport: 3, precioEscasez: 300
            }
        },

        // ── 7. Sequía Extrema ────────────────────────────────────────────
        {
            id: 7,
            nombre: 'Sequía Extrema',
            icono: '🏜️',
            estilo: 'default',
            descripcion: 'Año de baja hidraulicidad extrema (50% de la media). La hidráulica pierde protagonismo, aumenta la dependencia del gas y el estrés del sistema. Escenario climático adverso.',
            params: {
                nuclear: 7.0, solar: 40.0, eolica: 38.0, hidraulica: 17.0, ccgt: 24.0,
                bateriasPotencia: 6.0, bateriasCapacidad: 25, bombeo: 3.5, bombeoCapacidad: 30,
                precioGas: 48, precioCO2: 70, rendimientoCCGT: 0.55, omCCGT: 3.5,
                cargosSistema: 12.5, perdidasRed: 0.05, semilla: 555,
                demandaAnual: 265, hidraulicidad: 0.50,
                anioObjetivo: 2028, crecimientoDemanda: 0.5, electrificacionTWh: 1.5,
                eficienciaDemanda: 0.4, aplicarPlanNuclear: true, cierreNuclear: 2035,
                flexibilidadGW: 4.0, flexibilidadPct: 6,
                interconexion: 3.5, precioImport: 100, precioExport: 5, precioEscasez: 380
            }
        }
    ];

    /**
     * Obtiene un escenario por su ID.
     * @param {number} id
     * @returns {Object|null}
     */
    SEF.getEscenario = function(id) {
        return SEF.ESCENARIOS.find(e => e.id === id) || null;
    };

})();
