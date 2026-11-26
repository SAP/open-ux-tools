import { createConfig } from '../../eslint.config.mjs';

export default [
    {
        ignores: ['scripts']
    },
    ...createConfig(import.meta.dirname)
];
