const { rules } = require('eslint-plugin-fiori-custom');
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
        rules: {
            '@typescript-eslint/no-require-imports': 'warn'
        }
    }
];
