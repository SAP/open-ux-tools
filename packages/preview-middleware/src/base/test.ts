// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { Resource } from '@ui5/fs';
import type { CompleteTestConfig, TestConfig, TestConfigDefaults } from '../types';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { MiddlewareUtils } from '@ui5/server';
import { posix } from 'node:path';
import { getTestResourcesPathPrefix, adjustPathForSandbox } from './utils/project';

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
} as const satisfies TestConfigDefaults;

/**
 * Check if the init path is a default generated path (not user-provided).
 * Compares the init path against what would be generated as default for the framework.
 *
 * @param framework the test framework
 * @param initPath the init path to check
 * @param utils middleware utils
 * @returns true if the init path matches the default for this framework
 */
export function isDefaultInitPath(
    framework: 'OPA5' | 'QUnit' | 'Testsuite',
    initPath: string,
    utils?: MiddlewareUtils
): boolean {
    const defaultInit = DEFAULTS[framework.toLowerCase()]?.init;
    if (!defaultInit) {
        return false;
    }
    const testPathPrefix = getTestResourcesPathPrefix(utils);
    if (testPathPrefix) {
        // For component projects, compute the adjusted default
        const adjustedInit = adjustPathForSandbox(defaultInit, testPathPrefix);
        const expectedPath = posix.join('/', posix.join(testPathPrefix, adjustedInit));
        return initPath === expectedPath;
    }
    // For non-component projects, check against the default
    return initPath === defaultInit;
}

/**
 * Merge the given test configuration with the default values.
 *
 * @param config test configuration
 * @param utils middleware utils
 * @returns merged test configuration
 */
export function mergeTestConfigDefaults(config: TestConfig, utils?: MiddlewareUtils): CompleteTestConfig {
    const testPathPrefix = getTestResourcesPathPrefix(utils);
    const defaults: CompleteTestConfig = structuredClone(DEFAULTS[config.framework.toLowerCase()] ?? {});

    if (testPathPrefix) {
        // remove leading /test from defaults if sandboxPathPrefix is set
        defaults.pattern = adjustPathForSandbox(defaults.pattern, testPathPrefix);
        for (const prop of ['path', 'init'] as const) {
            defaults[prop] = adjustPathForSandbox(defaults[prop], testPathPrefix);
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
