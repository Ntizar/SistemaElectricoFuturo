# Auditoría: Sistema Eléctrico Futuro v3.4

> **Repositorio:** Ntizar/SistemaElectricoFuturo  
> **Versión auditada:** v3.4 (commit 7ced976)  
> **Fecha auditoría:** 1 de junio 2026  
> **Auditor:** Koldo (agente de Koldo)

---

## 0. Resumen ejecutivo

**Pregunta original del proyecto:** ¿Qué pasará con el sistema eléctrico español durante el cierre nuclear 2027-2035?

**Hallazgo principal:** El proyecto ha evolucionado significativamente desde la auditoría anterior (v3.1 → v3.4). Los problemas críticos identificados en la v3.1 (precio heurístico, PRNG defectuoso, renovables sin calibrar, calendario ENRESA erróneo) han sido **corregidos**. El motor de simulación ahora implementa un despacho real por orden de mérito con SRMC, PRNG Mulberry32, factores de capacidad calibrados a datos REE 2025 y calendario nuclear correcto. El proyecto está en un estado **sólido** para herramienta exploratoria, con 22 escenarios (incluyendo 4 ceteris paribus nucleares), Monte Carlo multi-semilla y verificación de balance energético.

**Nota global: 8/10**

| Área | Nota | Justificación |
|------|------|---------------|
| Motor de simulación | 8.5 | Orden de mérito correcto, precio marginal real, desviaciones menores |
| Calidad del dato | 8 | Calendario ENRESA correcto, CF calibrados, discrepancies residuales |
| Reproducibilidad | 7.5 | PRNG correcto, faltan tests unitarios y CI |
| Producto y foco | 8.5 | Excelente cobertura nuclear ceteris paribus, Monte Carlo, ENS+LOLE |

---

## 1. Diagnóstico de calidad de simulación

### Problemas corregidos desde v3.1

| ID | Problema original | Corrección en v3.4 | Estado |
|----|-------------------|---------------------|--------|
| S1 | Precio heurístico (`if ratioRenovable > 1.20`) | Despacho real SRMC con 12 tecnologías ordenadas | ✅ Resuelto |
| S2 | PRNG `Math.sin` defectuoso | Mulberry32 en `constants.js` línea 37-55 | ✅ Resuelto |
| S3 | Renovables sin calibrar (factor 1.35 arbitrario) | CF reales: solar 24%, eólica 20%, offshore 43% | ✅ Resuelto |
| S4 | Offshore = onshore × 1.18 | Perfil propio con correlación parcial 0.6 + ruido independiente | ✅ Resuelto |
| S7 | Sin paradas de recarga nuclear | Calendario escalonado (~30 días/18 meses/reactor) | ✅ Resuelto |

### Problemas nuevos o residuales

#### H1 (Medio) — Factor 1.35 en weather.js persiste

**Archivo:** `weather.js` línea 23  
**Código:**
```js
return U.clamp(irradiance * cloudiness * olaCalorFactor * 1.35, 0, 1);
```

**Problema:** El factor 1.35 infla artificialmente el perfil solar generado en `weather.js`. En `simulator.js` se aplica una corrección inversa:
```js
gen.solar[h] = p.solar * weather.solar[h] * (CF_SOLAR_REAL / Math.max(0.01, cfSolarMedio));
```

Esto crea una **doble corrección**: primero se infla, luego se desinfla. Aunque el resultado final es correcto (CF real ≈ 0.24), la arquitectura es confusa y frágil. El factor 1.35 no tiene justificación física.

**Consecuencia:** Si alguien modifica `weather.js` sin entender la cadena de correcciones, puede romper la calibración silenciosamente.

**Corrección:** Eliminar el factor 1.35 de `weather.js` y dejar que `simulator.js` maneje la calibración completamente, O documentar explícitamente que 1.35 compensa la transmisión atmosférica simplificada.

#### H2 (Medio) — FC_HISTORICOS desactualizados

**Archivo:** `constants.js` línea 124-130  
**Código:**
```js
SEF.FC_HISTORICOS = Object.freeze({
    nuclear: 0.90,
    solar: 0.18,  // ← Desactualizado
    eolica: 0.24, // ← Desactualizado
    offshore: 0.43,
    hidro: 0.20,
});
```

**Problema:** Los valores en `FC_HISTORICOS` no coinciden con los valores reales REE 2025:
- Solar: 0.18 en FC_HISTORICOS vs 0.24 real → discrepancia 33%
- Eólica: 0.24 en FC_HISTORICOS vs 0.20 real → discrepancia 20%

El simulador usa `CF_SOLAR_REAL = 0.24` y `CF_EOLICA_REAL = 0.20` en `simulator.js`, que son correctos. Pero `FC_HISTORICOS` se usa para calcular autoconsumo en `demand.js` línea 110:
```js
const autoconsumoTWh = params.autoconsumoFV_GW * SEF.FC_HISTORICOS.solar * 8760 / 1000 * ETA_AUTOCONSUMO;
```

**Consecuencia:** El autoconsumo se calcula con un CF solar subestimado (0.18 vs 0.24), lo que **subestima la producción de autoconsumo FV** en un ~25%.

**Corrección:** Actualizar `FC_HISTORICOS.solar` a 0.24 y `FC_HISTORICOS.eolica` a 0.20, o mejor aún, usar las mismas constantes `CF_SOLAR_REAL` / `CF_EOLICA_REAL` definidas en `simulator.js`.

#### H3 (Bajo) — Cálculo hidráulica de embalse con variable de instancia

**Archivo:** `simulator.js` líneas 293-298  
**Código:**
```js
if (!this._hidroEmbalseUsadoGWh) this._hidroEmbalseUsadoGWh = 0;
const restanteEmbalse = Math.max(0, presupuestoTWhAnual * 1000 - this._hidroEmbalseUsadoGWh) / (M.HORAS_ANIO - h);
```

**Problema:** `this._hidroEmbalseUsadoGWh` es una variable de instancia que persiste entre llamadas a `simular()`. Si se instancia un nuevo `SimuladorElectrico` para el mismo escenario, el estado anterior se mantiene si no se resetea.

**Consecuencia:** En la trayectoria multianual (donde se crean instancias nuevas por año), esto no es problema porque `trajectory.js` crea una instancia nueva por año. Pero si alguien reutiliza la instancia, el presupuesto hidráulico se acumbula incorrectamente.

**Corrección:** Inicializar `this._hidroEmbalseUsadoGWh = 0` al inicio de `simular()`, no lazy.

#### H4 (Bajo) — Escenario 0 "Datos Reales 2025" usa año 2026

**Archivo:** `scenarios.js` línea 33  
**Código:**
```js
escenario(0, 'Datos Reales 2025', '📅', ..., { anioObjetivo: 2026, ... })
```

**Problema:** El escenario "Datos Reales 2025" usa `anioObjetivo: 2026`, no 2025. Esto significa que el año de simulación es 2026, pero los datos de capacidad son de 2025.

**Consecuencia:** El clima sintético se genera para 2026, no 2025. Esto puede afectar los resultados si hay diferencias climáticas significativas entre años.

**Corrección:** Cambiar `anioObjetivo: 2025` o documentar explícitamente que el escenario approxima 2025 usando capacities de 2025 pero clima de 2026.

---

## 2. Errores de dato verificables

### Calendario nuclear ENRESA (verificado ✅)

| Reactor | Capacidad GW | Código v3.4 | ENRESA real | Estado |
|---------|-------------|-------------|-------------|--------|
| Almaraz I | 1.049 | 2027 | nov 2027 | ✅ |
| Almaraz II | 1.044 | 2028 | oct 2028 | ✅ |
| Ascó I | 0.995 | 2030 | oct 2030 | ✅ |
| Cofrentes | 1.064 | 2030 | nov 2030 | ✅ |
| Ascó II | 0.997 | 2032 | sep 2032 | ✅ |
| Vandellós II | 1.027 | 2035 | feb 2035 | ✅ |
| Trillo | 1.066 | 2035 | may 2035 | ✅ |

### Objetivos PNIEC 2030 (verificado ✅)

| Objetivo | PNIEC real | Código | Estado |
|----------|-----------|--------|--------|
| Solar | 81 GW | 81 GW (escenario 13) | ✅ |
| Eólica terrestre | 62 GW | 62 GW (escenario 13) | ✅ |
| Offshore | 3 GW | 3 GW (escenario 13) | ✅ |
| Almacenamiento | 22 GW | 22 GW (escenario 8) | ✅ |

### Datos REE 2025 (verificado ✅)

| Tecnología | DATOS_2025 | Real REE | Estado |
|------------|-----------|----------|--------|
| Solar | 24.7 GW | ~24.7 GW | ✅ |
| Eólica | 31.6 GW | ~31.6 GW | ✅ |
| Nuclear | 7.0 GW | ~7.0 GW | ✅ |
| Hidráulica | 17.1 GW | ~17.1 GW | ✅ |
| Gas CCGT | 24.0 GW | ~24.0 GW | ✅ |

---

## 3. Reproducibilidad y rigor metodológico

| # | Checklist | Estado |
|---|-----------|--------|
| R1 | PRNG determinista y documentado (Mulberry32) | ✅ |
| R2 | Verificación de balance energético anual | ✅ (console.warn si desviación > 0.5 TWh) |
| R3 | Constantes con fuente/cita | ⚠️ Parcial (muchas constantes sin fuente explícita) |
| R4 | Test de calibración contra año de referencia (2025) | ❌ Pendiente |
| R5 | Calendario real (DIAS_ACUM + mesDelDia) | ✅ |
| R6 | Ejecutable headless en Node | ❌ Pendiente |

---

## 4. Arquitectura, código y mantenibilidad

### Fortalezas

- **Modularidad excelente:** 13 archivos JS bien separados por responsabilidad
- **Sin dependencias externas:** HTML estático + CDN (Vue 3, Plotly.js)
- **Código limpio:** convención consistente, comentarios en castellano
- **Escenarios bien estructurados:** cada uno sobrescribe solo los parámetros relevantes
- **Trayectoria multianual:** estado persistente entre años (baterías, bombeo, hidraulicidad)
- **Monte Carlo:** multi-semilla con percentiles P5-P50-P95

### Áreas de mejora

| # | Área | Problema | Impacto |
|---|------|----------|---------|
| A1 | Tests | Sin tests unitarios ni de regresión | No se detectan roturas silenciosas |
| A2 | Build | Sin package.json ni Vite | Difícil ejecutar tests o linting |
| A3 | CI | Sin GitHub Actions | No hay gates de calidad |
| A4 | Headless | Motor no ejecutable en Node | No se puede automatizar validación |
| A5 | Constants | FC_HISTORICOS desactualizado | Autoconsumo subestimado |
| A6 | Weather | Factor 1.35 sin documentar | Confuso para mantenimiento |

---

## 5. Foco del producto

### ¿Responde a la pregunta original?

**Sí, excelentemente.** Los escenarios ceteris paribus nucleares (IDs 18-21) permiten aislar directamente el efecto del cierre nuclear:

- **Escenario 18:** Cierre ENRESA oficial (sin prórroga)
- **Escenario 19:** Prórroga 10 años
- **Escenario 20:** Prórroga 20 años (60 años vida)
- **Escenario 21:** Cierre acelerado 2030

**Comparativa lado a lado:** Los 4 escenarios usan los **mismos parámetros** excepto la política nuclear, lo que permite una comparación ceteris paribus válida.

**Métricas de seguridad de suministro:**
- ENS (Energía No Suministrada) ✅
- LOLE (Loss of Load Expectation) ✅
- Horas inercia crítica ✅
- Horas sin gas ✅
- Vertidos ✅

**Falta:** Vista comparativa visual en UI (tabla/resumen lado a lado) — pendiente según PLAN.md.

---

## 6. Plan de acción priorizado

### Fase 0: Correcciones inmediatas (1 día)

| # | Tarea | Severidad |
|---|-------|-----------|
| 1 | Actualizar `FC_HISTORICOS.solar` a 0.24 y `eolica` a 0.20 | Alta |
| 2 | Inicializar `this._hidroEmbalseUsadoGWh = 0` al inicio de `simular()` | Baja |
| 3 | Documentar o eliminar factor 1.35 en weather.js | Media |
| 4 | Aclarar que escenario 0 usa año 2026 (no 2025) | Baja |

### Fase 1: Calibración y validación (1 semana)

| # | Tarea | Prioridad |
|---|-------|-----------|
| 5 | Test de calibración contra datos REE 2025 | Alta |
| 6 | Actualizar FC_HISTORICOS con valores reales | Alta |
| 7 | Alinear constantes con fuentes oficiales | Media |

### Fase 2: Ingeniería (2 semanas)

| # | Tarea | Prioridad |
|---|-------|-----------|
| 8 | package.json + Vite (build system) | Alta |
| 9 | Tests unitarios con Vitest | Alta |
| 10 | Motor headless ESM (ejecutable en Node) | Media |
| 11 | GitHub Actions CI | Media |

### Fase 3: Producto (continuo)

| # | Tarea | Prioridad |
|---|-------|-----------|
| 12 | Vista comparativa cierre vs prórroga en UI | Alta |
| 13 | Documentar todas las constantes con fuentes | Media |

---

## 7. Tabla resumen de hallazgos

| ID | Severidad | Área | Problema | Acción | Estado |
|----|-----------|------|----------|--------|--------|
| H1 | 🟡 Medio | Calidad | Factor 1.35 en weather.js sin documentar | Documentar o eliminar | Pendiente |
| H2 | 🟡 Medio | Dato | FC_HISTORICOS solar=0.18, eolica=0.24 desactualizados | Actualizar a 0.24/0.20 | Pendiente |
| H3 | 🟡 Bajo | Reproducibilidad | _hidroEmbalseUsadoGWh no se resetea | Inicializar al inicio de simular() | Pendiente |
| H4 | 🟡 Bajo | Dato | Escenario 0 "Datos 2025" usa año 2026 | Documentar o corregir | Pendiente |
| R4 | 🟠 Alto | Rigor | Sin test de calibración 2025 | Crear con Vitest | Pendiente |
| A1 | 🟠 Alto | Ingeniería | Sin tests unitarios | Implementar Vitest | Pendiente |
| A2 | 🟠 Alto | Ingeniería | Sin package.json/Vite | Crear build system | Pendiente |
| A3 | 🟡 Medio | Ingeniería | Sin GitHub Actions CI | Configurar lint+tests+deploy | Pendiente |

---

## 8. Conclusión

El Sistema Eléctrico Futuro v3.4 es un proyecto **sólido y técnicamente defensible** para una herramienta exploratoria. Los problemas críticos de la v3.1 han sido resueltos, y el motor de simulación ahora implementa un despacho real por orden de mérito con datos calibrados.

Los hallazgos residuales son de **severidad media-baja** y no comprometen la validez de los resultados para el uso previsto (análisis exploratorio de escenarios). Las mejoras recomendadas son:

1. **Inmediato:** Actualizar FC_HISTORICOS y documentar weather.js
2. **Corto plazo:** Tests de calibración y build system
3. **Medio plazo:** CI/CD y motor headless

**El proyecto responde excelentemente a su pregunta original** sobre el impacto del cierre nuclear, con escenarios ceteris paribus que permiten comparación directa.

---

*Auditoría generada por Koldo — 1 de junio 2026*
