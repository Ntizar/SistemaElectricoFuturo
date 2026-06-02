import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: [
                'index.html',
                'js/constants.js',
                'js/theme.js',
                'js/nuclear.js',
                'js/weather.js',
                'js/demand.js',
                'js/storage.js',
                'js/policy.js',
                'js/scenarios.js',
                'js/simulator.js',
                'js/montecarlo.js',
                'js/trajectory.js',
                'js/charts.js',
                'js/ree-data.js',
                'js/app.js',
            ],
        },
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.js'],
        testTimeout: 30000,
    },
});
