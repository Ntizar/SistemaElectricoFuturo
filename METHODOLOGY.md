# ============================================================================
#  METHODOLOGY.md — Metodología del modelo de simulación
# ============================================================================
#  Versión: 4.0.0
#  Autor: David Antizar (Ntizar)
#  Fecha: 2026-06-01
# ============================================================================

## Resumen ejecutivo

Sistema Eléctrico Futuro es un **modelo de despacho horario** que simula el
funcionamiento del sistema eléctrico peninsular español hora a hora durante un
año completo (8760 horas). El modelo resuelve el **orden de mérito** de
generación según coste marginal de corto plazo (SRMC) y calcula precios,
emisiones y métricas de sistema resultantes.

## 1. Arquitectura del modelo

### 1.1 Capas

```
┌─────────────────────────────────────────────────┐
│  Capa de presentación (index.html + app.js)     │
│  Dashboard Vue.js 3 + Plotly.js                 │
├─────────────────────────────────────────────────┤
│  Capa de simulación (simulator.js)              │
│  Despacho horario por orden de mérito           │
├─────────────────────────────────────────────────┤
│  Capa de módulos (nuclear, weather, demand,     │
│  storage, policy, scenarios, trajectory,        │
│  montecarlo)                                    │
├─────────────────────────────────────────────────┤
│  Capa de datos (constants.js)                   │
│  Parámetros del sistema, fuentes, rangos        │
└─────────────────────────────────────────────────┘
```

### 1.2 Flujo de ejecución

1. **Selección de escenario** → Parámetros del usuario o predefinido
2. **Generación meteorológica** → `weather.js` genera perfiles solares y
   eólicos sintéticos para 8760 horas
3. **Demanda por sector** → `demand.js` calcula demanda residencial,
   industrial, terciario, transporte (EV+V2G) y H₂
4. **Despacho horario** → `simulator.js` resuelve el orden de mérito:
   - Nuclear (base, sin rampas)
   - Renovables (solar + eólica, profiles meteorológicos)
   - Almacenamiento (baterías + bombeo, arbitrando valle-pico)
   - Hidráulica gestionable
   - Interconexiones (flujo ±3 GW)
   - CCGT (último recurso, coste marginal)
5. **Política energética** → `policy.js` aplica subvenciones, penalizaciones,
   objetivos PNIEC
6. **Cálculo de KPIs** → Precio medio, emisiones, cobertura renovable, LCOE

## 2. Orden de mérito

### 2.1 Coste marginal de corto plazo (SRMC)

El SRMC se calcula para cada tecnología según:

```
SRMC(nuclear) = O&M nuclear / 8760 ≈ 0.01 €/kWh → floor price ≈ 10 €/MWh
SRMC(solar) = O&M solar ≈ 0.001 €/kWh → 0 €/MWh (coste marginal ~0)
SRMC(eolica) = O&M eolica ≈ 0.003 €/kWh → 0 €/MWh
SRMC(bombeo) = (coste_bombeo + O&M) / η_bombeo
SRMC(CCGT) = gas/η + CO₂·FCO2/η + O&M ≈ 70-120 €/MWh
SRMC(escasez) = 450 €/MWh (precio tope)
```

### 2.2 Reglas de despacho

1. Nuclear cubre base (capacity factor fijo)
2. Renovables cubren según perfil meteorológico
3. Almacenamiento carga con exceso, descarga con déficit
4. Hidráulica gestionable cubre picos
5. Interconexiones importan/exportan según disponibilidad
6. CCGT cubre el residuo
7. Si hay déficit total → precio de escasez (450 €/MWh)

## 3. Modelos por módulo

### 3.1 Nuclear (`nuclear.js`)

- **Calendario ENRESA 2019:** Cierre progresivo de 7 reactores (2027-2035)
- **Prórroga:** Opción +10 o +20 años por decreto
- **Paradas de recarga:** ~30 días por reactor, escalonados
- **Capacity factor:** 90% (ref REE 2025)
- **Límite aéreo:** 2000 t (transporte combustible)

### 3.2 Meteorología (`weather.js`)

- **Perfil solar:** Modelo Beer-Lambert con factor 1.35 (compensación simplificación transmisión atmosférica)
- **Perfil eólico:** Distribución Weibull (k=2, c calculada desde viento medio)
- **Estrés climático:** Ola calor (>35°C) reduce eficiencia solar; viento extremo reduce eficiencia eólica
- **Semilla aleatoria:** Controlada para reproducibilidad

### 3.3 Demanda (`demand.js`)

- **Sectores:** Residencial, industrial, terciario, transporte (EV+V2G), H₂
- **Elasticidad:** -0.15 (respuesta a precio)
- **Autoconsumo FV:** Factor de reducción 0.25 (25% detrás del contador)
- **Heat pumps:** Eficiencia COP 3.0
- **EV/V2G:** Eficiencia batería 0.85, disponibilidad 5h/día

### 3.4 Almacenamiento (`storage.js`)

- **Baterías:**
  - Eficiencia round-trip depende de C-rate: 0.87 (1h) a 0.92 (4h)
  - Degradación: 2%/365 ciclos + 1.5% calendario/año
  - Reserva técnica: 10% de capacidad
  - Vida útil: 5000 ciclos (80% SoH)

- **Bombeo:**
  - Eficiencia: 75%
  - Reserva estacional: mínimo julio-agosto (estiaje), máximo primavera (post-deshielo)
  - Sin degradación (infraestructura civil)

- **V2G (Vehicle-to-Grid):**
  - Disponibilidad: 20:00-06:00
  - Eficiencia: 80%
  - Capacidad: 10% del parque EV

### 3.5 Política (`policy.js`)

- **Subvenciones:** Solar (-30%), eólica (-20%), baterías (-40%)
- **Penalizaciones:** Gas (+10 €/MWh), CO₂ (+50 €/t)
- **Objetivos PNIEC:** Renovable 74%, Solar 81 GW, Eólica 57 GW, Almacenamiento 22 GW (2030)

### 3.6 Escenarios (`scenarios.js`)

- **22 escenarios** predefinidos cubriendo:
  - Datos reales 2025 (escenario 0)
  - PNIEC Base 2030/2035
  - Prórroga nuclear +10/+20 años
  - Escenarios extremos (sin nuclear, sin gas, máxima renovable)
  - Escenarios de prueba para validación

### 3.7 Trayectoria multianual (`trajectory.js`)

- **Periodo:** 2026-2035 (10 años)
- **Rampas:** Capacidades crecen según PNIEC
- **Nuclear:** Se reduce según calendario ENRESA
- **Almacenamiento:** Degrada entre años
- **Precios:** Evolucionan con costes de inputs

### 3.8 Monte Carlo (`montecarlo.js`)

- **Simulaciones:** 100-1000 iteraciones
- **Variables aleatorias:** Semilla climática, precios de gas/CO₂, demanda
- **Percentiles:** P5, P50, P95 de cada KPI
- **Función de distribución:** Kernel density estimation

## 4. Métricas de sistema

| Métrica | Unidad | Descripción |
|---------|--------|-------------|
| `precioMedio` | €/MWh | Media anual de precios horarios |
| `precioP90` | €/MWh | Percentil 90 (horas de estrés) |
| `precioP10` | €/MWh | Percentil 10 (horas de exceso) |
| `emisionesAnuales` | Mt CO₂ | Emisiones totales del sector eléctrico |
| `intensidadCarbona` | gCO₂/kWh | Emisiones por kWh generado |
| `coberturaRenovable` | % | Generación renovable / demanda total |
| `dependenciaGas` | % | Generación gas / demanda total |
| `horasDeficit` | horas | Horas con déficit de suministro |
| `ensTWh` | TWh | Energía no suministrada (ENS) |
| `vertidosTWh` | TWh | Excedente renovable vertido |
| `balanceTWh` | TWh | Desviación energía generada - demanda |

## 5. Validación

### 5.1 Tests automatizados

- **154 tests** en 9 archivos (`tests/`)
- Cobertura: calibración, orden de mérito, almacenamiento, nuclear, trayectoria, regresión
- Ejecución: `npm test` (Vitest)
- CI: GitHub Actions (Node 20 + 22)

### 5.2 Calibración contra REE 2025

| Métrica | Modelo | REE Real | Nota |
|---------|--------|----------|------|
| Solar | 50-55 TWh | 52.5 TWh | ✓ Dentro de rango |
| Eólica | 50-60 TWh | 55.6 TWh | ✓ Dentro de rango |
| Nuclear | 48-55 TWh | 51.9 TWh | ✓ Dentro de rango |
| Demanda | 240-260 TWh | 248 TWh | ✓ Dentro de rango |
| Precio medio | 200-350 €/MWh | 63 €/MWh | ⚠ Modelo simplificado |
| Emisiones | 3-8 Mt | 36 Mt | ⚠ Modelo subestima gas |

**Nota:** El precio medio del modelo es más alto que el real porque el modelo
no captura toda la flexibilidad del sistema real (respaldo internacional,
gestión de demanda, mercados de futuro). Las emisiones son menores porque el
gas se usa menos en el modelo simplificado.

## 6. Limitaciones conocidas

1. **Precio medio alto:** El modelo subestima la flexibilidad del sistema real
2. **Emisiones bajas:** El gas se usa menos de lo necesario
3. **Balance energético:** Desviación de ~8 TWh (simplificación)
4. **Sin mercados de futuro:** Solo precio spot
5. **Sin modelado hidrológico detallado:** Hidráulica simplificada
6. **Sin restricciones de red:** Flujo libre en toda la península

## 7. Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 3.4 | 2026-05 | Versión anterior |
| 4.0 | 2026-06 | Auditoría completa: FC_HISTORICOS corregidos, tests 154/154, CI, ESLint, documentación |

## 8. Referencias

Ver `CONSTANTS.md` para fuentes de datos y constantes.
Ver `README.md` para instrucciones de uso.
Ver `AUDITORIA-2026-06-01.md` para informe de auditoría.
