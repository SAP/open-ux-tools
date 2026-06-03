// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { Resource } from '@ui5/fs';
import { mergeTestConfigDefaults, generateImportList } from '../../../src/base/test.js';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { MiddlewareUtils } from '@ui5/server';

const mockUtils = {
    getProject() {
        return {
            getType: () => 'application'
        };
    }
} as unknown as MiddlewareUtils;

describe('test', () => {
    describe('merge test configs', () => {
        test('Qunit only base config', () => {
            const result = mergeTestConfigDefaults({ framework: 'QUnit' }, mockUtils);
            expect(result).toEqual({
                framework: 'QUnit',
                path: '/test/unitTests.qunit.html',
                init: '/test/unitTests.qunit.js',
                pattern: '/test/**/*Test.{js,ts}',
                isCustomInit: false
            });
        });

        test('opa5 only base config', () => {
            const result = mergeTestConfigDefaults({ framework: 'OPA5' }, mockUtils);
            expect(result).toEqual({
                framework: 'OPA5',
                path: '/test/opaTests.qunit.html',
                init: '/test/opaTests.qunit.js',
                pattern: '/test/**/*Journey.{js,ts}',
                isCustomInit: false
            });
        });

        test('Qunit with custom config', () => {
            const result = mergeTestConfigDefaults(
                {
                    framework: 'QUnit',
                    path: 'custom/path.html',
                    init: 'custom/path.js',
                    pattern: 'custom/pattern'
                },
                mockUtils
            );
            expect(result).toEqual({
                framework: 'QUnit',
                path: '/custom/path.html',
                init: '/custom/path.js',
                pattern: 'custom/pattern',
                isCustomInit: true
            });
        });

        test('opa5 with custom config', () => {
            const result = mergeTestConfigDefaults(
                {
                    framework: 'OPA5',
                    path: 'custom/path.html',
                    init: 'custom/path.js',
                    pattern: 'custom/pattern'
                },
                mockUtils
            );
            expect(result).toEqual({
                framework: 'OPA5',
                path: '/custom/path.html',
                init: '/custom/path.js',
                pattern: 'custom/pattern',
                isCustomInit: true
            });
        });
    });

    describe('generate import list', () => {
        test('empty resource list', () => {
            const result = generateImportList('ns', []);
            expect(result).toEqual([]);
        });
        test('resource list', () => {
            const result = generateImportList('ns', [{ getPath: () => '/test/opaTests.qunit.html' } as Resource]);
            expect(result).toEqual(['ns/test/opaTests.qunit']);
        });
        test('component type strips test path prefix from file paths', () => {
            const mockComponentUtils = {
                getProject() {
                    return {
                        getType: () => 'component',
                        getNamespace: () => 'my/fe/v2/app'
                    };
                }
            } as unknown as MiddlewareUtils;
            const result = generateImportList(
                'my/fe/v2/app',
                [
                    {
                        getPath: () => '/test-resources/my/fe/v2/app/unit/SomeTest.js'
                    } as Resource
                ],
                mockComponentUtils
            );
            expect(result).toEqual(['my/fe/v2/app/test/unit/SomeTest']);
        });
    });
});
