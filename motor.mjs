/**
 * ============================================================================
 *  MOTOR HEADLESS — Ejecutable Node.js para el simulador SEF
 * ============================================================================
 *  Permite ejecutar simulaciones desde terminal sin navegador.
 *  Carga los módulos SEF en modo headless (sin window/document) y expone
 *  una CLI para ejecutar escenarios o parámetros personalizados.
 *
 *  Uso:
 *    node motor.mjs --scenario=1
 *    node motor.mjs --scenario=1 --anio=2030
 *    node motor.mjs --params params.json --output resultados.json
 *    node motor.mjs --scenario=5 --anio=2027 --semilla=123
 *    node motor.mjs --trayectoria
 *    node motor.mjs --scenario=1 --kpi=precioMedioPonderado,emisionesAnuales
 *
 *  Salida: JSON en stdout o archivo (--output).
 * ============================================================================
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
//  CARGA DE MÓDULOS SEF EN MODO HEADLESS
// ============================================================================

/**
 * Ejecuta un archivo JS como módulo SEF (que espera window.SEF).
 * En Node.js, creamos un namespace SEF global y ejecutamos el código
 * usando new Function() para evitar problemas de scope en ESM.
 */
function cargarModuloSEF(ruta) {
    const codigo = readFileSync(ruta, 'utf-8');
    // Crear un contexto con window.SEF disponible
    const SEF = globalThis.SEF || {};
    globalThis.SEF = SEF;
    // window es necesario para los módulos que hacen `window.SEF = SEF`
    if (!globalThis.window) {
        globalThis.window = { SEF: SEF };
    }
    // Ejecutar el código con new Function para evitar problemas de scope en ESM
    // Los módulos usan IIFE con (function(){ ... })(); que asignan propiedades a SEF
    try {
        const fn = new Function(codigo);
        fn();
    } catch (err) {
        console.error(`Error cargando ${ruta}:`, err.message);
        throw err;
    }
}

function cargarTodosLosModulos() {
    const modulos = [
        'js/constants.js',
        'js/weather.js',
        'js/demand.js',
        'js/storage.js',
        'js/policy.js',
        'js/nuclear.js',
        'js/simulator.js',
        'js/trajectory.js',
        'js/montecarlo.js',
        'js/scenarios.js',
    ];

    for (const mod of modulos) {
        const ruta = join(__dirname, mod);
        cargarModuloSEF(ruta);
    }

    if (!globalThis.SEF) {
        throw new Error('SEF no se cargó correctamente');
    }
}

// ============================================================================
//  PARSER DE ARGUMENTOS CLI
// ============================================================================

function parseArgs(argv) {
    const args = {};
    const rest = [];

    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];

        if (arg.startsWith('--')) {
            const eq = arg.indexOf('=');
            if (eq !== -1) {
                const key = arg.slice(2, eq);
                const val = arg.slice(eq + 1);
                args[key] = val;
            } else {
                // Flag sin valor, o flag con valor en el siguiente argumento
                const key = arg.slice(2);
                // Verificar si el siguiente argumento existe y no empieza con '-'
                if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
                    args[key] = argv[++i];
                } else {
                    args[key] = true;
                }
            }
        } else if (arg.startsWith('-')) {
            // Soporte para -s como abreviatura de --scenario
            const key = arg.slice(1);
            if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
                args[key] = argv[++i];
            } else {
                args[key] = true;
            }
        } else {
            rest.push(arg);
        }
    }

    return { args, rest };
}

// ============================================================================
//  CONVERSIÓN DE TIPOS
// ============================================================================

function convertirTipos(obj) {
    const resultado = {};
    for (const [key, val] of Object.entries(obj)) {
        if (val === 'true') resultado[key] = true;
        else if (val === 'false') resultado[key] = false;
        else if (/^\d+$/.test(val)) resultado[key] = parseInt(val, 10);
        else if (/^\d+\.\d+$/.test(val)) resultado[key] = parseFloat(val);
        else resultado[key] = val;
    }
    return resultado;
}

// ============================================================================
//  ESCENARIOS
// ============================================================================

function obtenerEscenario(id) {
    if (!SEF.ESCENARIOS) return null;
    const idx = parseInt(id, 10);
    if (isNaN(idx)) return SEF.ESCENARIOS.find(e => e.id === id || e.nombre === id) || null;
    return SEF.ESCENARIOS[idx] || null;
}

// ============================================================================
//  EJECUCIÓN DE SIMULACIÓN
// ============================================================================

function ejecutarSimulacion(params) {
    const simulador = new SEF.SimuladorElectrico(params);
    const resultado = simulador.simular();

    // Añadir metadatos
    resultado._meta = {
        anio: params.anioObjetivo,
        semilla: params.semilla,
        escenario: params.escenario || null,
        timestamp: new Date().toISOString(),
        version: '3.3.0-headless',
    };

    return resultado;
}

function ejecutarTrayectoria(paramsBase) {
    return SEF.Trajectory.simularTrayectoria(paramsBase, {
        onProgress: (info) => {
            console.error(`  [${info.index}/${info.total}] ${info.year}`);
        },
    });
}

function ejecutarMonteCarlo(params, semillas) {
    return SEF.MonteCarlo.simularMultiSemilla(params, semillas);
}

// ============================================================================
//  FILTRADO DE KPIs
// ============================================================================

function filtrarKPIs(resultado, kpis) {
    if (!kpis || kpis.length === 0) return resultado;

    const filtro = {};
    for (const key of kpis) {
        if (key === '_meta') {
            filtro[key] = resultado[key];
            continue;
        }
        if (resultado[key] !== undefined) {
            filtro[key] = resultado[key];
        }
    }

    // Incluir arrays importantes (mix, precios, demandaHoraria) si se piden
    const arraysImportantes = ['mix', 'precios', 'demandaHoraria', 'detalleDemanda', 'mensual', 'estadoBateriaFinal', 'estadoBombeoFinal'];
    for (const arr of arraysImportantes) {
        if (kpis.includes(arr)) {
            filtro[arr] = resultado[arr];
        }
    }

    return filtro;
}

// ============================================================================
//  FORMATEO DE SALIDA
// ============================================================================

function formatearResultado(resultado, compacto = false) {
    if (compacto) {
        // Solo KPIs resumidos + metadatos
        const resumen = {
            _meta: resultado._meta,
            precioMedio: resultado.precioMedio,
            precioMedioPonderado: resultado.precioMedioPonderado,
            emisionesAnuales: resultado.emisionesAnuales,
            consumoGasTWh: resultado.consumoGasTWh,
            coberturaRenovable: resultado.coberturaRenovable,
            horasDeficit: resultado.horasDeficit,
            horasGas: resultado.horasGas,
            horasVertido: resultado.horasVertido,
            vertidosTWh: resultado.vertidosTWh,
            importacionesTWh: resultado.importacionesTWh,
            horasSinGas: resultado.horasSinGas,
            horasPrecioNegativo: resultado.horasPrecioNegativo,
            horasPrecioAlto: resultado.horasPrecioAlto,
            horasInerciaCritica: resultado.horasInerciaCritica,
            ENS: resultado.ensTWh,
            intensidadCarbona: resultado.intensidadCarbona,
            costeSistemaMEur: resultado.costeSistemaMEur,
            horasBombeoActivo: resultado.horasBombeoActivo,
            horasFlex: resultado.horasFlex,
            horasExportacion: resultado.horasExportacion,
            horasImportacion: resultado.horasImportacion,
            demandaAjustadaTWh: resultado.demandaAjustadaTWh,
            demandaFlexTWh: resultado.demandaFlexTWh,
            demandaReducidaTWh: resultado.demandaReducidaTWh,
            coberturaRenovable: resultado.coberturaRenovable,
            dependenciaGas: resultado.dependenciaGas,
            vertidosPct: resultado.vertidosPct,
            precioMin: resultado.precioMin,
            precioMax: resultado.precioMax,
            precioP10: resultado.precioP10,
            precioMediana: resultado.precioMediana,
            precioP90: resultado.precioP90,
            lcoeSolar: resultado.lcoeSolar,
            lcoeEolica: resultado.lcoeEolica,
            lcoeGas: resultado.lcoeGas,
            lcosBaterias: resultado.lcosBaterias,
        };
        return resumen;
    }
    return resultado;
}

// ============================================================================
//  RESUMEN LEGIBLE POR CONSOLA
// ============================================================================

function imprimirResumen(resultado) {
    const r = resultado;
    console.error('');
    console.error('═'.repeat(60));
    console.error('  SIMULACIÓN — Sistema Eléctrico Español');
    console.error('═'.repeat(60));
    console.error(`  Año:          ${r._meta?.anio || '?'}`);
    console.error(`  Semilla:      ${r._meta?.semilla || '?'}`);
    console.error(`  Escenario:    ${r._meta?.escenario || 'personalizado'}`);
    console.error('─'.repeat(60));
    console.error(`  Precio medio:       ${r.precioMedio?.toFixed(2)} €/MWh`);
    console.error(`  Precio ponderado:   ${r.precioMedioPonderado?.toFixed(2)} €/MWh`);
    console.error(`  Precio mín/máx:     ${r.precioMin?.toFixed(2)} / ${r.precioMax?.toFixed(2)} €/MWh`);
    console.error(`  P10 / Mediana / P90: ${r.precioP10?.toFixed(2)} / ${r.precioMediana?.toFixed(2)} / ${r.precioP90?.toFixed(2)} €/MWh`);
    console.error('─'.repeat(60));
    console.error(`  Emisiones:          ${r.emisionesAnuales?.toFixed(2)} Mt CO₂`);
    console.error(`  Intensidad CO₂:     ${r.intensidadCarbona?.toFixed(1)} gCO₂/kWh`);
    console.error(`  Consumo gas:        ${r.consumoGasTWh?.toFixed(2)} TWh`);
    console.error(`  Horas con gas:      ${r.horasGas}`);
    console.error(`  Horas sin gas:      ${r.horasSinGas}`);
    console.error('─'.repeat(60));
    console.error(`  Cobertura renovable: ${r.coberturaRenovable?.toFixed(1)} %`);
    console.error(`  Dependencia gas:    ${r.dependenciaGas?.toFixed(1)} %`);
    console.error(`  Vertidos:           ${r.vertidosTWh?.toFixed(2)} TWh (${r.vertidosPct?.toFixed(1)} %)`);
    console.error(`  Horas vertido:      ${r.horasVertido}`);
    console.error('─'.repeat(60));
    console.error(`  Importaciones:      ${r.importacionesTWh?.toFixed(2)} TWh (${r.horasImportacion} h)`);
    console.error(`  Exportaciones:      ${r.exportacionesTWh?.toFixed(2)} TWh (${r.horasExportacion} h)`);
    console.error('─'.repeat(60));
    console.error(`  Demanda anual:      ${r.demandaAjustadaTWh?.toFixed(1)} TWh`);
    console.error(`  Demanda flexible:   ${r.demandaFlexTWh?.toFixed(2)} TWh (${r.horasFlex} h)`);
    console.error(`  Demanda reducida:   ${r.demandaReducidaTWh?.toFixed(2)} TWh`);
    console.error(`  Horas bombeo activo: ${r.horasBombeoActivo}`);
    console.error('─'.repeat(60));
    console.error(`  ENS (deseo no servido): ${r.ensTWh?.toFixed(3)} TWh (${r.horasDeficit} h)`);
    console.error(`  Horas inercia crítica:  ${r.horasInerciaCritica}`);
    console.error('─'.repeat(60));
    console.error(`  Coste sistema:      ${r.costeSistemaMEur?.toFixed(1)} M€`);
    console.error(`  LCOE solar:         ${r.lcoeSolar?.toFixed(1)} €/MWh`);
    console.error(`  LCOE eólica:        ${r.lcoeEolica?.toFixed(1)} €/MWh`);
    console.error(`  LCOE gas:           ${r.lcoeGas?.toFixed(1)} €/MWh`);
    console.error(`  LoCos baterías:     ${r.lcosBaterias?.toFixed(1)} €/MWh`);
    console.error(`  Horas precio neg.:  ${r.horasPrecioNegativo}`);
    console.error(`  Horas precio alto:  ${r.horasPrecioAlto} (>150 €/MWh)`);
    console.error('═'.repeat(60));
    console.error('');
}

// ============================================================================
//  AYUDA
// ============================================================================

function imprimirAyuda() {
    console.log(`
Sistema Eléctrico Futuro — Motor Headless v3.3.0
Ejecuta simulaciones del sistema eléctrico español desde terminal.

USO:
  node motor.mjs [OPCIONES]

OPCIONES:
  --scenario=<ID>           Ejecutar escenario predefinido (0-21)
                            0: Datos Reales 2025
                            1: PNIEC Base 2030
                            2: Prórroga Nuclear
                            3: Sin Nuclear
                            4: Almacenamiento Masivo
                            5: Crisis del Gas
                            6: Hidrógeno Verde
                            7: Sequía Extrema
                            8: Cierre Nuclear ENRESA
                            9: Prórroga 60 Años
                            10: Apagón Ibérico Repetido
                            11: VE Masivo 2030
                            12: Autoconsumo 30 GW
                            13: PNIEC 2030 Actualizado
                            14: Ley de Cambio Climático 2050
                            15: Ola de Calor Extrema
                            16: Crisis Geopolítica Gas + CO₂
                            17: Datos REE Real 2026
                            18: Cierre ENRESA oficial
                            19: Prórroga nuclear 10 años
                            20: Prórroga nuclear 20 años (60 años vida)
                            21: Cierre nuclear acelerado 2030

  --anio=<AÑO>              Sobrescribir año objetivo (ej: --anio=2030)
  --semilla=<N>             Semilla PRNG (ej: --semilla=42)
  --params=<archivo.json>   Cargar parámetros desde archivo JSON
  --output=<archivo.json>   Guardar resultado en archivo (en vez de stdout)
  --compacto                Solo KPIs resumidos (sin arrays mix/precios)
  --kpi=<kpi1,kpi2,...>     Filtrar solo estos KPIs del resultado
  --trayectoria             Ejecutar trayectoria 2026-2035 completa
  --montecarlo              Ejecutar simulación Monte Carlo (multi-semilla)
  --semillas=<1,42,100>     Semillas para Monte Carlo (por defecto: 9 semillas)
  --kpi-mc=<kpi1,...>       KPIs para resumen Monte Carlo
  --help                    Mostrar esta ayuda

EJEMPLOS:
  node motor.mjs --scenario=1
  node motor.mjs --scenario=1 --anio=2032 --compacto
  node motor.mjs --scenario=5 --output crisis_gas.json
  node motor.mjs --trayectoria --compacto
  node motor.mjs --scenario=1 --montecarlo --kpi=precioMedioPonderado,emisionesAnuales
  node motor.mjs --params mis_params.json --output resultados.json --compacto
`);
}

// ============================================================================
//  MAIN
// ============================================================================

async function main() {
    const { args } = parseArgs(process.argv);

    // --help
    if (args.help) {
        imprimirAyuda();
        process.exit(0);
    }

    // Cargar módulos SEF
    try {
        cargarTodosLosModulos();
    } catch (err) {
        console.error('Error cargando módulos SEF:', err.message);
        process.exit(1);
    }

    // Determinar modo de ejecución
    const esTrayectoria = args.trayectoria === true;
    const esMonteCarlo = args.montecarlo === true;

    // Construir parámetros base
    let params = {};

    // Si hay archivo de parámetros, cargarlo
    if (args.params) {
        try {
            const contenido = readFileSync(resolve(args.params), 'utf-8');
            params = JSON.parse(contenido);
        } catch (err) {
            console.error(`Error cargando ${args.params}:`, err.message);
            process.exit(1);
        }
    }

    // Si hay escenario, cargarlo
    if (args.scenario) {
        const esc = obtenerEscenario(args.scenario);
        if (!esc) {
            console.error(`Error: escenario "${args.scenario}" no encontrado.`);
            console.error(`Escenarios disponibles: 0-${SEF.ESCENARIOS.length - 1}`);
            process.exit(1);
        }
        params = { ...esc.params };
        params.escenario = esc.nombre;
    }

    // Sobrescribir parámetros individuales
    if (args.anio) params.anioObjetivo = parseInt(args.anio, 10);
    if (args.semilla) params.semilla = parseInt(args.semilla, 10);

    // Ejecutar según modo
    let resultado;

    if (esTrayectoria) {
        console.error('Ejecutando trayectoria 2026-2035...');
        resultado = await ejecutarTrayectoria(params);
        // Formatear trayectoria
        resultado._meta = {
            tipo: 'trayectoria',
            anioInicio: SEF.MODEL.BASE_ANIO,
            anioFin: 2035,
            semilla: params.semilla,
            escenario: params.escenario || null,
            timestamp: new Date().toISOString(),
            version: '3.3.0-headless',
        };
    } else if (esMonteCarlo) {
        const semillas = args.semillas
            ? args.semillas.split(',').map(s => parseInt(s.trim(), 10))
            : undefined;
        resultado = ejecutarMonteCarlo(params, semillas);
        resultado._meta = {
            tipo: 'montecarlo',
            anio: params.anioObjetivo,
            semilla: params.semilla,
            nSemillas: resultado.nSemillas,
            semillasUsadas: resultado.semillasUsadas,
            escenario: params.escenario || null,
            timestamp: new Date().toISOString(),
            version: '3.3.0-headless',
        };
    } else {
        // Simulación simple
        resultado = ejecutarSimulacion(params);
    }

    // Filtrar KPIs si se especificó
    if (args.kpi) {
        const kpis = args.kpi.split(',').map(k => k.trim());
        resultado = filtrarKPIs(resultado, kpis);
    }

    // Formatear resultado
    const compacto = args.compacto === true || args.c === true;
    const salida = formatearResultado(resultado, compacto);

    // Imprimir resumen legible por consola (stderr)
    if (!esMonteCarlo && !esTrayectoria && !compacto) {
        imprimirResumen(resultado);
    }

    // Monte Carlo: imprimir resumen de percentiles
    if (esMonteCarlo) {
        console.error('');
        console.error('═'.repeat(60));
        console.error('  MONTE CARLO — Percentiles');
        console.error('═'.repeat(60));
        for (const [kpi, p] of Object.entries(resultado.percentiles)) {
            console.error(`  ${kpi.padEnd(28)} P5: ${p.p5?.toFixed(2)?.padStart(10)}  P50: ${p.p50?.toFixed(2)?.padStart(10)}  P95: ${p.p95?.toFixed(2)?.padStart(10)}`);
        }
        console.error('═'.repeat(60));
        console.error('');
    }

    // Trajectoria: imprimir resumen por año
    if (esTrayectoria) {
        console.error('');
        console.error('═'.repeat(60));
        console.error('  TRAYECTORIA 2026-2035');
        console.error('═'.repeat(60));
        const resumen = resultado.resumen;
        for (let i = 0; i < resumen.years.length; i++) {
            const year = resumen.years[i];
            console.error(`  ${year}: precio=${(resumen.precio[i]?.toFixed(1) || '—').padStart(8)}  ` +
                `emisiones=${(resumen.emisiones[i]?.toFixed(2) || '—').padStart(7)} Mt  ` +
                `renovable=${(resumen.renovables[i]?.toFixed(1) || '—').padStart(6)}%  ` +
                `gas=${(resumen.gas[i]?.toFixed(2) || '—').padStart(7)} TWh`);
        }
        console.error('═'.repeat(60));
        console.error('');
    }

    // Salida JSON: stdout o archivo
    const json = JSON.stringify(salida, null, 2);

    if (args.output) {
        writeFileSync(resolve(args.output), json, 'utf-8');
        console.error(`Resultado guardado en: ${args.output}`);
    } else {
        console.log(json);
    }
}

main().catch(err => {
    console.error('Error fatal:', err.message);
    console.error(err.stack);
    process.exit(1);
});
