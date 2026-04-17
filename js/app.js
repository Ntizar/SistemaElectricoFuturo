/**
 * ============================================================================
 *  APLICACION VUE 3 - Sistema Electrico Futuro v3
 * ============================================================================
 */

'use strict';

(function() {
    const { createApp, ref, reactive, computed, onMounted, nextTick, watch } = Vue;

    const SIDE_TABS = [
        { id: 'escenarios', label: 'Escenarios' },
        { id: 'modelo', label: 'Modelo' },
        { id: 'politica', label: 'Legislacion' },
        { id: 'pniec', label: 'PNIEC' },
        { id: 'guia', label: 'Guia' },
    ];

    const MAIN_TABS = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'analisis', label: 'Analisis' },
        { id: 'trayectoria', label: 'Trayectoria' },
    ];

    const WEEK_OPTIONS = [
        { value: 2, label: 'Ene' },
        { value: 10, label: 'Mar' },
        { value: 25, label: 'Jun' },
        { value: 35, label: 'Sep' },
        { value: 45, label: 'Nov' },
    ];

    const MODEL_GROUPS = [
        {
            title: 'Capacidad instalada',
            hint: 'La trayectoria usa estas potencias como base y luego aplica las rampas anuales.',
            controls: [
                { key: 'nuclear', label: 'Nuclear', min: 0, max: 10, step: 0.1, unit: 'GW', decimals: 1 },
                { key: 'solar', label: 'Solar FV', min: 0, max: 150, step: 1, unit: 'GW' },
                { key: 'eolica', label: 'Eolica terrestre', min: 0, max: 110, step: 1, unit: 'GW' },
                { key: 'eolicaOffshore', label: 'Eolica marina', min: 0, max: 15, step: 0.1, unit: 'GW', decimals: 1 },
                { key: 'hidraulica', label: 'Hidraulica', min: 0, max: 25, step: 0.5, unit: 'GW', decimals: 1 },
                { key: 'ccgt', label: 'CCGT', min: 0, max: 40, step: 0.5, unit: 'GW', decimals: 1 },
            ],
        },
        {
            title: 'Almacenamiento y flexibilidad',
            hint: 'Baterias y bombeo ahora degradan capacidad y V2G aporta descarga nocturna si hay parque VE.',
            controls: [
                { key: 'bateriasPotencia', label: 'Baterias potencia', min: 0, max: 60, step: 0.5, unit: 'GW', decimals: 1 },
                { key: 'bateriasCapacidad', label: 'Baterias capacidad', min: 0, max: 220, step: 1, unit: 'GWh' },
                { key: 'bateriasDuracionH', label: 'Duracion baterias', min: 1, max: 10, step: 0.5, unit: 'h', decimals: 1 },
                { key: 'bombeo', label: 'Bombeo potencia', min: 0, max: 18, step: 0.5, unit: 'GW', decimals: 1 },
                { key: 'bombeoCapacidad', label: 'Bombeo capacidad', min: 0, max: 120, step: 1, unit: 'GWh' },
                { key: 'flexibilidadGW', label: 'Flexibilidad instantanea', min: 0, max: 20, step: 0.5, unit: 'GW', decimals: 1 },
                { key: 'flexibilidadPct', label: 'Demanda gestionable', min: 0, max: 25, step: 1, unit: '%', decimals: 0 },
            ],
        },
        {
            title: 'Demanda sectorial 2030+',
            hint: 'Incluye electrificacion del transporte, bombas de calor, industria y electrolisis.',
            controls: [
                { key: 'demandaAnual', label: 'Demanda base', min: 220, max: 320, step: 1, unit: 'TWh' },
                { key: 'crecimientoDemanda', label: 'Crecimiento anual', min: -1, max: 3, step: 0.1, unit: '%/anio', decimals: 1 },
                { key: 'electrificacionTWh', label: 'Electrificacion extra', min: 0, max: 10, step: 0.2, unit: 'TWh/anio', decimals: 1 },
                { key: 'eficienciaDemanda', label: 'Eficiencia y ahorro', min: 0, max: 8, step: 0.2, unit: '%', decimals: 1 },
                { key: 'vePorcentajeParque', label: 'Parque VE electrificado', min: 0, max: 50, step: 1, unit: '%', decimals: 0 },
                { key: 'smartChargingPct', label: 'Carga inteligente VE', min: 0, max: 100, step: 1, unit: '%', decimals: 0 },
                { key: 'v2gPct', label: 'V2G activo', min: 0, max: 30, step: 1, unit: '%', decimals: 0 },
                { key: 'bombaCalorPct', label: 'Bombas de calor', min: 0, max: 60, step: 1, unit: '%', decimals: 0 },
                { key: 'industriaElectrificacionTWh', label: 'Industria electrificada', min: 0, max: 15, step: 0.5, unit: 'TWh', decimals: 1 },
                { key: 'h2ObjetivoMt', label: 'H2 verde objetivo', min: 0, max: 1.5, step: 0.05, unit: 'Mt', decimals: 2 },
                { key: 'h2FlexibilidadHoras', label: 'Flexibilidad electrolisis', min: 1, max: 16, step: 1, unit: 'h', decimals: 0 },
                { key: 'autoconsumoFV_GW', label: 'Autoconsumo FV', min: 0, max: 40, step: 1, unit: 'GW', decimals: 0 },
            ],
        },
        {
            title: 'Trayectoria, clima y red',
            hint: 'Estos parametros solo se expresan plenamente cuando ejecutas la trayectoria 2026-2035.',
            controls: [
                { key: 'anioObjetivo', label: 'Anio objetivo', min: 2026, max: 2035, step: 1, unit: '', decimals: 0 },
                { key: 'hidraulicidad', label: 'Hidraulicidad anual', min: 0.5, max: 1.5, step: 0.05, unit: 'x', decimals: 2 },
                { key: 'solarRampaGW_anio', label: 'Rampa solar', min: 0, max: 8, step: 0.1, unit: 'GW/anio', decimals: 1 },
                { key: 'eolicaTerrestreRampa', label: 'Rampa eolica', min: 0, max: 5, step: 0.1, unit: 'GW/anio', decimals: 1 },
                { key: 'eolicaOffshoreRampa', label: 'Rampa offshore', min: 0, max: 1.5, step: 0.05, unit: 'GW/anio', decimals: 2 },
                { key: 'bateriasRampaGW_anio', label: 'Rampa baterias', min: 0, max: 4, step: 0.1, unit: 'GW/anio', decimals: 1 },
                { key: 'interconexion', label: 'Interconexion base', min: 0, max: 8, step: 0.1, unit: 'GW', decimals: 1 },
                { key: 'interconexionRampaGW_anio', label: 'Rampa interconexion', min: 0, max: 1, step: 0.05, unit: 'GW/anio', decimals: 2 },
                { key: 'nuevaLineaFrancia_anio', label: 'Nueva linea Francia', min: 2026, max: 2035, step: 1, unit: '', decimals: 0 },
                { key: 'inerciaMinGW', label: 'Minimo sincrono', min: 1, max: 8, step: 0.1, unit: 'GW', decimals: 1 },
                { key: 'reservaRodantePct', label: 'Reserva rodante', min: 1, max: 10, step: 0.5, unit: '%', decimals: 1 },
                { key: 'sequiaClusterAnios', label: 'Cluster de sequia', min: 0, max: 5, step: 1, unit: 'anios', decimals: 0 },
                { key: 'variabilidadInteranualPct', label: 'Variabilidad clima', min: 0, max: 20, step: 1, unit: '%', decimals: 0 },
                { key: 'eventoApagonPct', label: 'Shock de inestabilidad', min: 0, max: 20, step: 1, unit: '%', decimals: 0 },
            ],
        },
    ];

    const POLICY_TOGGLES = [
        { key: 'aplicarPlanNuclear', label: 'Aplicar calendario de cierre nuclear' },
        { key: 'prorrogaNuclear', label: 'Permitir prorroga nuclear' },
        { key: 'topeIbericoActivo', label: 'Tope iberico al gas' },
        { key: 'cfdActivo', label: 'CfDs renovables' },
        { key: 'peajesDinamicosActivos', label: 'Peajes dinamicos' },
        { key: 'pvpcActivo', label: 'PVPC y ajustes regulados' },
        { key: 'leyCambioClimaticoActiva', label: 'Ley de Cambio Climatico' },
        { key: 'olaCalorExtrema', label: 'Forzar ola de calor extrema' },
    ];

    const POLICY_GROUPS = [
        {
            title: 'Mercado y combustibles',
            controls: [
                { key: 'precioGas', label: 'Gas TTF', min: 15, max: 140, step: 1, unit: '€/MWh' },
                { key: 'precioCO2', label: 'CO2 ETS', min: 30, max: 180, step: 5, unit: '€/t' },
                { key: 'rendimientoCCGT', label: 'Rendimiento CCGT', min: 0.45, max: 0.62, step: 0.01, unit: '%', decimals: 0, percent: true },
                { key: 'omCCGT', label: 'O&M variable', min: 1, max: 8, step: 0.1, unit: '€/MWh', decimals: 1 },
                { key: 'precioImport', label: 'Precio importacion', min: 40, max: 180, step: 5, unit: '€/MWh' },
                { key: 'precioExport', label: 'Precio exportacion', min: 0, max: 40, step: 1, unit: '€/MWh' },
                { key: 'precioEscasez', label: 'Precio escasez', min: 200, max: 700, step: 10, unit: '€/MWh' },
            ],
        },
        {
            title: 'Politica regulatoria',
            controls: [
                { key: 'mecanismoCapacidad_euro_kW', label: 'Pago por capacidad', min: 0, max: 40, step: 1, unit: '€/kW-anio' },
                { key: 'cfdRenovables_strike', label: 'Strike CfD renovable', min: 30, max: 100, step: 1, unit: '€/MWh' },
                { key: 'peajeP1', label: 'Peaje P1', min: 0, max: 25, step: 0.5, unit: '€/MWh', decimals: 1 },
                { key: 'peajeP2', label: 'Peaje P2', min: 0, max: 20, step: 0.5, unit: '€/MWh', decimals: 1 },
                { key: 'peajeP3', label: 'Peaje P3', min: 0, max: 15, step: 0.5, unit: '€/MWh', decimals: 1 },
                { key: 'perdidasRed', label: 'Perdidas de red', min: 0, max: 0.08, step: 0.005, unit: '%', decimals: 1, percent: true },
                { key: 'prorrogaGlobal', label: 'Prorroga global nuclear', min: 0, max: 25, step: 1, unit: 'anios', decimals: 0, visible: params => params.prorrogaNuclear },
                { key: 'cierreNuclear', label: 'Retirada acelerada total', min: 2028, max: 2035, step: 1, unit: '', decimals: 0, visible: params => params.aplicarPlanNuclear },
            ],
        },
    ];

    const GUIDE_BLOCKS = [
        {
            title: 'Como leer el modelo',
            body: 'El simulador sigue un despacho por orden de merito con nuclear de base, renovables variables, almacenamiento, hidro gestionable, interconexion y CCGT como ultimo recurso.',
        },
        {
            title: 'Que anade la v3',
            body: 'La v3 incorpora sectores de demanda, calendario nuclear ENRESA, politica energetica, V2G, degradacion de baterias y trayectoria 2026-2035.',
        },
        {
            title: 'Que no pretende ser',
            body: 'No sustituye modelos oficiales de REE o MITECO. Es una herramienta exploratoria para tensionar hipotesis y comparar decisiones de sistema.',
        },
    ];

    const SOURCES = [
        { label: 'REE - Sistema electrico', href: 'https://www.ree.es/es/datos' },
        { label: 'OMIE - Mercado diario', href: 'https://www.omie.es/' },
        { label: 'MITECO - PNIEC', href: 'https://www.miteco.gob.es/es/energia/temas/planificacion/plan-nacional-integrado-energia-clima.html' },
        { label: 'CNMC - Peajes y cargos', href: 'https://www.cnmc.es/ambitos-de-actuacion/energia/peajes-y-cargos' },
        { label: 'ENTSO-E - Transparency', href: 'https://transparency.entsoe.eu/' },
        { label: 'EU ETS - Precio CO2', href: 'https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_es' },
    ];

    const RESULT_KEYS = [
        'precioMedio', 'precioMedioPonderado', 'precioP10', 'precioMediana', 'precioP90', 'precioMin', 'precioMax',
        'emisionesAnuales', 'coberturaRenovable', 'dependenciaGas', 'consumoGasTWh', 'vertidosTWh', 'vertidosPct',
        'horasGas', 'horasVertido', 'horasDeficit', 'maxDeficit', 'horasPrecioNegativo', 'horasPrecioAlto',
        'importacionesTWh', 'exportacionesTWh', 'demandaFlexTWh', 'demandaReducidaTWh', 'horasImportacion', 'horasExportacion', 'horasFlex',
        'demandaAjustadaTWh', 'nuclearEfectivaGW', 'costeSistemaMEur', 'lcoeSolar', 'lcoeEolica', 'lcoeGas', 'lcosBaterias',
        'horasSinGas', 'horasInerciaCritica', 'hidraulicidadMedia',
    ];

    function emptyResults() {
        return {
            precioMedio: 0,
            precioMedioPonderado: 0,
            precioP10: 0,
            precioMediana: 0,
            precioP90: 0,
            precioMin: 0,
            precioMax: 0,
            emisionesAnuales: 0,
            coberturaRenovable: 0,
            dependenciaGas: 0,
            consumoGasTWh: 0,
            vertidosTWh: 0,
            vertidosPct: 0,
            horasGas: 0,
            horasVertido: 0,
            horasDeficit: 0,
            maxDeficit: 0,
            horasPrecioNegativo: 0,
            horasPrecioAlto: 0,
            importacionesTWh: 0,
            exportacionesTWh: 0,
            demandaFlexTWh: 0,
            demandaReducidaTWh: 0,
            horasImportacion: 0,
            horasExportacion: 0,
            horasFlex: 0,
            demandaAjustadaTWh: 0,
            nuclearEfectivaGW: 0,
            costeSistemaMEur: 0,
            lcoeSolar: 0,
            lcoeEolica: 0,
            lcoeGas: 0,
            lcosBaterias: 0,
            horasSinGas: 0,
            horasInerciaCritica: 0,
            hidraulicidadMedia: 0,
            mensual: null,
            capacidades: {},
            policySnapshot: {},
            detalleDemanda: [],
        };
    }

    createApp({
        setup() {
            const params = reactive({ ...SEF.PARAMS_DEFAULT });
            const resultados = reactive(emptyResults());

            const escenarioActual = ref(1);
            const tabActual = ref('escenarios');
            const tabPrincipal = ref('dashboard');
            const semanaVista = ref(25);
            const vistaPrecios = ref('semana');
            const vistaAnual = ref(false);
            const copiado = ref(false);
            const simulando = ref(false);
            const trayectoriaSimulando = ref(false);
            const progresoTrayectoria = ref(0);
            const theme = ref('light');
            const trayectoria = ref(null);

            let mixSimulado = null;
            let preciosSimulados = null;

            const datos2025 = SEF.DATOS_2025;
            const escenarios = SEF.ESCENARIOS;

            const nombreEscenario = computed(() => {
                const esc = escenarios.find(item => item.id === escenarioActual.value);
                return esc ? esc.nombre : 'Personalizado';
            });

            const descripcionEscenario = computed(() => {
                const esc = escenarios.find(item => item.id === escenarioActual.value);
                return esc ? esc.descripcion : 'Configuracion personalizada sobre la base de Aurora y del nuevo motor multi-anio.';
            });

            const pniecStatus = computed(() => {
                const P = SEF.PNIEC_2030;
                const cap = resultados.capacidades || {};
                const almacenamiento = cap.almacenamiento || (params.bateriasPotencia + params.bombeo);
                const eolicaTotal = (cap.eolica || params.eolica) + (cap.offshore || params.eolicaOffshore);
                return [
                    {
                        indicador: '% Renovables en generacion',
                        objetivo: `${P.renovablesGeneracion}%`,
                        actual: `${resultados.coberturaRenovable.toFixed(0)}%`,
                        status: resultados.coberturaRenovable >= P.renovablesGeneracion ? 'cumple' : resultados.coberturaRenovable >= 70 ? 'parcial' : 'no-cumple',
                    },
                    {
                        indicador: 'Emisiones del sector',
                        objetivo: `< ${P.emisionesMax} Mt`,
                        actual: `${resultados.emisionesAnuales.toFixed(1)} Mt`,
                        status: resultados.emisionesAnuales <= P.emisionesMax ? 'cumple' : resultados.emisionesAnuales <= 28 ? 'parcial' : 'no-cumple',
                    },
                    {
                        indicador: 'Solar instalada',
                        objetivo: `${P.solarGW} GW`,
                        actual: `${(cap.solar || params.solar).toFixed(0)} GW`,
                        status: (cap.solar || params.solar) >= P.solarGW ? 'cumple' : (cap.solar || params.solar) >= 68 ? 'parcial' : 'no-cumple',
                    },
                    {
                        indicador: 'Eolica total',
                        objetivo: `${P.eolicaGW + P.offshoreGW} GW`,
                        actual: `${eolicaTotal.toFixed(1)} GW`,
                        status: eolicaTotal >= (P.eolicaGW + P.offshoreGW) ? 'cumple' : eolicaTotal >= 55 ? 'parcial' : 'no-cumple',
                    },
                    {
                        indicador: 'Almacenamiento',
                        objetivo: `${P.almacenamientoGW} GW`,
                        actual: `${almacenamiento.toFixed(1)} GW`,
                        status: almacenamiento >= P.almacenamientoGW ? 'cumple' : almacenamiento >= 16 ? 'parcial' : 'no-cumple',
                    },
                ];
            });

            const summaryStats = computed(() => ([
                { label: 'Precio medio pond.', value: `${resultados.precioMedioPonderado.toFixed(1)} €/MWh`, tone: resultados.precioMedioPonderado > 85 ? 'warning' : 'neutral' },
                { label: 'Cobertura renovable', value: `${resultados.coberturaRenovable.toFixed(0)}%`, tone: resultados.coberturaRenovable >= 75 ? 'success' : 'neutral' },
                { label: 'Emisiones anuales', value: `${resultados.emisionesAnuales.toFixed(1)} Mt`, tone: resultados.emisionesAnuales <= 20 ? 'success' : resultados.emisionesAnuales > 30 ? 'danger' : 'warning' },
                { label: 'Coste sistema', value: `${resultados.costeSistemaMEur.toFixed(0)} M€`, tone: 'neutral' },
            ]));

            const criticalCards = computed(() => ([
                {
                    label: 'Consumo gas anual',
                    value: `${resultados.consumoGasTWh.toFixed(1)} TWh`,
                    sub: `${resultados.horasGas.toFixed(0)} h con gas · ${resultados.dependenciaGas.toFixed(1)}% del mix`,
                    tone: resultados.consumoGasTWh > 45 ? 'danger' : resultados.consumoGasTWh > 25 ? 'warning' : 'success',
                },
                {
                    label: 'Vertidos renovables',
                    value: `${resultados.vertidosTWh.toFixed(1)} TWh`,
                    sub: `${resultados.horasVertido.toFixed(0)} h · ${resultados.vertidosPct.toFixed(1)}% de VRE`,
                    tone: resultados.vertidosPct > 10 ? 'warning' : 'success',
                },
                {
                    label: 'Deficit y escasez',
                    value: `${resultados.horasDeficit.toFixed(0)} h`,
                    sub: `Pico ${resultados.maxDeficit.toFixed(1)} GW`,
                    tone: resultados.horasDeficit > 30 ? 'danger' : resultados.horasDeficit > 0 ? 'warning' : 'success',
                },
                {
                    label: 'Horas sin gas',
                    value: `${resultados.horasSinGas.toFixed(0)} h`,
                    sub: 'Mide cuantas horas el sistema evita CCGT.',
                    tone: resultados.horasSinGas > 4000 ? 'success' : 'neutral',
                },
                {
                    label: 'Importaciones netas',
                    value: `${(resultados.importacionesTWh - resultados.exportacionesTWh).toFixed(1)} TWh`,
                    sub: `Imp ${resultados.importacionesTWh.toFixed(1)} · Exp ${resultados.exportacionesTWh.toFixed(1)}`,
                    tone: resultados.importacionesTWh > 18 ? 'warning' : 'neutral',
                },
                {
                    label: 'Estres de red',
                    value: `${resultados.horasInerciaCritica.toFixed(0)} h`,
                    sub: 'Horas por debajo del minimo sincronico.',
                    tone: resultados.horasInerciaCritica > 10 ? 'danger' : resultados.horasInerciaCritica > 0 ? 'warning' : 'success',
                },
            ]));

            const sectorDemandRows = computed(() => {
                if (!resultados.detalleDemanda || !resultados.detalleDemanda.length) return [];
                const totals = {
                    residencial: 0,
                    servicios: 0,
                    industrial: 0,
                    ve: 0,
                    bombasCalor: 0,
                    h2: 0,
                };
                resultados.detalleDemanda.forEach(hour => {
                    totals.residencial += hour.residencial || 0;
                    totals.servicios += hour.servicios || 0;
                    totals.industrial += hour.industrial || 0;
                    totals.ve += hour.ve || 0;
                    totals.bombasCalor += hour.bombasCalor || 0;
                    totals.h2 += (hour.h2 || 0) + (hour.h2Flexible || 0);
                });
                return [
                    ['Residencial', totals.residencial / 1000],
                    ['Servicios', totals.servicios / 1000],
                    ['Industria', totals.industrial / 1000],
                    ['VE', totals.ve / 1000],
                    ['Bombas de calor', totals.bombasCalor / 1000],
                    ['H2 flexible', totals.h2 / 1000],
                ].map(([label, value]) => ({ label, value }));
            });

            const policyEffects = computed(() => {
                const gasStress = Math.max(0, params.precioGas - 45);
                return [
                    {
                        label: 'Tope iberico',
                        active: params.topeIbericoActivo,
                        price: params.topeIbericoActivo ? -(6 + gasStress * 0.18) : 0,
                        emissions: params.topeIbericoActivo ? 0.2 : 0,
                        cost: params.topeIbericoActivo ? 4 + gasStress * 0.08 : 0,
                    },
                    {
                        label: 'CfDs renovables',
                        active: params.cfdActivo,
                        price: params.cfdActivo ? -4 : 0,
                        emissions: params.cfdActivo ? -0.4 : 0,
                        cost: params.cfdActivo ? 1.8 : 0,
                    },
                    {
                        label: 'Pago por capacidad',
                        active: params.mecanismoCapacidad_euro_kW > 0,
                        price: params.mecanismoCapacidad_euro_kW > 0 ? 0.8 : 0,
                        emissions: 0,
                        cost: params.mecanismoCapacidad_euro_kW > 0 ? 2.2 : 0,
                    },
                    {
                        label: 'Prorroga nuclear',
                        active: params.prorrogaNuclear,
                        price: params.prorrogaNuclear ? -9 : 0,
                        emissions: params.prorrogaNuclear ? -4.2 : 0,
                        cost: params.prorrogaNuclear ? -3.5 : 0,
                    },
                    {
                        label: 'Ley climatica',
                        active: params.leyCambioClimaticoActiva,
                        price: params.leyCambioClimaticoActiva ? -2.5 : 0,
                        emissions: params.leyCambioClimaticoActiva ? -6.5 : 0,
                        cost: params.leyCambioClimaticoActiva ? 5.5 : 0,
                    },
                ];
            });

            const trajectoryCards = computed(() => {
                if (!trayectoria.value?.resumen?.years?.length) return [];
                const resumen = trayectoria.value.resumen;
                const first = resumen.years[0];
                const last = resumen.years[resumen.years.length - 1];
                const firstResult = trayectoria.value.porAnio[first];
                const lastResult = trayectoria.value.porAnio[last];
                return [
                    { label: 'Precio 2026 → 2035', value: `${firstResult.precioMedioPonderado.toFixed(0)} → ${lastResult.precioMedioPonderado.toFixed(0)} €/MWh` },
                    { label: 'Emisiones 2026 → 2035', value: `${firstResult.emisionesAnuales.toFixed(1)} → ${lastResult.emisionesAnuales.toFixed(1)} Mt` },
                    { label: 'Renovable 2026 → 2035', value: `${firstResult.coberturaRenovable.toFixed(0)}% → ${lastResult.coberturaRenovable.toFixed(0)}%` },
                    { label: 'Gas 2026 → 2035', value: `${firstResult.consumoGasTWh.toFixed(1)} → ${lastResult.consumoGasTWh.toFixed(1)} TWh` },
                ];
            });

            const trajectoryRows = computed(() => {
                if (!trayectoria.value?.resumen?.years?.length) return [];
                return trayectoria.value.resumen.years.map(year => {
                    const result = trayectoria.value.porAnio[year];
                    return {
                        year,
                        precio: result.precioMedioPonderado,
                        emisiones: result.emisionesAnuales,
                        renovables: result.coberturaRenovable,
                        gas: result.consumoGasTWh,
                        nuclear: result.nuclearEfectivaGW,
                    };
                });
            });

            function formatControlValue(control, value) {
                if (typeof value === 'boolean') return value ? 'Activo' : 'Inactivo';
                let raw = Number(value);
                if (control.percent) raw *= 100;
                const decimals = control.decimals ?? (String(control.step).includes('.') ? String(control.step).split('.')[1].length : 0);
                const formatted = Number.isFinite(raw) ? raw.toFixed(decimals) : value;
                return control.unit ? `${formatted} ${control.unit}` : `${formatted}`;
            }

            function setResults(res) {
                RESULT_KEYS.forEach(key => { resultados[key] = res[key]; });
                resultados.mensual = res.mensual;
                resultados.capacidades = res.capacidades || {};
                resultados.policySnapshot = res.policySnapshot || {};
                resultados.detalleDemanda = res.detalleDemanda || [];
                mixSimulado = res.mix;
                preciosSimulados = res.precios;
            }

            function renderizarGraficos() {
                nextTick(() => {
                    if (mixSimulado) {
                        SEF.Charts.plotMix('plot-mix', mixSimulado, { semana: semanaVista.value, vistaAnual: vistaAnual.value });
                    }
                    if (preciosSimulados) {
                        SEF.Charts.plotPrecios('plot-precios', preciosSimulados, resultados, { vista: vistaPrecios.value, semana: semanaVista.value });
                        SEF.Charts.plotPrecios('plot-duracion', preciosSimulados, resultados, { vista: 'duracion' });
                    }
                    if (resultados.mensual) {
                        SEF.Charts.plotBarras('plot-barras', params, resultados);
                        SEF.Charts.plotMensual('plot-mensual', resultados.mensual);
                        SEF.Charts.plotPreciosMensuales('plot-precios-mensuales', resultados.mensual);
                    }
                    renderizarTrayectoria();
                });
            }

            function renderizarTrayectoria() {
                nextTick(() => {
                    if (!trayectoria.value) return;
                    SEF.Charts.plotTrajectoryMix('plot-trayectoria-mix', trayectoria.value);
                    SEF.Charts.plotTrajectoryKPIs('plot-trayectoria-kpis', trayectoria.value);
                    SEF.Charts.plotTrajectoryPNIEC('plot-trayectoria-pniec', trayectoria.value);
                });
            }

            function simular() {
                simulando.value = true;
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        try {
                            const res = new SEF.SimuladorElectrico({ ...params }).simular();
                            setResults(res);
                            renderizarGraficos();
                        } finally {
                            simulando.value = false;
                        }
                    }, 20);
                });
            }

            function cargarEscenario(id) {
                const esc = SEF.getEscenario(id);
                if (!esc) return;
                escenarioActual.value = id;
                Object.assign(params, esc.params);
                simular();
            }

            function resetear() {
                cargarEscenario(0);
            }

            async function simularTrayectoria() {
                trayectoriaSimulando.value = true;
                progresoTrayectoria.value = 0;
                try {
                    trayectoria.value = await SEF.Trajectory.simularTrayectoria({ ...params }, {
                        onProgress({ index, total }) {
                            progresoTrayectoria.value = Math.round((index / total) * 100);
                        },
                    });
                    tabPrincipal.value = 'trayectoria';
                    renderizarTrayectoria();
                } finally {
                    trayectoriaSimulando.value = false;
                }
            }

            function randomizarSemilla() {
                params.semilla = Math.floor(1 + Math.random() * 9999);
            }

            function copiarConfig() {
                const payload = JSON.stringify({ ...params }, null, 2);
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(payload);
                }
                copiado.value = true;
                setTimeout(() => { copiado.value = false; }, 1800);
            }

            function toggleVistaAnual() {
                vistaAnual.value = !vistaAnual.value;
                renderizarGraficos();
            }

            function cambiarVistaPrecios(vista) {
                vistaPrecios.value = vista;
                renderizarGraficos();
            }

            function cambiarTabPrincipal(tab) {
                tabPrincipal.value = tab;
                renderizarGraficos();
            }

            function actualizarGraficos() {
                renderizarGraficos();
            }

            function toggleTheme() {
                theme.value = SEF.Theme.toggle();
                renderizarGraficos();
            }

            function diffPct(actual, referencia) {
                if (!referencia) return 0;
                return ((actual - referencia) / referencia) * 100;
            }

            function diffClass(actual, referencia, invertir = false) {
                const mejor = invertir ? actual > referencia : actual < referencia;
                return mejor ? 'is-positive' : 'is-negative';
            }

            function statusLabel(status) {
                if (status === 'cumple') return 'Cumple';
                if (status === 'parcial') return 'Parcial';
                return 'No cumple';
            }

            function toneClass(tone) {
                return tone ? `is-${tone}` : '';
            }

            function signed(value, decimals = 1, unit = '') {
                const prefix = value > 0 ? '+' : '';
                return `${prefix}${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`;
            }

            watch(tabPrincipal, () => nextTick(renderizarGraficos));

            onMounted(() => {
                theme.value = SEF.Theme.init();
                SEF.Theme.on(nextTheme => {
                    theme.value = nextTheme;
                    nextTick(renderizarGraficos);
                });
                simular();
            });

            return {
                SIDE_TABS,
                MAIN_TABS,
                WEEK_OPTIONS,
                MODEL_GROUPS,
                POLICY_TOGGLES,
                POLICY_GROUPS,
                GUIDE_BLOCKS,
                SOURCES,
                params,
                resultados,
                datos2025,
                escenarios,
                escenarioActual,
                tabActual,
                tabPrincipal,
                semanaVista,
                vistaPrecios,
                vistaAnual,
                copiado,
                simulando,
                trayectoriaSimulando,
                progresoTrayectoria,
                trayectoria,
                theme,
                nombreEscenario,
                descripcionEscenario,
                pniecStatus,
                summaryStats,
                criticalCards,
                sectorDemandRows,
                policyEffects,
                trajectoryCards,
                trajectoryRows,
                simular,
                cargarEscenario,
                resetear,
                simularTrayectoria,
                randomizarSemilla,
                copiarConfig,
                toggleVistaAnual,
                cambiarVistaPrecios,
                cambiarTabPrincipal,
                actualizarGraficos,
                toggleTheme,
                formatControlValue,
                diffPct,
                diffClass,
                statusLabel,
                toneClass,
                signed,
            };
        },
    }).mount('#app');
})();
