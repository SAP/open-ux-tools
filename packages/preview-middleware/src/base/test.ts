import type { Resource } from '@ui5/fs';
import type { InternalTestConfig, TestConfig } from '../types';

const DEFAULTS: Record<string, InternalTestConfig> = {
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
    }
};

/**
 * Merge the given test configuration with the default values.
 *
 * @param config test configuration
 * @returns merged test configuration
 */
export function mergeTestConfigDefaults(config: TestConfig) {
    const key = config.framework.toLowerCase();
    const defaults = DEFAULTS[key] ?? {};
    if (config.path && !config.path.startsWith('/')) {
        config.path = `/${config.path}`;
    }
    if (config.init && !config.init.startsWith('/')) {
        config.init = `/${config.init}`;
    }
    return {
        framework: defaults.framework ?? config.framework,
        path: config.path ?? defaults.path,
        init: config.init ?? defaults.init,
        pattern: config.pattern ?? defaults.pattern
    };
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
