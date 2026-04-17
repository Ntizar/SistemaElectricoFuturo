# Sistema Electrico Futuro 2026-2035

**Autor:** David Antizar  
**Version:** 3.0  
**Licencia:** MIT

---

Pruébalo en https://ntizar.github.io/SistemaElectricoFuturo/

## Descripcion

Simulador interactivo del sistema electrico espanol con foco en el horizonte 2026-2035. La v3 ya no se limita a un unico anio estacionario: combina simulacion anual de 8.760 horas con una trayectoria multi-anio que incorpora decisiones de parque, electrificacion, almacenamiento, politica energetica y estres climaticos plausibles.

## Novedades de la v3

- interfaz rehecha sobre **Ntizar Aurora v4** con modo claro por defecto y toggle dark
- **17 escenarios** con casos realistas para Espana: cierre ENRESA, VE masivo, autoconsumo 30 GW, crisis geopolitica del gas, ley climatica, sequias y ola de calor
- **demanda sectorial**: residencial, servicios, industria, vehiculo electrico, bombas de calor, H2 verde y autoconsumo
- **calendario nuclear real** basado en ENRESA con opcion de prorroga
- **almacenamiento avanzado**: degradacion de baterias, bombeo y soporte V2G
- **politica energetica**: tope iberico, CfDs, peajes dinamicos, PVPC y pagos por capacidad
- **trayectoria 2026-2035** con rampas de despliegue y estado persistente entre anios
- nuevas metricas: horas sin gas, estres de red, coste del sistema, LCOE y LCOS aproximados

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

### Opcion 1: abrir directamente

Abre `index.html` en un navegador moderno.

### Opcion 2: servidor local

```bash
python -m http.server 8080
```

o

```bash
npx serve .
```

## Modos de analisis

### 1. Simulacion anual

Calcula una unica anualidad de 8.760 horas para un anio objetivo. Sirve para comparar escenarios, ajustar parametros o estudiar sensibilidad.

### 2. Trayectoria 2026-2035

Ejecuta 10 anos consecutivos con:

- rampas de solar, eolica, offshore y baterias
- crecimiento del parque VE y bombas de calor
- acumulacion del objetivo de H2
- degradacion de baterias entre anios
- disponibilidad nuclear segun calendario real o prorroga

## Escenarios incluidos

| # | Escenario | Idea principal |
| --- | --- | --- |
| 0 | Datos Reales 2025 | Referencia base del sistema reciente |
| 1 | PNIEC Base 2030 | Despliegue renovable y almacenamiento de referencia |
| 2 | Prorroga Nuclear | Mas firmeza nuclear, menos urgencia de respaldo |
| 3 | Sin Nuclear | Cierre acelerado y fuerte tension de sistema |
| 4 | Almacenamiento Masivo | Mucha bateria y bombeo para absorber excedentes |
| 5 | Crisis del Gas | Gas y CO2 muy altos |
| 6 | Hidrogeno Verde | Electrolisis flexible absorbiendo excedentes |
| 7 | Sequia Extrema | Baja hidraulicidad y mas estres del sistema |
| 8 | Cierre Nuclear ENRESA | Calendario oficial sin prorroga |
| 9 | Prorroga 60 Anos | Escenario defensivo de seguridad de suministro |
| 10 | Apagon Iberico Repetido | Shock de inercia y reserva rodante |
| 11 | VE Masivo 2030 | 10M de VE, smart charging y V2G |
| 12 | Autoconsumo 30 GW | FV detras del contador a gran escala |
| 13 | PNIEC 2030 Actualizado | Variante mas ambiciosa del despliegue |
| 14 | Ley Climatico 2050 | Senda multi-anio de descarbonizacion |
| 15 | Ola de Calor Extrema | Pico de demanda y penalizacion solar |
| 16 | Crisis Geopolitica Gas + CO2 | Shock europeo con prorroga nuclear defensiva |

## Fuentes

- REE: https://www.ree.es/es/datos
- OMIE: https://www.omie.es/
- MITECO: https://www.miteco.gob.es/es/energia/temas/planificacion/plan-nacional-integrado-energia-clima.html
- CNMC: https://www.cnmc.es/ambitos-de-actuacion/energia/peajes-y-cargos
- ENTSO-E: https://transparency.entsoe.eu/
- EU ETS: https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_es

## Notas

- El proyecto sigue siendo una herramienta exploratoria, no un modelo de despacho oficial.
- La validacion tecnica minima ya cubre sintaxis JS, simulacion anual y trayectoria multi-anio en entorno Node.
- Falta validacion manual en navegador para confirmar experiencia completa de Vue + Plotly + tema claro/oscuro.
