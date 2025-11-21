const base = require('../../eslint.config.js');
const { default:  eslintPlugin } = require('eslint-plugin-eslint-plugin');

module.exports = [
    {
        ignores: ['config/**/eslintrc*.js']
    },
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
    },
    eslintPlugin.configs.recommended
];
