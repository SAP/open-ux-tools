const base = require('../../eslint.config.js');
const tseslint = require('typescript-eslint');
const tsParser = tseslint.parser;

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