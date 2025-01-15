import { readFileSync } from 'fs';
import { TestFixture } from '../fixtures';

export function commonChecks(testFixture: TestFixture, OUTPUT_DIR_PREFIX: string): void {
    const rootPackageJsonContent = readFileSync(`${OUTPUT_DIR_PREFIX}/package.json`, 'utf-8');
    const rootPackageJson = JSON.parse(rootPackageJsonContent);
    const expectRootPackageJsonContent = testFixture.getContents('sap-ux-test/package.json');
    const expectRootPackageJson = JSON.parse(expectRootPackageJsonContent);
    expect(rootPackageJson).toEqual(expectRootPackageJson);

    const routerPackageJsonContent = readFileSync(`${OUTPUT_DIR_PREFIX}/router/package.json`, 'utf-8');
    const routerPackageJson = JSON.parse(routerPackageJsonContent);
    const expectRouterPackageJsonContent = testFixture.getContents('sap-ux-test/router/package.json');
    const expectRouterPackageJson = JSON.parse(expectRouterPackageJsonContent);
    expect(routerPackageJson).toEqual(expectRouterPackageJson);
}
