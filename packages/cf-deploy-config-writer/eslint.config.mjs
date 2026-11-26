import { createConfig } from '../../eslint.config.mjs';

export default [
    {
        ignores: ['test/jest.setup.mjs']
    },
    ...createConfig(import.meta.dirname)
];
