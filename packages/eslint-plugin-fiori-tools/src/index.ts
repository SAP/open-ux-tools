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
    rules: rules as Record<string, any>,
    configs: {},
    processors: {}
};

const commonConfig = {
    files: ['**/manifest.json'],
    language: '@sap-ux/eslint-plugin-fiori-tools/fioriElements',
    plugins: {
        '@sap-ux/eslint-plugin-fiori-tools': plugin
    }
};

Object.assign(plugin.configs as {}, {
    'Base-requirements': {
        ...commonConfig,
        rules: {}
    },
    'FE-requirements': {
        ...commonConfig,
        rules: {}
    },
    'SAP-consistency': {
        ...commonConfig,
        rules: { '@sap-ux/eslint-plugin-fiori-tools/flex-enabled': 'warn' }
    },
    'ERP-consistency': {
        ...commonConfig,
        rules: {}
    }
});

export default plugin;

module.exports = plugin;
