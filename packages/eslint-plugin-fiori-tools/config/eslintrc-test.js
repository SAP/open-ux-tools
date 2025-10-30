const { defineConfig } = require('eslint/config');
const babelParser = require('@babel/eslint-parser');

module.exports = defineConfig([{
    files: ['webapp/test/**/*.js', 'webapp/test/**/*.ts'],
    ignores: ['**/*.d.ts'],

    languageOptions: {
        parser: babelParser,
        parserOptions: {
            requireConfigFile: false
        }
    },

    plugins: {
        '@sap-ux/fiori-tools': require('../lib/index.js')
    },

    rules: {
        '@sap-ux/fiori-tools/sap-opa5-autowait-true': 'warn'
    }
}]);
