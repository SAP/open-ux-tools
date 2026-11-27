import { createConfig } from '../../eslint.config.mjs';

export default [
    ...createConfig(import.meta.dirname),
    {
        rules: {
            // switched off temporarily until logger for webapps
            'no-console': 'off'
        },
        settings: {
            'react': {
                'version': 'detect'
            }
        }
    },
];