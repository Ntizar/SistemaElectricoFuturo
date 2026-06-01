import globals from 'globals';

export default [
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                SEF: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-undef': 'error',
            'no-console': 'off',
            'no-constant-condition': 'warn',
            'no-empty': 'warn',
            'no-extra-semi': 'warn',
            'no-redeclare': 'error',
            'no-shadow': 'warn',
            'eqeqeq': ['warn', 'smart'],
            'no-var': 'warn',
            'prefer-const': 'warn',
        },
    },
    {
        ignores: ['node_modules/', 'dist/', '*.min.js'],
    },
];
