import { createConfig } from '../../../eslint.config.mjs';

export default [
    {
        ignores: ['test/fixtures', 'dist', 'version.js', '**/playwright-report/**']
    },
    ...createConfig(import.meta.dirname),
    {
        rules: {
            'no-console': 'off'
        }
    }
];
