# Supuestos de Política y Mercado

## Objetivo

Documentar qué palancas regulatorias están modeladas en la v3 y cómo afectan al resultado.

## 1. Tope ibérico

- se modela como un techo al precio marginal del gas cuando hay CCGT en el margen
- se añade una compensación al consumidor en función de la diferencia entre el marginal original y el techo
- no pretende replicar toda la liquidación real del mecanismo ibérico

## 2. CfDs renovables

- solar, eólica terrestre y offshore pueden cobrar por encima del spot si el strike es mayor
- el diferencial se traslada al coste del sistema
- offshore usa un strike mayor que el de la renovable terrestre por su estructura de coste

## 3. Peajes dinámicos

- se sustituyen los cargos planos por franjas P1, P2 y P3
- la asignación horaria es simplificada y orientativa
- sirve para tensionar el efecto de desplazar demanda o carga VE

## 4. Pago por capacidad

- remunera potencia firme de CCGT y almacenamiento
- no altera directamente el spot
- se incorpora al coste anual agregado del sistema

## 5. PVPC y ajustes regulados

- se aplica como una pequeña capa adicional sobre el precio final
- representa comercialización regulada y pequeños ajustes no marginalistas

## 6. Prórroga nuclear

- no es una política de mercado sino una decisión de parque
- su efecto se ve en menor gas marginal, menos emisiones y menor tensión en horas de inercia

## 7. Ley de Cambio Climático

- se interpreta como una senda que favorece despliegue renovable, electrificación y reducción estructural de emisiones
- su efecto detallado no está codificado como una única fórmula, sino distribuido entre rampas de capacidad y demanda sectorial

## 8. Limitaciones

- no se modelan impuestos, cargos fiscales o liquidaciones de capacidad con exactitud regulatoria
- no se implementan subastas ni contratos bilaterales reales por agente
- el módulo es útil para comparativa de sensibilidad, no para auditoría regulatoria formal
