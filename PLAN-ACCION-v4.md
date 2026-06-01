# Plan de Acción: Sistema Eléctrico Futuro v3.4 → v4.0

> **Fecha:** 1 de junio 2026  
> **Objetivo:** Cerrar hallazgos de auditoría, añadir tests y elevar el proyecto a producción  
> **Horizonte:** 3-4 semanas

---

## Resumen visual

```
SEMANA 1          SEMANA 2          SEMANA 3          SEMANA 4
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Fase 0      │  │ Fase 1      │  │ Fase 2      │  │ Fase 3      │
│ Corrección  │→ │ Calibración │→ │ Ingeniería  │→ │ Producto    │
│ inmediata   │  │ validación  │  │ build/test  │  │ UX + docs   │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
   2-3 días          3-4 días          5-6 días          3-4 días
```

---

## Fase 0 — Correcciones inmediatas (2-3 días)

> **Objetivo:** Cerrar los 4 hallazgos de la auditoría y alinear datos con fuentes oficiales.

### Tarea 0.1 — Actualizar FC_HISTORICOS con valores reales REE 2025
- **Archivo:** `js/constants.js` línea 124-130
- **Cambios:**
  ```js
  SEF.FC_HISTORICOS = Object.freeze({
      nuclear: 0.90,
      solar: 0.24,    // 0.18 → 0.24 (52.5 TWh / 24.7 GW / 8760h)
      eolica: 0.20,   // 0.24 → 0.20 (55.6 TWh / 31.6 GW / 8760h)
      offshore: 0.43,
      hidro: 0.20,
  });
  ```
- **Impacto:** Autoconsumo FV se subestimaba ~25%. Con este cambio, `demand.js` línea 110 calcula correctamente:
  ```js
  const autoconsumoTWh = params.autoconsumoFV_GW * SEF.FC_HISTORICOS.solar * 8760 / 1000 * ETA_AUTOCONSUMO;
  ```
- **Verificación:** Ejecutar escenario 0 (Datos Reales 2025) y comprobar que la generación solar total ≈ 52.5 TWh.

### Tarea 0.2 — Documentar o eliminar factor 1.35 en weather.js
- **Archivo:** `js/weather.js` línea 23
- **Opción A (recomendada):** Añadir comentario que justifique el factor:
  ```js
  // Factor 1.35: compensa la simplificación del modelo de transmisión atmosférica
  // (Beer-Lambert con parámetros fijos). En un modelo completo, este factor
  // variaría con la masa de aire y la turbidez. Se mantiene para que el perfil
  // horario adimensional tenga amplitud realista antes de la calibración en simulator.js.
  return U.clamp(irradiance * cloudiness * olaCalorFactor * 1.35, 0, 1);
  ```
- **Opción B:** Eliminar el 1.35 y ajustar la calibración en simulator.js (más limpio pero más cambios).
- **Decisión:** Opción A por ahora (menor riesgo).

### Tarea 0.3 — Inicializar _hidroEmbalseUsadoGWh al inicio de simular()
- **Archivo:** `js/simulator.js` línea ~121 (inicio de `simular()`)
- **Cambio:** Añadir antes del bucle horario:
  ```js
  this._hidroEmbalseUsadoGWh = 0;
  ```
- **Verificación:** Ejecutar dos veces el mismo escenario y comprobar que los resultados son idénticos.

### Tarea 0.4 — Aclarar escenario 0 en UI
- **Archivo:** `js/scenarios.js` línea 30
- **Cambio:** Actualizar descripción:
  ```js
  'Aproxima el sistema español observado en 2025: demanda moderada, eólica marina casi inexistente y almacenamiento todavía limitado. Simula año 2026 con capacities de 2025.'
  ```
- **Alternativa:** Cambiar `anioObjetivo: 2026` a `anioObjetivo: 2025` (requiere verificar que el motor soporta año 2025).

---

## Fase 1 — Calibración y validación (3-4 días)

> **Objetivo:** Tener un test de regresión que asegure que el simulador da resultados defendibles contra datos reales.

### Tarea 1.1 — Crear test de calibración contra REE 2025
- **Archivo nuevo:** `tests/calibracion-2025.test.js`
- **Objetivo:** Ejecutar escenario 0 y verificar que las métricas clave están dentro de rangos plausibles:
  ```js
  describe('Calibración contra datos REE 2025', () => {
    it('generación solar entre 48-58 TWh', () => { ... });
    it('generación eólica entre 50-62 TWh', () => { ... });
    it('generación nuclear entre 48-55 TWh', () => { ... });
    it('demanda entre 240-260 TWh', () => { ... });
    it('precio medio entre 40-90 €/MWh', () => { ... });
    it('emisiones entre 30-42 Mt', () => { ... });
    it('balance energético < 1 TWh desviación', () => { ... });
  });
  ```
- **Dependencia:** Tarea 0.1 (FC_HISTORICOS actualizado)

### Tarea 1.2 — Test de orden de mérito
- **Archivo nuevo:** `tests/orden-merito.test.js`
- **Objetivo:** Verificar que el precio marginal se forma correctamente:
  ```js
  describe('Orden de mérito', () => {
    it('precio = nuclear (10 €/MWh) cuando solo nuclear cubre demanda', () => { ... });
    it('precio = CCGT cuando gas es marginal', () => { ... });
    it('precio = escasez cuando hay déficit > 30%', () => { ... });
    it('precio negativo cuando renovable > 120% demanda', () => { ... });
  });
  ```

### Tarea 1.3 — Test de almacenamiento
- **Archivo nuevo:** `tests/almacenamiento.test.js`
- **Objetivo:** Verificar degradación, eficiencia y reserva estacional:
  ```js
  describe('Almacenamiento', () => {
    it('degradación 2% por 365 ciclos', () => { ... });
    it('eficiencia round-trip depende de C-rate', () => { ... });
    it('reserva estacional bombeo: mínimo en julio-agosto', () => { ... });
    it('batería no descarga bajo reserva técnica (10%)', () => { ... });
  });
  ```

### Tarea 1.4 — Test de calendario nuclear
- **Archivo nuevo:** `tests/nuclear.test.js`
- **Objetivo:** Verificar cierres ENRESA y paradas de recarga:
  ```js
  describe('Calendario nuclear', () => {
    it('Almaraz I cerrado en 2027', () => { ... });
    it('7 reactores en 2025, 6 en 2028, 2 en 2035', () => { ... });
    it('paradas de recarga escalonadas (no todos a la vez)', () => { ... });
    it('prórroga +10 años extiende todos los reactores', () => { ... });
  });
  ```

### Tarea 1.5 — Test de trayectoria multianual
- **Archivo nuevo:** `tests/trayectoria.test.js`
- **Objetivo:** Verificar que la trayectoria 2026-2035 es consistente:
  ```js
  describe('Trayectoria 2026-2035', () => {
    it('solar crece con rampa definida', () => { ... });
    it('baterías degradan entre años', () => { ... });
    it('nuclear se reduce según calendario ENRESA', () => { ... });
    it('estado persistente entre años (baterías, bombeo)', () => { ... });
  });
  ```

---

## Fase 2 — Ingeniería y build system (5-6 días)

> **Objetivo:** Tener un proyecto profesional con tests automatizados, linting y CI.

### Tarea 2.1 — package.json + Vite
- **Archivos nuevos:** `package.json`, `vite.config.js`
- **Contenido package.json:**
  ```json
  {
    "name": "sistema-electrico-futuro",
    "version": "4.0.0",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview",
      "test": "vitest run",
      "test:watch": "vitest",
      "lint": "eslint js/",
      "lint:fix": "eslint js/ --fix"
    },
    "devDependencies": {
      "vite": "^6.0.0",
      "vitest": "^3.0.0",
      "eslint": "^9.0.0"
    }
  }
  ```
- **vite.config.js:**
  ```js
  import { defineConfig } from 'vite';
  export default defineConfig({
    root: '.',
    build: { outDir: 'dist' },
    test: { globals: true, environment: 'node' },
  });
  ```

### Tarea 2.2 — Adaptar motor para headless ESM
- **Archivos a modificar:** Todos los `js/*.js`
- **Cambio principal:** Envolver cada módulo en export condicional:
  ```js
  // Al final de cada archivo, antes del cierre IIFE:
  if (typeof module !== 'undefined' && module.exports) {
      module.exports = SEF.Weather;  // o SEF.Storage, etc.
  }
  ```
- **Alternativa más limpia:** Crear `js/engine.js` que reexporta todo:
  ```js
  import { SEF } from './constants.js';
  import './nuclear.js';
  import './weather.js';
  // ...
  export default SEF;
  ```
- **Objetivo:** Ejecutar `node --experimental-vm-modules tests/calibracion-2025.test.js`

### Tarea 2.3 — ESLint configuration
- **Archivos nuevos:** `eslint.config.js`
- **Reglas:**
  ```js
  export default [
      { rules: { 'no-unused-vars': 'warn', 'no-undef': 'error' } }
  ];
  ```

### Tarea 2.4 — GitHub Actions CI
- **Archivo nuevo:** `.github/workflows/ci.yml`
- **Contenido:**
  ```yaml
  name: CI
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '22' }
        - run: npm ci
        - run: npm run lint
        - run: npm test
    deploy:
      needs: test
      if: github.ref == 'refs/heads/main'
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '22' }
        - run: npm ci && npm run build
        - uses: peaceiris/actions-gh-pages@v4
          with:
            github_token: ${{ secrets.GITHUB_TOKEN }}
            publish_dir: ./dist
  ```

### Tarea 2.5 — Test de regresión completo
- **Archivo nuevo:** `tests/regresion.test.js`
- **Objetivo:** Ejecutar los 22 escenarios y guardar snapshot de métricas clave:
  ```js
  describe('Regresión — todos los escenarios', () => {
    SEF.ESCENARIOS.forEach(escenario => {
      it(`${escenario.nombre} — métricas en rango`, () => {
        const sim = new SEF.SimuladorElectrico(escenario.params);
        const R = sim.simular();
        expect(R.precioMedio).toBeGreaterThan(-50);
        expect(R.precioMedio).toBeLessThan(3000);
        expect(R.coberturaRenovable).toBeGreaterThan(0);
        expect(R.coberturaRenovable).toBeLessThanOrEqual(100);
      });
    });
  });
  ```

---

## Fase 3 — Producto y UX (3-4 días)

> **Objetivo:** Cerrar las mejoras de producto pendientes y documentar todo.

### Tarea 3.1 — Vista comparativa nuclear en dashboard
- **Archivo:** `js/app.js` o `js/charts.js`
- **Descripción:** Añadir sección que muestre lado a lado los 4 escenarios ceteris paribus (18-21):
  ```
  ┌────────────────┬──────────┬──────────┬──────────┬──────────┐
  │ Métrica        │ ENRESA   │ Prórroga │ Prórroga │ Cierre   │
  │                │ oficial  │ 10 años  │ 20 años  │ 2030     │
  ├────────────────┼──────────┼──────────┼──────────┼──────────┤
  │ Precio medio   │ XX €/MWh │ XX €/MWh │ XX €/MWh │ XX €/MWh │
  │ Emisiones      │ XX Mt    │ XX Mt    │ XX Mt    │ XX Mt    │
  │ ENS            │ XX TWh   │ XX TWh   │ XX TWh   │ XX TWh   │
  │ Horas déficit  │ XX h     │ XX h     │ XX h     │ XX h     │
  │ Renovable %    │ XX%      │ XX%      │ XX%      │ XX%      │
  └────────────────┴──────────┴──────────┴──────────┴──────────┘
  ```

### Tarea 3.2 — Documentar constantes con fuentes
- **Archivo:** `docs/DATA-2025.md` (ampliar)
- **Contenido:** Para cada constante numérica, añadir:
  ```markdown
  ## Factores de capacidad REE 2025
  
  | Tecnología | CF | Fuente | Cálculo |
  |------------|-----|--------|---------|
  | Solar | 0.24 | REE | 52.5 TWh / 24.7 GW / 8760h |
  | Eólica | 0.20 | REE | 55.6 TWh / 31.6 GW / 8760h |
  | Nuclear | 0.90 | REE | Calendario paradas estándar |
  | Offshore | 0.43 | REE/MITECO | 0 GW en 2025, estimación |
  ```

### Tarea 3.3 — Actualizar METHODOLOGY.md
- **Archivo:** `docs/METHODOLOGY.md`
- **Añadir secciones:**
  - Cálculo del precio marginal SRMC (con fórmula)
  - Modelo de degradación de baterías
  - Reserva estacional de bombeo
  - Método Monte Carlo multi-semilla
  - Limitaciones conocidas del modelo

### Tarea 3.4 — Preparar release v4.0
- **Cambios en README.md:**
  - Actualizar versión a 4.0
  - Añadir badge de CI
  - Documentar tests
  - Actualizar estructura de archivos
- **Tag git:** `v4.0`
- **Release en GitHub:** Con changelog y notas de la versión

---

## Tabla resumen con dependencias

```
Fase 0 (inmediato)
├── 0.1 Actualizar FC_HISTORICOS ─────┐
├── 0.2 Documentar weather.js ────────┤
├── 0.3 Reset _hidroEmbalseUsadoGWh ──┤
└── 0.4 Aclarar escenario 0 ─────────┘
                                      │
                                      ▼
Fase 1 (calibración)
├── 1.1 Test calibración REE 2025 ────┐
├── 1.2 Test orden de mérito ─────────┤
├── 1.3 Test almacenamiento ──────────┤
├── 1.4 Test calendario nuclear ──────┤
└── 1.5 Test trayectoria ─────────────┘
                                      │
                                      ▼
Fase 2 (ingeniería)
├── 2.1 package.json + Vite ──────────┐
├── 2.2 Adaptar motor headless ───────┤
├── 2.3 ESLint config ────────────────┤
├── 2.4 GitHub Actions CI ────────────┤
└── 2.5 Test regresión completo ──────┘
                                      │
                                      ▼
Fase 3 (producto)
├── 3.1 Vista comparativa nuclear ────┐
├── 3.2 Documentar constantes ────────┤
├── 3.3 Actualizar METHODOLOGY.md ────┤
└── 3.4 Release v4.0 ─────────────────┘
```

---

## Criterios de aceptación v4.0

- [ ] Todos los tests pasan (`npm test`)
- [ ] Linting sin errores (`npm run lint`)
- [ ] Build exitoso (`npm run build`)
- [ ] Motor ejecutable en Node (`node tests/calibracion-2025.test.js`)
- [ ] CI verde en GitHub Actions
- [ ] Vista comparativa nuclear funcionando
- [ ] Documentación completa (METHODOLOGY.md + DATA-2025.md)
- [ ] Deploy automático a GitHub Pages

---

## Estimación total

| Fase | Días | Dependencias |
|------|------|--------------|
| Fase 0 | 2-3 | Ninguna |
| Fase 1 | 3-4 | Fase 0 |
| Fase 2 | 5-6 | Fase 1 |
| Fase 3 | 3-4 | Fase 2 |
| **Total** | **13-17 días** | |

---

*Plan generado por Koldo — 1 de junio 2026*
