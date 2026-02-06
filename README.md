# ⚡ Simulador Sistema Eléctrico Español 2026-2035

**Autor:** David Antizar  
**Versión:** 2.0  
**Licencia:** MIT

---

## 📋 Descripción

Herramienta interactiva de simulación del sistema eléctrico español que permite explorar diferentes escenarios energéticos en el horizonte 2026-2035. Simula **8.760 horas** (un año completo) de despacho de generación eléctrica siguiendo el orden de mérito (merit order) del mercado mayorista español (OMIE).

### Características principales

- **Simulación hora a hora** con modelos realistas de solar, eólica, demanda y formación de precios
- **8 escenarios predefinidos** basados en datos reales y planes oficiales (PNIEC 2030)
- **30+ parámetros configurables**: capacidades instaladas, precios de commodities, almacenamiento, interconexiones, flexibilidad, horizonte temporal
- **Semilla meteorológica reproducible** para comparar escenarios bajo las mismas condiciones climáticas
- **Indicadores clave**: precio medio ponderado, emisiones CO₂, cobertura renovable, vertidos, déficit, horas de estrés
- **Cumplimiento PNIEC**: verificación automática de objetivos del Plan Nacional Integrado de Energía y Clima
- **Visualizaciones interactivas** con Plotly.js: mix de generación, precios, distribución horaria, comparación con 2025

---

## 🏗️ Estructura del proyecto

```
SistemaElectricoFuturo/
├── index.html              # Punto de entrada principal
├── css/
│   └── styles.css          # Estilos CSS (variables, layout, componentes)
├── js/
│   ├── constants.js        # Constantes, datos 2025, PNIEC, paleta de colores
│   ├── scenarios.js        # 8 escenarios predefinidos con descripciones
│   ├── simulator.js        # Motor de simulación (clase SimuladorElectrico)
│   ├── charts.js           # Módulo de gráficos Plotly.js
│   └── app.js              # Aplicación Vue 3 (estado, interacción, orquestación)
├── docs/
│   └── METHODOLOGY.md      # Documentación técnica de la metodología
└── README.md               # Este archivo
```

---

## 🚀 Uso

### Opción 1: Abrir directamente
Abre `index.html` en cualquier navegador moderno (Chrome, Firefox, Edge, Safari).

### Opción 2: Servidor local
```bash
# Con Python
python -m http.server 8080

# Con Node.js
npx serve .

# Con VS Code
# Instalar extensión "Live Server" y hacer clic derecho → "Open with Live Server"
```

### Opción 3: GitHub Pages
El proyecto está preparado para desplegarlo directamente en GitHub Pages sin configuración adicional.

---

## 📊 Escenarios incluidos

| # | Escenario | Descripción |
|---|-----------|-------------|
| 0 | **Datos Reales 2025** | Configuración base con datos reales del sistema español |
| 1 | **PNIEC Base 2030** | Objetivos del Plan Nacional: 76 GW solar, 62 GW eólica |
| 2 | **Prórroga Nuclear** | Extensión de vida útil nuclear, menos presión renovable |
| 3 | **Sin Nuclear** | Cierre total para 2028, máxima expansión renovable |
| 4 | **Almacenamiento Masivo** | 40 GW baterías + 12 GW bombeo |
| 5 | **Crisis del Gas** | Gas TTF a 95€/MWh, incentivo transición renovable |
| 6 | **Hidrógeno Verde** | Alta flexibilidad (12 GW electrolizadores), absorbe excedentes |
| 7 | **Sequía Extrema** | Hidraulicidad al 50%, estrés del sistema |

---

## 🔧 Modelo de simulación

### Motor de despacho (merit order)

1. **Nuclear** → Base inflexible, ~90% factor de capacidad
2. **Solar FV** → Modelo geométrico solar real (lat. 40.4°N) con nubosidad estocástica
3. **Eólica** → Serie temporal con autocorrelación y persistencia meteorológica
4. **Almacenamiento** → Baterías (90% eficiencia) y bombeo (75%) cargan con excedentes
5. **Flexibilidad** → Demanda gestionable absorbe o reduce ante exceso/déficit
6. **Interconexiones** → Importación/exportación con países vecinos
7. **Hidráulica** → Gestionable, priorizada en déficit, estacional
8. **Gas CCGT** → Último recurso, con rampa térmica y mínimo estable

### Formación de precios

- Sistema **marginalista** (OMIE): el precio lo fija la última tecnología necesaria
- Coste CCGT = Gas/eficiencia + CO₂×ETS/eficiencia + O&M + prima de estrés
- Canibalización renovable: precios bajos o negativos con alto ratio VRE/demanda
- Ajustes regulados: pérdidas de red + cargos/peajes (CNMC/MITECO)

### Mejoras respecto a v1

- Modelo solar basado en geometría solar real (declinación, ángulo horario, masa de aire)
- Viento con autocorrelación temporal y bloques sinópticos de persistencia
- Demanda sensible a temperatura (curva en U: calefacción/refrigeración)
- Rampa térmica y limitaciones operativas de CCGT
- Vista de análisis mensual con curva de duración de precios
- 2 escenarios adicionales (Hidrógeno Verde, Sequía Extrema)

---

## 📐 Fuentes de datos

| Fuente | Datos | URL |
|--------|-------|-----|
| **REE** | Generación, demanda, capacidad instalada | [ree.es/es/datos](https://www.ree.es/es/datos) |
| **OMIE** | Precios mercado diario | [omie.es](https://www.omie.es/) |
| **MITECO** | PNIEC 2030, planificación | [miteco.gob.es](https://www.miteco.gob.es/es/energia/temas/planificacion/plan-nacional-integrado-energia-clima.html) |
| **CNMC** | Peajes y cargos regulados | [cnmc.es](https://www.cnmc.es/ambitos-de-actuacion/energia/peajes-y-cargos) |
| **ENTSO-E** | Interconexiones, transparencia | [transparency.entsoe.eu](https://transparency.entsoe.eu/) |
| **EU ETS** | Precio CO₂ | [climate.ec.europa.eu](https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_es) |

---

## 🛠️ Tecnologías

- **Vue 3** (Composition API) — Framework reactivo
- **Plotly.js** — Gráficos interactivos de alta calidad
- **CSS Custom Properties** — Tematización y mantenibilidad
- **Vanilla JS** — Motor de simulación sin dependencias
- **GitHub Pages** — Despliegue estático

---

## 📄 Licencia

MIT © David Antizar

