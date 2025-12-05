const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
    {
        files: ['**/webapp/manifest.json'],

        language: '@sap-ux/fiori-tools/fioriElements',

        plugins: {
            '@sap-ux/fiori-tools': require('../lib/index.js').default
        },

        rules: {
            '@sap-ux/fiori-tools/flex-enabled': 'warn'
        }
    }
]);
