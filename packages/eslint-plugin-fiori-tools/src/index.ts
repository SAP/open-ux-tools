import type { Linter } from 'eslint';
import type { Plugin } from '@eslint/config-helpers';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rules } from './rules';
import { FioriLanguage } from './language/fiori-language';

// Read package.json to get version
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as {
    name: string;
    version: string;
};

// Plugin meta information (required for ESLint 9)
export const meta = {
    name: '@sap-ux/eslint-plugin-fiori-tools',
    version: packageJson.version
};

export const languages = {
    fiori: new FioriLanguage()
};

const plugin: Plugin = {
    meta: {
        name: '@sap-ux/eslint-plugin-fiori-tools',
        version: '0.0.1',
        namespace: '@sap-ux/fiori-tools'
    },
    languages: {
        fiori: new FioriLanguage()
    },
    rules: rules as Record<string, any>,
    processors: {}
};

// Named configs for easy consumption
// These use getters for lazy loading to avoid loading config files at require time
// The config files are templates meant for end users and have dependencies that
// may not be available when the plugin itself is loaded
export const configs = {
    // Recommended config for JavaScript projects (prod + test)
    get recommended(): Linter.Config[] {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const commonConfig = require('../config/eslintrc-common.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const prodConfig = require('../config/eslintrc-prod.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const testConfig = require('../config/eslintrc-test.js') as Linter.Config[];
        return [
            // ...commonConfig,
            // ...prodConfig,
            // ...testConfig,
            {
                files: ['**/manifest.json', '**/*.xml', '**/*.cds'],
                language: '@sap-ux/eslint-plugin-fiori-tools/fiori',
                plugins: {
                    '@sap-ux/eslint-plugin-fiori-tools': plugin
                },
                rules: {
                    '@sap-ux/eslint-plugin-fiori-tools/flex-enabled': 'warn',
                    '@sap-ux/eslint-plugin-fiori-tools/require-width-including-column-header': 'warn'
                }
            }
        ];
    },
    // Recommended config for TypeScript projects (prod + test)
    get 'recommended-typescript'(): Linter.Config[] {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const commonConfig = require('../config/eslintrc-common.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const prodConfig = require('../config/eslintrc-prod.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const testConfig = require('../config/eslintrc-test.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const typescriptConfig = require('../config/eslintrc-typescript.js') as Linter.Config[];
        return [...commonConfig, ...typescriptConfig, ...prodConfig, ...testConfig];
    },
    // Production code only
    get 'prod-code'(): Linter.Config[] {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const commonConfig = require('../config/eslintrc-common.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const prodConfig = require('../config/eslintrc-prod.js') as Linter.Config[];
        return [...commonConfig, ...prodConfig];
    },
    // Production code with TypeScript
    get 'prod-code-typescript'(): Linter.Config[] {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const commonConfig = require('../config/eslintrc-common.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const prodConfig = require('../config/eslintrc-prod.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const typescriptConfig = require('../config/eslintrc-typescript.js') as Linter.Config[];
        return [...commonConfig, ...typescriptConfig, ...prodConfig];
    },
    // Test code only
    get 'test-code'(): Linter.Config[] {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const commonConfig = require('../config/eslintrc-common.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const testConfig = require('../config/eslintrc-test.js') as Linter.Config[];
        return [...commonConfig, ...testConfig];
    },
    // Test code with TypeScript
    get 'test-code-typescript'(): Linter.Config[] {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const commonConfig = require('../config/eslintrc-common.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const testConfig = require('../config/eslintrc-test.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const typescriptConfig = require('../config/eslintrc-typescript.js') as Linter.Config[];
        return [...commonConfig, ...typescriptConfig, ...testConfig];
    },
    // manifest.json
    get 'SAP-consistency'(): Linter.Config[] {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const manifestConfig = require('../config/eslintrc-manifest.js') as Linter.Config[];
        return [...manifestConfig];
    }
};

// Legacy config export for backward compatibility
// @deprecated Use `configs` instead
export const config = {
    get defaultTS(): Linter.Config[] {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const commonConfig = require('../config/eslintrc-common.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const prodConfig = require('../config/eslintrc-prod.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const testConfig = require('../config/eslintrc-test.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const typescriptConfig = require('../config/eslintrc-typescript.js') as Linter.Config[];
        return [...commonConfig, ...prodConfig, ...testConfig, ...typescriptConfig];
    },
    get defaultJS(): Linter.Config[] {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const commonConfig = require('../config/eslintrc-common.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const prodConfig = require('../config/eslintrc-prod.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const testConfig = require('../config/eslintrc-test.js') as Linter.Config[];
        return [...commonConfig, ...prodConfig, ...testConfig];
    },
    get testCode(): Linter.Config[] {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const commonConfig = require('../config/eslintrc-common.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const testConfig = require('../config/eslintrc-test.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const typescriptConfig = require('../config/eslintrc-typescript.js') as Linter.Config[];
        return [...commonConfig, ...typescriptConfig, ...testConfig];
    },
    get prodCode(): Linter.Config[] {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const commonConfig = require('../config/eslintrc-common.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const prodConfig = require('../config/eslintrc-prod.js') as Linter.Config[];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const typescriptConfig = require('../config/eslintrc-typescript.js') as Linter.Config[];
        return [...commonConfig, ...typescriptConfig, ...prodConfig];
    }
};

plugin.configs = configs;

export default plugin;
