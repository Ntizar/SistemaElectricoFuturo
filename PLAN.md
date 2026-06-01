# Plan: SistemaElectricoFuturo — v3.4+

## 0. Resumen ejecutivo

Proyecto: simulador horario del sistema eléctrico español 2026-2035.
Repositorio: `Ntizar/SistemaElectricoFuturo` (rama `main`).
Deploy: https://ntizar.github.io/SistemaElectricoFuturo/

**Versión actual:** v3.4 (commit `7ced976`, mayo 2026)
**Stack:** HTML estático + Vue 3 CDN + Plotly.js + CSS propio (Ntizar Aurora). Sin build system.

## 1. Estado actual por fases

### Fase 0 — Sinceridad y foco ✅ (Completado v3.4)

| # | Tarea | Estado |
|---|-------|--------|
| D2 | Quitar etiqueta "tiempo real" → "Referencia REE 2025 (estática)" | ✅ |
| D1 | Corregir calendario ENRESA y sincronizar UI | ✅ |
| D5 | Arreglar incoherencia clamp 500 vs precioEscasez → [-50, 3000] | ✅ |
| R1 | Alinear texto "AR(1) sobre histórico REE" con código real | ✅ |
| — | Documentar en panel qué es dato y qué es hipótesis | ✅ |

### Fase 1 — Núcleo de simulación correcto ✅ (Completado v3.4)

| # | Tarea | Estado |
|---|-------|--------|
| S3 | Reemplazar PRNG Math.sin por Mulberry32 | ✅ |
| S1 | Despacho real por orden de mérito (pila SRMC, 12 tecnologías) | ✅ |
| S2 | Calibrar perfiles solar/eólico a CF reales REE 2025 (solar 24%, eólica 20%) | ✅ |
| S6 | Calendario de días reales y función mesDelDia() | ✅ |
| R2 | Verificación de balance energético horario y anual | ✅ |
| S2 | Offshore con perfil propio (correlación parcial 0.6 con onshore) | ✅ |

### Fase 2 — Calibración y validación ✅ (Completado v3.4)

| # | Tarea | Estado |
|---|-------|--------|
| S5 | Demanda sectorial: una sola fuente de verdad (suma de sectores) | ✅ |
| S4 | Hidráulica con presupuesto energético (fluyente 38% + embalse 62%) | ✅ |
| D3 | Tope ibérico documentado como hipotético tipo RDL 10/2022 (expirado) | ✅ |
| D4 | CfD de doble cara (con signo: productor devuelve si spot > strike) | ✅ |
| D6 | "Coste sistema" → "Facturación mayorista" | ✅ |

### Fase 3 — Producto enfocado en la pregunta nuclear ✅ (Completado)

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| S7 | Paradas de recarga nuclear escalonadas | ✅ Completada (v3.4) | ~30 días cada 18 meses por reactor, con tracking horario y KPI en dashboard |
| — | **Escenarios ceteris paribus nuclear** | ✅ | 4 nuevos (IDs 18-21): ENRESA, Prórroga 10a, Prórroga 20a, Cierre 2030 |
| — | **ENS + LOLE como KPIs principales** | ✅ | Añadidos al dashboard |
| — | **Monte Carlo multi-semilla** | ✅ | `montecarlo.js`: 9 semillas, percentiles P5-P50-P95 |
| — | Vista comparativa cierre vs prórroga | ⏳ Pendiente | Tabla/resumen visual en UI |

### Fase 4 — Ingeniería y mantenibilidad ✅ (~80%)

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| R3 | METHODOLOGY.md con fuentes | ✅ | Creado con 14 secciones y 16+ enlaces oficiales |
| — | **Pestaña Información + enlaces** | ✅ | Marco legal (10 leyes), organismos (9), glosario (18 términos) |
| R4 | Test de calibración contra 2025 | ⏳ Pendiente | Vitest |
| A1 | package.json + Vite | ⏳ Pendiente | Build system |
| A2 | Tests unitarios + regresión | ⏳ Pendiente | Vitest |
| A3 | GitHub Actions CI | ⏳ Pendiente | lint + tests + deploy Pages |
| A4 | Motor headless ESM | ⏳ Pendiente | Ejecutable en Node |
| — | **API ESIOS/REE real** (opción A del D2) | ⏳ Pendiente | fetch con caché |

## 2. Próximos pasos (orden de ejecución)

### Prioridad alta (siguiente sesión)
1. Vista comparativa de escenarios nucleares en el dashboard
2. Paradas de recarga nuclear (S7) — ~30 días cada 18 meses por reactor
3. package.json + Vite (build system)
4. Tests Vitest (calibración 2025 + unitarios)
5. GitHub Actions CI (lint + tests + deploy Pages)

### Prioridad media
6. Motor headless ESM
7. API ESIOS/REE real con fetch

## 3. Arquitectura actual

```
SistemaElectricoFuturo/
├── index.html
├── PLAN.md
├── README.md
├── css/
│   ├── ntizar.css
│   ├── ntizar.next.css
│   ├── app.css
│   └── ree-data.css
├── js/
│   ├── constants.js      # Constantes, PRNG, utilidades
│   ├── theme.js          # Gestión de tema claro/oscuro
│   ├── nuclear.js        # Calendario ENRESA
│   ├── weather.js        # Clima sintético
│   ├── demand.js         # Demanda sectorial
│   ├── storage.js        # Baterías, bombeo, V2G
│   ├── policy.js         # Política energética
│   ├── scenarios.js      # 22 escenarios (0-21)
│   ├── simulator.js      # Motor de simulación anual
│   ├── trajectory.js     # Trayectoria multianual
│   ├── montecarlo.js     # Monte Carlo multi-semilla
│   ├── charts.js         # Gráficos Plotly
│   ├── ree-data.js       # Datos REE de referencia
│   └── app.js            # App Vue 3
├── docs/
│   ├── METHODOLOGY.md
│   └── DATA-2025.md
└── img/                  # Social preview
```

## 4. Dependencias de carga (index.html)

Orden estricto:
1. CDN: Plotly, Vue 3, Google Fonts (Inter)
2. CSS: ntizar.css, ntizar.next.css, app.css, ree-data.css
3. JS en orden:
   - constants.js → theme.js → nuclear.js → weather.js → demand.js → storage.js → policy.js → scenarios.js → simulator.js → trajectory.js → montecarlo.js → charts.js → ree-data.js → app.js

## 5. Contratos principales

### SimuladorElectrico.simular()
- Entrada: `params` (objeto con parámetros del escenario)
- Salida: `R` (objeto con resultados: precios, mix, emisiones, ENS, LOLE, etc.)
- Usa: Weather, Demand, Nuclear, Storage, Policy

### SEF.MonteCarlo.simularMultiSemilla(params, semillas)
- Entrada: params base + array de semillas
- Salida: `{ resultados[], percentiles: { kpi: {p5, p50, p95} } }`
- 9 semillas por defecto: [1, 42, 100, 500, 1000, 2000, 5000, 7777, 9999]

### Escenarios ceteris paribus
- IDs 18-21: mismos params excepto política nuclear
- 18: ENRESA oficial, 19: Prórroga 10a, 20: Prórroga 20a, 21: Cierre 2030
- Objetivo: aislar el efecto del cierre nuclear

## 6. KPIs de seguridad de suministro

| Métrica | Descripción | Unidad |
|---------|-------------|--------|
| ENS | Energía No Suministrada acumulada | TWh |
| LOLE | Loss of Load Expectation (horas de déficit) | h/año |
| Horas inercia crítica | Horas bajo mínimo síncrono | h/año |
| Horas sin gas | Horas con CCGT apagado | h/año |
| Vertidos | Energía renovable no aprovechada | TWh |
| Importaciones netas | Dependencia exterior | TWh |

## 7. Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v3.0 | Abril 2026 | Aurora, trayectoria, política, clima, 18 escenarios |
| v3.1 | Mayo 2026 | Datos REE, normativa, CNMC, castellano refinado |
| **v3.4** | **Mayo 2026** | Despacho SRMC, PRNG Mulberry32, calibración CF, calendario ENRESA, ENS+LOLE, Monte Carlo, escenarios ceteris paribus |
| v3.3 | Mayo 2026 | METHODOLOGY.md, pestaña Información (leyes, organismos, glosario), SOURCES ampliado |
