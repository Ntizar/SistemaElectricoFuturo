/**
 * ============================================================================
 *  TEMA Y TOKENS REACTIVOS
 * ============================================================================
 */

'use strict';

(function() {
    const listeners = new Set();
    const STORAGE_KEY = 'sef-theme';

    function bodyRoot() {
        return document.body;
    }

    function currentTheme() {
        return bodyRoot()?.getAttribute('data-nz-theme') || 'light';
    }

    function setTheme(theme) {
        const next = theme === 'dark' ? 'dark' : 'light';
        const root = bodyRoot();
        if (!root) return next;
        root.classList.add('nz');
        root.setAttribute('data-nz-theme', next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch (err) {
            // localStorage puede fallar en modo privado o sandbox.
        }
        listeners.forEach(cb => cb(next));
        return next;
    }

    function init() {
        let saved = 'light';
        try {
            saved = window.localStorage.getItem(STORAGE_KEY) || 'light';
        } catch (err) {
            saved = 'light';
        }
        return setTheme(saved);
    }

    function toggle() {
        return setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    }

    function on(callback) {
        if (typeof callback !== 'function') return () => {};
        listeners.add(callback);
        return () => listeners.delete(callback);
    }

    function token(name, fallback) {
        const root = bodyRoot();
        if (!root) return fallback;
        const value = getComputedStyle(root).getPropertyValue(name).trim();
        return value || fallback;
    }

    function plotlyLayout() {
        return {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: {
                family: 'Inter, system-ui, sans-serif',
                color: token('--nz-text-default', '#475569'),
                size: 11,
            },
            hoverlabel: {
                bgcolor: token('--nz-color-slate-900', '#0f172a'),
                bordercolor: token('--nz-border-default', 'rgba(148,163,184,0.22)'),
                font: {
                    family: 'Inter, system-ui, sans-serif',
                    color: token('--nz-color-slate-50', '#f8fafc'),
                    size: 11,
                },
            },
            legend: {
                orientation: 'h',
                y: -0.22,
                bgcolor: 'rgba(0,0,0,0)',
                borderwidth: 0,
                font: { size: 10 },
            },
            margin: { t: 24, r: 12, b: 42, l: 56 },
            xaxis: {
                color: token('--nz-text-default', '#475569'),
                gridcolor: token('--nz-border-soft', 'rgba(148,163,184,0.12)'),
                zerolinecolor: token('--nz-border-default', 'rgba(148,163,184,0.18)'),
            },
            yaxis: {
                color: token('--nz-text-default', '#475569'),
                gridcolor: token('--nz-border-soft', 'rgba(148,163,184,0.12)'),
                zerolinecolor: token('--nz-border-default', 'rgba(148,163,184,0.18)'),
            },
        };
    }

    SEF.Theme = {
        init,
        setTheme,
        toggle,
        on,
        currentTheme,
        plotlyLayout,
        token,
    };
})();
