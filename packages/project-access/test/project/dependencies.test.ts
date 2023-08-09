import { join, sep } from 'path';
import type { Package } from '../../src';
import { getNodeModulesPath } from '../../src';
import { hasDependency } from '../../src/project/dependencies';

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
