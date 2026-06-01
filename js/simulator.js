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

        /**
         * Calcula la capacidad nuclear efectiva a nivel horario,
         * incluyendo paradas de recarga escalonadas (~30 días cada 18 meses).
         */
        calcularNuclearHorario(horaAnio) {
            if (!this.params.aplicarPlanNuclear) return this.params.nuclear * SEF.MODEL.FC_NUCLEAR;
            const override = {
                prorrogaGlobal: this.params.prorrogaNuclear ? (this.params.prorrogaGlobal || 10) : 0,
                retiraTodoEn: this.params.cierreNuclear < 2035 ? this.params.cierreNuclear : null,
            };
            const capacidadTotal = SEF.Nuclear.capacidadNuclearHoraria(this.params, horaAnio, override);
            return capacidadTotal * SEF.MODEL.FC_NUCLEAR;
        }

    /**
     * Calcula el precio marginal como el coste SRMC de la última tecnología
     * necesaria para cubrir la demanda. Orden de mérito:
     *   1. Nuclear (must-run, SRMC ≈ 10 €/MWh)
     *   2. Renovables (SRMC ≈ 0)
     *   3. Hidráulica fluyente (SRMC ≈ 5)
     *   4. Descarga almacenamiento (coste de oportunidad = precio medio reciente)
     *   5. Hidráulica de embalse (coste de oportunidad del agua)
     *   6. Interconexión importación (precio de frontera)
     *   7. CCGT: (precioGas/η + CO₂·0.37/η + O&M)
     *   8. Demanda flexible / reducción voluntaria (VoLL ≈ precioEscasez)
     */
    calcularPrecioMarginal(gen, demandaGW, contexto, gasAnterior, SRMCstack) {
        const p = this.params;
        const calorEsp = 1 / Math.max(0.45, p.rendimientoCCGT);
        const costeComb = p.precioGas * calorEsp;
        const costeCO2 = (M.FACTOR_CO2_GAS / Math.max(0.45, p.rendimientoCCGT)) * p.precioCO2;
        const costeCCGT = costeComb + costeCO2 + p.omCCGT;

        // SRMC de cada tecnología en el orden de mérito
        const ordenMerito = [
            { tec: 'nuclear',     srmc: 10,     gw: gen.nuclear },
            { tec: 'solar',       srmc: 0,      gw: gen.solar },
            { tec: 'eolica',      srmc: 0,      gw: gen.eolica },
            { tec: 'offshore',    srmc: 0,      gw: gen.offshore },
            { tec: 'hidroFluyente', srmc: 5,    gw: gen.hidroFluyente || 0 },
            { tec: 'baterias',    srmc: SRMCstack?.bateria || 30,  gw: gen.baterias },
            { tec: 'bombeo',      srmc: SRMCstack?.bombeo || 35,   gw: gen.bombeo },
            { tec: 'v2g',         srmc: SRMCstack?.v2g || 40,      gw: gen.v2g },
            { tec: 'hidroEmbalse', srmc: SRMCstack?.hidro || 45,   gw: gen.hidroEmbalse || 0 },
            { tec: 'importacion', srmc: p.precioImport,             gw: gen.importacion },
            { tec: 'gas',         srmc: costeCCGT,                  gw: gen.gas },
            { tec: 'flexDown',    srmc: p.precioEscasez,            gw: gen.flexDown || 0 },
        ];

        // Encontrar la última tecnología con generación > 0 en el stack ordenado
        let precio = 10; // floor price mínimo (nuclear)
        for (let i = ordenMerito.length - 1; i >= 0; i--) {
            if (ordenMerito[i].gw > 0.01) {
                precio = ordenMerito[i].srmc;
                break;
            }
        }

        // Si hay déficit (demanda no servida), precio = VoLL
        if (contexto.deficit > 0.3) {
            const deficitPct = contexto.deficit / Math.max(1, demandaGW);
            precio = Math.max(precio, p.precioEscasez * Math.min(1, deficitPct * 4));
        }

        // Prima por estrés de inercia/reserva (señal de escasez de firmeza)
        if (contexto.inerciaInsuficiente) precio += 25;
        if (contexto.reservaInsuficiente) precio += 18;

        // Precios negativos cuando renovable + must-run > demanda
        const ratioRenovable = demandaGW > 0 ? (gen.solar + gen.eolica + gen.offshore) / demandaGW : 0;
        if (ratioRenovable > 1.20 && gen.vertido > 0.5) {
            precio = Math.min(precio, Math.max(-50, -10 - (ratioRenovable - 1) * 30));
        }

        return Math.min(3000, Math.max(-50, precio));
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
            // La demanda ajustada se calcula como la suma real de los sectores,
        // no como un objetivo independiente que obliga a reescalar.
        // Se usa como estimación inicial; el valor real es la suma de los sectores en demand.
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
                ensTWh: 0,
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
                horasParadaNuclear: 0,
                hidraulicidadMedia: weather.resumen.hidraulicidadAnual,
            };

            let demandaTotalGWh = 0;
            let precioPonderadoSum = 0;
            let consumidorCfD = 0;
            const cfSolarMedio = weather.resumen.cfSolarMedio || 0.20;
            const cfEolicoMedio = weather.resumen.cfEolicoMedio || 0.30;

            for (let h = 0; h < M.HORAS_ANIO; h++) {
                const dia = Math.floor(h / 24);
                const hora = h % 24;
                const mes = U.mesDelDia(dia);

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
                    hidroFluyente: 0,
                    hidroEmbalse: 0,
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

                // Generación renovable con factores de capacidad calibrados
                // Se normaliza la serie para que el CF anual coincida con valores reales REE 2025.
                // CF reales: solar 24% (52.5 TWh / 24.7 GW / 8760h), eólica 20% (55.6 / 31.6 / 8760h)
                const CF_SOLAR_REAL = 0.24;
                const CF_EOLICA_REAL = 0.20;
                const CF_OFFSHORE_REAL = 0.43;
                // El perfil horario adimensional (weather.solar/h) se normaliza al CF real
                // mediante normalizeSeries en demand.js o se acepta el CF "que salga" del perfil
                // generado por weather.js. Para calibrar, escalamos la serie generada:
                // gen.solar[h] = p.solar * weather.solar[h] * (CF_SOLAR_REAL / CF_EFECTIVO_ANUAL)
                // Como weather.solar[h] ya tiene media ~0.20 (aproximación sintética),
                // aplicamos un factor de corrección para que coincida con CF_SOLAR_REAL.
                // La capacidad nuclear varía horariamente: incluye paradas de recarga escalonadas.
                gen.nuclear = this.calcularNuclearHorario(h);
                // Contabilizar horas en parada de recarga nuclear
                if (gen.nuclear < 0.01 && p.aplicarPlanNuclear) R.horasParadaNuclear++;
                gen.solar = p.solar * weather.solar[h] * (CF_SOLAR_REAL / Math.max(0.01, cfSolarMedio));
                gen.eolica = p.eolica * weather.viento[h] * (CF_EOLICA_REAL / Math.max(0.01, cfEolicoMedio));
                // Offshore con perfil propio: mayor CF, menor variabilidad diurna,
                // correlación parcial con viento terrestre (factor 0.6 + ruido independiente)
                const offshoreWind = 0.6 * weather.viento[h] + 0.4 * (0.35 + (h % 1000) * 0.0003);
                gen.offshore = p.eolicaOffshore * U.clamp(offshoreWind * 1.6, 0.15, 0.85) * (CF_OFFSHORE_REAL / 0.43);

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

                    // Hidráulica fluyente (run-of-river): perfil casi fijo, sin gestión de embalse.
                    // ~40% de la capacidad hidráulica total es fluyente en España.
                    const hidroFluyenteGW = p.hidraulica * 0.38;
                    const hidroEmbalseGW = p.hidraulica * 0.62;
                    gen.hidroFluyente = Math.min(hidroFluyenteGW * U.clamp(0.6 + weather.hidraulicidad[h] * 0.5, 0.4, 1.0), deficit);
                    deficit -= gen.hidroFluyente;

                    // Hidráulica de embalse con presupuesto energético anual (TWh limitados).
                    // El presupuesto anual = hidraulicidad × TWh referencia.
                    const presupuestoTWhAnual = weather.hidraulicidad[h] * (37.6 * 0.62);
                    if (!this._hidroEmbalseUsadoGWh) this._hidroEmbalseUsadoGWh = 0;
                    const restanteEmbalse = Math.max(0, presupuestoTWhAnual * 1000 - this._hidroEmbalseUsadoGWh) / (M.HORAS_ANIO - h);
                    if (deficit > 0) {
                        gen.hidroEmbalse = Math.min(deficit, hidroEmbalseGW * U.clamp(0.24 + weather.hidraulicidad[h] * 0.38, 0.08, 0.85), restanteEmbalse * 2);
                        deficit -= gen.hidroEmbalse;
                        this._hidroEmbalseUsadoGWh += gen.hidroEmbalse;
                    }
                    gen.hidraulica = gen.hidroFluyente + gen.hidroEmbalse;

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
                        R.ensTWh += deficit / 1000;
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
                const SRMCstack = {
                    bateria: 30 + (battery.ciclosEquivalentes > 200 ? 15 : 0),
                    bombeo: 35,
                    v2g: 40,
                    hidro: 45 + (1 - weather.hidraulicidad[h]) * 20,
                };
                const precioMarginal = this.calcularPrecioMarginal(gen, demandaEfectivaGW, contextoPrecio, gasAnterior, SRMCstack);
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

            // Intensidad de carbono: gCO2 por kWh generado
            // emisionesAnuales está en megatoneladas (Mt) = 10^12 g
            // demandaTotalGWh está en GWh = 10^9 Wh = 10^6 kWh
            // gCO2/kWh = (Mt * 10^12 g) / (GWh * 10^6 kWh) = Mt/GWh * 10^6
            R.intensidadCarbona = demandaTotalGWh > 0
                ? (R.emisionesAnuales * 1e12) / (demandaTotalGWh * 1e6)
                : 0;

            // Verificación de balance energético anual
            // generación total = demanda servida + vertidos + exportaciones - importaciones
            const genTotalCheck = mix.reduce((s, g) => s + g.nuclear + g.solar + g.eolica + g.offshore + g.hidraulica + g.gas + g.baterias + g.bombeo + g.v2g + g.h2Flex, 0) / 1000;
            const cargaTotalCheck = mix.reduce((s, g) => s + g.cargaBaterias + g.cargaBombeo, 0) / 1000;
            const vertCheck = R.vertidosTWh + R.exportacionesTWh - R.importacionesTWh;
            const demandaTotalServida = R.demandaAjustadaTWh;
            const balance = Math.abs(genTotalCheck - cargaTotalCheck - demandaTotalServida - vertCheck);
            if (balance > 0.5) {
                console.warn('[SEF Balance] Desviación energética anual:', balance.toFixed(2), 'TWh');
            }
            R.verificacionBalance = { balanceTWh: balance, genTotalTWh: genTotalCheck };

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
            this._ultimoMix = mix;
            this._ultimoDetalleDemanda = detalleDemanda;
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
                const mes = U.mesDelDia(Math.floor(h / 24)) % 12;
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

        /**
         * Calcula los flujos de energía para un gráfico Sankey.
         * Fuentes → Sectores de demanda, mostrando cómo la energía
         * fluye desde las tecnologías hasta los consumidores finales.
         */
        calcularFlujosSankey() {
            const mix = this._ultimoMix;
            if (!mix || !mix.length) return null;

            // Sumar generación por tecnología (GWh)
            const gen = {
                nuclear: 0, solar: 0, eolica: 0, offshore: 0,
                hidraulica: 0, gas: 0, baterias: 0, bombeo: 0, v2g: 0,
                importacion: 0, exportacion: 0, vertido: 0,
                h2Flex: 0, flexDown: 0,
            };
            for (let h = 0; h < mix.length; h++) {
                const g = mix[h];
                gen.nuclear += g.nuclear || 0;
                gen.solar += g.solar || 0;
                gen.eolica += g.eolica || 0;
                gen.offshore += g.offshore || 0;
                gen.hidraulica += g.hidraulica || 0;
                gen.gas += g.gas || 0;
                gen.baterias += g.baterias || 0;
                gen.bombeo += g.bombeo || 0;
                gen.v2g += g.v2g || 0;
                gen.importacion += g.importacion || 0;
                gen.exportacion += g.exportacion || 0;
                gen.vertido += g.vertido || 0;
                gen.h2Flex += g.h2Flex || 0;
                gen.flexDown += g.flexDown || 0;
            }

            // Sumar demanda por sector (GWh)
            const dem = {
                residencial: 0, servicios: 0, industrial: 0,
                ve: 0, bombasCalor: 0, h2: 0,
            };
            const detalle = this._ultimoDetalleDemanda;
            if (detalle) {
                for (let h = 0; h < detalle.length; h++) {
                    const d = detalle[h];
                    dem.residencial += d.residencial || 0;
                    dem.servicios += d.servicios || 0;
                    dem.industrial += d.industrial || 0;
                    dem.ve += d.ve || 0;
                    dem.bombasCalor += d.bombasCalor || 0;
                    dem.h2 += (d.h2 || 0) + (d.h2Flexible || 0);
                }
            }

            // Construir nodos y enlaces
            // Nodos fuente (generación)
            const fuentes = [];
            const enlaces = [];
            let nodoIdx = 0;

            const fuentesArr = [
                { key: 'nuclear', label: 'Nuclear', val: gen.nuclear },
                { key: 'solar', label: 'Solar FV', val: gen.solar },
                { key: 'eolica', label: 'Eólica terrestre', val: gen.eolica },
                { key: 'offshore', label: 'Eólica marina', val: gen.offshore },
                { key: 'hidraulica', label: 'Hidráulica', val: gen.hidraulica },
                { key: 'gas', label: 'Gas CCGT', val: gen.gas },
                { key: 'importacion', label: 'Importaciones', val: gen.importacion },
                { key: 'vertido', label: 'Vertidos', val: gen.vertido },
            ];

            for (const f of fuentesArr) {
                if (f.val > 0.01) {
                    fuentes.push(f.label);
                    enlaces.push({ source: nodoIdx, value: f.val });
                    nodoIdx++;
                }
            }

            // Nodos intermedios: almacenamiento (neto)
            const batNeto = Math.max(0, gen.baterias - gen.bombeo);
            const batCarga = gen.cargaBaterias || gen.baterias * 0.3;
            const bombeoCarga = gen.cargaBombeo || gen.bombeo * 0.4;

            // Nodos de demanda
            const sectores = [
                { key: 'residencial', label: 'Residencial', val: dem.residencial },
                { key: 'servicios', label: 'Servicios', val: dem.servicios },
                { key: 'industrial', label: 'Industria', val: dem.industrial },
                { key: 've', label: 'Vehículos eléctricos', val: dem.ve },
                { key: 'bombasCalor', label: 'Bombas de calor', val: dem.bombasCalor },
                { key: 'h2', label: 'H₂ flexible', val: dem.h2 },
            ];

            // Añadir nodos de almacenamiento como intermedios
            if (batNeto > 0.01) {
                fuentes.push('Baterías (descarga)');
                enlaces.push({ source: nodoIdx, value: batNeto });
                nodoIdx++;
            }
            if (gen.bombeo > 0.01) {
                fuentes.push('Bombeo (descarga)');
                enlaces.push({ source: nodoIdx, value: gen.bombeo });
                nodoIdx++;
            }
            if (gen.v2g > 0.01) {
                fuentes.push('V2G (descarga)');
                enlaces.push({ source: nodoIdx, value: gen.v2g });
                nodoIdx++;
            }

            // Añadir nodos de demanda
            for (const s of sectores) {
                if (s.val > 0.01) {
                    fuentes.push(s.label);
                    nodoIdx++;
                }
            }

            // Añadir vertido como nodo sink
            if (gen.vertido > 0.01) {
                fuentes.push('Vertido (pérdida)');
                nodoIdx++;
            }

            // Construir enlaces: cada fuente → todos los sectores (proporcional)
            const genTotal = fuentesArr.reduce((s, f) => s + f.val, 0);
            const sectoresActivos = sectores.filter(s => s.val > 0.01);

            // Enlaces de generación → sectores (distribución proporcional)
            for (let i = 0; i < fuentesArr.length; i++) {
                const f = fuentesArr[i];
                if (f.val <= 0.01) continue;
                for (let j = 0; j < sectoresActivos.length; j++) {
                    const s = sectoresActivos[j];
                    const demandaTotalSectores = sectoresActivos.reduce((sum, sec) => sum + sec.val, 0);
                    const flujo = (s.val / Math.max(1, demandaTotalSectores)) * f.val;
                    if (flujo > 0.01) {
                        enlaces.push({
                            source: i,
                            target: fuentesArr.length + j,
                            value: flujo,
                        });
                    }
                }
            }

            // Enlaces de almacenamiento → sectores
            let storageIdx = fuentesArr.length;
            if (batNeto > 0.01) {
                for (let j = 0; j < sectoresActivos.length; j++) {
                    const s = sectoresActivos[j];
                    const demandaTotalSectores = sectoresActivos.reduce((sum, sec) => sum + sec.val, 0);
                    const flujo = (s.val / Math.max(1, demandaTotalSectores)) * batNeto;
                    if (flujo > 0.01) {
                        enlaces.push({
                            source: storageIdx,
                            target: fuentesArr.length + j,
                            value: flujo,
                        });
                    }
                }
                storageIdx++;
            }
            if (gen.bombeo > 0.01) {
                for (let j = 0; j < sectoresActivos.length; j++) {
                    const s = sectoresActivos[j];
                    const demandaTotalSectores = sectoresActivos.reduce((sum, sec) => sum + sec.val, 0);
                    const flujo = (s.val / Math.max(1, demandaTotalSectores)) * gen.bombeo;
                    if (flujo > 0.01) {
                        enlaces.push({
                            source: storageIdx,
                            target: fuentesArr.length + j,
                            value: flujo,
                        });
                    }
                }
                storageIdx++;
            }
            if (gen.v2g > 0.01) {
                for (let j = 0; j < sectoresActivos.length; j++) {
                    const s = sectoresActivos[j];
                    const demandaTotalSectores = sectoresActivos.reduce((sum, sec) => sum + sec.val, 0);
                    const flujo = (s.val / Math.max(1, demandaTotalSectores)) * gen.v2g;
                    if (flujo > 0.01) {
                        enlaces.push({
                            source: storageIdx,
                            target: fuentesArr.length + j,
                            value: flujo,
                        });
                    }
                }
                storageIdx++;
            }

            // Enlace de vertido (pérdida)
            if (gen.vertido > 0.01) {
                enlaces.push({
                    source: storageIdx,
                    target: storageIdx, // auto-loop para pérdidas
                    value: gen.vertido,
                });
            }

            return {
                nodos: fuentes,
                enlaces,
                generacionTotal: genTotal,
                demandaTotal: sectoresActivos.reduce((s, sec) => s + sec.val, 0),
                porTecnologia: fuentesArr.filter(f => f.val > 0.01).map(f => ({
                    nombre: f.label,
                    valor: parseFloat(f.val.toFixed(2)),
                })),
                porSector: sectoresActivos.map(s => ({
                    nombre: s.label,
                    valor: parseFloat(s.val.toFixed(2)),
                })),
            };
        }
    }

    SEF.SimuladorElectrico = SimuladorElectrico;
})();
