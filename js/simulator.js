/**
 * ============================================================================
 *  MOTOR DE SIMULACION DEL SISTEMA ELECTRICO ESPANOL
 * ============================================================================
 */

'use strict';

(function() {
    const M = SEF.MODEL;
    const U = SEF.Utils;

    class SimuladorElectrico {
        constructor(params) {
            this.params = { ...SEF.PARAMS_DEFAULT, ...params };
        }

        calcularDemandaAjustada() {
            const years = Math.max(0, this.params.anioObjetivo - M.BASE_ANIO);
            const growth = Math.pow(1 + (this.params.crecimientoDemanda / 100), years);
            const electr = this.params.electrificacionTWh * years;
            const efficiency = Math.max(0.82, 1 - (this.params.eficienciaDemanda / 100));
            return U.clamp((this.params.demandaAnual * growth + electr) * efficiency, 180, 380);
        }

        calcularNuclearDisponible() {
            if (!this.params.aplicarPlanNuclear) return this.params.nuclear;
            return SEF.Nuclear.disponibleEnAnio(this.params.anioObjetivo, {
                prorrogaGlobal: this.params.prorrogaNuclear ? (this.params.prorrogaGlobal || 10) : 0,
                retiraTodoEn: this.params.cierreNuclear < 2035 ? this.params.cierreNuclear : null,
            });
        }

        calcularPrecioMarginal(gen, demandaGW, ratioRenovable, contexto, gasAnterior) {
            const p = this.params;
            const calorEsp = 1 / Math.max(0.45, p.rendimientoCCGT);
            const costeComb = p.precioGas * calorEsp;
            const costeCO2 = (M.FACTOR_CO2_GAS / Math.max(0.45, p.rendimientoCCGT)) * p.precioCO2;
            const costeCCGT = costeComb + costeCO2 + p.omCCGT;
            const stressCCGT = Math.min(1, gen.gas / Math.max(0.5, p.ccgt));
            const stressHidro = Math.min(1, gen.hidraulica / Math.max(0.5, p.hidraulica));
            const stressInercia = contexto.inerciaInsuficiente ? 25 : 0;
            const stressReserva = contexto.reservaInsuficiente ? 18 : 0;

            let precio;
            if (ratioRenovable > 1.20) {
                precio = Math.max(-20, 5 - (ratioRenovable - 1) * 44);
            } else if (ratioRenovable > 1.05) {
                precio = 5 + (1.2 - ratioRenovable) * 100;
            } else if (gen.gas > 0.25) {
                const primaStress = 12 * Math.pow(stressCCGT, 1.5);
                const deltaGas = Math.max(0, gen.gas - gasAnterior);
                const primaRampa = deltaGas > 1 ? 3 * deltaGas : 0;
                precio = costeCCGT + primaStress + primaRampa + stressInercia + stressReserva;
            } else if (gen.hidraulica > 0.5) {
                precio = 25 + 24 * stressHidro + stressInercia;
            } else {
                precio = 6 + (1 - ratioRenovable) * 28 + stressInercia;
            }

            if (contexto.importacion > 0) {
                const stressImport = Math.min(1, contexto.importacion / Math.max(0.5, p.interconexion));
                precio = Math.max(precio, p.precioImport * (0.86 + 0.28 * stressImport));
            }
            if (contexto.exportacion > 0) {
                precio = Math.min(precio, p.precioExport + 10);
            }
            if (contexto.deficit > 0.3) {
                const deficitPct = contexto.deficit / Math.max(1, demandaGW);
                precio = Math.max(precio, p.precioEscasez * Math.min(1, deficitPct * 4));
            }

            return Math.min(500, Math.max(-25, precio));
        }

        percentil(arr, p) {
            if (!arr.length) return 0;
            const sorted = Float64Array.from(arr).sort();
            const k = (sorted.length - 1) * (p / 100);
            const f = Math.floor(k);
            const c = Math.ceil(k);
            return f === c ? sorted[f] : sorted[f] + (sorted[c] - sorted[f]) * (k - f);
        }

        simular() {
            const p = this.params;
            const demandaAnualTWh = this.calcularDemandaAjustada();
            const nuclearGW = this.calcularNuclearDisponible();
            const weather = SEF.Weather.serieAnual(p.anioObjetivo, p.semilla, p);
            const demand = SEF.Demand.generarSeries(p, new U.SeededRNG(p.semilla * 5 + 1), weather);
            const demandScale = (demandaAnualTWh * 1000) / Math.max(1, U.sum(demand.total));

            const battery = SEF.Storage.createBattery(p, p._batteryState || {});
            const pumped = SEF.Storage.createPumpedHydro(p, p._pumpedState || {});
            const yearIndex = p._trajectoryYearIndex || 0;
            SEF.Storage.degradeBattery(battery, yearIndex);

            let gasAnterior = 0;

            const mix = new Array(M.HORAS_ANIO);
            const precios = new Float64Array(M.HORAS_ANIO);
            const demandaHorariaGW = new Float64Array(M.HORAS_ANIO);
            const detalleDemanda = new Array(M.HORAS_ANIO);

            const R = {
                consumoGasTWh: 0,
                vertidosTWh: 0,
                horasGas: 0,
                horasVertido: 0,
                horasDeficit: 0,
                maxDeficit: 0,
                emisionesAnuales: 0,
                horasBombeoActivo: 0,
                horasPrecioNegativo: 0,
                horasPrecioAlto: 0,
                importacionesTWh: 0,
                exportacionesTWh: 0,
                demandaFlexTWh: 0,
                demandaReducidaTWh: 0,
                horasImportacion: 0,
                horasExportacion: 0,
                horasFlex: 0,
                demandaAjustadaTWh: demandaAnualTWh,
                nuclearEfectivaGW: nuclearGW,
                costeSistemaMEur: 0,
                lcoeSolar: SEF.COSTES_REF.solarFV,
                lcoeEolica: SEF.COSTES_REF.eolica,
                lcoeGas: SEF.COSTES_REF.ccgt,
                lcosBaterias: SEF.COSTES_REF.baterias,
                horasSinGas: 0,
                horasInerciaCritica: 0,
                hidraulicidadMedia: weather.resumen.hidraulicidadAnual,
            };

            let demandaTotalGWh = 0;
            let precioPonderadoSum = 0;
            let consumidorCfD = 0;

            for (let h = 0; h < M.HORAS_ANIO; h++) {
                const dia = Math.floor(h / 24);
                const hora = h % 24;
                const mes = Math.floor(dia / 30.5) % 12;

                const demandaGW = demand.total[h] * demandScale;
                detalleDemanda[h] = {
                    residencial: demand.porSector.residencial[h] * demandScale,
                    servicios: demand.porSector.servicios[h] * demandScale,
                    industrial: demand.porSector.industrial[h] * demandScale,
                    ve: demand.porSector.ve[h] * demandScale,
                    bombasCalor: demand.porSector.bombasCalor[h] * demandScale,
                    h2: demand.porSector.h2[h] * demandScale,
                    h2Flexible: 0,
                    autoconsumo: demand.porSector.autoconsumo[h],
                };

                const gen = {
                    nuclear: 0,
                    solar: 0,
                    eolica: 0,
                    offshore: 0,
                    hidraulica: 0,
                    gas: 0,
                    baterias: 0,
                    bombeo: 0,
                    v2g: 0,
                    vertido: 0,
                    cargaBaterias: 0,
                    cargaBombeo: 0,
                    importacion: 0,
                    exportacion: 0,
                    h2Flex: 0,
                    flexDown: 0,
                };

                const flexCapGW = Math.min(
                    p.flexibilidadGW * demand.flexibilidad[h],
                    demandaGW * (p.flexibilidadPct / 100)
                );

                gen.nuclear = nuclearGW * M.FC_NUCLEAR;
                gen.solar = p.solar * weather.solar[h];
                gen.eolica = p.eolica * weather.viento[h];
                gen.offshore = p.eolicaOffshore * U.clamp(weather.viento[h] * 1.18, 0.1, 0.78);

                let genBase = gen.nuclear + gen.solar + gen.eolica + gen.offshore;
                let excedente = genBase - demandaGW;

                if (excedente > 0) {
                    const batCharge = SEF.Storage.despachar(battery, { excesoGW: excedente, deficitGW: 0 }, { mes, hora });
                    gen.cargaBaterias = batCharge.chargeGW;
                    excedente -= batCharge.chargeGW;

                    const pumpCharge = SEF.Storage.despachar(pumped, { excesoGW: excedente, deficitGW: 0 }, { mes, hora });
                    gen.cargaBombeo = pumpCharge.chargeGW;
                    excedente -= pumpCharge.chargeGW;
                    if (pumpCharge.chargeGW > 0.3) R.horasBombeoActivo++;

                    if (excedente > 0 && flexCapGW > 0) {
                        const h2Flex = Math.min(excedente, flexCapGW, detalleDemanda[h].h2 + 0.3);
                        gen.h2Flex = h2Flex;
                        detalleDemanda[h].h2Flexible = h2Flex;
                        excedente -= h2Flex;
                        R.demandaFlexTWh += h2Flex / 1000;
                        if (h2Flex > 0.2) R.horasFlex++;
                    }

                    if (excedente > 0 && p.interconexion > 0) {
                        const exp = Math.min(excedente, p.interconexion);
                        gen.exportacion = exp;
                        excedente -= exp;
                        R.exportacionesTWh += exp / 1000;
                        if (exp > 0.2) R.horasExportacion++;
                    }

                    gen.vertido = Math.max(0, excedente);
                    if (gen.vertido > 0.3) R.horasVertido++;
                    R.vertidosTWh += gen.vertido / 1000;
                } else {
                    let deficit = -excedente;

                    const hidroDisp = p.hidraulica * U.clamp(0.24 + weather.hidraulicidad[h] * 0.38, 0.08, 0.85);
                    gen.hidraulica = Math.min(hidroDisp, deficit);
                    deficit -= gen.hidraulica;

                    const batDischarge = SEF.Storage.despachar(battery, { excesoGW: 0, deficitGW: deficit }, { mes, hora });
                    gen.baterias = batDischarge.dischargeGW;
                    deficit -= gen.baterias;

                    const pumpDischarge = SEF.Storage.despachar(pumped, { excesoGW: 0, deficitGW: deficit }, { mes, hora });
                    gen.bombeo = pumpDischarge.dischargeGW;
                    deficit -= gen.bombeo;

                    if (deficit > 0 && p.v2gPct > 0) {
                        gen.v2g = Math.min(deficit, SEF.Storage.v2gDisponible(p, hora));
                        deficit -= gen.v2g;
                    }

                    if (deficit > 0 && flexCapGW > 0) {
                        const flexDown = Math.min(deficit, flexCapGW);
                        gen.flexDown = flexDown;
                        deficit -= flexDown;
                        R.demandaReducidaTWh += flexDown / 1000;
                        if (flexDown > 0.2) R.horasFlex++;
                    }

                    if (deficit > 0 && p.interconexion > 0) {
                        const imp = Math.min(deficit, p.interconexion);
                        gen.importacion = imp;
                        deficit -= imp;
                        R.importacionesTWh += imp / 1000;
                        if (imp > 0.2) R.horasImportacion++;
                    }

                    if (deficit > 0) {
                        const maxRampa = p.ccgt * M.RAMPA_CCGT + gasAnterior;
                        const minSincrono = Math.max(0, p.inerciaMinGW - (gen.nuclear + gen.hidraulica));
                        gen.gas = Math.min(Math.max(deficit, minSincrono), p.ccgt, maxRampa);
                        deficit -= gen.gas;
                        if (gen.gas > 0.3) R.horasGas++;
                    }

                    if (deficit > 0.3) {
                        R.horasDeficit++;
                        R.maxDeficit = Math.max(R.maxDeficit, deficit);
                    }
                }

                battery.energiaGWh *= (1 - M.AUTODESCARGA_BAT);

                const demandaEfectivaGW = Math.max(0, demandaGW + gen.h2Flex - gen.flexDown);
                demandaHorariaGW[h] = demandaEfectivaGW;
                const renovables = gen.solar + gen.eolica + gen.offshore + gen.hidraulica;
                const inerciaSincrona = gen.nuclear + gen.hidraulica + Math.min(gen.gas, p.ccgt * M.MIN_ESTABLE_CCGT);
                const reservaObjetivo = demandaEfectivaGW * (p.reservaRodantePct / 100);
                const reservaDisponible = gen.hidraulica * 0.2 + gen.gas * 0.15 + gen.baterias * 0.4 + gen.v2g * 0.3;
                const contextoPrecio = {
                    importacion: gen.importacion,
                    exportacion: gen.exportacion,
                    deficit: Math.max(0, demandaEfectivaGW - genBase - gen.hidraulica - gen.baterias - gen.bombeo - gen.v2g - gen.gas - gen.importacion),
                    inerciaInsuficiente: inerciaSincrona < p.inerciaMinGW,
                    reservaInsuficiente: reservaDisponible < reservaObjetivo,
                };

                if (contextoPrecio.inerciaInsuficiente) R.horasInerciaCritica++;
                const precioMarginal = this.calcularPrecioMarginal(gen, demandaEfectivaGW, demandaEfectivaGW > 0 ? renovables / demandaEfectivaGW : 0, contextoPrecio, gasAnterior);
                const precioAjustado = SEF.Policy.precioFinal(precioMarginal, {
                    hora,
                    yearIndex,
                    genGasGW: gen.gas,
                }, p);

                const cfdSolar = SEF.Policy.CfD('solar', precioAjustado.precioFinal, p);
                const cfdEolica = SEF.Policy.CfD('eolica', precioAjustado.precioFinal, p);
                const cfdOffshore = SEF.Policy.CfD('offshore', precioAjustado.precioFinal, p);
                consumidorCfD += (gen.solar / 1000) * cfdSolar.ajusteConsumidor;
                consumidorCfD += (gen.eolica / 1000) * cfdEolica.ajusteConsumidor;
                consumidorCfD += (gen.offshore / 1000) * cfdOffshore.ajusteConsumidor;

                const precio = precioAjustado.precioFinal;
                if (precio < 0) R.horasPrecioNegativo++;
                if (precio > 150) R.horasPrecioAlto++;
                if (gen.gas < 0.1) R.horasSinGas++;

                R.consumoGasTWh += gen.gas / 1000;
                R.emisionesAnuales += gen.gas * (M.FACTOR_CO2_GAS / Math.max(0.45, p.rendimientoCCGT)) / 1000;

                const demandaServida = demandaEfectivaGW - contextoPrecio.deficit;
                demandaTotalGWh += demandaServida;
                precioPonderadoSum += precio * demandaServida;
                R.costeSistemaMEur += (precio * demandaServida) / 1000;

                gasAnterior = gen.gas;
                mix[h] = gen;
                precios[h] = precio;
            }

            const precioArr = Array.from(precios);
            R.precioMedio = precioArr.reduce((a, b) => a + b, 0) / M.HORAS_ANIO;
            R.precioMedioPonderado = demandaTotalGWh > 0 ? precioPonderadoSum / demandaTotalGWh : R.precioMedio;
            R.precioP10 = this.percentil(precioArr, 10);
            R.precioMediana = this.percentil(precioArr, 50);
            R.precioP90 = this.percentil(precioArr, 90);
            R.precioMin = Math.min(...precioArr);
            R.precioMax = Math.max(...precioArr);

            const genTotal = mix.reduce((s, g) => s + g.nuclear + g.solar + g.eolica + g.offshore + g.hidraulica + g.gas, 0);
            const genRenovable = mix.reduce((s, g) => s + g.solar + g.eolica + g.offshore + g.hidraulica, 0);
            const genGas = mix.reduce((s, g) => s + g.gas, 0);
            const genVRE = mix.reduce((s, g) => s + g.solar + g.eolica + g.offshore, 0);

            R.coberturaRenovable = genTotal > 0 ? (genRenovable / genTotal) * 100 : 0;
            R.dependenciaGas = genTotal > 0 ? (genGas / genTotal) * 100 : 0;
            R.vertidosPct = genVRE > 0 ? (R.vertidosTWh * 1000 / genVRE) * 100 : 0;

            const capacityPayments = SEF.Policy.mecanismoCapacidad(p);
            R.costeSistemaMEur += (capacityPayments.baterias + capacityPayments.ccgt) / 1000000;
            R.costeSistemaMEur += consumidorCfD;

            const totalBatteryOut = mix.reduce((s, g) => s + g.baterias + g.v2g, 0) / 1000;
            const batteryCapFactor = p.bateriasCapacidad > 0 ? totalBatteryOut / Math.max(0.1, battery.capacidadEfectivaGWh) : 0;
            R.lcosBaterias = SEF.COSTES_REF.baterias * (1 + Math.min(0.4, batteryCapFactor * 0.04));

            R.mensual = this._calcularResumenMensual(mix, precios, demandaHorariaGW);
            R.mix = mix;
            R.precios = precioArr;
            R.demandaHoraria = demandaHorariaGW;
            R.detalleDemanda = detalleDemanda;
            R.capacidades = {
                nuclear: nuclearGW,
                solar: p.solar,
                eolica: p.eolica,
                offshore: p.eolicaOffshore,
                hidraulica: p.hidraulica,
                ccgt: p.ccgt,
                almacenamiento: p.bateriasPotencia + p.bombeo,
                bateriasPotencia: p.bateriasPotencia,
                bateriasCapacidad: p.bateriasCapacidad,
                bombeo: p.bombeo,
                interconexion: p.interconexion,
            };
            R.policySnapshot = {
                topeIbericoActivo: p.topeIbericoActivo,
                cfdActivo: p.cfdActivo,
                peajesDinamicosActivos: p.peajesDinamicosActivos,
                pvpcActivo: p.pvpcActivo,
                prorrogaNuclear: p.prorrogaNuclear,
                leyCambioClimaticoActiva: p.leyCambioClimaticoActiva,
            };
            R.estadoBateriaFinal = {
                energiaGWh: battery.energiaGWh,
                capacidadEfectivaGWh: battery.capacidadEfectivaGWh,
                ciclosEquivalentes: battery.ciclosEquivalentes,
            };
            R.estadoBombeoFinal = {
                energiaGWh: pumped.energiaGWh,
                capacidadEfectivaGWh: pumped.capacidadEfectivaGWh,
                ciclosEquivalentes: pumped.ciclosEquivalentes,
            };

            return R;
        }

        _calcularResumenMensual(mix, precios, demanda) {
            const mensual = Array.from({ length: 12 }, () => ({
                nuclear: 0,
                solar: 0,
                eolica: 0,
                offshore: 0,
                hidraulica: 0,
                gas: 0,
                baterias: 0,
                h2Flex: 0,
                vertido: 0,
                importacion: 0,
                exportacion: 0,
                demanda: 0,
                precio: 0,
                horas: 0,
            }));

            for (let h = 0; h < M.HORAS_ANIO; h++) {
                const mes = Math.floor(Math.floor(h / 24) / 30.5) % 12;
                const g = mix[h];
                const m = mensual[mes];
                m.nuclear += g.nuclear;
                m.solar += g.solar;
                m.eolica += g.eolica;
                m.offshore += g.offshore || 0;
                m.hidraulica += g.hidraulica;
                m.gas += g.gas;
                m.baterias += g.baterias + g.bombeo + g.v2g;
                m.h2Flex += g.h2Flex || 0;
                m.vertido += g.vertido;
                m.importacion += g.importacion;
                m.exportacion += g.exportacion;
                m.demanda += demanda[h];
                m.precio += precios[h];
                m.horas++;
            }

            for (const m of mensual) {
                m.nuclear /= 1000;
                m.solar /= 1000;
                m.eolica /= 1000;
                m.offshore /= 1000;
                m.hidraulica /= 1000;
                m.gas /= 1000;
                m.baterias /= 1000;
                m.h2Flex /= 1000;
                m.vertido /= 1000;
                m.importacion /= 1000;
                m.exportacion /= 1000;
                m.demanda /= 1000;
                m.precioMedio = m.horas > 0 ? m.precio / m.horas : 0;
            }

            return mensual;
        }
    }

    SEF.SimuladorElectrico = SimuladorElectrico;
})();
