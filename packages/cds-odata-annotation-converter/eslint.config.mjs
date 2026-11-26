import { createConfig } from '../../eslint.config.mjs';

export default [
    ...createConfig(import.meta.dirname),
    {
        ignores: ['**/*.cjs']
    },
    {
        'rules': {
            '@typescript-eslint/no-use-before-define': ['off']
        }
    }
];
