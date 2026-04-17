# Supuestos de Politica y Mercado

## Objetivo

Documentar que palancas regulatorias estan modeladas en la v3 y como afectan al resultado.

## 1. Tope iberico

- se modela como un techo al precio marginal del gas cuando hay CCGT en el margen
- se anade una compensacion al consumidor en funcion de la diferencia entre el marginal original y el techo
- no pretende replicar toda la liquidacion real del mecanismo iberico

## 2. CfDs renovables

- solar, eolica terrestre y offshore pueden cobrar por encima del spot si el strike es mayor
- el diferencial se traslada al coste del sistema
- offshore usa un strike mayor que el de la renovable terrestre por su estructura de coste

## 3. Peajes dinamicos

- se sustituyen los cargos planos por franjas P1, P2 y P3
- la asignacion horaria es simplificada y orientativa
- sirve para tensionar el efecto de desplazar demanda o carga VE

## 4. Pago por capacidad

- remunera potencia firme de CCGT y almacenamiento
- no altera directamente el spot
- se incorpora al coste anual agregado del sistema

## 5. PVPC y ajustes regulados

- se aplica como una pequena capa adicional sobre el precio final
- representa comercializacion regulada y pequenos ajustes no marginalistas

## 6. Prorroga nuclear

- no es una politica de mercado sino una decision de parque
- su efecto se ve en menor gas marginal, menos emisiones y menor tension en horas de inercia

## 7. Ley de Cambio Climatico

- se interpreta como una senda que favorece despliegue renovable, electrificacion y reduccion estructural de emisiones
- su efecto detallado no esta hardcodeado como una unica formula, sino distribuido entre rampas de capacidad y demanda sectorial

## 8. Limitaciones

- no se modelan impuestos, cargos fiscales o liquidaciones de capacidad con exactitud regulatoria
- no se implementan subastas ni contratos bilaterales reales por agente
- el modulo es util para comparativa de sensibilidad, no para auditoria regulatoria formal
