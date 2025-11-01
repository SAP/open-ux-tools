const { defineConfig, globalIgnores } = require('eslint/config');

const js = require('@eslint/js');

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([
    {
        extends: compat.extends('../../.eslintrc'),

        languageOptions: {
            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: __dirname
            }
        }
    },
    globalIgnores(['**/dist', '**/lib', '**/.eslintrc*.js'])
]);
