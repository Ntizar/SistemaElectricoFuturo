# ============================================================================
#  CONSTANTS.md — Documentación de constantes del modelo
# ============================================================================
#  Versión: 4.0.0
#  Fuente principal: `js/constants.js`
#  Todas las constantes incluyen fuente y justificación.
# ============================================================================

## 1. Constantes físicas

| Constante | Valor | Fuente | Notas |
|-----------|-------|--------|-------|
| `FCO2_GAS` | 0.202 tCO₂/MWh | IPCC AR6, Tabla 8.2 | Gas natural combined cycle |
| `FCO2_GAS_INFERIOR` | 0.184 tCO₂/MWh | IPCC AR6 | Poder calorífico inferior |
| `FACTOR_CO2_GAS` | 0.202 tCO₂/MWh | IPCC AR6 | Alias para compatibilidad |
| `EFICIENCIA_BOMBEO` | 0.75 | IRENA, "Pumped Hydro Energy Storage" | Bombeo reversible |
| `FC_HISTORICOS.nuclear` | 0.90 | REE 2025 | Capacidad de referencia |
| `FC_HISTORICOS.solar` | 0.24 | REE 2025 (52.5 TWh / 24.7 GW / 8760h) | Factor capacidad real |
| `FC_HISTORICOS.eolica` | 0.20 | REE 2025 (55.6 TWh / 31.6 GW / 8760h) | Factor capacidad real |
| `FC_HISTORICOS.offshore` | 0.43 | REE 2025 | Eólica marina |
| `FC_HISTORICOS.hidro` | 0.20 | REE 2025 | Hidráulica total |

## 2. Parámetros de almacenamiento

| Constante | Valor | Fuente | Notas |
|-----------|-------|--------|-------|
| `DEGRADACION_BATERIA_POR_CICLO` | 0.02/365 | BloombergNEF, "Battery Degradation" | 2% por 365 ciclos equivalentes |
| `DEGRADACION_CALENDARIO` | 0.015 | BloombergNEF | 1.5% por año calendario |
| `RESERVA_TECNICA` | 0.10 | Práctica industrial | 10% de capacidad nominal |
| `CICLOS_MAX_BATERIA` | 5000 | Fabricantes (Tesla Megapack) | Ciclos hasta 80% SoH |
| `LITIOS_POR_GWH` | 25 t/GWh | IEA, "Critical Minerals" | Litio metálico |
| `COBRE_POR_GWH` | 60 t/GWh | IEA, "Critical Minerals" | Cobre electrolítico |

## 3. Parámetros económicos (defecto)

| Constante | Valor | Fuente | Notas |
|-----------|-------|--------|-------|
| `PRECIO_GAS_DEFECTO` | 42 €/MWh | TTF 2025 promedio | Title Transfer Facility |
| `PRECIO_CO2_DEFECTO` | 70 €/MWh | EU ETS 2025 promedio | Precio allowances |
| `PRECIO_ESCASEZ_DEFECTO` | 450 €/MWh | OMIE 2025 peak | Precio de escasez |
| `PRECIO_LITIO_DEFECTO` | 15 €/kg | BloombergNEF, Q1 2025 | Carbonato de litio |
| `OM_CC` | 2.5 €/MWh | IRENA | O&M de ciclo combinado |
| `OM_OPP` | 12 €/MWh | IRENA | O&M de solar fotovoltaica |
| `OM_WIND` | 30 €/MWh | IRENA | O&M de eólica terrestre |
| `OM_HYDRO` | 10 €/MWh | IRENA | O&M de hidráulica |

## 4. Parámetros de coste nivelado (LCOE)

| Constante | Valor | Fuente | Notas |
|-----------|-------|--------|-------|
| `OPEX_SOLAR` | 12 €/kW·año | IRENA, "Renewable Power Generation Costs 2024" | O&M + seguros |
| `CAPEX_SOLAR_DEF` | 750 €/kW | IRENA 2024 | Coste instalación |
| `OPEX_EOLICA` | 30 €/kW·año | IRENA 2024 | O&M eólica terrestre |
| `CAPEX_EOLICA_DEF` | 1200 €/kW | IRENA 2024 | Coste instalación |
| `OPEX_NUCLEAR` | 80 €/kW·año | WNA, "World Nuclear Association" | O&M nuclear |
| `CAPEX_NUCLEAR_DEF` | 5000 €/kW | WNA 2024 | Coste newbuild |
| `OPEX_BATERIA` | 15 €/kW·año | BloombergNEF | O&M baterías |
| `CAPEX_BATERIA_DEF` | 350 €/kWh | BloombergNEF 2024 | Coste pack |
| `VIDA_UTIL_DEFAULT` | 30 años | Estándar industrial | Para LCOE |

## 5. Parámetros de almacenamiento

| Constante | Valor | Fuente | Notas |
|-----------|-------|--------|-------|
| `EFICIENCIA_V2G` | 0.80 | IEA, "Global EV Outlook 2025" | Vehicle-to-grid |
| `HORAS_V2G_DIARIAS` | 5 | IEA | Disponibilidad media |
| `RESERVA_LITIO_PCT` | 15% | IEA | Reserva estratégica |
| `EFICIENCIA_CICLO_COMPLETO` | 0.75 | IRENA | Bombeo reversible |

## 6. Parámetros climáticos

| Constante | Valor | Fuente | Notas |
|-----------|-------|--------|-------|
| `PRECIPITACION_BASE` | 700 mm/año | AEMET, "Clima de España" | Media peninsular |
| `TEMP_BASE` | 14.5°C | AEMET | Media anual |
| `DIAS_CIERRE_NUCLEAR` | 30 | ENRESA protocolo 2019 | Parada recarga combustible |
| `UMBRAL_AEREO` | 2000 t | ENRESA | Transporte aéreo limitado |
| `UMBRAL_TERRESTRE` | 1000 t | ENRESA | Transporte terrestre |

## 7. Parámetros de demanda

| Constante | Valor | Fuente | Notas |
|-----------|-------|--------|-------|
| `ELASTICIDAD_DEMANDA` | -0.15 | IEA | Respuesta a precio |
| `EFICIENCIA_HEAT_PUMP` | 3.0 | IEA, "Heat Pump Update" | Bomba de calor |
| `EFICIENCIA_VEHiculo` | 0.85 | IEA | Eficiencia batería EV |
| `FACTOR_AUTOCONSUMO` | 0.25 | REE, "Informe 2025" | Reducción demanda FV |

## 8. Datos nucleares ENRESA (calendario 2019)

| Reactor | Potencia (MW) | Cierre | Fuente |
|---------|---------------|--------|--------|
| Almaraz I | 1030 | 2027 | ENRESA protocolo 2019 |
| Almaraz II | 1030 | 2028 | ENRESA protocolo 2019 |
| Ascó I | 1000 | 2030 | ENRESA protocolo 2019 |
| Cofrentes | 1060 | 2030 | ENRESA protocolo 2019 |
| Ascó II | 1000 | 2032 | ENRESA protocolo 2019 |
| Vandellós II | 1070 | 2035 | ENRESA protocolo 2019 |
| Trillo | 1060 | 2035 | ENRESA protocolo 2019 |

**Total sin prórroga (2036):** 0 GW
**Total con prórroga +10a:** 7.0 GW (todos operativos)

## 9. Escenarios (22 definidos)

Ver `js/scenarios.js` para la definición completa de cada escenario.
Todos los escenarios usan `anioObjetivo: 2026` como punto de partida.

## 10. Fuentes principales

- **REE:** https://www.ree.es/es/datos (generación, demanda, precios)
- **OMIE:** https://www.omie.es/ (precios de mercado, pool)
- **ENRESA:** https://www.enresa.es/ (calendario nuclear)
- **IRENA:** https://www.irena.org/ (costes, tecnología)
- **IEA:** https://www.iea.org/ (demanda, almacenamiento, V2G)
- **BloombergNEF:** https://about.bnef.com/ (baterías, litio)
- **IPCC:** https://www.ipcc.ch/ (factores de emisión)
- **AEMET:** https://www.aemet.es/ (datos climáticos)
- **WNA:** https://world-nuclear.org/ (costes nucleares)
- **PNIEC:** https://www.miteco.gob.es/ (objetivos energéticos)
