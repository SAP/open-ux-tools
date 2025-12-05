import type { Linter } from 'eslint';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rules } from './rules';
import { FioriElementsLanguage } from './language/fiori-elements-language';

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
    fioriElements: new FioriElementsLanguage()
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
        return [...commonConfig, ...prodConfig, ...testConfig];
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

// Default export following ESLint 9 plugin structure
// This is the recommended way to export plugins in ESLint 9
const plugin = {
    meta,
    configs,
    rules,
    languages
};

export default plugin;
