import baseConfig from '../../eslint.config.mjs';

export default [
    {
        ignores: ['test/input/**']
    },
    ...baseConfig,
    {
        files: ['test/**/*.ts'],
        rules: {
            'import/no-unresolved': ['error', { ignore: ['^@sap-ux/fiori-migration-writer$'] }]
        }
    }
];
