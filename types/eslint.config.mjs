import { createConfig } from '../eslint.config.mjs';

export default [
    ...createConfig(import.meta.dirname),
    {
        rules: {
            "semi": "off"
        }
    }
];
