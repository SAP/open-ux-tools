const { ignores } = require('eslint-plugin-prettier/recommended');
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
                project: './tsconfig.eslint.json'
            }
        },
        'rules': {
            '@typescript-eslint/no-use-before-define': ['off']
        }
    }
];
