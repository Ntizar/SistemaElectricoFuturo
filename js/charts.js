/**
 * ============================================================================
 *  MÓDULO DE GRÁFICOS — Plotly.js
 * ============================================================================
 *  Renderizado de todas las visualizaciones del simulador:
 *    - Mix de generación (semanal / anual)
 *    - Precios mayoristas (semanal / distribución anual)
 *    - Comparación con 2025 (barras agrupadas)
 *    - Desglose mensual (barras apiladas)
 *    - Curva de duración de precios (monotónica)
 *
 *  Autor: David Antizar
 * ============================================================================
 */

'use strict';

(function () {
    const C  = SEF.COLORES;
    const LB = SEF.PLOTLY_LAYOUT_BASE;

    /** Utilidad: deep-merge de layout con base */
    function layout(custom) {
        const base = JSON.parse(JSON.stringify(LB));
        return mergeDeep(base, custom);
    }
    function mergeDeep(target, source) {
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                mergeDeep(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    const PLOTLY_CONFIG = { responsive: true, displayModeBar: false };

    // =====================================================================
    //  1. MIX DE GENERACIÓN
    // =====================================================================

    /**
     * Renderiza el gráfico principal de mix de generación.
     * @param {string} divId  - ID del contenedor DOM
     * @param {Array}  mix    - Array de 8760 objetos de generación
     * @param {Object} opts   - { semana, vistaAnual }
     */
    function plotMix(divId, mix, opts = {}) {
        if (!mix || !mix.length) return;

        if (opts.vistaAnual) {
            _plotMixAnual(divId, mix);
        } else {
            _plotMixSemanal(divId, mix, opts.semana || 25);
        }
    }

    function _plotMixSemanal(divId, mix, semana) {
        const inicio = 168 * semana;
        const data   = mix.slice(inicio, inicio + 168);
        const x      = data.map((_, i) => i);

        const traces = [
            _stackTrace(x, data.map(g => g.nuclear),          'Nuclear',          C.nuclear),
            _stackTrace(x, data.map(g => g.solar),             'Solar FV',         C.solar),
            _stackTrace(x, data.map(g => g.eolica),            'Eólica',           C.eolica),
            _stackTrace(x, data.map(g => g.hidraulica),        'Hidráulica',       C.hidro),
            _stackTrace(x, data.map(g => g.baterias + g.bombeo), 'Almacen. (desc.)', C.baterias),
            _stackTrace(x, data.map(g => g.importacion),       'Import.',          C.importar),
            _stackTrace(x, data.map(g => g.gas),               'Gas CCGT',         C.gas),
            _stackTrace(x, data.map(g => -(g.cargaBaterias + g.cargaBombeo)),
                        'Almacen. (carga)', C.bombeo, 'two'),
        ];

        const tickvals = [12, 36, 60, 84, 108, 132, 156];
        const nombresSemana = {
            2: 'Enero (Invierno)', 10: 'Marzo (Primavera)',
            25: 'Junio (Verano)', 35: 'Septiembre (Otoño)',
            45: 'Noviembre (Otoño tardío)'
        };

        const lyt = layout({
            xaxis: {
                title: `Semana ${semana} — ${nombresSemana[semana] || ''}`,
                tickvals, ticktext: SEF.DIAS_SEMANA
            },
            yaxis: { title: 'GW', zeroline: true, zerolinecolor: 'rgba(148,163,184,0.25)' },
        });

        Plotly.newPlot(divId, traces, lyt, PLOTLY_CONFIG);
    }

    function _plotMixAnual(divId, mix) {
        // Promedios diarios
        const dias = [];
        for (let d = 0; d < 365; d++) {
            const bloque = mix.slice(d * 24, d * 24 + 24);
            const avg = key => bloque.reduce((s, g) => s + g[key], 0) / 24;
            dias.push({
                nuclear: avg('nuclear'), solar: avg('solar'), eolica: avg('eolica'),
                hidraulica: avg('hidraulica'), gas: avg('gas'),
                bat: bloque.reduce((s, g) => s + g.baterias + g.bombeo, 0) / 24,
                imp: avg('importacion'),
            });
        }

        const x = dias.map((_, i) => i);
        const traces = [
            _stackTrace(x, dias.map(d => d.nuclear),     'Nuclear',     C.nuclear),
            _stackTrace(x, dias.map(d => d.solar),        'Solar FV',    C.solar),
            _stackTrace(x, dias.map(d => d.eolica),       'Eólica',      C.eolica),
            _stackTrace(x, dias.map(d => d.hidraulica),   'Hidráulica',  C.hidro),
            _stackTrace(x, dias.map(d => d.bat),          'Almacen.',    C.baterias),
            _stackTrace(x, dias.map(d => d.imp),          'Import.',     C.importar),
            _stackTrace(x, dias.map(d => d.gas),          'Gas CCGT',    C.gas),
        ];

        const tickvals = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];
        const lyt = layout({
            xaxis: { title: 'Día del año (media diaria)', tickvals, ticktext: SEF.MESES },
            yaxis: { title: 'GW (media diaria)' },
        });

        Plotly.newPlot(divId, traces, lyt, PLOTLY_CONFIG);
    }

    /** Helper para crear una traza de área apilada */
    function _stackTrace(x, y, name, color, group = 'one') {
        return {
            x, y, name,
            type: 'scatter',
            stackgroup: group,
            fillcolor: color.fill,
            line: { width: 0.5, color: color.line },
            hovertemplate: `${name}: %{y:.1f} GW<extra></extra>`,
        };
    }

    // =====================================================================
    //  2. PRECIOS MAYORISTAS
    // =====================================================================

    /**
     * Renderiza el gráfico de precios.
     * @param {string} divId
     * @param {Array<number>} precios - 8760 precios horarios
     * @param {Object} resultados - para percentiles y medias
     * @param {Object} opts - { vista: 'semana'|'anual'|'duracion', semana }
     */
    function plotPrecios(divId, precios, resultados, opts = {}) {
        if (!precios || !precios.length) return;
        const vista = opts.vista || 'semana';

        if (vista === 'semana') {
            _plotPreciosSemana(divId, precios, opts.semana || 25);
        } else if (vista === 'anual') {
            _plotPreciosHistograma(divId, precios, resultados);
        } else {
            _plotPreciosDuracion(divId, precios, resultados);
        }
    }

    function _plotPreciosSemana(divId, precios, semana) {
        const inicio = 168 * semana;
        const data   = precios.slice(inicio, inicio + 168);
        const x      = data.map((_, i) => i);
        const max    = Math.max(...data);
        const min    = Math.min(...data);

        const traces = [
            {
                x, y: data, name: 'Precio €/MWh',
                fill: 'tozeroy', fillcolor: C.precio.fill,
                line: { color: C.precio.line, width: 1.5 },
                hovertemplate: '%{y:.1f} €/MWh<extra></extra>',
            },
            {
                x, y: Array(168).fill(SEF.DATOS_2025.precioMedio),
                name: 'Media 2025',
                line: { color: C.ref2025.line, width: 2, dash: 'dash' },
                hovertemplate: '%{y:.0f} €/MWh (2025)<extra></extra>',
            }
        ];

        const lyt = layout({
            margin: { t: 10, r: 10, b: 40, l: 50 },
            xaxis: {
                title: 'Horas de la semana',
                tickvals: [12, 36, 60, 84, 108, 132, 156],
                ticktext: SEF.DIAS_SEMANA,
            },
            yaxis: {
                title: '€/MWh',
                range: [Math.min(-20, min - 10), Math.max(180, max + 20)],
            },
            shapes: [
                { type: 'rect', xref: 'paper', x0: 0, x1: 1, yref: 'y',
                  y0: 100, y1: 150, fillcolor: 'rgba(239,68,68,0.07)', line: { width: 0 } },
                { type: 'rect', xref: 'paper', x0: 0, x1: 1, yref: 'y',
                  y0: 0, y1: 30, fillcolor: 'rgba(0,245,212,0.06)', line: { width: 0 } },
            ],
        });

        Plotly.newPlot(divId, traces, lyt, PLOTLY_CONFIG);
    }

    function _plotPreciosHistograma(divId, precios, R) {
        const maxP = Math.max(...precios, 200);

        const shapes = [
            _vline(R.precioP10, '#fbbf24', 'dot'),
            _vline(R.precioMediana, '#3b82f6', 'solid'),
            _vline(R.precioP90, '#ef4444', 'dot'),
            _vline(R.precioMedioPonderado, '#00f5d4', 'dash'),
            _vline(SEF.DATOS_2025.precioMedio, '#ffd93d', 'dot'),
        ];

        const annotations = [
            _vanno(R.precioMedioPonderado, 1.0, 'Media pond.', '#00f5d4'),
            _vanno(R.precioMediana,        0.95, 'P50',        '#3b82f6'),
            _vanno(R.precioP10,            0.88, 'P10',        '#fbbf24'),
            _vanno(R.precioP90,            0.88, 'P90',        '#ef4444'),
            _vanno(SEF.DATOS_2025.precioMedio, 0.80, '2025',   '#ffd93d'),
        ];

        const traces = [{
            type: 'histogram', x: precios, name: 'Horas del año',
            nbinsx: 80,
            marker: { color: 'rgba(0,245,212,0.30)', line: { color: 'rgba(0,245,212,0.5)', width: 0.5 } },
            hovertemplate: '€%{x:.0f}<br>Horas: %{y}<extra></extra>',
        }];

        const lyt = layout({
            margin: { t: 10, r: 10, b: 40, l: 50 },
            bargap: 0.02,
            xaxis: {
                title: '€/MWh (distribución anual)',
                range: [Math.min(-30, R.precioP10 - 40), Math.max(260, maxP + 30)],
            },
            yaxis: { title: 'Horas' },
            shapes, annotations,
        });

        Plotly.newPlot(divId, traces, lyt, PLOTLY_CONFIG);
    }

    function _plotPreciosDuracion(divId, precios, R) {
        const sorted = [...precios].sort((a, b) => b - a);
        const x = sorted.map((_, i) => i);

        const traces = [
            {
                x, y: sorted, name: 'Precio',
                fill: 'tozeroy', fillcolor: 'rgba(0,245,212,0.15)',
                line: { color: '#00f5d4', width: 1.5 },
                hovertemplate: 'Hora %{x}: %{y:.1f} €/MWh<extra></extra>',
            },
            {
                x, y: Array(8760).fill(SEF.DATOS_2025.precioMedio),
                name: 'Media 2025',
                line: { color: '#fbbf24', width: 1.5, dash: 'dash' },
            }
        ];

        const lyt = layout({
            margin: { t: 10, r: 10, b: 40, l: 50 },
            xaxis: { title: 'Horas del año (ordenadas por precio desc.)' },
            yaxis: { title: '€/MWh' },
            annotations: [
                { x: 4380, y: R.precioMediana, text: `P50: ${R.precioMediana.toFixed(0)}€`,
                  showarrow: true, arrowhead: 2, arrowcolor: '#3b82f6',
                  font: { size: 10, color: '#3b82f6' }, bgcolor: 'rgba(15,23,42,0.85)' },
            ],
        });

        Plotly.newPlot(divId, traces, lyt, PLOTLY_CONFIG);
    }

    /** Helper: línea vertical en un histograma */
    function _vline(xval, color, dash) {
        return {
            type: 'line', x0: xval, x1: xval, yref: 'paper', y0: 0, y1: 1,
            line: { color, width: 1.5, dash },
        };
    }
    /** Helper: anotación junto a línea vertical */
    function _vanno(x, y, text, color) {
        return {
            x, y, yref: 'paper', xanchor: 'left', yanchor: 'bottom',
            showarrow: false, text,
            font: { size: 9, color },
            bgcolor: 'rgba(15,23,42,0.7)',
        };
    }

    // =====================================================================
    //  3. COMPARACIÓN CON 2025 (BARRAS)
    // =====================================================================

    function plotBarras(divId, params, resultados) {
        const D = SEF.DATOS_2025;
        const cats = ['Nuclear', 'Solar', 'Eólica', 'Hidro', 'Gas'];
        const v2025 = [D.nuclearTWh, D.solarTWh, D.eolicaTWh, D.hidroTWh, D.gasTWh];

        const fc = SEF.FC_HISTORICOS;
        const nucGW = resultados.nuclearEfectivaGW ?? params.nuclear;
        const vSim = [
            nucGW * fc.nuclear * 8760 / 1000,
            params.solar * fc.solar * 8760 / 1000,
            params.eolica * fc.eolica * 8760 / 1000,
            params.hidraulica * fc.hidro * 8760 / 1000 * params.hidraulicidad,
            resultados.consumoGasTWh,
        ];

        const traces = [
            {
                x: cats, y: v2025, name: '2025', type: 'bar',
                marker: { color: 'rgba(251,191,36,0.65)', line: { color: '#fbbf24', width: 1 } },
                hovertemplate: '%{x}: %{y:.1f} TWh<extra>2025</extra>',
            },
            {
                x: cats, y: vSim, name: 'Simulación', type: 'bar',
                marker: { color: 'rgba(0,245,212,0.65)', line: { color: '#00f5d4', width: 1 } },
                hovertemplate: '%{x}: %{y:.1f} TWh<extra>Sim</extra>',
            }
        ];

        const lyt = layout({
            margin: { t: 5, r: 5, b: 30, l: 40 },
            barmode: 'group', bargap: 0.3,
            yaxis: { title: 'TWh' },
            legend: { orientation: 'h', y: -0.3, font: { size: 9 } },
        });

        Plotly.newPlot(divId, traces, lyt, PLOTLY_CONFIG);
    }

    // =====================================================================
    //  4. DESGLOSE MENSUAL (BARRAS APILADAS)
    // =====================================================================

    function plotMensual(divId, mensual) {
        if (!mensual) return;
        const x = SEF.MESES;
        const techs = [
            { key: 'nuclear',     name: 'Nuclear',    color: C.nuclear },
            { key: 'solar',       name: 'Solar',      color: C.solar },
            { key: 'eolica',      name: 'Eólica',     color: C.eolica },
            { key: 'hidraulica',  name: 'Hidráulica', color: C.hidro },
            { key: 'baterias',    name: 'Almacen.',   color: C.baterias },
            { key: 'importacion', name: 'Import.',    color: C.importar },
            { key: 'gas',         name: 'Gas CCGT',   color: C.gas },
        ];

        const traces = techs.map(t => ({
            x, y: mensual.map(m => m[t.key]),
            name: t.name, type: 'bar',
            marker: { color: t.color.fill, line: { color: t.color.line, width: 0.5 } },
            hovertemplate: `${t.name}: %{y:.1f} TWh<extra></extra>`,
        }));

        // Línea de demanda
        traces.push({
            x, y: mensual.map(m => m.demanda),
            name: 'Demanda', type: 'scatter', mode: 'lines+markers',
            line: { color: '#f8fafc', width: 2, dash: 'dot' },
            marker: { size: 4, color: '#f8fafc' },
            hovertemplate: 'Demanda: %{y:.1f} TWh<extra></extra>',
        });

        const lyt = layout({
            margin: { t: 10, r: 10, b: 35, l: 50 },
            barmode: 'stack', bargap: 0.2,
            yaxis: { title: 'TWh' },
            legend: { orientation: 'h', y: -0.22, font: { size: 8 } },
        });

        Plotly.newPlot(divId, traces, lyt, PLOTLY_CONFIG);
    }

    // =====================================================================
    //  5. PRECIOS MENSUALES MEDIOS
    // =====================================================================

    function plotPreciosMensuales(divId, mensual) {
        if (!mensual) return;
        const x = SEF.MESES;
        const y = mensual.map(m => m.precioMedio);

        const traces = [{
            x, y, type: 'bar', name: 'Precio medio',
            marker: {
                color: y.map(v => v > 100 ? 'rgba(239,68,68,0.7)' :
                                  v > 70  ? 'rgba(251,191,36,0.7)' :
                                            'rgba(0,245,212,0.6)'),
                line: {
                    color: y.map(v => v > 100 ? '#ef4444' : v > 70 ? '#fbbf24' : '#00f5d4'),
                    width: 1
                },
            },
            hovertemplate: '%{x}: %{y:.1f} €/MWh<extra></extra>',
        }, {
            x, y: Array(12).fill(SEF.DATOS_2025.precioMedio),
            type: 'scatter', mode: 'lines', name: 'Media 2025',
            line: { color: '#fbbf24', width: 1.5, dash: 'dash' },
        }];

        const lyt = layout({
            margin: { t: 10, r: 10, b: 35, l: 50 },
            yaxis: { title: '€/MWh' },
            legend: { orientation: 'h', y: -0.22, font: { size: 8 } },
            bargap: 0.25,
        });

        Plotly.newPlot(divId, traces, lyt, PLOTLY_CONFIG);
    }

    // =====================================================================
    //  EXPORTAR AL NAMESPACE GLOBAL
    // =====================================================================

    SEF.Charts = {
        plotMix,
        plotPrecios,
        plotBarras,
        plotMensual,
        plotPreciosMensuales,
    };

})();
