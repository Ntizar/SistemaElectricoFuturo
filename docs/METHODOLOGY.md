# Metodología del modelo — Sistema Eléctrico Futuro

> Documento técnico que describe las hipótesis, fuentes y algoritmos del simulador.
> Versión: v3.2 · Última actualización: mayo 2026

---

## 1. Despacho por orden de mérito (SRMC stack)

Cada hora (8760 h/año) el simulador resuelve el equilibrio oferta-demanda ordenando las tecnologías por **coste marginal de corto plazo (SRMC)**:

| Orden | Tecnología | SRMC (€/MWh) | Notas |
|-------|-----------|-------------|-------|
| 1 | Nuclear | 8–12 | Must-run, coste variable bajo (combustible + O&M) |
| 2 | Solar FV | 0 | Coste marginal nulo; vertido si excede demanda |
| 3 | Eólica terrestre | 0 | Ídem |
| 4 | Eólica marina | 0 | Ídem |
| 5 | Hidráulica fluyente | 5 | Run-of-river, perfil casi fijo |
| 6 | Baterías | 30–45 | Coste de oportunidad = precio medio reciente + degradación |
| 7 | Bombeo | 35 | Coste de oportunidad estacional |
| 8 | V2G | 40 | Descarga nocturna desde baterías de VE |
| 9 | Hidráulica embalse | 45–65 | Coste de oportunidad del agua (water value) |
| 10 | Importación | `precioImport` | Precio de frontera con Francia/Portugal |
| 11 | CCGT | `precioGas/η + CO₂·0.37/η + O&M` | Último recurso firme |
| 12 | Flex down / déficit | `precioEscasez` (~450–600) | Demanda flexible o VOLL |

**Precio marginal = SRMC de la última tecnología necesaria para casar la demanda.**

Fuente: metodología estándar de mercado eléctrico (OMIE, ENTSO-E).

---

## 2. Generación renovable y calibración

### Factores de capacidad reales (REE 2025)

| Tecnología | Capacidad (GW) | Generación (TWh) | CF real | CF en simulación |
|-----------|-------|-------|-------|---------|
| Solar FV | 24,7 | 52,5 | 24,3% | Normalizado a 24% |
| Eólica terrestre | 31,6 | 55,6 | 20,1% | Normalizado a 20% |
| Eólica marina | 0 | 0 | — | Normalizado a 43% |

**Fuente:** REE — Informe del Sistema Eléctrico Español 2025
([ree.es/es/datos/publicaciones](https://www.ree.es/es/datos/publicaciones/informe-del-sistema-electrico-espanol))

### Calibración

Las series climáticas sintéticas (solar, viento) se normalizan para que el CF anual coincida con los valores reales observados:

```
gen.solar[h] = p.solar * weather.solar[h] * (CF_SOLAR_REAL / CF_medio_anual)
```

Eólica marina: correlación parcial (0,6) con viento terrestre + componente independiente para reflejar la diferente geografía.

---

## 3. PRNG — Mulberry32

Sustituye al anterior generador basado en `Math.sin` (no uniforme, correlaciones).

```
Referencia: Tommy Ettinger — https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
```

- 32 bits, distribución uniforme, periodo largo
- Determinista: misma semilla → misma secuencia
- Box-Muller para generar normales sobre Mulberry32

---

## 4. Calendario nuclear ENRESA

Protocolo oficial de cierre programado (fuente: ENRESA 2019):

| Reactor | Cierre | Potencia (MW) |
|---------|--------|---------------|
| Almaraz I | noviembre 2027 | 1.011 |
| Almaraz II | octubre 2028 | 1.011 |
| Ascó I | octubre 2030 | 1.032 |
| Cofrentes | noviembre 2030 | 1.102 |
| Ascó II | septiembre 2032 | 1.032 |
| Vandellós II | febrero 2035 | 1.087 |
| Trillo | mayo 2035 | 1.066 |

**Fuente:** ENRESA — Plan de Desmantelamiento
([enresa.es](https://www.enresa.es/esp/gestion_combustible/ciclo-combustible/plan-de-desmantelamiento/))

La función `SEF.Nuclear.disponibleEnAnio()` calcula los GW disponibles según el calendario, prórrogas y cierres acelerados.

---

## 5. Hidráulica: fluyente + embalse

Separación basada en la composición real del parque hidráulico español:

| Tipo | % capacidad | Perfil | Presupuesto |
|------|-------------|--------|-------------|
| Fluyente (run-of-river) | ~38% | Casi fijo, siguiendo hidraulicidad horaria | Sin límite anual |
| Embalse (gestionable) | ~62% | Despachado según water value | Anual: hidraulicidad × 37,6 TWh × 0,62 |

**Fuente:** REE — Estadísticas hidráulicas
([ree.es/es/datos/generacion](https://www.ree.es/es/datos/generacion/hidraulica))

Presupuesto de embalse: capacidad máxima ~8.000 GWh de almacenamiento. Se optimiza para verter en horas de precio bajo y generar en horas de precio alto.

---

## 6. CfD (Contratos por Diferencias) — doble cara

Implementación correcta del mecanismo de doble cara:

```js
ingresoProductor = strike  // siempre recibe el strike
ajusteConsumidor = strike - precioSpot  // con signo
```

- Si `precioSpot < strike`: consumidor paga extra (diferencia positiva)
- Si `precioSpot > strike`: consumidor ahorra (diferencia negativa)

Esto refleja el efecto estabilizador real de los CfD, a diferencia de la versión anterior que sólo encarecía al consumidor.

---

## 7. Tope ibérico al gas

**Documentado como mecanismo hipotético.** No reproduce la fórmula exacta del RDL 10/2022 (expirado en diciembre de 2024), que tenía:

- Precio de referencia: 40 €/MWh de media el primer semestre
- Incremento mensual de 5 €/MWh hasta ~70 €/MWh
- Compensación financiada por consumidores con contrato indexado

El modelo usa parámetros configurables por el usuario (tope, compensación) para explorar escenarios "qué pasaría si".

---

## 8. Precios: clamp y VOLL

- Rango de precios: [-50, 3000] €/MWh
- Precio mínimo: -50 €/MWh (excedente renovable extremo)
- Precio máximo: 3.000 €/MWh (aproximación al Value of Lost Loss)
- En horas con déficit > 0,3 GW, el precio escala hacia `precioEscasez` en función del porcentaje de demanda no servida

**Fuente VOLL:** CNMC — Valor de la energía no suministrada
([cnmc.es](https://www.cnmc.es/ambitos-de-actuacion/energia/calidad-del-suministro-electrico))

---

## 9. Demanda sectorial

La demanda anual en TWh se desagrega en perfiles horarios normalizados:

| Sector | Perfil | Fuente |
|--------|--------|--------|
| Residencial | Curva diaria estacional (invierno/verano) | REE perfiles de consumo |
| Servicios | Similar a residencial con pico matinal | REE / IDAE |
| Industrial | Base plana con reducción fin de semana | REE — gran consumo |
| VE | Carga inteligente al valle (06-08h, 13-16h) | IDAE — movilidad eléctrica |
| Bombas de calor | Invierno (alta), verano (baja) | IDAE — climatización |
| H₂ flexible | Electrólisis en horas de excedente renovable | Estrategia H₂ MITECO |
| Autoconsumo FV | Restado de demanda residencial/servicios | REE — FV distribuida |

**Fuentes:** REE, IDAE, MITECO, PNIEC 2024.

---

## 10. Almacenamiento

### Baterías
- Eficiencia round-trip: 92% (4h), 90% (2h), 87% (1h)
- Degradación: 2% lineal por cada 365 ciclos equivalentes
- SoC operativo: 10%–95%
- Autodescarga: 0,1%/hora

### Bombeo
- Eficiencia: 75% round-trip
- Reserva estacional: embalse lleno en abril/octubre, mínimo en agosto/febrero
- Sólo bombea si precio < percentil 30; turbina si precio > percentil 70

### V2G
- Disponible en horas pico (19-22h)
- Eficiencia: 85% ida, 85% vuelta
- Capacidad ligada al parque VE (7 kW/vehículo, 60% participación)

**Fuentes:** IRENA, IEA, especificaciones técnicas de fabricantes.

---

## 11. Monte Carlo y bandas de incertidumbre

- Se ejecutan 9 semillas climáticas: [1, 42, 100, 500, 1000, 2000, 5000, 7777, 9999]
- Cada semilla genera una climatología diferente (viento, nubes, hidraulicidad)
- Para cada KPI se calculan percentiles P5, P50, P95
- Las bandas representan incertidumbre puramente climática (no económica o de políticas)

---

## 12. Verificación de balance energético

Al final de cada simulación se verifica:

```
generación_total - carga_almacenamiento - demanda_servida - vertidos - exportaciones + importaciones ≈ 0
```

Si la desviación supera 0,5 TWh, se emite una advertencia en consola.

---

## 13. Limitaciones del modelo

- **No modela restricciones nodales ni flujos AC**: balance agregado peninsular
- **No resuelve óptimo estocástico multi-etapa**: es un despacho heurístico con reglas
- **LCOE indicativos**: no incluyen coste de capital detallado, riesgo regulatorio ni tasa de descuento específica
- **Sin mercado intradiario ni de ajuste**: sólo mercado diario
- **Perfiles climáticos sintéticos**: no calibrados contra series históricas de CF (aunque normalizados a CF reales)
- **Sin paradas de recarga nuclear**: modelado como baseload plano (FC 0,90 constante)
- **Sin ciclo combinado con captura de CO₂ ni hidrógeno como combustible**
- **Herramienta exploratoria**: no sustituye a modelos oficiales de REE, MITECO o ENTSO-E

---

## 14. Enlaces oficiales

| Organismo | Enlace | Contenido |
|-----------|--------|-----------|
| REE | [ree.es/es/datos](https://www.ree.es/es/datos) | Demanda, generación, emisiones en tiempo real |
| OMIE | [omie.es](https://www.omie.es/) | Precios mercado diario e intradiario |
| MITECO | [miteco.gob.es/energia](https://www.miteco.gob.es/es/energia/temas/planificacion/plan-nacional-integrado-energia-clima.html) | PNIEC 2024 |
| CNMC | [cnmc.es/energia](https://www.cnmc.es/ambitos-de-actuacion/energia/peajes-y-cargos) | Peajes, cargos, supervisión |
| ENRESA | [enresa.es](https://www.enresa.es/esp/gestion_combustible/ciclo-combustible/plan-de-desmantelamiento/) | Plan de desmantelamiento nuclear |
| ENTSO-E | [transparency.entsoe.eu](https://transparency.entsoe.eu/) | Datos de sistema europeos |
| EU ETS | [climate.ec.europa.eu](https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_es) | Precio CO₂ y subastas |
| IDAE | [idae.es](https://www.idae.es/) | Eficiencia, renovables, movilidad |
