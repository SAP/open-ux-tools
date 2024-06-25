import { join, sep } from 'path';
import type { Package } from '../../src';
import { FileName, getNodeModulesPath } from '../../src';
import { addPackageDevDependency, hasDependency } from '../../src/project/dependencies';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

describe('Test hasDependency()', () => {
    test('Test package.json has dependency', async () => {
        const packageJson = { dependencies: { dependency: '1.2.3' } } as Partial<Package>;
        expect(hasDependency(packageJson as Package, 'dependency')).toBeTruthy();
    });

    test('Test package.json has devDependency', async () => {
        const packageJson = { devDependencies: { 'dev-dependency': '9.8.7' } } as Partial<Package>;
        expect(hasDependency(packageJson as Package, 'dev-dependency')).toBeTruthy();
    });

    test('Test package.json has neither dependency nor devDependency', async () => {
        const packageJson = {
            dependencies: { dependency: '1.1.1' },
            devDependencies: { 'dev-dependency': '0.0.0' }
        } as Partial<Package>;
        expect(hasDependency(packageJson as Package, 'dep')).toBeFalsy();
    });
});

describe('Test getNodeModulesPath()', () => {
    test('Find node_modules parent of this module, should return root path to this module', () => {
        expect(getNodeModulesPath(__dirname)?.split(sep).pop()).toBe('project-access');
    });

    test('Find node_modules parent of this module with a given module, should return root path', () => {
        expect(getNodeModulesPath(__dirname, '@ui5/manifest')?.split(sep).pop()).toBe('project-access');
    });

    test('Find node_modules parent of this module with a non existing module, should return undefined', () => {
        expect(getNodeModulesPath(__dirname, 'wrong-module')?.split(sep).pop()).toBe(undefined);
    });

    test('Find node_modules parent for relative path, should return undefined', () => {
        expect(getNodeModulesPath(join('some/relative/path'))).toBe(undefined);
    });
});

describe('Test updatePackageScript()', () => {
    const sampleRoot = join(__dirname, '../test-data/json/package');

    test('should add package script', async () => {
        const fs = create(createStorage());
        await addPackageDevDependency(sampleRoot, '@mock-lib', '0.0.1', fs);
        expect(fs.dump(join(sampleRoot, FileName.Package))).toMatchInlineSnapshot(`
            Object {
              "": Object {
                "contents": "{
                \\"name\\": \\"test\\",
                \\"version\\": \\"1.0.0\\",
                \\"devDependencies\\": {
                    \\"@mock-lib\\": \\"0.0.1\\"
                }
            }
            ",
                "state": "modified",
              },
            }
        `);
    });
});
