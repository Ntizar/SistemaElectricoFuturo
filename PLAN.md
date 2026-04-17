# Plan: SistemaElectricoFuturo v3 - Aurora + Modelo Realista 2026-2035

## 0. Contexto y diagnóstico

- Repo: `C:\Ntizar_Obsidian\Ntizar_Brain\Github\SistemaElectricoFuturo`.
- Git: repo propio en `main`, sincronizado con `origin/main`.
- Stack actual: HTML estático + Vue 3 CDN + Plotly.js + CSS propio. Sin build.
- Estado actual: 5 módulos JS (`constants`, `scenarios`, `simulator`, `charts`, `app`), 8 escenarios predefinidos, simulación hora a hora con merit order y precio marginalista.

### Limitaciones detectadas

- Dark-only neón y fuera de la marca Ntizar Aurora v4.
- Modelo estacionario de un único año objetivo.
- Cierre nuclear lineal y no basado en el calendario ENRESA.
- Demanda agregada sin sectores ni autoconsumo detrás del contador.
- Almacenamiento idealizado, sin degradación ni V2G.
- Sin capa de política energética ni mercado regulado realista.
- Meteorología sin variabilidad interanual ni sequías persistentes.
- Restricciones de red incompletas: inercia, reserva rodante y eventos de estrés.
- Interconexión agregada sin trayectoria de ampliación.
- Faltan vistas de trayectoria, legislación, sensibilidad y coste del sistema.

## 1. Objetivos acordados

1. Migrar la UI a Ntizar Aurora v4 con `body.nz`, light-first, toggle dark persistido y layout reescrito con componentes `nz-*`.
2. Mantener el simulador anual actual, pero envolverlo con un modo trayectoria 2026-2035 que preserve estado entre años.
3. Incorporar demanda sectorial, cierre nuclear real, almacenamiento degradable, V2G, H₂ flexible, política energética y clima multianual.
4. Ampliar escenarios, métricas y visualizaciones para acercar el producto a decisiones eléctricas reales del caso español.

## 2. Principios de ejecución

- Cambios pequeños y verificables.
- Sin build system ni dependencias nuevas.
- La API anual del simulador debe seguir funcionando mientras se amplían módulos.
- Plotly debe reaccionar al tema leyendo tokens del DOM.
- Checkpoint humano antes de commits, pushes o cambios mayores no pactados.

## 3. Arquitectura propuesta

### 3.1 Árbol final

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

### 3.2 Contratos de módulos nuevos

#### `js/theme.js`

- `SEF.Theme.init()` lee `localStorage.sef-theme` y aplica `data-nz-theme`.
- `SEF.Theme.toggle()` alterna tema y notifica a suscriptores.
- `SEF.Theme.on(callback)` registra observadores.
- `SEF.Theme.plotlyLayout()` devuelve el layout base de Plotly a partir de tokens `--nz-*`.

#### `js/nuclear.js`

- `SEF.Nuclear.CALENDARIO` con reactores y cierres ENRESA.
- `SEF.Nuclear.disponibleEnAnio(anio, override)` devuelve GW disponibles.
- Parámetros soportados: `prorrogaGlobal`, `prorrogaPorReactor`, `retiradaAnticipada`.

#### `js/demand.js`

- Desglose sectorial: residencial, servicios, industrial, VE, bombas de calor, H₂ y autoconsumo.
- `SEF.Demand.generarSeries(params, rng, weather)` devuelve demanda total, detalle por sector y flexibilidad.

#### `js/storage.js`

- Baterías con degradación por ciclo y calendario.
- Eficiencia dependiente del `C-rate`.
- V2G nocturno ligado al parque VE.
- Bombeo con reserva estacional.

#### `js/policy.js`

- Tope ibérico, mecanismo de capacidad, CfDs y peajes dinámicos.
- Ajustes al precio final del sistema y al coste total anual.

#### `js/weather.js`

- Variabilidad interanual, sequía clúster y eventos extremos.
- `SEF.Weather.serieAnual(anio, seed, params)` devuelve contexto meteorológico anual.

#### `js/trajectory.js`

- Orquesta simulaciones de 2026 a 2035 con estado persistente.
- Devuelve resultados por año y un resumen agregado de trayectoria.

#### `js/simulator.js`

- Sigue siendo el motor anual.
- Consume `weather`, `demand`, `nuclear`, `storage` y `policy`.
- Añade mínimo síncrono, reserva rodante y métricas de sistema.

### 3.3 Integración Aurora v4

1. Copiar `design-system/ntizar.css` al repo como `css/ntizar.css`.
2. Renombrar `css/styles.css` a `css/app.css` y dejar sólo overrides específicos.
3. Reescribir el layout con `.nz-section`, `.nz-grid`, `.nz-surface`, `.nz-card`, `.nz-btn`, `.nz-table` y formularios `nz-*`.
4. Mantener la semántica energética de colores en gráficos, pero ajustando contrastes para fondo claro y oscuro.
5. Incorporar toggle de tema y repintado de Plotly.

## 4. Mejoras de modelo

### 4.1 Datos 2025

- Revisar referencias REE/OMIE/MITECO y documentarlas en `docs/DATA-2025.md`.
- Ampliar `DATOS_2025` con autoconsumo, parque VE y stock de bombas de calor.

### 4.2 Nuevos parámetros

- Despliegue temporal de solar, eólica, baterías e interconexión.
- Penetración sectorial: VE, smart charging, V2G, bombas de calor, H₂, autoconsumo.
- Política energética: tope ibérico, capacidad, CfDs, PVPC y peajes por franja.
- Clima: variabilidad interanual y sequías agrupadas.
- Red: inercia mínima y reserva rodante.

### 4.3 Nuevos escenarios

- Mantener los 8 actuales.
- Añadir escenarios 8-16: ENRESA oficial, prórroga 60 años, apagones ibéricos, VE masivo, autoconsumo 30 GW, PNIEC 2024, ley climática trayectoria, ola de calor extrema y crisis geopolítica gas+CO₂.

### 4.4 Nuevas vistas

- Tab `Trayectoria` con mix anual, precio, emisiones y heatmap PNIEC.
- Panel legislativo con interruptores de política.
- Vistas de sensibilidad y coste del sistema.

### 4.5 Nuevas métricas

- LCOE por tecnología.
- LCOS de baterías.
- Coste total del sistema.
- Factor de carga efectivo.
- Horas sin gas.
- Horas de estrés de red por falta de inercia.

## 5. Fases de implementación

### Fase 0 - Setup

- `git pull --ff-only`.
- Crear `PLAN.md`.
- Actualizar ficha del proyecto en `knowledge/projects/`.
- Verificación: app base sigue siendo legible y el repo queda consistente.

### Fase 1 - Integración Aurora v4 visual

- Copiar `ntizar.css`.
- Crear `app.css`.
- Reescribir `index.html` y añadir `theme.js`.
- Adaptar `charts.js` al tema.

### Fase 2 - Datos y calendario nuclear

- Crear `nuclear.js`.
- Actualizar `constants.js`.
- Integrar calendario real en el simulador.

### Fase 3 - Demanda sectorial

- Crear `demand.js`.
- Reemplazar la generación de demanda agregada por un modelo sectorial compatible con la versión anterior.

### Fase 4 - Almacenamiento avanzado y V2G

- Crear `storage.js`.
- Integrar degradación y soporte V2G.

### Fase 5 - Política y mercado

- Crear `policy.js`.
- Aplicar tope ibérico, CfDs, peajes dinámicos y pagos por capacidad.

### Fase 6 - Clima multianual y trayectoria

- Crear `weather.js` y `trajectory.js`.
- Integrar simulación 2026-2035 con progreso y estado persistente.

### Fase 7 - Escenarios y métricas

- Completar `scenarios.js`.
- Ampliar resultados y gráficos.

### Fase 8 - Docs y pulido

- Actualizar `README.md` y `docs/METHODOLOGY.md`.
- Crear `docs/POLICY.md` y `docs/DATA-2025.md`.

### Fase 9 - Refinamiento v3.1 (en curso)

- Corregir castellano con ñ y tildes en UI, escenarios y documentación.
- Protagonizar gráficos: ancho completo, alturas mayores y explicación técnica adjunta.
- Renombrar botón de trayectoria a "Simular PNIEC 2035" y retirar el toggle de tema del hero.
- Revisar almacenamiento: eficiencia dependiente de duración, degradación calibrada y reserva estacional realista en bombeo.
- Ampliar la pestaña Guía con fórmulas y lectura técnica por gráfico.

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Plotly pierde contraste en light mode | Leer tokens del DOM y reforzar líneas/alphas |
| 10 años bloquean la UI | Rebanar la simulación por año con progreso |
| `ntizar.css` choca con componentes legacy | Mantener overrides sólo en `app.css` y revisar clases propias |
| El calendario nuclear cambia | Encapsularlo en `nuclear.js` |
| Fuentes 2025 incompletas | Documentar hipótesis y fecha de consulta |

## 7. Checkpoints humanos

- Antes de commits o pushes.
- Antes de cambios de arquitectura no cubiertos por este plan.
- Antes de borrar archivos legacy fuera de la migración ya pactada.

## 8. Entregables

1. `project/PLAN.md` como contrato de implementación.
2. Ficha de `knowledge/projects/SistemaElectricoFuturo.md` actualizada con estado y fases.

## 9. Estado actual

- `project/` apunta al repo real de `SistemaElectricoFuturo`.
- Fases 0-8 completadas con v3.0 Aurora.
- Fase 9 (v3.1) en curso: refinamiento lingüístico, visual y técnico.
