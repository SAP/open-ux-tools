import type { Package } from '../../src';
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
