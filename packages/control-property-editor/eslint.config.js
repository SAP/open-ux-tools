const base = require('../../eslint.config.js');

module.exports = [
    ...base,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            },
        },
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