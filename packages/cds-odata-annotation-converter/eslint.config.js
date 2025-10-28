const { ignores } = require('eslint-plugin-prettier/recommended');
const base = require('../../eslint.config.js');
module.exports = [
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: '@typescript-eslint/parser',
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json'
            }
        },
        'rules': {
            '@typescript-eslint/no-use-before-define': ['off']
        }
    }
];
