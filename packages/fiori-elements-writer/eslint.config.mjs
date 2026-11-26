import { createConfig } from '../../eslint.config.mjs';

export default [
    {
        ignores: ['**/*.cjs']
    },
    ...createConfig(import.meta.dirname)
];