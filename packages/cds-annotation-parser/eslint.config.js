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
            }
        }
    },
    {
        'rules': {
            '@typescript-eslint/naming-convention': [
                'off',
                { 'selector': 'variable', 'format': ['UPPER_CASE', 'snake_case'] }
            ]
        }
    },
    {
        'files': ['src/parser/parser.ts'],
        'rules': {
            'new-cap': [
                'warn',
                {
                    'capIsNew': false
                }
            ]
        }
    },
    {
        'files': ['src/parser/tokens.ts'],
        'rules': {
            'camelcase': [
                'warn',
                {
                    'properties': 'never'
                }
            ]
        }
    }
];
