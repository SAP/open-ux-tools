const { defineConfig } = require('eslint/config');
const babelParser = require('@babel/eslint-parser');
const js = require('@eslint/js');

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
            'test/**'
        ],

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
            ...js.configs.recommended.rules,
            '@sap-ux/fiori-tools/sap-no-global-variable': 'error',
            '@sap-ux/fiori-tools/sap-no-jquery-device-api': 'warn',
            '@sap-ux/fiori-tools/sap-no-hardcoded-color': 'error',
            '@sap-ux/fiori-tools/sap-no-hardcoded-url': 'error',
            '@sap-ux/fiori-tools/sap-no-localstorage': 'error',
            '@sap-ux/fiori-tools/sap-no-override-rendering': 'error',
            '@sap-ux/fiori-tools/sap-no-override-storage-prototype': 'error',
            '@sap-ux/fiori-tools/sap-no-sessionstorage': 'error',
            '@sap-ux/fiori-tools/sap-no-ui5base-prop': 'error',
            '@sap-ux/fiori-tools/sap-message-toast': 'warn',
            '@sap-ux/fiori-tools/sap-no-ui5-prop-warning': 'warn',
            '@sap-ux/fiori-tools/sap-no-localhost': 'warn',
            '@sap-ux/fiori-tools/sap-usage-basemastercontroller': 'warn',
            '@sap-ux/fiori-tools/sap-no-absolute-component-path': 'error',
            '@sap-ux/fiori-tools/sap-no-encode-file-service': 'warn',
            '@sap-ux/fiori-tools/sap-no-dom-insertion': 'warn',
            '@sap-ux/fiori-tools/sap-cross-application-navigation': 'warn',
            '@sap-ux/fiori-tools/sap-no-location-usage': 'warn',
            '@sap-ux/fiori-tools/sap-timeout-usage': 'warn',
            '@sap-ux/fiori-tools/sap-no-proprietary-browser-api': 'warn',
            '@sap-ux/fiori-tools/sap-no-dom-access': 'warn',
            '@sap-ux/fiori-tools/sap-no-history-manipulation': 'warn',
            '@sap-ux/fiori-tools/sap-no-global-selection': 'warn',
            '@sap-ux/fiori-tools/sap-no-location-reload': 'error',
            '@sap-ux/fiori-tools/sap-no-global-event': 'error',
            '@sap-ux/fiori-tools/sap-no-exec-command': 'error',
            '@sap-ux/fiori-tools/sap-no-br-on-return': 'error',
            '@sap-ux/fiori-tools/sap-no-dynamic-style-insertion': 'error',
            '@sap-ux/fiori-tools/sap-no-element-creation': 'error',
            '@sap-ux/fiori-tools/sap-no-global-define': 'error',
            '@sap-ux/fiori-tools/sap-forbidden-window-property': 'warn',
            '@sap-ux/fiori-tools/sap-no-navigator': 'error',
            '@sap-ux/fiori-tools/sap-no-inner-html-write': 'error',
            '@sap-ux/fiori-tools/sap-no-inner-html-access': 'warn',
            '@sap-ux/fiori-tools/sap-bookmark-performance': 'warn',
            '@sap-ux/fiori-tools/sap-no-commons-usage': 'error',
            '@sap-ux/fiori-tools/sap-ui5-no-private-prop': 'off',
            '@sap-ux/fiori-tools/sap-browser-api-error': 'off',
            '@sap-ux/fiori-tools/sap-browser-api-warning': 'warn',
            '@sap-ux/fiori-tools/sap-no-window-alert': 'off',
            '@sap-ux/fiori-tools/sap-ui5-legacy-jquerysap-usage': 'warn',
            '@sap-ux/fiori-tools/sap-ui5-global-eval': 'warn',
            '@sap-ux/fiori-tools/sap-ui5-legacy-factories': 'warn',
            '@sap-ux/fiori-tools/sap-ui5-forms': 'warn'
        }
    }
]);
