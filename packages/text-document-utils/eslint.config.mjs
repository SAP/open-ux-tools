import { createConfig } from '../../eslint.config.mjs';

export default [
    ...createConfig(import.meta.dirname),
    {
        ignores: ['dist-cjs/**'],
    },
];