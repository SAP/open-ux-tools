import type { Resource } from '@ui5/fs';
import type { InternalTestConfig, TestConfig, TestConfigDefaults } from '../types';

const DEFAULTS: Record<string, Readonly<InternalTestConfig>> = {
    qunit: {
        path: '/test/unitTests.qunit.html',
        init: '/test/unitTests.qunit.js',
        pattern: '/test/**/*Test.*',
        framework: 'QUnit'
    },
    opa5: {
        path: '/test/opaTests.qunit.html',
        init: '/test/opaTests.qunit.js',
        pattern: '/test/**/*Journey.*',
        framework: 'OPA5'
    },
    testsuite: {
        path: '/test/testsuite.qunit.html',
        init: '/test/testsuite.qunit.js',
        pattern: '',
        framework: 'Testsuite'
    }
} satisfies TestConfigDefaults;

/**
 * Merge the given test configuration with the default values.
 *
 * @param config test configuration
 * @returns merged test configuration
 */
export function mergeTestConfigDefaults(config: TestConfig): InternalTestConfig {
    const defaults = DEFAULTS[config.framework.toLowerCase()] ?? {};
    const merged: InternalTestConfig = { ...defaults, ...config };
    if (!merged.path.startsWith('/')) {
        merged.path = `/${merged.path}`;
    }
    if (!merged.init.startsWith('/')) {
        merged.init = `/${config.init}`;
    }
    return merged;
}

/**
 * Generate a list of imports from a list of resources.
 *
 * @param ns namespace of the test files
 * @param resourceList list of resources representing test files
 * @returns array of strings representing the tests
 */
export function generateImportList(ns: string, resourceList: Resource[]): string[] {
    return resourceList
        ? resourceList.map((file) => {
              const path = file.getPath().split('.');
              path.pop();
              return `${ns}${path.join('.')}`;
          })
        : [];
}
