import { JSONLanguage } from '@eslint/json';
import type { Plugin, Config } from '@eslint/config-helpers';
import rules from './rules';

const plugin: Plugin = {
    meta: {
        name: 'eslint-plugin-fiori-tools',
        version: '0.0.1'
    },
    languages: {
        json: new JSONLanguage({ mode: 'json' })
    },
    rules
};

const commonConfig: Config = {
    files: ['**/manifest.json'],
    plugins: { consistency: plugin },
    language: 'consistency/json'
};

const v2: Config = {
    ...commonConfig,
    rules: { 'consistency/flex-enabled': 'warn' }
};
const v4: Config = {
    ...commonConfig,
    rules: {
        'consistency/flex-enabled': 'error'
    }
};

// Export the plugin as default and attach the configs
module.exports = plugin;
module.exports.default = plugin;
module.exports.v2 = v2;
module.exports.v4 = v4;
export default plugin;
export { v2, v4 };
