# Plan: SistemaElectricoFuturo v3 - Aurora + Modelo Realista 2026-2035

## 0. Contexto y diagnostico

- Repo: `C:\Ntizar_Obsidian\Ntizar_Brain\Github\SistemaElectricoFuturo`.
- Git: repo propio en `main`, sincronizado con `origin/main`.
- Stack actual: HTML estatico + Vue 3 CDN + Plotly.js + CSS propio. Sin build.
- Estado actual: 5 modulos JS (`constants`, `scenarios`, `simulator`, `charts`, `app`), 8 escenarios predefinidos, simulacion hora a hora con merit order y precio marginalista.

### Limitaciones detectadas

- Dark-only neon y fuera de la marca Ntizar Aurora v4.
- Modelo estacionario de un unico anio objetivo.
- Cierre nuclear lineal y no basado en el calendario ENRESA.
- Demanda agregada sin sectores ni autoconsumo detras del contador.
- Almacenamiento idealizado, sin degradacion ni V2G.
- Sin capa de politica energetica ni mercado regulado realista.
- Meteorologia sin variabilidad interanual ni sequias persistentes.
- Restricciones de red incompletas: inercia, reserva rodante y eventos de estres.
- Interconexion agregada sin trayectoria de ampliacion.
- Faltan vistas de trayectoria, legislacion, sensibilidad y coste del sistema.

## 1. Objetivos acordados

1. Migrar la UI a Ntizar Aurora v4 con `body.nz`, light-first, toggle dark persistido y layout reescrito con componentes `nz-*`.
2. Mantener el simulador anual actual, pero envolverlo con un modo trayectoria 2026-2035 que preserve estado entre anios.
3. Incorporar demanda sectorial, cierre nuclear real, almacenamiento degradable, V2G, H2 flexible, politica energetica y clima multi-anio.
4. Ampliar escenarios, metricas y visualizaciones para acercar el producto a decisiones electricas reales del caso espanol.

## 2. Principios de ejecucion

- Cambios pequenos y verificables.
- Sin build system ni dependencias nuevas.
- La API anual del simulador debe seguir funcionando mientras se amplian modulos.
- Plotly debe reaccionar al tema leyendo tokens del DOM.
- Checkpoint humano antes de commits, pushes o cambios mayores no pactados.

## 3. Arquitectura propuesta

### 3.1 Arbol final

```text
SistemaElectricoFuturo/
|- index.html
|- PLAN.md
|- css/
|  |- ntizar.css
|  |- app.css
|- js/
|  |- constants.js
|  |- scenarios.js
|  |- policy.js
|  |- demand.js
|  |- storage.js
|  |- nuclear.js
|  |- weather.js
|  |- simulator.js
|  |- trajectory.js
|  |- charts.js
|  |- theme.js
|  |- app.js
|- docs/
   |- METHODOLOGY.md
   |- POLICY.md
   |- DATA-2025.md
```

### 3.2 Contratos de modulos nuevos

#### `js/theme.js`

- `SEF.Theme.init()` lee `localStorage.sef-theme` y aplica `data-nz-theme`.
- `SEF.Theme.toggle()` alterna tema y notifica a suscriptores.
- `SEF.Theme.on(callback)` registra observadores.
- `SEF.Theme.plotlyLayout()` devuelve el layout base de Plotly a partir de tokens `--nz-*`.

#### `js/nuclear.js`

- `SEF.Nuclear.CALENDARIO` con reactores y cierres ENRESA.
- `SEF.Nuclear.disponibleEnAnio(anio, override)` devuelve GW disponibles.
- Parametros soportados: `prorrogaGlobal`, `prorrogaPorReactor`, `retiradaAnticipada`.

#### `js/demand.js`

- Desglose sectorial: residencial, servicios, industrial, VE, bombas de calor, H2 y autoconsumo.
- `SEF.Demand.generarSeries(params, rng, weather)` devuelve demanda total, detalle por sector y flexibilidad.

#### `js/storage.js`

- Baterias con degradacion por ciclo y calendario.
- Eficiencia dependiente del `C-rate`.
- V2G nocturno ligado al parque VE.
- Bombeo con reserva estacional.

#### `js/policy.js`

- Tope iberico, mecanismo de capacidad, CfDs y peajes dinamicos.
- Ajustes al precio final del sistema y al coste total anual.

#### `js/weather.js`

- Variabilidad interanual, sequia cluster y eventos extremos.
- `SEF.Weather.serieAnual(anio, seed, params)` devuelve contexto meteorologico anual.

#### `js/trajectory.js`

- Orquesta simulaciones de 2026 a 2035 con estado persistente.
- Devuelve resultados por anio y un resumen agregado de trayectoria.

#### `js/simulator.js`

- Sigue siendo el motor anual.
- Consume `weather`, `demand`, `nuclear`, `storage` y `policy`.
- Anade minimo sincrono, reserva rodante y metricas de sistema.

### 3.3 Integracion Aurora v4

1. Copiar `design-system/ntizar.css` al repo como `css/ntizar.css`.
2. Renombrar `css/styles.css` a `css/app.css` y dejar solo overrides especificos.
3. Reescribir el layout con `.nz-section`, `.nz-grid`, `.nz-surface`, `.nz-card`, `.nz-btn`, `.nz-table` y formularios `nz-*`.
4. Mantener la semantica energetica de colores en graficos, pero ajustando contrastes para fondo claro y oscuro.
5. Incorporar toggle de tema y repintado de Plotly.

## 4. Mejoras de modelo

### 4.1 Datos 2025

- Revisar referencias REE/OMIE/MITECO y documentarlas en `docs/DATA-2025.md`.
- Ampliar `DATOS_2025` con autoconsumo, parque VE y stock de bombas de calor.

### 4.2 Nuevos parametros

- Despliegue temporal de solar, eolica, baterias e interconexion.
- Penetracion sectorial: VE, smart charging, V2G, bombas de calor, H2, autoconsumo.
- Politica energetica: tope iberico, capacidad, CfDs, PVPC y peajes por franja.
- Clima: variabilidad interanual y sequias agrupadas.
- Red: inercia minima y reserva rodante.

### 4.3 Nuevos escenarios

- Mantener los 8 actuales.
- Anadir escenarios 8-16: ENRESA oficial, prorroga 60 anios, apagones ibericos, VE masivo, autoconsumo 30 GW, PNIEC 2024, ley climatica trayectoria, ola de calor extrema y crisis geopolitica gas+CO2.

### 4.4 Nuevas vistas

- Tab `Trayectoria` con mix anual, precio, emisiones y heatmap PNIEC.
- Panel legislativo con interruptores de politica.
- Vistas de sensibilidad y coste del sistema.

### 4.5 Nuevas metricas

- LCOE por tecnologia.
- LCOS de baterias.
- Coste total del sistema.
- Factor de carga efectivo.
- Horas sin gas.
- Horas de estres de red por falta de inercia.

## 5. Fases de implementacion

### Fase 0 - Setup

- `git pull --ff-only`.
- Crear `PLAN.md`.
- Actualizar ficha del proyecto en `knowledge/projects/`.
- Verificacion: app base sigue siendo legible y el repo queda consistente.

### Fase 1 - Integracion Aurora v4 visual

- Copiar `ntizar.css`.
- Crear `app.css`.
- Reescribir `index.html` y anadir `theme.js`.
- Adaptar `charts.js` al tema.

### Fase 2 - Datos y calendario nuclear

- Crear `nuclear.js`.
- Actualizar `constants.js`.
- Integrar calendario real en el simulador.

### Fase 3 - Demanda sectorial

- Crear `demand.js`.
- Reemplazar la generacion de demanda agregada por un modelo sectorial compatible con la version anterior.

### Fase 4 - Almacenamiento avanzado y V2G

- Crear `storage.js`.
- Integrar degradacion y soporte V2G.

### Fase 5 - Politica y mercado

- Crear `policy.js`.
- Aplicar tope iberico, CfDs, peajes dinamicos y pagos por capacidad.

### Fase 6 - Clima multi-anio y trayectoria

- Crear `weather.js` y `trajectory.js`.
- Integrar simulacion 2026-2035 con progreso y estado persistente.

### Fase 7 - Escenarios y metricas

- Completar `scenarios.js`.
- Ampliar resultados y graficos.

### Fase 8 - Docs y pulido

- Actualizar `README.md` y `docs/METHODOLOGY.md`.
- Crear `docs/POLICY.md` y `docs/DATA-2025.md`.

## 6. Riesgos y mitigaciones

| Riesgo | Mitigacion |
| --- | --- |
| Plotly pierde contraste en light mode | Leer tokens del DOM y reforzar lineas/alphas |
| 10 anos bloquean la UI | Rebanar la simulacion por anio con progreso |
| `ntizar.css` choca con componentes legacy | Mantener overrides solo en `app.css` y revisar clases propias |
| El calendario nuclear cambia | Encapsularlo en `nuclear.js` |
| Fuentes 2025 incompletas | Documentar hipotesis y fecha de consulta |

## 7. Checkpoints humanos

- Antes de commits o pushes.
- Antes de cambios de arquitectura no cubiertos por este plan.
- Antes de borrar archivos legacy fuera de la migracion ya pactada.

## 8. Entregables

1. `project/PLAN.md` como contrato de implementacion.
2. Ficha de `knowledge/projects/SistemaElectricoFuturo.md` actualizada con estado y fases.

## 9. Estado actual

- `project/` ya apunta al repo real de `SistemaElectricoFuturo`.
- Fase 0 iniciada.
- Siguiente paso: ejecutar Fase 1 e integrar Aurora v4 sin romper la simulacion anual.
