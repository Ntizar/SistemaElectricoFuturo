/**
 * ============================================================================
 *  MOTOR DE SIMULACIÓN DEL SISTEMA ELÉCTRICO ESPAÑOL
 * ============================================================================
 *  Simula hora a hora (8760 h/año) el despacho de generación eléctrica
 *  siguiendo el orden de mérito (merit order) del mercado mayorista español.
 *
 *  Mejoras respecto a versión anterior:
 *    - Modelo solar basado en geometría solar real (latitud España 40.4°N)
 *    - Viento con autocorrelación temporal (persistencia meteorológica)
 *    - Demanda sensible a temperatura (calefacción/refrigeración)
 *    - Formación de precios mejorada con escasez y canibalización
 *    - Rampa térmica y mínimo estable de CCGT
 *    - Mejor gestión de almacenamiento
 *
 *  Autor: David Antizar
 * ============================================================================
 */

'use strict';

(function() {
    const M = SEF.MODEL;
    const T = SEF.TEMP_MENSUAL;

    /**
     * Generador de números pseudoaleatorios con semilla reproducible.
     * Permite reproducir exactamente un escenario meteorológico.
     */
    class SeededRNG {
        constructor(seed) {
            this.seed = seed;
        }
        /** Retorna un valor en [0, 1) */
        next() {
            this.seed = Math.sin(this.seed * 9301 + 49297) * 49271;
            return this.seed - Math.floor(this.seed);
        }
        /** Retorna un valor con distribución aproximadamente normal (Box-Muller simplificado) */
        gauss(media = 0, sigma = 1) {
            const u1 = Math.max(1e-10, this.next());
            const u2 = this.next();
            const z  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            return media + sigma * z;
        }
    }

    /**
     * Clase principal del simulador.
     */
    class SimuladorElectrico {
        /**
         * @param {Object} params - Parámetros de configuración del escenario
         */
        constructor(params) {
            this.params = { ...SEF.PARAMS_DEFAULT, ...params };
        }

        // ── GEOMETRÍA SOLAR ─────────────────────────────────────────────

        /**
         * Calcula el factor de irradiación solar normalizado [0..1]
         * usando geometría solar real para la latitud de España.
         *
         * @param {number} dia  - Día del año (0-364)
         * @param {number} hora - Hora del día (0-23)
         * @param {number} nubes - Factor de nubosidad [0..1], 1 = cielo despejado
         * @returns {number} Factor de capacidad solar [0..1]
         */
        calcularSolar(dia, hora, nubes) {
            const lat = M.LATITUD_ESPANA * Math.PI / 180;
            // Declinación solar (ecuación de Cooper)
            const decl = 23.45 * Math.sin(2 * Math.PI * (284 + dia) / 365) * Math.PI / 180;
            // Ángulo horario (0 = mediodía solar, 15° por hora)
            const omega = (hora - 12) * 15 * Math.PI / 180;
            // Elevación solar
            const sinElev = Math.sin(lat) * Math.sin(decl) +
                            Math.cos(lat) * Math.cos(decl) * Math.cos(omega);
            if (sinElev <= 0.01) return 0; // Noche o sol rasante

            // Masa de aire (Air Mass) para atenuación atmosférica
            const AM = 1 / Math.max(0.05, sinElev);
            // Modelo de cielo claro (Hottel simplificado para España)
            const transmitancia = 0.75 * Math.pow(0.70, Math.pow(AM, 0.678));
            // Factor de irradiancia normalizado
            const irradiancia = sinElev * transmitancia;
            // Aplicar nubosidad y limitar a [0, 1]
            return Math.max(0, Math.min(1, irradiancia * nubes * 1.35));
        }

        // ── MODELO DE VIENTO ─────────────────────────────────────────────

        /**
         * Genera una serie de factores de capacidad eólica con autocorrelación.
         * El viento tiene una fuerte persistencia temporal (α ≈ 0.92-0.96)
         * que refleja la dinámica de los frentes meteorológicos.
         *
         * @param {SeededRNG} rng - Generador aleatorio con semilla
         * @returns {Float64Array} 8760 valores de factor de capacidad eólica
         */
        generarSerieViento(rng) {
            const serie = new Float64Array(M.HORAS_ANIO);
            let estado = 0.30; // Valor inicial

            // Generar bloques sinópticos (3-7 días de persistencia)
            const bloques = [];
            let h = 0;
            while (h < M.HORAS_ANIO) {
                const duracion = Math.floor(48 + rng.next() * 120); // 2-7 días
                const intensidad = rng.next();
                bloques.push({ inicio: h, duracion, intensidad });
                h += duracion;
            }

            for (let i = 0; i < M.HORAS_ANIO; i++) {
                const dia = Math.floor(i / 24);
                const hora = i % 24;
                const mes = Math.floor(dia / 30.5);

                // Base estacional: más viento en invierno (Dic-Feb) y menos en verano
                const baseEstacional = 0.28 + 0.14 * Math.cos((mes - 0.5) * Math.PI / 6);

                // Efecto sinóptico (qué bloque domina)
                let sinoptico = baseEstacional;
                for (const b of bloques) {
                    if (i >= b.inicio && i < b.inicio + b.duracion) {
                        sinoptico = baseEstacional * (0.3 + b.intensidad * 1.4);
                        break;
                    }
                }

                // Variación diurna (algo más de viento por la tarde por convección)
                const diurno = 1 + 0.08 * Math.sin((hora - 6) * Math.PI / 12);

                // Autocorrelación fuerte hora a hora
                const alpha = 0.94;
                const innovacion = rng.gauss(0, 0.06);
                estado = alpha * estado + (1 - alpha) * sinoptico + innovacion;

                // Factor de capacidad final
                serie[i] = Math.max(0.02, Math.min(0.92, estado * diurno));
            }
            return serie;
        }

        // ── MODELO DE DEMANDA ────────────────────────────────────────────

        /**
         * Genera la curva de demanda horaria normalizada, sensible a
         * temperatura (calefacción en invierno, refrigeración en verano),
         * día de la semana y hora del día.
         *
         * @param {SeededRNG} rng - Generador aleatorio
         * @returns {Float64Array} 8760 valores de demanda normalizada
         */
        generarSerieDemanda(rng) {
            const serie = new Float64Array(M.HORAS_ANIO);

            for (let i = 0; i < M.HORAS_ANIO; i++) {
                const dia = Math.floor(i / 24);
                const hora = i % 24;
                const mes = Math.floor(dia / 30.5) % 12;
                const diaSemana = dia % 7;

                // Temperatura simulada (base mensual + variación diurna + ruido)
                const tempBase = T[mes];
                const varDiurna = 4.5 * Math.sin((hora - 6) * Math.PI / 12);
                const ruido = rng.gauss(0, 1.5);
                const temp = tempBase + varDiurna + ruido;

                // Factor de temperatura (curva en U: frío → calefacción, calor → AC)
                let factorTemp = 1.0;
                if (temp < 15) factorTemp = 1 + (15 - temp) * 0.013;
                if (temp > 25) factorTemp = 1 + (temp - 25) * 0.018;

                // Perfil horario: doble pico español (mañana ~10h, tarde/noche ~20h)
                const picoManana = Math.exp(-Math.pow((hora - 10) / 2.8, 2)) * 0.28;
                const picoTarde  = Math.exp(-Math.pow((hora - 20) / 2.5, 2)) * 0.32;
                const baseNocturna = 0.62;
                const perfilHorario = baseNocturna + picoManana + picoTarde;

                // Factor laboralidad
                const factorLaboral = diaSemana < 5 ? 1.04 : 0.87;

                // Ruido residual (±3%)
                const ruidoDemanda = 0.97 + rng.next() * 0.06;

                serie[i] = perfilHorario * factorLaboral * factorTemp * ruidoDemanda;
            }
            return serie;
        }

        // ── CÁLCULOS AUXILIARES ──────────────────────────────────────────

        /**
         * Calcula la demanda anual ajustada por horizonte temporal,
         * electrificación y eficiencia energética.
         * @returns {number} TWh
         */
        calcularDemandaAjustada() {
            const anioBase = 2026;
            const years = Math.max(0, this.params.anioObjetivo - anioBase);
            const crec = Math.pow(1 + (this.params.crecimientoDemanda / 100), years);
            const electr = this.params.electrificacionTWh * years;
            const efic = Math.max(0.85, 1 - (this.params.eficienciaDemanda / 100));
            return Math.max(180, Math.min(360, (this.params.demandaAnual * crec + electr) * efic));
        }

        /**
         * Calcula la capacidad nuclear disponible según plan de cierre.
         * @returns {number} GW disponibles
         */
        calcularNuclearDisponible() {
            if (!this.params.aplicarPlanNuclear) return this.params.nuclear;
            const anioBase = 2026;
            const cierre = Math.max(anioBase + 1, this.params.cierreNuclear);
            const years = Math.max(0, this.params.anioObjetivo - anioBase);
            const horizonte = Math.max(1, cierre - anioBase);
            return Math.max(0, this.params.nuclear * Math.max(0, 1 - (years / horizonte)));
        }

        /**
         * Calcula el factor hidráulico para una hora dada.
         * El hidráulico es gestionable: se guarda para picos de demanda.
         */
        calcularHidro(dia, hora, rng) {
            const mes = Math.floor(dia / 30.5) % 12;
            // Más disponible en primavera (deshielo) y otoño (lluvias)
            const baseEstacional = 0.28 + 0.28 * Math.cos((mes - 4) * Math.PI / 6);
            return Math.max(0.08, Math.min(0.85, baseEstacional * this.params.hidraulicidad));
        }

        // ── FORMACIÓN DE PRECIOS ─────────────────────────────────────────

        /**
         * Calcula el precio marginal del mercado spot (OMIE) para una hora dada.
         * Sigue el sistema marginalista: el precio lo fija la última tecnología
         * necesaria para cubrir la demanda.
         *
         * @param {Object} gen - Generación por tecnología (GW)
         * @param {number} demandaGW - Demanda total (GW)
         * @param {number} ratioRenovable - Ratio gen. renovable/demanda
         * @param {Object} contexto - Info adicional (importación, déficit, etc.)
         * @param {number} gasAnterior - GW de gas de la hora anterior (rampa)
         * @returns {number} Precio marginal €/MWh
         */
        calcularPrecioMarginal(gen, demandaGW, ratioRenovable, contexto, gasAnterior) {
            const p = this.params;
            // Coste marginal del CCGT (€/MWh_eléctrico)
            const calorEsp  = 1 / Math.max(0.45, p.rendimientoCCGT);
            const costeComb = p.precioGas * calorEsp;
            const costeCO2  = (M.FACTOR_CO2_GAS / Math.max(0.45, p.rendimientoCCGT)) * p.precioCO2;
            const costeCCGT = costeComb + costeCO2 + p.omCCGT;

            // Stress térmico (cuanto más cargado el parque CCGT, más caro)
            const stressCCGT = Math.min(1, gen.gas / Math.max(0.5, p.ccgt));
            // Stress hidráulico  
            const stressHidro = Math.min(1, gen.hidraulica / Math.max(0.5, p.hidraulica));

            let precio;

            if (ratioRenovable > 1.20) {
                // Gran exceso renovable → precios muy bajos o negativos
                const exceso = ratioRenovable - 1;
                precio = Math.max(-20, 5 - exceso * 45);
            } else if (ratioRenovable > 1.05) {
                // Ligero exceso → precios bajos
                precio = 5 + (1.2 - ratioRenovable) * 100;
            } else if (gen.gas > 0.3) {
                // Gas es marginal → precio = coste CCGT + prima de estrés
                const primaStress = 12 * Math.pow(stressCCGT, 1.5);
                // Prima de arranque/rampa (si hay cambio brusco)
                const deltGas = Math.max(0, gen.gas - gasAnterior);
                const primaRampa = deltGas > 1 ? 3 * deltGas : 0;
                precio = costeCCGT + primaStress + primaRampa;
            } else if (gen.hidraulica > 0.5) {
                // Hidráulica es marginal → bid de oportunidad
                precio = 25 + 25 * stressHidro;
            } else {
                // Solo renovable cubriendo demanda, precio bajo
                precio = 6 + (1 - ratioRenovable) * 30;
            }

            // Importaciones fijan suelo
            if (contexto.importacion > 0) {
                const stressImport = Math.min(1, contexto.importacion / Math.max(0.5, p.interconexion));
                precio = Math.max(precio, p.precioImport * (0.85 + 0.3 * stressImport));
            }

            // Exportaciones fijan suelo bajo
            if (contexto.exportacion > 0) {
                precio = Math.min(precio, p.precioExport + 10);
            }

            // Escasez (VOLL - Value of Lost Load)
            if (contexto.deficit > 0.3) {
                const deficitPct = contexto.deficit / Math.max(1, demandaGW);
                precio = Math.max(precio, p.precioEscasez * Math.min(1, deficitPct * 4));
            }

            // Ajustes regulados: pérdidas de red y cargos/peajes (CNMC/MITECO)
            precio = precio * (1 + p.perdidasRed) + p.cargosSistema;

            // Acotar a rangos observados en OMIE con margen futuro
            return Math.min(500, Math.max(-25, precio));
        }

        // ── CÁLCULO DE PERCENTILES ──────────────────────────────────────

        /**
         * Calcula el percentil p de un array.
         * @param {Array<number>} arr
         * @param {number} p - Percentil (0-100)
         */
        percentil(arr, p) {
            if (!arr.length) return 0;
            const sorted = Float64Array.from(arr).sort();
            const k = (sorted.length - 1) * (p / 100);
            const f = Math.floor(k);
            const c = Math.ceil(k);
            return f === c ? sorted[f] : sorted[f] + (sorted[c] - sorted[f]) * (k - f);
        }

        // ── SIMULACIÓN PRINCIPAL ─────────────────────────────────────────

        /**
         * Ejecuta la simulación hora a hora del sistema eléctrico.
         * Despacha generación siguiendo merit order y calcula precios,
         * emisiones, vertidos, déficit y otros indicadores.
         *
         * @returns {Object} Resultados completos de la simulación
         */
        simular() {
            const p = this.params;
            const rng = new SeededRNG(p.semilla || 42);

            // Demanda y nuclear ajustadas por horizonte
            const demandaAnualTWh = this.calcularDemandaAjustada();
            const demandaMediaGW  = demandaAnualTWh * 1000 / M.HORAS_ANIO;
            const nuclearGW       = this.calcularNuclearDisponible();

            // Generar series temporales
            const serieViento  = this.generarSerieViento(new SeededRNG(p.semilla * 7 + 13));
            const serieDemanda = this.generarSerieDemanda(new SeededRNG(p.semilla * 3 + 7));

            // RNG para nubes y variaciones
            const rngMeteo = new SeededRNG(p.semilla * 11 + 37);

            // Estado del almacenamiento
            let estadoBateria = p.bateriasCapacidad * 0.5;
            let estadoBombeo  = p.bombeoCapacidad * 0.5;
            let gasAnterior   = 0;

            // Acumuladores
            const mix     = new Array(M.HORAS_ANIO);
            const precios = new Float64Array(M.HORAS_ANIO);
            const demandaHorariaGW = new Float64Array(M.HORAS_ANIO);

            const R = {
                consumoGasTWh: 0, vertidosTWh: 0, horasGas: 0, horasVertido: 0,
                horasDeficit: 0, maxDeficit: 0, emisionesAnuales: 0,
                horasBombeoActivo: 0, horasPrecioNegativo: 0, horasPrecioAlto: 0,
                importacionesTWh: 0, exportacionesTWh: 0,
                demandaFlexTWh: 0, demandaReducidaTWh: 0,
                horasImportacion: 0, horasExportacion: 0, horasFlex: 0,
                demandaAjustadaTWh: demandaAnualTWh,
                nuclearEfectivaGW: nuclearGW,
            };

            let demandaTotalGWh = 0;
            let precioPonderadoSum = 0;

            // ── Bucle horario ────────────────────────────────────────────
            for (let h = 0; h < M.HORAS_ANIO; h++) {
                const dia  = Math.floor(h / 24);
                const hora = h % 24;
                const mes  = Math.floor(dia / 30.5) % 12;

                // Demanda de esta hora
                const demandaGW = demandaMediaGW * serieDemanda[h];
                demandaHorariaGW[h] = demandaGW;

                const gen = {
                    nuclear: 0, solar: 0, eolica: 0, hidraulica: 0,
                    gas: 0, baterias: 0, bombeo: 0,
                    vertido: 0, cargaBaterias: 0, cargaBombeo: 0,
                    importacion: 0, exportacion: 0
                };

                const flexCapGW = Math.min(
                    p.flexibilidadGW,
                    demandaGW * (p.flexibilidadPct / 100)
                );

                // ── 1. NUCLEAR (base inflexible) ─────────────────────────
                gen.nuclear = nuclearGW * M.FC_NUCLEAR;

                // ── 2. SOLAR ─────────────────────────────────────────────
                const nubes = 0.65 + rngMeteo.next() * 0.35;
                gen.solar = p.solar * this.calcularSolar(dia, hora, nubes);

                // ── 3. EÓLICA ────────────────────────────────────────────
                gen.eolica = p.eolica * serieViento[h];

                // Generación renovable + nuclear total
                const genBase = gen.nuclear + gen.solar + gen.eolica;
                let excedente = genBase - demandaGW;

                if (excedente > 0) {
                    // ── EXCEDENTE: cargar almacenamiento, exportar, verter ──

                    // Baterías (eficiencia 90%)
                    const espacioBat = p.bateriasCapacidad - estadoBateria;
                    const cargaBat = Math.min(excedente, p.bateriasPotencia, espacioBat / M.EFICIENCIA_BAT);
                    gen.cargaBaterias = cargaBat;
                    estadoBateria += cargaBat * M.EFICIENCIA_BAT;
                    excedente -= cargaBat;

                    // Bombeo hidráulico (eficiencia 75%)
                    if (excedente > 0) {
                        const espacioBombeo = p.bombeoCapacidad - estadoBombeo;
                        const cargaBombeo = Math.min(excedente, p.bombeo, espacioBombeo / M.EFICIENCIA_BOMBEO);
                        gen.cargaBombeo = cargaBombeo;
                        estadoBombeo += cargaBombeo * M.EFICIENCIA_BOMBEO;
                        excedente -= cargaBombeo;
                        if (cargaBombeo > 0.3) R.horasBombeoActivo++;
                    }

                    // Demanda flexible al alza (power-to-X, carga industrial)
                    if (excedente > 0 && flexCapGW > 0) {
                        const flexUp = Math.min(excedente, flexCapGW);
                        excedente -= flexUp;
                        R.demandaFlexTWh += flexUp / 1000;
                        if (flexUp > 0.2) R.horasFlex++;
                    }

                    // Exportaciones
                    if (excedente > 0 && p.interconexion > 0) {
                        const exp = Math.min(excedente, p.interconexion);
                        gen.exportacion = exp;
                        excedente -= exp;
                        R.exportacionesTWh += exp / 1000;
                        if (exp > 0.2) R.horasExportacion++;
                    }

                    // Vertido (energía no aprovechable)
                    gen.vertido = Math.max(0, excedente);
                    if (gen.vertido > 0.3) R.horasVertido++;
                    R.vertidosTWh += gen.vertido / 1000;

                    gen.hidraulica = 0;
                    gen.gas = 0;

                } else {
                    // ── DÉFICIT: despachar fuentes despachables ──────────
                    let deficit = -excedente;

                    // 4. Hidráulica gestionable
                    const hidroDisp = p.hidraulica * this.calcularHidro(dia, hora, rngMeteo);
                    gen.hidraulica = Math.min(hidroDisp, deficit);
                    deficit -= gen.hidraulica;

                    // 5. Descarga baterías
                    if (deficit > 0 && estadoBateria > 0) {
                        const descBat = Math.min(p.bateriasPotencia, estadoBateria, deficit);
                        gen.baterias = descBat;
                        estadoBateria -= descBat;
                        deficit -= descBat;
                    }

                    // 6. Descarga bombeo (turbinación)
                    if (deficit > 0 && estadoBombeo > 0) {
                        const descBombeo = Math.min(p.bombeo, estadoBombeo, deficit);
                        gen.bombeo = descBombeo;
                        estadoBombeo -= descBombeo;
                        deficit -= descBombeo;
                    }

                    // 7. Demanda flexible a la baja (reducción temporal)
                    if (deficit > 0 && flexCapGW > 0) {
                        const flexDown = Math.min(deficit, flexCapGW);
                        deficit -= flexDown;
                        R.demandaReducidaTWh += flexDown / 1000;
                        if (flexDown > 0.2) R.horasFlex++;
                    }

                    // 8. Importaciones
                    if (deficit > 0 && p.interconexion > 0) {
                        const imp = Math.min(deficit, p.interconexion);
                        gen.importacion = imp;
                        deficit -= imp;
                        R.importacionesTWh += imp / 1000;
                        if (imp > 0.2) R.horasImportacion++;
                    }

                    // 9. Gas CCGT (última opción, con rampa)
                    if (deficit > 0) {
                        // Limitar rampa de subida/bajada
                        const maxRampa = p.ccgt * M.RAMPA_CCGT + gasAnterior;
                        gen.gas = Math.min(deficit, p.ccgt, maxRampa);
                        deficit -= gen.gas;
                        if (gen.gas > 0.3) R.horasGas++;
                    }

                    // Déficit real no cubierto
                    if (deficit > 0.3) {
                        R.horasDeficit++;
                        R.maxDeficit = Math.max(R.maxDeficit, deficit);
                    }
                }

                // Autodescarga baterías
                estadoBateria *= (1 - M.AUTODESCARGA_BAT);

                // Acumular gas y emisiones
                R.consumoGasTWh += gen.gas / 1000;
                R.emisionesAnuales += gen.gas *
                    (M.FACTOR_CO2_GAS / Math.max(0.45, p.rendimientoCCGT)) / 1000;

                // PRECIO MARGINAL
                const ratioRen = demandaGW > 0 ? genBase / demandaGW : 0;
                const ctx = {
                    importacion: gen.importacion,
                    exportacion: gen.exportacion,
                    deficit: Math.max(0, demandaGW - genBase - gen.hidraulica -
                             gen.baterias - gen.bombeo - gen.gas - gen.importacion)
                };
                const precio = this.calcularPrecioMarginal(gen, demandaGW, ratioRen, ctx, gasAnterior);

                if (precio < 0)   R.horasPrecioNegativo++;
                if (precio > 150) R.horasPrecioAlto++;

                demandaTotalGWh += demandaGW;
                precioPonderadoSum += precio * demandaGW;

                gasAnterior = gen.gas;
                mix[h] = gen;
                precios[h] = precio;
            }

            // ── Agregaciones ─────────────────────────────────────────────
            const precioArr = Array.from(precios);
            R.precioMedio = precioArr.reduce((a, b) => a + b, 0) / M.HORAS_ANIO;
            R.precioMedioPonderado = demandaTotalGWh > 0
                ? precioPonderadoSum / demandaTotalGWh
                : R.precioMedio;
            R.precioP10     = this.percentil(precioArr, 10);
            R.precioMediana = this.percentil(precioArr, 50);
            R.precioP90     = this.percentil(precioArr, 90);
            R.precioMin     = Math.min(...precioArr);
            R.precioMax     = Math.max(...precioArr);

            const genTotal = mix.reduce((s, g) =>
                s + g.nuclear + g.solar + g.eolica + g.hidraulica +
                g.gas + g.baterias + g.bombeo + g.importacion, 0);
            const genRenovable = mix.reduce((s, g) =>
                s + g.solar + g.eolica + g.hidraulica, 0);
            const genGas = mix.reduce((s, g) => s + g.gas, 0);
            const genVRE = mix.reduce((s, g) => s + g.solar + g.eolica, 0);

            R.coberturaRenovable = (genRenovable / genTotal) * 100;
            R.dependenciaGas     = (genGas / genTotal) * 100;
            R.vertidosPct        = genVRE > 0 ? (R.vertidosTWh * 1000 / genVRE) * 100 : 0;

            // Resumen mensual para gráficos
            R.mensual = this._calcularResumenMensual(mix, precios, demandaHorariaGW);

            R.mix     = mix;
            R.precios = precioArr;
            R.demandaHoraria = demandaHorariaGW;

            return R;
        }

        // ── RESUMEN MENSUAL ──────────────────────────────────────────────

        /**
         * Calcula totales mensuales para gráficos de barras.
         */
        _calcularResumenMensual(mix, precios, demanda) {
            const mensual = Array.from({ length: 12 }, () => ({
                nuclear: 0, solar: 0, eolica: 0, hidraulica: 0,
                gas: 0, baterias: 0, vertido: 0, importacion: 0, exportacion: 0,
                demanda: 0, precio: 0, horas: 0
            }));

            for (let h = 0; h < M.HORAS_ANIO; h++) {
                const mes = Math.floor(Math.floor(h / 24) / 30.5) % 12;
                const g = mix[h];
                const m = mensual[mes];
                m.nuclear     += g.nuclear;
                m.solar       += g.solar;
                m.eolica      += g.eolica;
                m.hidraulica  += g.hidraulica;
                m.gas         += g.gas;
                m.baterias    += g.baterias + g.bombeo;
                m.vertido     += g.vertido;
                m.importacion += g.importacion;
                m.exportacion += g.exportacion;
                m.demanda     += demanda[h];
                m.precio      += precios[h];
                m.horas++;
            }

            // Convertir a TWh y promedios
            for (const m of mensual) {
                m.nuclear     /= 1000;
                m.solar       /= 1000;
                m.eolica      /= 1000;
                m.hidraulica  /= 1000;
                m.gas         /= 1000;
                m.baterias    /= 1000;
                m.vertido     /= 1000;
                m.importacion /= 1000;
                m.exportacion /= 1000;
                m.demanda     /= 1000;
                m.precioMedio = m.horas > 0 ? m.precio / m.horas : 0;
            }

            return mensual;
        }
    }

    // Exportar al namespace global
    SEF.SimuladorElectrico = SimuladorElectrico;
})();
