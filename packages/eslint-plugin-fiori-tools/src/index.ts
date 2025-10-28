import { JSONLanguage, JSONSourceCode } from '@eslint/json';
import type { Plugin } from '@eslint/config-helpers';
import rules from './rules';

//------------------------------------------------------------------------------
// Plugin Definition
//------------------------------------------------------------------------------

const plugin: Plugin = {
    meta: {
        name: 'eslint-plugin-fiori-tools',
        version: '0.0.1'
    },
    languages: {
        json: new JSONLanguage({ mode: 'json' })
    },
    rules,
    configs: {
        manifest: {
            plugins: {},
            rules: { 'consistency/flex-enabled': 'warn' }
        }
    }
};

(plugin.configs!.manifest as any).plugins.consistency = plugin;

module.exports = plugin;
module.exports.default = plugin;
module.exports.JSONSourceCode = JSONSourceCode;
