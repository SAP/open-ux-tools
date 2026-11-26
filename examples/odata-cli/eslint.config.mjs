import { createConfig } from '../../eslint.config.mjs';

export default [
    ...createConfig(import.meta.dirname),
    {
        rules: {
            'no-console': 'off'
        }
    }
];
