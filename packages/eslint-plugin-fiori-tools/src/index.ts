import { FioriElementsLanguage } from './language/fiori-elements-language';
import type { Plugin } from '@eslint/config-helpers';
import rules from './rules';

const plugin: Plugin = {
    meta: {
        name: '@sap-ux/eslint-plugin-fiori-tools',
        version: '0.0.1',
        namespace: '@sap-ux/fiori-tools'
    },
    languages: {
        fioriElements: new FioriElementsLanguage()
    },
    rules,
    configs: {},
    processors: {}
};

Object.assign(plugin.configs as {}, {
    '@sap-ux/fiori-tools/Base-requirements': {
        files: ['**/manifest.json'],
        language: '@sap-ux/fiori-tools/fioriElements',
        plugins: {
            '@sap-ux/fiori-tools': plugin
        },
        rules: {}
    },
    '@sap-ux/fiori-tools/FE-requirements': {
        files: ['**/manifest.json'],
        language: '@sap-ux/fiori-tools/fioriElements',
        plugins: {
            '@sap-ux/fiori-tools': plugin
        },
        rules: {}
    },
    '@sap-ux/fiori-tools/SAP-consistency': {
        files: ['**/manifest.json'],
        language: '@sap-ux/fiori-tools/fioriElements',
        plugins: {
            '@sap-ux/fiori-tools': plugin
        },
        rules: { '@sap-ux/fiori-tools/flex-enabled': 'warn' }
    },
    '@sap-ux/fiori-tools/ERP-consistency': {
        files: ['**/manifest.json'],
        language: '@sap-ux/fiori-tools/fioriElements',
        plugins: {
            '@sap-ux/fiori-tools': plugin
        },
        rules: {}
    }
});

export default plugin;

module.exports = plugin;
