import { createConfig } from '../../eslint.config.mjs';

export default [
    ...createConfig(import.meta.dirname),
    {
        rules: {
            "sonarjs/no-implicit-dependencies": "warn",
        }
    },
];