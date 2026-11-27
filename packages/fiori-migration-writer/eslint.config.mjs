import { createConfig } from '../../eslint.config.mjs';

export default [
    {
        ignores: ['test/input/**', 'test-output/**']
    },
    ...createConfig(import.meta.dirname),
    {
        files: ['test/**/*.ts'],
        rules: {
            'import/no-unresolved': ['error', { ignore: ['^@sap-ux/fiori-migration-writer$'] }]
        }
    }
];
