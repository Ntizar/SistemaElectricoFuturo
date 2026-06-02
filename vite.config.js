import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.js'],
        testTimeout: 30000,
    },
});
