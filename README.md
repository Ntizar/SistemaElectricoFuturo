# Sistema Eléctrico Futuro 2026-2035

**Autor:** David Antizar  
**Versión:** 3.1  
**Licencia:** MIT

---

Pruébalo en https://ntizar.github.io/SistemaElectricoFuturo/

## Descripción

Simulador interactivo del sistema eléctrico español con foco en el horizonte 2026-2035. La v3 ya no se limita a un único año estacionario: combina simulación anual de 8.760 horas con una trayectoria multianual que incorpora decisiones de parque, electrificación, almacenamiento, política energética y estreses climáticos plausibles.

## Novedades de la v3

- interfaz rehecha sobre **Ntizar Aurora v4** con modo claro por defecto
- **17 escenarios** con casos realistas para España: cierre ENRESA, VE masivo, autoconsumo 30 GW, crisis geopolítica del gas, ley climática, sequías y ola de calor
- **demanda sectorial**: residencial, servicios, industria, vehículo eléctrico, bombas de calor, H₂ verde y autoconsumo
- **calendario nuclear real** basado en ENRESA con opción de prórroga
- **almacenamiento avanzado**: degradación de baterías, bombeo con reserva estacional y soporte V2G
- **política energética**: tope ibérico, CfDs, peajes dinámicos, PVPC y pagos por capacidad
- **trayectoria 2026-2035** con rampas de despliegue y estado persistente entre años
- nuevas métricas: horas sin gas, estrés de red, coste del sistema, LCOE y LCOS aproximados

## Novedades de la v3.1

- castellano revisado con ñ y tildes en toda la interfaz, escenarios y documentación
- gráficos protagonistas en ancho completo con lectura técnica adjunta
- botón de trayectoria renombrado a **Simular PNIEC 2035**
- almacenamiento recalibrado: eficiencia dependiente de la duración, degradación 2 %/365 ciclos y reserva estacional de bombeo realista
- pestaña **Guía** ampliada con fórmulas y metodología

## Estructura

```text
SistemaElectricoFuturo/
|- index.html
|- PLAN.md
|- css/
|  |- ntizar.css
|  |- app.css
|- js/
|  |- constants.js
|  |- theme.js
|  |- nuclear.js
|  |- weather.js
|  |- demand.js
|  |- storage.js
|  |- policy.js
|  |- scenarios.js
|  |- simulator.js
|  |- trajectory.js
|  |- charts.js
|  |- app.js
|- docs/
   |- METHODOLOGY.md
   |- POLICY.md
   |- DATA-2025.md
```

## Uso

### Opción 1: abrir directamente

Abre `index.html` en un navegador moderno.

### Opción 2: servidor local

```bash
python -m http.server 8080
```

o

```bash
npx serve .
```

## Modos de análisis

### 1. Simulación anual

Calcula una única anualidad de 8.760 horas para un año objetivo. Sirve para comparar escenarios, ajustar parámetros o estudiar sensibilidad.

### 2. Trayectoria 2026-2035

Ejecuta 10 años consecutivos con:

- rampas de solar, eólica, offshore y baterías
- crecimiento del parque VE y bombas de calor
- acumulación del objetivo de H₂
- degradación de baterías entre años
- disponibilidad nuclear según calendario real o prórroga

## Escenarios incluidos

| # | Escenario | Idea principal |
| --- | --- | --- |
| 0 | Datos Reales 2025 | Referencia base del sistema reciente |
| 1 | PNIEC Base 2030 | Despliegue renovable y almacenamiento de referencia |
| 2 | Prórroga Nuclear | Más firmeza nuclear, menos urgencia de respaldo |
| 3 | Sin Nuclear | Cierre acelerado y fuerte tensión de sistema |
| 4 | Almacenamiento Masivo | Mucha batería y bombeo para absorber excedentes |
| 5 | Crisis del Gas | Gas y CO₂ muy altos |
| 6 | Hidrógeno Verde | Electrólisis flexible absorbiendo excedentes |
| 7 | Sequía Extrema | Baja hidraulicidad y más estrés del sistema |
| 8 | Cierre Nuclear ENRESA | Calendario oficial sin prórroga |
| 9 | Prórroga 60 Años | Escenario defensivo de seguridad de suministro |
| 10 | Apagón Ibérico Repetido | Shock de inercia y reserva rodante |
| 11 | VE Masivo 2030 | 10M de VE, smart charging y V2G |
| 12 | Autoconsumo 30 GW | FV detrás del contador a gran escala |
| 13 | PNIEC 2030 Actualizado | Variante más ambiciosa del despliegue |
| 14 | Ley de Cambio Climático 2050 | Senda multianual de descarbonización |
| 15 | Ola de Calor Extrema | Pico de demanda y penalización solar |
| 16 | Crisis Geopolítica Gas + CO₂ | Shock europeo con prórroga nuclear defensiva |

## Fuentes

- REE: https://www.ree.es/es/datos
- OMIE: https://www.omie.es/
- MITECO: https://www.miteco.gob.es/es/energia/temas/planificacion/plan-nacional-integrado-energia-clima.html
- CNMC: https://www.cnmc.es/ambitos-de-actuacion/energia/peajes-y-cargos
- ENTSO-E: https://transparency.entsoe.eu/
- EU ETS: https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_es

## Notas

- El proyecto sigue siendo una herramienta exploratoria, no un modelo de despacho oficial.
- La validación técnica mínima cubre sintaxis JS, simulación anual y trayectoria multianual en entorno Node.
- Falta validación manual en navegador para confirmar experiencia completa de Vue + Plotly.
