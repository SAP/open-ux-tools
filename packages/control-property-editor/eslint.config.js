const base = require('../../eslint.config.js');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
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