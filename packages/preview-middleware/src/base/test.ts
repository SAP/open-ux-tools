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
 * Merge the given test configuration with the default values.
 *
 * @param config test configuration
 * @param utils middleware utils
 * @returns merged test configuration
 */
export function mergeTestConfigDefaults(config: TestConfig, utils?: MiddlewareUtils): CompleteTestConfig {
    let testPathPrefix = '/';
    if (typeof utils === 'object') {
        testPathPrefix =
            utils.getProject().getType() === 'component'
                ? posix.join('/test-resources', utils.getProject().getNamespace())
                : '/';
    }
    const defaults = DEFAULTS[config.framework.toLowerCase()] ?? {};
    const merged: CompleteTestConfig = { ...defaults, ...config };

    for (const prop of ['path', 'init'] as const) {
        if (typeof merged[prop] === 'string' && merged[prop]) {
            merged[prop] = posix.join(testPathPrefix, merged[prop]);
        }
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
