# Metodologia del Simulador v3

## Alcance

El simulador modela el sistema electrico peninsular espanol como una herramienta exploratoria y comparativa. No pretende reemplazar modelos operativos oficiales de REE, ESIOS o MITECO.

La v3 introduce dos modos:

- simulacion anual de 8.760 horas para un anio objetivo concreto
- trayectoria 2026-2035 con estado persistente entre anios

## 1. Produccion renovable y clima

### Solar FV

La generacion solar se calcula a partir de geometria solar real:

- declinacion solar de Cooper
- angulo horario por hora del dia
- elevacion solar para latitud representativa de 40.4 N
- transmitancia atmosferica simplificada
- nubosidad estocastica por hora

En escenarios de ola de calor extrema se aplica una penalizacion adicional de rendimiento de paneles.

### Eolica

La eolica usa persistencia horaria con autocorrelacion y modulacion estacional. La eolica marina reutiliza la serie del viento, pero con un factor de disponibilidad mas estable y mayor factor de capacidad.

### Clima multi-anio

`weather.js` genera variabilidad interanual:

- hidraulicidad anual con proceso AR(1)
- clustes de sequia configurables
- perturbacion meteorologica anual reproducible por semilla
- shock de inestabilidad tipo apagones ibericos

## 2. Demanda sectorial

La demanda ya no es una unica curva agregada. La v3 descompone:

- residencial
- servicios
- industrial
- vehiculo electrico
- bombas de calor
- electrolisis de H2 verde
- autoconsumo FV detras del contador

Cada sector tiene un perfil horario propio y se normaliza a su energia anual objetivo.

El autoconsumo no entra al pool como generacion de mercado: reduce la demanda neta residual.

## 3. Calendario nuclear

La disponibilidad nuclear delega en `nuclear.js` y usa el calendario ENRESA como referencia:

- Almaraz I 2027
- Almaraz II 2028
- Asco I 2030
- Cofrentes 2030
- Asco II 2031
- Vandellos II 2032
- Trillo 2035

La UI permite activar prorrogas globales para explorar escenarios alternativos.

## 4. Despacho horario

El orden de despacho base es:

1. nuclear
2. solar FV
3. eolica terrestre
4. eolica marina
5. carga de almacenamiento y absorcion flexible si hay excedente
6. hidraulica gestionable si hay deficit
7. descarga de baterias y bombeo
8. V2G nocturno
9. reduccion flexible de demanda
10. importaciones
11. gas CCGT

Se incluyen restricciones operativas nuevas:

- rampa de CCGT
- minimo sincronico de inercia
- reserva rodante como porcentaje de la demanda efectiva

## 5. Almacenamiento y V2G

`storage.js` modela:

- baterias con degradacion por ciclos y calendario
- eficiencia dependiente del C-rate
- bombeo con reserva estacional
- descarga V2G ligada al parque VE en ventana nocturna

Las baterias cargan con excedentes y descargan antes que el gas, manteniendo una reserva minima de estado de carga.

## 6. Precio y politica energetica

La base del precio sigue siendo marginalista:

`coste_CCGT = gas / rendimiento + CO2 / rendimiento + O&M`

Sobre el precio marginal se aplican capas politicas desde `policy.js`:

- tope iberico al gas
- peajes dinamicos P1/P2/P3
- PVPC y ajustes regulados
- pagos por capacidad
- CfDs renovables con strike especifico para offshore

El resultado final se usa para:

- precio medio simple
- precio medio ponderado por demanda servida
- curva de duracion
- coste agregado del sistema

## 7. Trayectoria 2026-2035

`trajectory.js` recalcula parametros por anio:

- rampas de solar, eolica, offshore, baterias e interconexion
- crecimiento del parque VE y bombas de calor
- acumulacion del objetivo de H2 verde
- degradacion de almacenamiento entre anios
- disponibilidad nuclear segun calendario real o prorroga

La simulacion se rebanada por anio con `setTimeout(0)` para no bloquear la UI.

## 8. Indicadores calculados

- precio medio simple y ponderado
- percentiles P10, P50, P90
- cobertura renovable primaria
- dependencia del gas sobre generacion primaria
- emisiones anuales
- vertidos renovables y su porcentaje sobre VRE
- horas de deficit
- horas sin gas
- horas de inercia critica
- coste total del sistema
- LCOE y LCOS aproximados

## 9. Limitaciones conocidas

- no modela red nodal ni congestiones internas por zonas
- no replica el mercado de servicios de ajuste real con detalle reglamentario
- usa hipotesis sinteticas para autoconsumo, VE y H2
- no sustituye series oficiales ni previsiones regulatorias

## 10. Verificacion recomendada

- comparar `Datos Reales 2025` con magnitudes observadas de REE y OMIE
- revisar `Autoconsumo 30 GW` para confirmar que la demanda neta nunca baja de cero
- revisar `Hidrogeno Verde` para validar absorcion de excedentes
- revisar `Cierre Nuclear ENRESA` y `Ley Climatico 2050` para confirmar la senda 2026-2035
