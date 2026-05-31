/**
 * ============================================================================
 *  MODULO DE GRAFICOS - Plotly.js
 * ============================================================================
 */

'use strict';

(function() {
    const C = SEF.COLORES;
    const PLOTLY_CONFIG = { responsive: true, displayModeBar: false };

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

    function layout(custom = {}) {
        const themedBase = SEF.Theme ? SEF.Theme.plotlyLayout() : SEF.PLOTLY_LAYOUT_BASE;
        return mergeDeep(JSON.parse(JSON.stringify(themedBase)), custom);
    }

    function markerColor(hex, alpha) {
        if (hex.startsWith('rgba')) return hex;
        if (!hex.startsWith('#') || hex.length !== 7) return hex;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function plotOrReact(divId, traces, lyt) {
        const node = document.getElementById(divId);
        if (!node) return;
        if (node.data) {
            Plotly.react(divId, traces, lyt, PLOTLY_CONFIG);
        } else {
            Plotly.newPlot(divId, traces, lyt, PLOTLY_CONFIG);
        }
    }

    function stackTrace(x, y, name, color, group = 'one') {
        return {
            x,
            y,
            name,
            type: 'scatter',
            stackgroup: group,
            fillcolor: color.fill,
            line: { width: 0.8, color: color.line },
            hovertemplate: `${name}: %{y:.1f} GW<extra></extra>`,
        };
    }

    function totalStackY(data) {
        if (!data || !data.length) return [];
        const totals = data.map((_, i) => data.reduce((s, d) => s + (d.nuclear || 0) + (d.solar || 0) + (d.eolica || 0) + (d.offshore || 0) + (d.hidraulica || 0) + (d.baterias || 0) + (d.bombeo || 0) + (d.v2g || 0) + (d.importacion || 0) + (d.gas || 0), 0));
        return totals;
    }

    function pctTrace(x, y, name, color, totalY, group = 'one') {
        return {
            x,
            y,
            name,
            type: 'scatter',
            stackgroup: group,
            fillcolor: color.fill,
            line: { width: 0.8, color: color.line },
            hovertemplate: `${name}: %{y:.1f} GW (%{customdata:.1f}% del total)<extra></extra>`,
            customdata: totalY.map((t, i) => t > 0 ? (y[i] / t) * 100 : 0),
        };
    }

    function plotMix(divId, mix, opts = {}) {
        if (!mix || !mix.length) return;
        if (opts.vistaAnual) {
            plotMixAnual(divId, mix);
        } else {
            plotMixSemanal(divId, mix, opts.semana || 25);
        }
    }

    function plotMixSemanal(divId, mix, semana) {
        const inicio = 168 * semana;
        const data = mix.slice(inicio, inicio + 168);
        const x = data.map((_, i) => i);
        const totalY = totalStackY(data);
        const traces = [
            pctTrace(x, data.map(g => g.nuclear), 'Nuclear', C.nuclear, totalY),
            pctTrace(x, data.map(g => g.solar), 'Solar FV', C.solar, totalY),
            pctTrace(x, data.map(g => g.eolica), 'Eolica', C.eolica, totalY),
            pctTrace(x, data.map(g => g.offshore || 0), 'Eolica marina', C.offshore, totalY),
            pctTrace(x, data.map(g => g.hidraulica), 'Hidraulica', C.hidro, totalY),
            pctTrace(x, data.map(g => g.baterias + g.bombeo + g.v2g), 'Almacen. descarga', C.baterias, totalY),
            pctTrace(x, data.map(g => g.importacion), 'Importacion', C.importar, totalY),
            pctTrace(x, data.map(g => g.gas), 'Gas CCGT', C.gas, totalY),
            pctTrace(x, data.map(g => -(g.cargaBaterias + g.cargaBombeo)), 'Almacen. carga', C.bombeo, totalY, 'two'),
        ];

        const lyt = layout({
            xaxis: {
                title: `Semana ${semana}`,
                tickvals: [12, 36, 60, 84, 108, 132, 156],
                ticktext: SEF.DIAS_SEMANA,
            },
            yaxis: { title: 'GW', zeroline: true },
        });

        plotOrReact(divId, traces, lyt);
    }

    function plotMixAnual(divId, mix) {
        const dias = [];
        for (let d = 0; d < 365; d++) {
            const bloque = mix.slice(d * 24, d * 24 + 24);
            const avg = key => bloque.reduce((s, g) => s + (g[key] || 0), 0) / 24;
            dias.push({
                nuclear: avg('nuclear'),
                solar: avg('solar'),
                eolica: avg('eolica'),
                offshore: avg('offshore'),
                hidraulica: avg('hidraulica'),
                gas: avg('gas'),
                almacenamiento: bloque.reduce((s, g) => s + g.baterias + g.bombeo + g.v2g, 0) / 24,
                importacion: avg('importacion'),
            });
        }

        const x = dias.map((_, i) => i);
        const traces = [
            stackTrace(x, dias.map(d => d.nuclear), 'Nuclear', C.nuclear),
            stackTrace(x, dias.map(d => d.solar), 'Solar FV', C.solar),
            stackTrace(x, dias.map(d => d.eolica), 'Eolica', C.eolica),
            stackTrace(x, dias.map(d => d.offshore), 'Eolica marina', C.offshore),
            stackTrace(x, dias.map(d => d.hidraulica), 'Hidraulica', C.hidro),
            stackTrace(x, dias.map(d => d.almacenamiento), 'Almacenamiento', C.baterias),
            stackTrace(x, dias.map(d => d.importacion), 'Importacion', C.importar),
            stackTrace(x, dias.map(d => d.gas), 'Gas CCGT', C.gas),
        ];

        const lyt = layout({
            xaxis: { title: 'Dia del anio', tickvals: [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349], ticktext: SEF.MESES },
            yaxis: { title: 'GW (media diaria)' },
        });

        plotOrReact(divId, traces, lyt);
    }

    function plotPrecios(divId, precios, resultados, opts = {}) {
        if (!precios || !precios.length) return;
        const vista = opts.vista || 'semana';
        if (vista === 'semana') {
            plotPreciosSemana(divId, precios, opts.semana || 25);
        } else if (vista === 'anual') {
            plotPreciosHistograma(divId, precios, resultados);
        } else {
            plotPreciosDuracion(divId, precios, resultados);
        }
    }

    function plotPreciosSemana(divId, precios, semana) {
        const inicio = 168 * semana;
        const data = precios.slice(inicio, inicio + 168);
        const max = Math.max(...data);
        const min = Math.min(...data);
        const media = data.reduce((s, v) => s + v, 0) / data.length;
        const horasNegativas = data.filter(v => v < 0).length;
        const horasAlto = data.filter(v => v > 120).length;

        const traces = [
            {
                x: data.map((_, i) => i),
                y: data,
                name: 'Precio',
                type: 'scatter',
                fill: 'tozeroy',
                fillcolor: C.precio.fill,
                line: { color: C.precio.line, width: 1.8 },
                hovertemplate: 'Hora %{x}: %{y:.1f} €/MWh<br><span style="font-size:10px">Media semana: %{customdata[0]:.1f} €/MWh · Neg: %{customdata[1]}h · Alto: %{customdata[2]}h</span><extra></extra>',
                customdata: [[media, horasNegativas, horasAlto], Array(data.length).fill([media, horasNegativas, horasAlto])],
            },
            {
                x: data.map((_, i) => i),
                y: Array(data.length).fill(SEF.DATOS_2025.precioMedio),
                name: 'Media 2025',
                type: 'scatter',
                line: { color: C.ref2025.line, width: 2, dash: 'dash' },
                hovertemplate: '%{y:.0f} €/MWh<extra>Media REE 2025</extra>',
            },
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
        });

        plotOrReact(divId, traces, lyt);
    }

    function plotPreciosHistograma(divId, precios, R) {
        const traces = [{
            type: 'histogram',
            x: precios,
            name: 'Horas del anio',
            nbinsx: 80,
            marker: {
                color: markerColor(C.precio.line, 0.28),
                line: { color: C.precio.line, width: 0.6 },
            },
            hovertemplate: 'Rango: €%{x:.0f}<br>Horas: %{y}<br>% del total: %{customdata:.1f}%<extra></extra>',
            customdata: precios.map(() => 100 / precios.length),
        }];

        const lyt = layout({
            margin: { t: 10, r: 10, b: 40, l: 50 },
            bargap: 0.03,
            xaxis: {
                title: '€/MWh (distribucion anual)',
                range: [Math.min(-30, R.precioP10 - 40), Math.max(260, R.precioMax + 30)],
            },
            yaxis: { title: 'Horas' },
            shapes: [
                vline(R.precioP10, '#f59e0b', 'dot'),
                vline(R.precioMediana, '#2563eb', 'solid'),
                vline(R.precioP90, '#dc2626', 'dot'),
                vline(R.precioMedioPonderado, C.precio.line, 'dash'),
            ],
            annotations: [
                vanno(R.precioMedioPonderado, 1.0, 'Media pond.', C.precio.line),
                vanno(R.precioMediana, 0.94, 'P50', '#2563eb'),
                vanno(R.precioP10, 0.88, 'P10', '#f59e0b'),
                vanno(R.precioP90, 0.88, 'P90', '#dc2626'),
            ],
        });

        plotOrReact(divId, traces, lyt);
    }

    function plotPreciosDuracion(divId, precios, R) {
        const sorted = [...precios].sort((a, b) => b - a);
        const media = precios.reduce((s, v) => s + v, 0) / precios.length;
        const horasNeg = precios.filter(v => v < 0).length;
        const horasAlto = precios.filter(v => v > 120).length;
        const precioMedioPond = R.precioMedioPonderado || media;
        const traces = [
            {
                x: sorted.map((_, i) => i),
                y: sorted,
                name: 'Precio',
                type: 'scatter',
                fill: 'tozeroy',
                fillcolor: markerColor(C.precio.line, 0.14),
                line: { color: C.precio.line, width: 1.8 },
                hovertemplate: 'Hora ordenada: %{x}<br>Precio: %{y:.1f} €/MWh<br><span style="font-size:10px">Ponderado: %{customdata[0]:.1f} €/MWh · Neg: %{customdata[1]}h · Alto: %{customdata[2]}h</span><extra></extra>',
                customdata: [[precioMedioPond, horasNeg, horasAlto], Array(sorted.length).fill([precioMedioPond, horasNeg, horasAlto])],
            },
            {
                x: sorted.map((_, i) => i),
                y: Array(sorted.length).fill(SEF.DATOS_2025.precioMedio),
                name: 'Media 2025',
                type: 'scatter',
                line: { color: C.ref2025.line, width: 1.5, dash: 'dash' },
            },
        ];

        const lyt = layout({
            margin: { t: 10, r: 10, b: 40, l: 50 },
            xaxis: { title: 'Horas del anio ordenadas por precio' },
            yaxis: { title: '€/MWh' },
            annotations: [
                {
                    x: 4380,
                    y: R.precioMediana,
                    text: `P50: ${R.precioMediana.toFixed(0)}€`,
                    showarrow: true,
                    arrowhead: 2,
                    arrowcolor: '#2563eb',
                    font: { size: 10, color: '#2563eb' },
                    bgcolor: SEF.Theme.token('--nz-color-slate-900', '#0f172a'),
                },
            ],
        });

        plotOrReact(divId, traces, lyt);
    }

    function vline(xval, color, dash) {
        return {
            type: 'line',
            x0: xval,
            x1: xval,
            yref: 'paper',
            y0: 0,
            y1: 1,
            line: { color, width: 1.5, dash },
        };
    }

    function vanno(x, y, text, color) {
        return {
            x,
            y,
            yref: 'paper',
            xanchor: 'left',
            yanchor: 'bottom',
            showarrow: false,
            text,
            font: { size: 9, color },
            bgcolor: SEF.Theme.token('--nz-color-slate-900', '#0f172a'),
        };
    }

    function plotBarras(divId, params, resultados) {
        const D = SEF.DATOS_2025;
        const cats = ['Nuclear', 'Solar', 'Eolica', 'Hidro', 'Gas'];
        const v2025 = [D.nuclearTWh, D.solarTWh, D.eolicaTWh, D.hidroTWh, D.gasTWh];
        const monthly = resultados.mensual || [];
        const sum = key => monthly.reduce((total, item) => total + (item[key] || 0), 0);
        const vSim = monthly.length ? [
            sum('nuclear'),
            sum('solar'),
            sum('eolica') + sum('offshore'),
            sum('hidraulica'),
            sum('gas'),
        ] : [0, 0, 0, 0, resultados.consumoGasTWh];

        const traces = [
            {
                x: cats,
                y: v2025,
                name: '2025',
                type: 'bar',
                marker: { color: markerColor(C.ref2025.line, 0.65), line: { color: C.ref2025.line, width: 1 } },
            },
            {
                x: cats,
                y: vSim,
                name: 'Simulacion',
                type: 'bar',
                marker: { color: markerColor(C.precio.line, 0.65), line: { color: C.precio.line, width: 1 } },
            },
        ];

        const lyt = layout({
            margin: { t: 5, r: 5, b: 30, l: 40 },
            barmode: 'group',
            bargap: 0.3,
            yaxis: { title: 'TWh' },
        });

        plotOrReact(divId, traces, lyt);
    }

    function plotMensual(divId, mensual) {
        if (!mensual) return;
        const techs = [
            { key: 'nuclear', name: 'Nuclear', color: C.nuclear },
            { key: 'solar', name: 'Solar', color: C.solar },
            { key: 'eolica', name: 'Eolica', color: C.eolica },
            { key: 'offshore', name: 'Eolica marina', color: C.offshore },
            { key: 'hidraulica', name: 'Hidraulica', color: C.hidro },
            { key: 'baterias', name: 'Almacen.', color: C.baterias },
            { key: 'importacion', name: 'Import.', color: C.importar },
            { key: 'gas', name: 'Gas CCGT', color: C.gas },
        ];

        const traces = techs.map(t => ({
            x: SEF.MESES,
            y: mensual.map(m => m[t.key] || 0),
            name: t.name,
            type: 'bar',
            marker: { color: t.color.fill, line: { color: t.color.line, width: 0.6 } },
            hovertemplate: `${t.name}: %{y:.1f} TWh (%{customdata:.1f}% de la demanda)<extra></extra>`,
            customdata: mensual.map(m => m.demanda > 0 ? ((m[t.key] || 0) / m.demanda) * 100 : 0),
        }));

        traces.push({
            x: SEF.MESES,
            y: mensual.map(m => m.demanda),
            name: 'Demanda',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: SEF.Theme.token('--nz-text-strong', '#0f172a'), width: 2, dash: 'dot' },
            marker: { size: 4, color: SEF.Theme.token('--nz-text-strong', '#0f172a') },
            hovertemplate: 'Demanda: %{y:.1f} TWh · % de gen: %{customdata:.1f}%<extra></extra>',
            customdata: mensual.map(m => m.demanda > 0 ? (m.demanda / m.demanda) * 100 : 0),
        });

        const lyt = layout({
            margin: { t: 10, r: 10, b: 35, l: 50 },
            barmode: 'stack',
            bargap: 0.2,
            yaxis: { title: 'TWh' },
        });

        plotOrReact(divId, traces, lyt);
    }

    function plotPreciosMensuales(divId, mensual) {
        if (!mensual) return;
        const y = mensual.map(m => m.precioMedio);
        const traces = [
            {
                x: SEF.MESES,
                y,
                type: 'bar',
                name: 'Precio medio',
                marker: {
                    color: y.map(v => v > 100 ? markerColor('#dc2626', 0.72) : v > 70 ? markerColor('#f59e0b', 0.72) : markerColor(C.precio.line, 0.64)),
                    line: { color: y.map(v => v > 100 ? '#dc2626' : v > 70 ? '#f59e0b' : C.precio.line), width: 1 },
                },
            },
            {
                x: SEF.MESES,
                y: Array(12).fill(SEF.DATOS_2025.precioMedio),
                type: 'scatter',
                mode: 'lines',
                name: 'Media 2025',
                line: { color: C.ref2025.line, width: 1.5, dash: 'dash' },
            },
        ];

        const lyt = layout({ margin: { t: 10, r: 10, b: 35, l: 50 }, yaxis: { title: '€/MWh' }, bargap: 0.25 });
        plotOrReact(divId, traces, lyt);
    }

    function plotTrajectoryMix(divId, trayectoria) {
        if (!trayectoria?.resumen?.years?.length) return;
        const years = trayectoria.resumen.years;
        const traces = [
            { key: 'nuclear', name: 'Nuclear', color: C.nuclear },
            { key: 'solar', name: 'Solar FV', color: C.solar },
            { key: 'eolica', name: 'Eolica', color: C.eolica },
            { key: 'offshore', name: 'Eolica marina', color: C.offshore },
            { key: 'hidraulica', name: 'Hidraulica', color: C.hidro },
            { key: 'ccgt', name: 'CCGT', color: C.gas },
        ].map(t => ({
            x: years,
            y: years.map(year => trayectoria.porAnio[year].capacidades[t.key] || 0),
            name: t.name,
            type: 'bar',
            marker: { color: t.color.fill, line: { color: t.color.line, width: 0.7 } },
        }));

        const lyt = layout({ barmode: 'stack', yaxis: { title: 'GW instalados' }, xaxis: { title: 'Anio' } });
        plotOrReact(divId, traces, lyt);
    }

    function plotTrajectoryKPIs(divId, trayectoria) {
        if (!trayectoria?.resumen?.years?.length) return;
        const years = trayectoria.resumen.years;
        const traces = [
            {
                x: years,
                y: trayectoria.resumen.precio,
                name: 'Precio medio pond.',
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: C.precio.line, width: 2.2 },
                marker: { size: 6, color: C.precio.line },
                yaxis: 'y1',
            },
            {
                x: years,
                y: trayectoria.resumen.precioP90,
                name: 'P90 precio',
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: '#dc2626', width: 2, dash: 'dot' },
                marker: { size: 5, color: '#dc2626' },
                yaxis: 'y1',
            },
            {
                x: years,
                y: trayectoria.resumen.emisiones,
                name: 'Emisiones',
                type: 'bar',
                marker: { color: markerColor('#475569', 0.45), line: { color: '#334155', width: 0.8 } },
                yaxis: 'y2',
            },
        ];

        const lyt = layout({
            xaxis: { title: 'Anio' },
            yaxis: { title: '€/MWh' },
            yaxis2: { title: 'Mt CO2', overlaying: 'y', side: 'right' },
        });

        plotOrReact(divId, traces, lyt);
    }

    function plotTrajectoryPNIEC(divId, trayectoria) {
        if (!trayectoria?.resumen?.years?.length) return;
        const years = trayectoria.resumen.years;
        const z = [
            years.map(year => trayectoria.porAnio[year].coberturaRenovable),
            years.map(year => trayectoria.porAnio[year].emisionesAnuales),
            years.map(year => trayectoria.porAnio[year].capacidades.solar),
            years.map(year => trayectoria.porAnio[year].capacidades.eolica + trayectoria.porAnio[year].capacidades.offshore),
            years.map(year => trayectoria.porAnio[year].capacidades.almacenamiento),
        ];

        const traces = [{
            type: 'heatmap',
            x: years,
            y: ['% Renovable', 'Mt CO2', 'Solar GW', 'Eolica GW', 'Almacenamiento GW'],
            z,
            colorscale: [
                [0, '#dbeafe'],
                [0.45, '#93c5fd'],
                [0.75, '#fbbf24'],
                [1, '#2563eb'],
            ],
            hovertemplate: '%{y} · %{x}: %{z:.1f}<br><span style="font-size:10px">Objetivo 2030: % Renovable 74%, Solar 81 GW, Eolica 57 GW, Almacenamiento 22 GW</span><extra></extra>',
        }];

        const lyt = layout({ margin: { t: 12, r: 10, b: 42, l: 100 } });
        plotOrReact(divId, traces, lyt);
    }

    SEF.Charts = {
        plotMix,
        plotPrecios,
        plotBarras,
        plotMensual,
        plotPreciosMensuales,
        plotTrajectoryMix,
        plotTrajectoryKPIs,
        plotTrajectoryPNIEC,
    };
})();
