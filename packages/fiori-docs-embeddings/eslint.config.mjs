import { createConfig } from '../../eslint.config.mjs';

export default [
    {
        ignores: ['dist/**', 'data/**', 'coverage/**', 'index.js', 'index.d.ts'],
    },
    ...createConfig(import.meta.dirname)
];