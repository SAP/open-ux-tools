import { createConfig } from '../../eslint.config.mjs';

export default [
    {
        ignores: ['dist', 'prebuilds'],
    },
    ...createConfig(import.meta.dirname)
];
