// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { Resource } from '@ui5/fs';
import type { CompleteTestConfig, TestConfig, TestConfigDefaults } from '../types';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { MiddlewareUtils } from '@ui5/server';
import { posix } from 'node:path';

const DEFAULTS: Record<string, Readonly<CompleteTestConfig>> = {
    qunit: {
        path: '/test/unitTests.qunit.html',
        init: '/test/unitTests.qunit.js',
        pattern: '/test/**/*Test.{js,ts}',
        framework: 'QUnit'
    },
    opa5: {
        path: '/test/opaTests.qunit.html',
        init: '/test/opaTests.qunit.js',
        pattern: '/test/**/*Journey.{js,ts}',
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
 * Get the test path prefix for component projects.
 *
 * @param utils middleware utils
 * @returns test path prefix or undefined
 */
function getTestPathPrefix(utils?: MiddlewareUtils): string | undefined {
    if (typeof utils !== 'object') {
        return undefined;
    }
    return utils.getProject?.()?.getType?.() === 'component'
        ? posix.join('/test-resources', utils.getProject().getNamespace())
        : undefined;
}

/**
 * Merge the given test configuration with the default values.
 *
 * @param config test configuration
 * @param utils middleware utils
 * @returns merged test configuration
 */
export function mergeTestConfigDefaults(config: TestConfig, utils?: MiddlewareUtils): CompleteTestConfig {
    const testPathPrefix = getTestPathPrefix(utils);
    const defaults: CompleteTestConfig = DEFAULTS[config.framework.toLowerCase()] ?? {};

    if (testPathPrefix) {
        // remove leading /test from defaults if sandboxPathPrefix is set
        defaults.pattern = defaults.pattern.replace(/^\/test/, '');
        for (const prop of ['path', 'init'] as const) {
            defaults[prop] = defaults[prop].replace(/^\/test/, '');
        }
    }

    const merged: CompleteTestConfig = { ...defaults, ...config };

    if (testPathPrefix) {
        // Prepend testPathPrefix
        for (const prop of ['path', 'init'] as const) {
            merged[prop] = posix.join(testPathPrefix, merged[prop]);
        }
    }

    // Ensure path and init start with leading slash when no prefix exists
    for (const prop of ['path', 'init'] as const) {
        merged[prop] = posix.join('/', merged[prop]);
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
