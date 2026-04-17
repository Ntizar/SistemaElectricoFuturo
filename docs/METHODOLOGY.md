# Metodología del Simulador v3

## Alcance

El simulador modela el sistema eléctrico peninsular español como una herramienta exploratoria y comparativa. No pretende reemplazar modelos operativos oficiales de REE, ESIOS o MITECO.

La v3 introduce dos modos:

- simulación anual de 8.760 horas para un año objetivo concreto
- trayectoria 2026-2035 con estado persistente entre años

## 1. Producción renovable y clima

### Solar FV

La generación solar se calcula a partir de geometría solar real:

- declinación solar de Cooper: `δ = 23,45° · sin(360/365 · (284 + día))`
- ángulo horario por hora del día: `H = 15° · (hora − 12)`
- elevación solar para latitud representativa de 40,4 °N:
  `sin(α) = sin(φ)·sin(δ) + cos(φ)·cos(δ)·cos(H)`
- transmitancia atmosférica simplificada en función de la masa de aire
- nubosidad estocástica horaria con correlación temporal

La irradiancia efectiva se multiplica por la potencia instalada y por un factor de rendimiento de panel que puede degradarse en olas de calor extremo (coeficiente de temperatura típico −0,4 %/°C sobre 25 °C de referencia).

### Eólica

La eólica terrestre usa persistencia horaria con autocorrelación AR(1) y modulación estacional (mayor factor en invierno, mínimo en verano). La eólica marina reutiliza la serie del viento pero con mayor factor de capacidad y menor variabilidad.

### Clima multianual

`weather.js` genera variabilidad interanual:

- hidraulicidad anual con proceso AR(1) en torno a la media histórica
- clústeres de sequía configurables (varios años secos consecutivos)
- perturbación meteorológica anual reproducible por semilla
- shock de inestabilidad tipo apagón ibérico

## 2. Demanda sectorial

La demanda ya no es una única curva agregada. La v3 la descompone por sectores:

- residencial
- servicios
- industrial
- vehículo eléctrico
- bombas de calor
- electrólisis de H₂ verde
- autoconsumo FV detrás del contador

Cada sector tiene un perfil horario propio y se normaliza a su energía anual objetivo mediante `normalizeSeries(perfil, energia_GWh)`.

El autoconsumo se modela como reducción de demanda neta, no como generación de mercado:

`E_autoconsumo_TWh = P_instalada_GW · FC_solar · 8760 h / 1000 · η`

con `η = 0,88` (pérdidas inversor, orientación, suciedad, sombreado). El residuo nunca se fuerza por debajo de cero.

## 3. Calendario nuclear

La disponibilidad nuclear delega en `nuclear.js` y usa el calendario ENRESA como referencia:

- Almaraz I 2027
- Almaraz II 2028
- Ascó I 2030
- Cofrentes 2030
- Ascó II 2031
- Vandellós II 2032
- Trillo 2035

La UI permite activar prórrogas globales para explorar escenarios alternativos (10, 12 o 20 años adicionales).

## 4. Despacho horario

El orden de despacho base por orden de mérito es:

1. nuclear
2. solar FV
3. eólica terrestre
4. eólica marina
5. carga de almacenamiento y absorción flexible si hay excedente
6. hidráulica gestionable si hay déficit
7. descarga de baterías y bombeo
8. V2G nocturno
9. reducción flexible de demanda
10. importaciones
11. gas CCGT

Restricciones operativas incorporadas:

- rampa máxima de CCGT entre horas
- mínimo síncrono de inercia en GW
- reserva rodante como porcentaje de la demanda efectiva

## 5. Almacenamiento y V2G

`storage.js` modela:

- **Eficiencia round-trip dependiente del C-rate**:
  `η = 0,94 − 0,07 · (1/duración_h)`
  → 4 h: 92,5 % | 2 h: 90,5 % | 1 h: 87,0 %
- **Degradación**: `SoH = 1 − ciclos · 0,02/365` (pérdida del 2 % cada 365 ciclos equivalentes).
- **SoC máximo utilizable**: baterías 95 %, bombeo 100 % (el embalse sí puede llenarse por completo).
- **Bombeo con reserva estacional** para cubrir la punta seca de verano:
  abr-jun 60 %, sep-oct 55 %, jul-ago 28 %, ene-feb 35 %, resto 45 %.
- **V2G**: descarga nocturna proporcional al parque VE conectado y al porcentaje de participación configurado.

Las baterías cargan con excedentes renovables y descargan antes que el gas, manteniendo una reserva mínima de estado de carga del 10 %.

## 6. Precio y política energética

La base del precio sigue siendo marginalista. El coste variable del ciclo combinado marca precio cuando es la tecnología marginal:

`coste_CCGT (€/MWh) = precio_gas / η_CCGT + precio_CO2 · 0,35 / η_CCGT + O&M_variable`

Sobre el precio marginal se aplican capas políticas desde `policy.js`:

- tope ibérico al gas cuando el precio del gas supera el umbral
- peajes dinámicos P1/P2/P3 según franja horaria
- PVPC y ajustes regulados
- pagos por capacidad
- CfDs renovables con strike específico para eólica marina

El resultado final se usa para:

- precio medio simple y ponderado por demanda servida
- percentiles P10, P50 y P90
- curva de duración
- coste agregado anual del sistema

## 7. Trayectoria 2026-2035

`trajectory.js` recalcula parámetros año a año partiendo del estado del año anterior:

- rampas anuales de solar, eólica terrestre y marina, baterías e interconexión
- crecimiento del parque VE y bombas de calor
- acumulación del objetivo anual de H₂ verde
- degradación acumulada de almacenamiento entre años
- disponibilidad nuclear según calendario real o prórroga activa

La simulación se trocea por año con `setTimeout(0)` para no bloquear la UI.

## 8. Indicadores calculados

- precio medio simple y ponderado por demanda
- percentiles P10, P50 y P90
- cobertura renovable primaria
- dependencia del gas sobre generación primaria
- emisiones anuales de CO₂
- vertidos renovables y su porcentaje sobre VRE
- horas de déficit
- horas sin gas
- horas con inercia crítica
- coste total del sistema
- LCOE y LCOS aproximados

## 9. Limitaciones conocidas

- no modela red nodal ni congestiones internas por zonas
- no replica el mercado de servicios de ajuste con detalle reglamentario
- usa hipótesis sintéticas para autoconsumo, VE y H₂
- no sustituye series oficiales ni previsiones regulatorias

## 10. Verificación recomendada

- comparar `Datos Reales 2025` con magnitudes observadas de REE y OMIE
- revisar `Autoconsumo 30 GW` para confirmar que la demanda neta nunca baja de cero
- revisar `Hidrógeno Verde` para validar absorción de excedentes
- revisar `Cierre Nuclear ENRESA` y `Ley de Cambio Climático 2050` para confirmar la senda 2026-2035
