/**
 * ============================================================================
 *  CONSTANTES DEL SISTEMA ELECTRICO ESPANOL
 * ============================================================================
 *  Datos de referencia 2025, objetivos PNIEC, costes, colores y parametros
 *  base para el simulador anual y la trayectoria 2026-2035.
 * ============================================================================
 */

'use strict';

const SEF = window.SEF || {};
window.SEF = SEF;

SEF.Utils = Object.freeze({
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    lerp(a, b, t) {
        return a + (b - a) * t;
    },
    sum(values) {
        let total = 0;
        for (let i = 0; i < values.length; i++) total += values[i];
        return total;
    },
    normalizeSeries(series, targetGWh) {
        const total = this.sum(series);
        const factor = total > 0 ? targetGWh / total : 0;
        const out = new Float64Array(series.length);
        for (let i = 0; i < series.length; i++) out[i] = series[i] * factor;
        return out;
    },
    SeededRNG: class SeededRNG {
        constructor(seed) {
            this.seed = Number.isFinite(seed) ? seed : 42;
        }
        next() {
            this.seed = Math.sin(this.seed * 9301 + 49297) * 49271;
            return this.seed - Math.floor(this.seed);
        }
        gauss(mean = 0, sigma = 1) {
            const u1 = Math.max(1e-10, this.next());
            const u2 = this.next();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            return mean + sigma * z;
        }
    },
});

SEF.DATOS_2025 = Object.freeze({
    nuclear: 7.0,
    nuclearTWh: 51.9,
    solar: 24.7,
    solarTWh: 52.5,
    eolica: 31.6,
    offshore: 0.0,
    eolicaTWh: 55.6,
    hidraulica: 17.1,
    hidroTWh: 37.6,
    gas: 24.0,
    gasTWh: 52.1,
    demanda: 248,
    precioMedio: 63,
    emisiones: 36,
    renovables: 56,
    autoconsumoGW: 8.2,
    veParqueMiles: 650,
    bombaCalorStockMiles: 2200,
    horasSinGas: 1620,
});

SEF.PNIEC_2030 = Object.freeze({
    renovablesGeneracion: 81,
    emisionesMax: 20,
    solarGW: 81,
    eolicaGW: 62,
    offshoreGW: 3,
    almacenamientoGW: 22,
    demandaTWh: 295,
    interconexionPct: 15,
});

SEF.MODEL = Object.freeze({
    HORAS_ANIO: 8760,
    BASE_ANIO: 2026,
    LATITUD_ESPANA: 40.4,
    FACTOR_CO2_GAS: 0.202,
    FC_NUCLEAR: 0.90,
    EFICIENCIA_BAT: 0.90,
    EFICIENCIA_BOMBEO: 0.75,
    AUTODESCARGA_BAT: 0.001,
    RAMPA_CCGT: 0.15,
    MIN_ESTABLE_CCGT: 0.40,
    INERCIA_MIN_GW: 3.0,
    RESERVA_RODANTE_PCT: 4.0,
    TWH_POR_MT_H2: 52,
    VEHICULOS_PARC_TOTAL_M: 30,
    VEHICULO_KM_ANIO: 11000,
    VEHICULO_KWH_KM: 0.17,
    BOMBAS_CALOR_TWH_MAX: 24,
});

SEF.TEMP_MENSUAL = Object.freeze([
    6.3, 7.9, 11.2, 13.7, 17.6, 23.4, 27.0, 26.4, 21.8, 15.8, 10.1, 6.9,
]);

SEF.FC_HISTORICOS = Object.freeze({
    nuclear: 0.90,
    solar: 0.18,
    eolica: 0.24,
    offshore: 0.43,
    hidro: 0.20,
});

SEF.COSTES_REF = Object.freeze({
    nuclear: 42,
    solarFV: 31,
    eolica: 36,
    offshore: 62,
    hidro: 44,
    ccgt: 92,
    baterias: 68,
    bombeo: 52,
    importacion: 90,
});

SEF.COLORES = Object.freeze({
    nuclear: { fill: 'rgba(239, 68, 68, 0.76)', line: '#dc2626', label: '#ef4444' },
    solar: { fill: 'rgba(245, 158, 11, 0.76)', line: '#f59e0b', label: '#f59e0b' },
    eolica: { fill: 'rgba(34, 197, 94, 0.72)', line: '#16a34a', label: '#16a34a' },
    offshore: { fill: 'rgba(20, 184, 166, 0.68)', line: '#0f766e', label: '#14b8a6' },
    hidro: { fill: 'rgba(37, 99, 235, 0.72)', line: '#2563eb', label: '#2563eb' },
    gas: { fill: 'rgba(100, 116, 139, 0.72)', line: '#475569', label: '#64748b' },
    baterias: { fill: 'rgba(124, 58, 237, 0.70)', line: '#7c3aed', label: '#8b5cf6' },
    bombeo: { fill: 'rgba(59, 130, 246, 0.32)', line: '#3b82f6', label: '#60a5fa' },
    vertido: { fill: 'rgba(251, 146, 60, 0.42)', line: '#f97316', label: '#fb923c' },
    deficit: { fill: 'rgba(239, 68, 68, 0.18)', line: '#ef4444', label: '#ef4444' },
    importar: { fill: 'rgba(6, 182, 212, 0.64)', line: '#0891b2', label: '#06b6d4' },
    exportar: { fill: 'rgba(20, 184, 166, 0.32)', line: '#14b8a6', label: '#14b8a6' },
    precio: { fill: 'rgba(37, 99, 235, 0.12)', line: '#2563eb', label: '#2563eb' },
    ref2025: { line: '#f59e0b', label: '#f59e0b' },
    h2: { fill: 'rgba(249, 115, 22, 0.54)', line: '#ea580c', label: '#f97316' },
});

SEF.PLOTLY_LAYOUT_BASE = Object.freeze({
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter, system-ui, sans-serif', color: '#475569', size: 11 },
    margin: { t: 24, r: 12, b: 42, l: 56 },
    hovermode: 'x unified',
    hoverlabel: {
        bgcolor: 'rgba(15,23,42,0.92)',
        bordercolor: 'rgba(148,163,184,0.24)',
        font: { family: 'Inter, system-ui, sans-serif', size: 11, color: '#f8fafc' },
    },
    legend: {
        orientation: 'h',
        y: -0.22,
        bgcolor: 'rgba(0,0,0,0)',
        borderwidth: 0,
        font: { size: 10 },
    },
    xaxis: {
        gridcolor: 'rgba(148,163,184,0.12)',
        zerolinecolor: 'rgba(148,163,184,0.18)',
    },
    yaxis: {
        gridcolor: 'rgba(148,163,184,0.12)',
        zerolinecolor: 'rgba(148,163,184,0.18)',
    },
});

SEF.PARAMS_DEFAULT = Object.freeze({
    nuclear: 7.0,
    solar: 48.0,
    eolica: 41.0,
    eolicaOffshore: 0.5,
    hidraulica: 17.0,
    ccgt: 24.0,
    bateriasPotencia: 4.0,
    bateriasCapacidad: 16,
    bombeo: 3.5,
    bombeoCapacidad: 30,
    precioGas: 42,
    precioCO2: 70,
    rendimientoCCGT: 0.57,
    omCCGT: 3.2,
    cargosSistema: 10.5,
    perdidasRed: 0.045,
    semilla: 42,
    demandaAnual: 248,
    hidraulicidad: 1.0,
    anioObjetivo: 2030,
    crecimientoDemanda: 0.9,
    electrificacionTWh: 2.5,
    eficienciaDemanda: 0.6,
    aplicarPlanNuclear: true,
    cierreNuclear: 2035,
    prorrogaNuclear: false,
    prorrogaGlobal: 0,
    flexibilidadGW: 4.5,
    flexibilidadPct: 6,
    interconexion: 3.2,
    precioImport: 95,
    precioExport: 8,
    precioEscasez: 450,
    solarRampaGW_anio: 4.5,
    eolicaTerrestreRampa: 2.4,
    eolicaOffshoreRampa: 0.3,
    bateriasRampaGW_anio: 1.2,
    bateriasDuracionH: 4,
    interconexionRampaGW_anio: 0.25,
    nuevaLineaFrancia_anio: 2028,
    vePorcentajeParque: 12,
    smartChargingPct: 45,
    v2gPct: 6,
    bombaCalorPct: 18,
    industriaElectrificacionTWh: 3,
    h2ObjetivoMt: 0.2,
    h2FlexibilidadHoras: 10,
    autoconsumoFV_GW: 8,
    topeIbericoActivo: false,
    topeIbericoAnios: 2,
    mecanismoCapacidad_euro_kW: 12,
    cfdActivo: true,
    cfdRenovables_strike: 58,
    peajesDinamicosActivos: true,
    peajeP1: 17,
    peajeP2: 11,
    peajeP3: 6,
    pvpcActivo: true,
    sequiaClusterAnios: 0,
    variabilidadInteranualPct: 8,
    inerciaMinGW: 3,
    reservaRodantePct: 4,
    leyCambioClimaticoActiva: true,
    eventoApagonPct: 0,
    olaCalorExtrema: false,
});

SEF.MESES = Object.freeze([
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]);

SEF.DIAS_SEMANA = Object.freeze(['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']);
