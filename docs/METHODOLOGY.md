# 📐 Metodología del Simulador

## 1. Modelo Solar

El factor de capacidad solar se calcula hora a hora usando geometría solar real:

- **Declinación solar** (ecuación de Cooper):  
  δ = 23.45° × sin(360° × (284 + día) / 365)

- **Ángulo horario**:  
  ω = (hora - 12) × 15°

- **Elevación solar**:  
  sin(α) = sin(φ) × sin(δ) + cos(φ) × cos(δ) × cos(ω)  
  donde φ = 40.4°N (latitud representativa de España)

- **Masa de aire** (Air Mass):  
  AM = 1 / sin(α)

- **Transmitancia atmosférica** (Hottel simplificado):  
  τ = 0.75 × 0.70^(AM^0.678)

- **Factor de nubosidad**: variable estocástica [0.65, 1.0] por hora

## 2. Modelo Eólico

El viento se modela con persistencia meteorológica:

- **Bloques sinópticos** de 2-7 días de duración con intensidad variable
- **Autocorrelación** α = 0.94 (fuerte persistencia hora a hora)
- **Estacionalidad**: más viento en invierno (~28% base + 14% cos(mes))
- **Variación diurna**: ±8% con pico vespertino por convección
- **Innovación gaussiana** σ = 0.06 por hora

## 3. Modelo de Demanda

La demanda incorpora sensibilidad a temperatura:

- **Perfil horario**: doble pico español (10h mañana, 20h tarde/noche)
- **Base nocturna**: 62% de la demanda media
- **Factor laboralidad**: laborables ×1.04, fines de semana ×0.87
- **Temperatura**: curva en U con umbrales:
  - T < 15°C → +1.3%/°C (calefacción)
  - T > 25°C → +1.8%/°C (refrigeración)
- **Ruido residual**: ±3% estocástico

## 4. Despacho de Generación (Merit Order)

Orden de despacho hora a hora:

1. **Nuclear**: GW_instalados × 0.90 (inflexible)
2. **Solar**: GW_instalados × factor_solar(hora)
3. **Eólica**: GW_instalados × factor_viento(hora)

Si generación base > demanda (EXCEDENTE):
4. Cargar baterías (η = 90%)
5. Cargar bombeo hidráulico (η = 75%)
6. Flexibilidad al alza (power-to-X)
7. Exportar por interconexión
8. Vertido (energía perdida)

Si generación base < demanda (DÉFICIT):
4. Hidráulica gestionable
5. Descargar baterías
6. Descargar bombeo (turbinación)
7. Flexibilidad a la baja (reducción demanda)
8. Importar por interconexión
9. Gas CCGT (con limitación de rampa)

## 5. Formación de Precios

Sistema marginalista (OMIE):

**Coste marginal CCGT:**
```
C_CCGT = (P_gas / η_CCGT) + (0.202 / η_CCGT) × P_CO2 + OM_CCGT
```

**Precio marginal:**
- ratio_VRE > 1.20 → precio = max(-20, 5 - exceso × 45) (negativo)
- ratio_VRE > 1.05 → precio = 5 + (1.2 - ratio) × 100 (bajo)
- Gas marginal → precio = C_CCGT + prima_estrés + prima_rampa
- Hidro marginal → precio = 25 + 25 × stress_hidro
- Solo renovable → precio = 6 + (1 - ratio) × 30

**Ajustes regulados:**
```
P_final = P_marginal × (1 + pérdidas_red) + cargos_peajes
```

**Límite superior**: escasez (VOLL) aplicado si déficit > 0.3 GW
**Rango**: [-25, 500] €/MWh

## 6. Indicadores Calculados

| Indicador | Fórmula |
|-----------|---------|
| Precio medio simple | Σ precios / 8760 |
| Precio medio ponderado | Σ (precio × demanda) / Σ demanda |
| Percentiles P10/P50/P90 | Interpolación lineal sobre precios ordenados |
| Cobertura renovable | (Solar + Eólica + Hidro) / Generación total × 100 |
| Dependencia gas | Gas / Generación total × 100 |
| Emisiones CO₂ | Σ (Gas_GW × 0.202 / η_CCGT) / 1000 en Mt |
| Vertidos | Energía renovable no absorbida en TWh |
| Horas déficit | Horas con demanda no cubierta > 0.3 GW |

## 7. Validación

Los resultados se validan contra datos reales de 2025:
- Nuclear: ~52 TWh (7 GW × 0.90 × 8760h / 1000)
- Solar: ~38 TWh (24 GW × 0.18 × 8760h / 1000)
- Eólica: ~65 TWh (31 GW × 0.24 × 8760h / 1000)
- Precio medio: ~60-70 €/MWh con mix actual

Nota: el simulador es una herramienta exploratoria, no un modelo de predicción. Los resultados dependen de las hipótesis y simplificaciones del modelo.
