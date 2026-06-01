// eslint.config.js — Flat config para ESLint v10
// Reemplaza .eslintrc.json que ESLint v10+ ya no soporta

import globals from 'globals';

export default [
    {
        files: ['js/**/*.js', 'tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.es2021,
                ...globals.node,
                SEF: 'readonly',
                Vue: 'readonly',
                Plotly: 'readonly',
                C: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            eqeqeq: ['error', 'always'],
            semi: ['error', 'always'],
            quotes: ['error', 'single'],
        },
    },
    {
        ignores: ['node_modules/', 'dist/', '*.min.js'],
    },
];
