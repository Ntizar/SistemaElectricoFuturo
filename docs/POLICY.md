# Supuestos de Política y Regulación del Sector Eléctrico

## Objetivo

Documentar el marco normativo vigente que afecta al sistema eléctrico español y cómo se refleja en el simulador.

---

## 1. Marco Legal Principal

### Ley 24/2013 del Sector Eléctrico
- **Estado:** Vigente
- **Impacto:** Alto
- **Descripción:** Marco legal del sistema eléctrico español. Establece el régimen jurídico de generación, transporte, distribución, comercialización y servicios auxiliares. Define la organización del mercado mayorista, los mecanismos de ajuste y las reglas de acceso a las redes.

### Ley 7/2021 de Cambio Climático y Transición Energética
- **Estado:** Vigente
- **Impacto:** Muy Alto
- **Descripción:** Marco legal para la descarbonización de la economía española. Objetivo: neutralidad climática 2050, reducción de emisiones 65% para 2030 (vs. 1990), promoción de energías renovables y movilidad sostenible.

### RD 24/2022 de Autoconsumo
- **Estado:** Vigente
- **Impacto:** Alto
- **Descripción:** Regulación del autoconsumo de energía eléctrica. Suprime el "impuesto al sol", simplifica trámites administrativos, establece compensación de excedentes y elimina barreras al autoconsumo compartido.

---

## 2. Planificación Energética

### PNIEC 2024 Actualizado
- **Estado:** Aprobado (enero 2024)
- **Impacto:** Muy Alto
- **Objetivos clave:**
  - 81 GW de capacidad solar fotovoltaica para 2030
  - 62 GW de eólica terrestre + 3 GW offshore
  - 22 GW de almacenamiento
  - 74% de generación renovable para 2030
  - Reducción de emisiones 65% vs. 1990
  - Demanda eléctrica ~295 TWh
  - 6.3 millones de vehículos de cero emisiones

### Mecanismo de Capacidad 2025
- **Estado:** En vigor
- **Impacto:** Medio
- **Descripción:** Remuneración por disponibilidad de capacidad de generación y demanda flexible. Garantiza la seguridad de suministro del sistema mediante pagos por capacidad disponible.

---

## 3. Mecanismos de Mercado

### Tope ETS y Precio del CO₂
- **Estado:** Vigente
- **Impacto:** Alto
- **Descripción:** Sistema de comercio de derechos de emisión de la UE (ETS). El precio del CO₂ afecta directamente al coste marginal del gas y, por tanto, al precio eléctrico. En 2025-2026, el precio ronda los 70 €/t.

### Real Decreto-ley de Contratos por Diferencia (CfD)
- **Estado:** En desarrollo
- **Impacto:** Alto
- **Descripción:** Contratos por diferencia (CfD) para renovables. Estabiliza ingresos de generadores y desacopla precio minorista del spot. Los generadores reciben el precio de mercado más la diferencia si el precio de mercado es inferior al strike price.

---

## 4. Informes Oficiales de Referencia

### CNMC (Comisión Nacional de los Mercados y la Competencia)
- **Informe Anual del Mercado de Gas 2025** (dic. 2025)
- **Informe Anual del Mercado de Electricidad 2025** (dic. 2025)
- **Informe de Resultados del Sistema Eléctrico 2025** (REE, mar. 2026)
- **Índice Red Eléctrica - Marzo 2026** (may. 2026)

### REE (Red Eléctrica de España)
- **Datos en tiempo real:** demanda, generación, interconexiones
- **Informe Anual del Sistema Eléctrico**
- **Índice mensual de indicadores del sistema**

---

## 5. Limitaciones del Simulador

- No se modelan impuestos, cargos fiscales o liquidaciones de capacidad con exactitud regulatoria
- No se implementan subastas ni contratos bilaterales reales por agente
- Los datos de normativa se actualizan manualmente; para datos en tiempo real consultar fuentes oficiales
- El módulo es útil para comparativa de sensibilidad y análisis cualitativo, no para auditoría regulatoria formal

---

## 6. Fuentes Oficiales

- [REE - Red Eléctrica de España](https://www.ree.es/es/datos)
- [CNMC - Comisión Nacional de los Mercados y la Competencia](https://www.cnmc.es)
- [PNIEC 2024](https://www.gob.es/economia/pniec/)
- [BOE - Boletín Oficial del Estado](https://www.boe.es)
- [EU ETS](https://ec.europa.eu/clima/eu-action/eu-emissions-trading-system-eu-ets_en)
