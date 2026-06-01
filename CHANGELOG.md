# Changelog

Todas las versiones notables del proyecto Sistema Eléctrico Futuro.

## [4.0.0] - 2026-06-01

### 🔧 Correcciones inmediatas
- **FC_HISTORICOS actualizados:** Solar 0.18→0.24, Eólica 0.24→0.20 (datos REE 2025)
- **Factor 1.35 documentado:** Justificación técnica en `weather.js`
- **Reset _hidroEmbalseUsadoGWh:** Se reinicia al inicio de cada `simular()` (evita acumulación)
- **Escenario 0 aclarado:** Descripción indica capacities 2025, simula año 2026

### 🧪 Tests (154/154 pasan)
- **calibracion-2025.test.js:** 15 tests de calibración contra datos REE 2025
- **orden-merito.test.js:** 5 tests de orden de mérito y SRMC
- **almacenamiento.test.js:** 10 tests de baterías, bombeo, V2G, degradación
- **nuclear.test.js:** 12 tests de calendario ENRESA, prórroga, paradas
- **trayectoria.test.js:** 8 tests de trayectoria multianual 2026-2035

### 🔧 Build system
- **package.json:** Configuración ESM, scripts test/build/lint
- **vite.config.js:** Configuración Vite para desarrollo y producción
- **engine.js:** Punto de entrada ESM para tests headless en Node

### 🔍 Linting
- **ESLint configurado:** Reglas para motor (0 errores, 4 warnings menores)
- **eslint.config.js:** Configuración ESM con globals browser/node

### 🔄 CI/CD
- **GitHub Actions CI:** Tests en Node 20 + 22, build estático, subida de artefactos

### 🎨 Dashboard
- **Vista comparativa nuclear:** Nuevo gráfico Plotly que superpone cierre ENRESA vs prórroga + gas adicional

### 📚 Documentación
- **CONSTANTS.md:** Todas las constantes con fuentes y justificación
- **METHODOLOGY.md:** Metodología completa del modelo (8 secciones)

## [3.4.0] - 2026-05

- Versión anterior (pre-auditoría)
- Motor de simulación funcional con 22 escenarios
- Dashboard Vue.js 3 + Plotly.js
- Trayectoria multianual 2026-2035
- Monte Carlo para incertidumbre climática
