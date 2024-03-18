import type { Resource } from '@ui5/fs';
import { mergeTestConfigDefaults, generateImportList } from '../../../src/base/test';

describe('test', () => {
    describe('merge test configs', () => {
        test('Qunit only base config', () => {
            const result = mergeTestConfigDefaults({ framework: 'QUnit' });
            expect(result).toEqual({
                framework: 'QUnit',
                path: '/test/unitTests.qunit.html',
                init: '/test/unitTests.qunit.js',
                pattern: '/test/**/*Test.*'
            });
        });

        test('opa5 only base config', () => {
            const result = mergeTestConfigDefaults({ framework: 'OPA5' });
            expect(result).toEqual({
                framework: 'OPA5',
                path: '/test/opaTests.qunit.html',
                init: '/test/opaTests.qunit.js',
                pattern: '/test/**/*Journey.*'
            });
        });

        test('Qunit with custom config', () => {
            const result = mergeTestConfigDefaults({
                framework: 'QUnit',
                path: 'custom/path.html',
                init: 'custom/path.js',
                pattern: 'custom/pattern'
            });
            expect(result).toEqual({
                framework: 'QUnit',
                path: '/custom/path.html',
                init: '/custom/path.js',
                pattern: 'custom/pattern'
            });
        });

        test('opa5 with custom config', () => {
            const result = mergeTestConfigDefaults({
                framework: 'OPA5',
                path: 'custom/path.html',
                init: 'custom/path.js',
                pattern: 'custom/pattern'
            });
            expect(result).toEqual({
                framework: 'OPA5',
                path: '/custom/path.html',
                init: '/custom/path.js',
                pattern: 'custom/pattern'
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
    });
});
