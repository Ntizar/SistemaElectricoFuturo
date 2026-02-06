/**
 * ============================================================================
 *  APLICACIÓN VUE 3 — Simulador Sistema Eléctrico Español
 * ============================================================================
 *  Orquesta la interfaz de usuario, la simulación y la visualización.
 *  Gestiona el estado de los parámetros, resultados, interacción y
 *  renderizado de gráficos.
 *
 *  Autor: David Antizar
 * ============================================================================
 */

'use strict';

(function () {
    const { createApp, ref, reactive, computed, onMounted, nextTick } = Vue;

    createApp({
        setup() {
            // ── Estado reactivo ──────────────────────────────────────────
            const params = reactive({ ...SEF.PARAMS_DEFAULT });

            const resultados = reactive({
                precioMedio: 0, precioMedioPonderado: 0,
                precioP10: 0, precioMediana: 0, precioP90: 0,
                precioMin: 0, precioMax: 0,
                emisionesAnuales: 0, coberturaRenovable: 0, dependenciaGas: 0,
                consumoGasTWh: 0, vertidosTWh: 0, vertidosPct: 0,
                horasGas: 0, horasVertido: 0, horasDeficit: 0, maxDeficit: 0,
                horasPrecioNegativo: 0, horasPrecioAlto: 0,
                importacionesTWh: 0, exportacionesTWh: 0,
                demandaFlexTWh: 0, demandaReducidaTWh: 0,
                horasImportacion: 0, horasExportacion: 0, horasFlex: 0,
                demandaAjustadaTWh: 0, nuclearEfectivaGW: 0,
                mensual: null,
            });

            const escenarioActual = ref(0);
            const tabActual      = ref('escenarios');
            const tabPrincipal   = ref('dashboard');
            const semanaVista    = ref(25);
            const vistaPrecios   = ref('semana');
            const vistaAnual     = ref(false);
            const copiado        = ref(false);
            const simulando      = ref(false);

            // Datos internos (no reactivos para rendimiento)
            let mixSimulado     = null;
            let preciosSimulados = null;

            // ── Datos de referencia ──────────────────────────────────────
            const datos2025 = SEF.DATOS_2025;
            const escenarios = SEF.ESCENARIOS;

            // ── Computed ─────────────────────────────────────────────────

            const nombreEscenario = computed(() => {
                const esc = escenarios.find(e => e.id === escenarioActual.value);
                return esc ? esc.nombre : 'Personalizado';
            });

            const descripcionEscenario = computed(() => {
                const esc = escenarios.find(e => e.id === escenarioActual.value);
                return esc ? esc.descripcion : '';
            });

            const pniecStatus = computed(() => {
                const P = SEF.PNIEC_2030;
                const almTotal = params.bateriasPotencia + params.bombeo;
                return [
                    {
                        indicador: '% Renovables en generación',
                        objetivo: P.renovablesGeneracion + '%',
                        actual: resultados.coberturaRenovable.toFixed(0) + '%',
                        status: resultados.coberturaRenovable >= P.renovablesGeneracion ? 'cumple' :
                                resultados.coberturaRenovable >= 65 ? 'parcial' : 'no-cumple'
                    },
                    {
                        indicador: 'Emisiones CO₂ del sector eléctrico',
                        objetivo: '< ' + P.emisionesMax + ' Mt',
                        actual: resultados.emisionesAnuales.toFixed(1) + ' Mt',
                        status: resultados.emisionesAnuales <= P.emisionesMax ? 'cumple' :
                                resultados.emisionesAnuales <= 45 ? 'parcial' : 'no-cumple'
                    },
                    {
                        indicador: 'Capacidad Solar FV instalada',
                        objetivo: P.solarGW + ' GW',
                        actual: params.solar.toFixed(0) + ' GW',
                        status: params.solar >= P.solarGW ? 'cumple' :
                                params.solar >= 60 ? 'parcial' : 'no-cumple'
                    },
                    {
                        indicador: 'Capacidad Eólica instalada',
                        objetivo: P.eolicaGW + ' GW',
                        actual: params.eolica.toFixed(0) + ' GW',
                        status: params.eolica >= P.eolicaGW ? 'cumple' :
                                params.eolica >= 50 ? 'parcial' : 'no-cumple'
                    },
                    {
                        indicador: 'Almacenamiento total',
                        objetivo: P.almacenamientoGW + ' GW',
                        actual: almTotal.toFixed(1) + ' GW',
                        status: almTotal >= P.almacenamientoGW ? 'cumple' :
                                almTotal >= 15 ? 'parcial' : 'no-cumple'
                    }
                ];
            });

            // ── Métodos ──────────────────────────────────────────────────

            function simular() {
                simulando.value = true;

                // Usar requestAnimationFrame para que el overlay se pinte
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        try {
                            const sim = new SEF.SimuladorElectrico(params);
                            const res = sim.simular();

                            // Copiar resultados escalares
                            const keys = [
                                'precioMedio', 'precioMedioPonderado', 'precioP10',
                                'precioMediana', 'precioP90', 'precioMin', 'precioMax',
                                'emisionesAnuales', 'coberturaRenovable', 'dependenciaGas',
                                'consumoGasTWh', 'vertidosTWh', 'vertidosPct',
                                'horasGas', 'horasVertido', 'horasDeficit', 'maxDeficit',
                                'horasPrecioNegativo', 'horasPrecioAlto',
                                'importacionesTWh', 'exportacionesTWh',
                                'demandaFlexTWh', 'demandaReducidaTWh',
                                'horasImportacion', 'horasExportacion', 'horasFlex',
                                'demandaAjustadaTWh', 'nuclearEfectivaGW',
                            ];
                            keys.forEach(k => { resultados[k] = res[k]; });
                            resultados.mensual = res.mensual;

                            mixSimulado = res.mix;
                            preciosSimulados = res.precios;

                            // Renderizar gráficos
                            renderizarGraficos();
                        } finally {
                            simulando.value = false;
                        }
                    }, 30);
                });
            }

            function renderizarGraficos() {
                nextTick(() => {
                    if (!mixSimulado) return;

                    // Mix de generación
                    const mixDiv = document.getElementById('plot-mix');
                    if (mixDiv) {
                        SEF.Charts.plotMix('plot-mix', mixSimulado, {
                            semana: semanaVista.value,
                            vistaAnual: vistaAnual.value,
                        });
                    }

                    // Precios
                    const precDiv = document.getElementById('plot-precios');
                    if (precDiv) {
                        SEF.Charts.plotPrecios('plot-precios', preciosSimulados, resultados, {
                            vista: vistaPrecios.value,
                            semana: semanaVista.value,
                        });
                    }

                    // Barras comparación
                    const barDiv = document.getElementById('plot-barras');
                    if (barDiv) {
                        SEF.Charts.plotBarras('plot-barras', params, resultados);
                    }

                    // Mensual (tab análisis)
                    const mensDiv = document.getElementById('plot-mensual');
                    if (mensDiv && resultados.mensual) {
                        SEF.Charts.plotMensual('plot-mensual', resultados.mensual);
                    }

                    // Precios mensuales
                    const pmDiv = document.getElementById('plot-precios-mensuales');
                    if (pmDiv && resultados.mensual) {
                        SEF.Charts.plotPreciosMensuales('plot-precios-mensuales', resultados.mensual);
                    }

                    // Curva de duración
                    const durDiv = document.getElementById('plot-duracion');
                    if (durDiv) {
                        SEF.Charts.plotPrecios('plot-duracion', preciosSimulados, resultados, {
                            vista: 'duracion',
                        });
                    }
                });
            }

            function cargarEscenario(id) {
                escenarioActual.value = id;
                const esc = SEF.getEscenario(id);
                if (esc) {
                    Object.assign(params, esc.params);
                }
                simular();
            }

            function resetear() {
                cargarEscenario(0);
            }

            function randomizarSemilla() {
                params.semilla = Math.floor(1 + Math.random() * 9999);
            }

            function copiarConfig() {
                const payload = JSON.stringify(params, null, 2);
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(payload);
                }
                copiado.value = true;
                setTimeout(() => { copiado.value = false; }, 2000);
            }

            function toggleVistaAnual() {
                vistaAnual.value = !vistaAnual.value;
                renderizarGraficos();
            }

            function cambiarVistaPrecios(vista) {
                vistaPrecios.value = vista;
                renderizarGraficos();
            }

            function actualizarGraficos() {
                renderizarGraficos();
            }

            function cambiarTabPrincipal(tab) {
                tabPrincipal.value = tab;
                nextTick(renderizarGraficos);
            }

            // ── Helpers de presentación ──────────────────────────────────

            function diffPct(actual, referencia) {
                if (referencia === 0) return 0;
                return ((actual - referencia) / referencia * 100);
            }

            function diffClass(actual, referencia, invertir = false) {
                const mejor = invertir ? actual > referencia : actual < referencia;
                return mejor ? 'positive' : 'negative';
            }

            function criticalClass(valor, umbralWarning, umbralDanger) {
                if (valor > umbralDanger) return 'danger';
                if (valor > umbralWarning) return 'warning';
                return 'success';
            }

            // ── Lifecycle ────────────────────────────────────────────────
            onMounted(() => {
                simular();
            });

            // ── Exponer al template ──────────────────────────────────────
            return {
                // Estado
                params, resultados, datos2025, escenarios,
                escenarioActual, tabActual, tabPrincipal,
                semanaVista, vistaPrecios, vistaAnual,
                copiado, simulando,

                // Computed
                nombreEscenario, descripcionEscenario, pniecStatus,

                // Métodos
                simular, cargarEscenario, resetear,
                randomizarSemilla, copiarConfig,
                toggleVistaAnual, cambiarVistaPrecios,
                actualizarGraficos, cambiarTabPrincipal,

                // Helpers
                diffPct, diffClass, criticalClass,
            };
        },
    }).mount('#app');

})();
