/**
 * ============================================================================
 *  CONSTANTES DEL SISTEMA ELÉCTRICO ESPAÑOL
 * ============================================================================
 *  Datos de referencia 2025, objetivos PNIEC 2030, factores de emisión,
 *  costes de referencia y parámetros del modelo de simulación.
 *
 *  Fuentes oficiales:
 *    - REE (Red Eléctrica de España): datos de demanda y generación
 *    - OMIE: precios del mercado diario
 *    - MITECO: PNIEC (Plan Nacional Integrado de Energía y Clima)
 *    - CNMC: peajes y cargos regulados
 *    - ENTSO-E: interconexiones europeas
 *    - EU ETS: precios de CO₂
 *
 *  Autor: David Antizar
 * ============================================================================
 */

'use strict';

const SEF = window.SEF || {};
window.SEF = SEF;

// ── Datos reales de España 2025 ─────────────────────────────────────────────
SEF.DATOS_2025 = Object.freeze({
    nuclear:      7.0,     // GW instalados
    nuclearTWh:  51.9,     // TWh generados
    solar:       24.0,     // GW instalados
    solarTWh:    52.5,     // TWh generados
    eolica:      31.0,     // GW instalados
    eolicaTWh:   55.6,     // TWh generados
    hidraulica:  17.0,     // GW instalados
    hidroTWh:    37.6,     // TWh generados
    gas:         24.0,     // GW instalados (CCGT)
    gasTWh:      52.1,     // TWh generados
    demanda:     260,      // TWh demanda anual peninsular
    precioMedio:  65,      // €/MWh media OMIE
    emisiones:    38,      // Mt CO₂ del sector eléctrico
    renovables:   56       // % del mix de generación
});

// ── Objetivos PNIEC 2030 ────────────────────────────────────────────────────
SEF.PNIEC_2030 = Object.freeze({
    renovablesGeneracion:   74,    // % de renovables en generación eléctrica
    emisionesMax:          35,    // Mt CO₂ techo sector eléctrico
    solarGW:               76,    // GW de solar FV instalados
    eolicaGW:              62,    // GW de eólica instalada
    almacenamientoGW:      22,    // GW de almacenamiento (baterías + bombeo)
    demandaTWh:           280,    // TWh demanda prevista
    interconexionPct:      15,    // % de ratio de interconexión
    eficienciaEnergetica:  39.5   // % mejora de eficiencia energética
});

// ── Parámetros del modelo de simulación ─────────────────────────────────────
SEF.MODEL = Object.freeze({
    HORAS_ANIO:         8760,
    LATITUD_ESPANA:     40.4,       // grados N (Madrid, representativa)
    FACTOR_CO2_GAS:     0.202,      // tCO₂ por MWh térmico de gas natural
    EFICIENCIA_BAT:     0.90,       // round-trip baterías Li-ion
    EFICIENCIA_BOMBEO:  0.75,       // round-trip bombeo hidráulico
    FC_NUCLEAR:         0.90,       // factor de capacidad nuclear
    AUTODESCARGA_BAT:   0.001,      // % por hora
    RAMPA_CCGT:         0.15,       // GW/hora rampa máxima por unidad
    MIN_ESTABLE_CCGT:   0.40,       // % de potencia mínima estable
    INERCIA_MIN_GW:     3.0,        // GW mínimos síncronos para estabilidad
});

// ── Temperaturas medias mensuales (Madrid, °C) ─────────────────────────────
SEF.TEMP_MENSUAL = Object.freeze([
    6.3, 7.9, 11.2, 13.7, 17.6, 23.4, 27.0, 26.4, 21.8, 15.8, 10.1, 6.9
]);

// ── Factores de capacidad históricos (España) ───────────────────────────────
SEF.FC_HISTORICOS = Object.freeze({
    nuclear: 0.90,
    solar:   0.18,    // horas equivalentes ~1580 h/año
    eolica:  0.24,    // horas equivalentes ~2100 h/año
    hidro:   0.20,    // muy variable por hidraulicidad
});

// ── Costes de referencia 2025 (€/MWh, LCOE) ────────────────────────────────
SEF.COSTES_REF = Object.freeze({
    nuclear:     35,
    solarFV:     28,
    eolica:      32,
    hidro:       40,
    ccgt:        85,     // variable, depende de gas y CO₂
    baterias:    55,     // LCOS (€/MWh almacenado y descargado)
    bombeo:      45,
});

// ── Colores del sistema para gráficos ───────────────────────────────────────
SEF.COLORES = Object.freeze({
    nuclear:   { fill: 'rgba(239, 68, 68, 0.85)',  line: '#ef4444', label: '#fca5a5' },
    solar:     { fill: 'rgba(250, 204, 21, 0.85)', line: '#facc15', label: '#fde68a' },
    eolica:    { fill: 'rgba(34, 197, 94, 0.85)',   line: '#22c55e', label: '#86efac' },
    hidro:     { fill: 'rgba(59, 130, 246, 0.85)',  line: '#3b82f6', label: '#93c5fd' },
    gas:       { fill: 'rgba(148, 163, 184, 0.85)', line: '#94a3b8', label: '#cbd5e1' },
    baterias:  { fill: 'rgba(168, 85, 247, 0.85)',  line: '#a855f7', label: '#d8b4fe' },
    bombeo:    { fill: 'rgba(139, 92, 246, 0.50)',   line: '#8b5cf6', label: '#c4b5fd' },
    vertido:   { fill: 'rgba(251, 146, 60, 0.50)',   line: '#fb923c', label: '#fdba74' },
    deficit:   { fill: 'rgba(239, 68, 68, 0.30)',   line: '#ef4444', label: '#fca5a5' },
    demanda:   { fill: 'rgba(255,255,255,0.0)',      line: '#f8fafc', label: '#f8fafc' },
    importar:  { fill: 'rgba(6, 182, 212, 0.70)',    line: '#06b6d4', label: '#67e8f9' },
    exportar:  { fill: 'rgba(20, 184, 166, 0.50)',   line: '#14b8a6', label: '#5eead4' },
    precio:    { fill: 'rgba(0, 245, 212, 0.20)',    line: '#00f5d4', label: '#00f5d4' },
    ref2025:   { line: '#fbbf24', label: '#fbbf24' },
});

// ── Layout base de Plotly ───────────────────────────────────────────────────
SEF.PLOTLY_LAYOUT_BASE = Object.freeze({
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor:  'rgba(0,0,0,0)',
    font:          { family: 'Inter, system-ui, sans-serif', color: '#94a3b8', size: 10 },
    margin:        { t: 25, r: 15, b: 45, l: 55 },
    hovermode:     'x unified',
    hoverlabel:    { bgcolor: 'rgba(15,23,42,0.95)', bordercolor: 'rgba(148,163,184,0.3)',
                     font: { family: 'Inter, system-ui', size: 11, color: '#e2e8f0' } },
    legend:        { orientation: 'h', y: -0.18, font: { size: 9 },
                     bgcolor: 'rgba(0,0,0,0)', borderwidth: 0 },
    xaxis:         { gridcolor: 'rgba(148,163,184,0.08)', zerolinecolor: 'rgba(148,163,184,0.15)' },
    yaxis:         { gridcolor: 'rgba(148,163,184,0.08)', zerolinecolor: 'rgba(148,163,184,0.15)' },
});

// ── Parámetros por defecto del simulador ────────────────────────────────────
SEF.PARAMS_DEFAULT = Object.freeze({
    nuclear:            7.0,
    solar:             25.0,
    eolica:            31.0,
    hidraulica:        17.0,
    ccgt:              24.0,
    bateriasPotencia:   3.0,
    bateriasCapacidad: 10,
    bombeo:             3.5,
    bombeoCapacidad:   30,
    precioGas:         42,
    precioCO2:         65,
    rendimientoCCGT:    0.55,
    omCCGT:             3.0,
    cargosSistema:     12.0,
    perdidasRed:        0.05,
    semilla:           42,
    demandaAnual:     260,
    hidraulicidad:      1.0,
    anioObjetivo:    2030,
    crecimientoDemanda: 0.6,
    electrificacionTWh: 2.0,
    eficienciaDemanda:  0.5,
    aplicarPlanNuclear: true,
    cierreNuclear:   2035,
    flexibilidadGW:     4.0,
    flexibilidadPct:    6,
    interconexion:      3.0,
    precioImport:      90,
    precioExport:       5,
    precioEscasez:    350,
});

// ── Nombres de meses en español ─────────────────────────────────────────────
SEF.MESES = Object.freeze([
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
]);

SEF.DIAS_SEMANA = Object.freeze(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
