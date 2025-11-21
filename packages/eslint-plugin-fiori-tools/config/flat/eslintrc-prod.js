const { defineConfig } = require('eslint/config');

const fioriCustom = require('eslint-plugin-fiori-custom');
const js = require('@eslint/js');

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([
    {
        files: ['./webapp/**/*.js', './webapp/**/*.ts'],

        ignores: [
            'target/**',
            'webapp/test/**',
            'webapp/localservice/**',
            'backup/**',
            '**/Gruntfile.js',
            '**/changes_preview.js',
            '**/changes_preview.ts',
            '**/gulpfile.js',
            '**/*.d.ts',
            '**/*.d.ts',
            'test/**'
        ],

        extends: compat.extends('eslint:recommended', 'plugin:fiori-custom/fioriToolsDefault'),

        plugins: {
            'fiori-custom': fioriCustom
        }
    }
]);
