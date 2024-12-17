import { findInstalledPackages } from '@sap-ux/nodejs-utils';
import { isS4Installed } from '../../src/utils';

jest.mock('@sap-ux/nodejs-utils', () => ({
    ...(jest.requireActual('@sap-ux/nodejs-utils') as object),
    findInstalledPackages: jest.fn() // Prevents searching for extensions
}));
const findInstalledPackagesMock = findInstalledPackages as jest.Mock;

describe('installed check', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test('should return true when S/4 generator extension is installed', async () => {
        findInstalledPackagesMock.mockResolvedValueOnce([
            {
                path: 'path/to/',
                packageJsonPath: 'path/to/package.json',
                packageInfo: {
                    name: '@sapux/s4-fiori-gen-ext',
                    version: '1.0.0',
                    keywords: ['fiori-generator-extension']
                }
            }
        ]);
        const result = await isS4Installed();
        expect(result).toBe(true);
    });

    test('should return false when S/4 generator extension is not installed', async () => {
        findInstalledPackagesMock.mockResolvedValueOnce([]);
        const result = await isS4Installed();
        expect(result).toBe(false);
    });
});
