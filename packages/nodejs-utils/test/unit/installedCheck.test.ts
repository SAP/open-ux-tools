import { join, normalize } from 'path';
import { findInstalledPackages } from '../../src/installedCheck';
import readPkgUp from 'read-pkg-up';
import fastGlob from 'fast-glob';
import { CommandRunner } from '../../src/commandRunner';
import { isAppStudio } from '@sap-ux/btp-utils';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));
const mockIsAppStudio = isAppStudio as jest.Mock;

const TEST_PACKAGE2_NAME_SUBSTRING = 'abcd-1234';
const TEST_PACKAGE2_NAME = `@fake-scope/fake-package-${TEST_PACKAGE2_NAME_SUBSTRING}`;
const TEST_PACKAGE2_KEYWORD = 'test_keyword_1234';
const mockTestPackageInfoWithKeywords: readPkgUp.ReadResult = {
    packageJson: {
        name: TEST_PACKAGE2_NAME,
        version: '1.2.3',
        keywords: ['some', 'keywords', TEST_PACKAGE2_KEYWORD]
    },
    path: 'found/package2/path'
};

const TEST_PACKAGE1_NAME_SUBSTRING = '1234-abcd';
const TEST_PACKAGE1_NAME = `@sap/${TEST_PACKAGE1_NAME_SUBSTRING}test-package-name`;
let mockTestPackage1: readPkgUp.ReadResult = {
    packageJson: {
        name: TEST_PACKAGE1_NAME,
        version: '0.1.0'
    },
    path: 'found/package1/path'
};

const customInstallLoc = join(__dirname, '../mocks/');
const mockNMPath = join(customInstallLoc, 'node_modules');
const appStudioInstallLoc = normalize('/extbin/npm/globals/lib/node_modules');
const npmGlobalNodeModules = normalize('/global/node_modules');

enum MOCK_READ_PKG_UP {
    TEST_PACKAGE1,
    TEST_PACKAGE2
}

let readPkgUpMockCondition = MOCK_READ_PKG_UP.TEST_PACKAGE2;

jest.mock('read-pkg-up', () => {
    return jest.fn(async ({ cwd }) => {
        if (cwd.indexOf('node_modules') > -1) {
            if (readPkgUpMockCondition === MOCK_READ_PKG_UP.TEST_PACKAGE2) {
                return mockTestPackageInfoWithKeywords;
            }
            if (readPkgUpMockCondition === MOCK_READ_PKG_UP.TEST_PACKAGE1) {
                return mockTestPackage1;
            }
        }
    });
});

enum MOCK_FAST_GLOB_PATH {
    LOCAL_NM_PATH,
    APP_STUDIO_PATH,
    GLOBAL_NM_PATH
}
// Condition to change the mock return value
let fastGlobMockCondition = MOCK_FAST_GLOB_PATH.LOCAL_NM_PATH;

jest.mock('fast-glob', () => ({
    __esModule: true,
    default: jest.fn(async (globPat, { cwd }) => {
        if (globPat === `**/*${TEST_PACKAGE2_NAME_SUBSTRING}*`) {
            if (fastGlobMockCondition === MOCK_FAST_GLOB_PATH.LOCAL_NM_PATH && cwd.indexOf(mockNMPath) > -1) {
                return [join(mockNMPath, TEST_PACKAGE2_NAME)];
            }
            if (
                fastGlobMockCondition === MOCK_FAST_GLOB_PATH.APP_STUDIO_PATH &&
                cwd.indexOf(appStudioInstallLoc) > -1
            ) {
                return [join(appStudioInstallLoc, TEST_PACKAGE2_NAME)];
            }
            if (
                fastGlobMockCondition === MOCK_FAST_GLOB_PATH.GLOBAL_NM_PATH &&
                cwd.indexOf(npmGlobalNodeModules) > -1
            ) {
                return [join(npmGlobalNodeModules, TEST_PACKAGE2_NAME)];
            }
        }
        if (globPat === `**/*${TEST_PACKAGE1_NAME_SUBSTRING}*`) {
            if (
                fastGlobMockCondition === MOCK_FAST_GLOB_PATH.GLOBAL_NM_PATH &&
                cwd.indexOf(npmGlobalNodeModules) > -1
            ) {
                return [join(npmGlobalNodeModules, TEST_PACKAGE1_NAME)];
            }
        }
        return [];
    })
}));

describe('Installed module checker', () => {
    // CommandRunner mock npm 'npm -g root'
    CommandRunner.prototype.run = jest.fn().mockResolvedValue(Promise.resolve('/npm_global_path'));
    const vscWrkspcConfigMock = {
        has: jest.fn(),
        inspect: jest.fn(),
        update: jest.fn(),
        get: jest.fn().mockImplementation((id: string) => {
            if (id === 'ApplicationWizard.installationLocation') {
                return customInstallLoc;
            }
        })
    };

    let nodeEnvSaved: string | undefined;

    beforeEach(() => {
        fastGlobMockCondition = MOCK_FAST_GLOB_PATH.LOCAL_NM_PATH;
        readPkgUpMockCondition = MOCK_READ_PKG_UP.TEST_PACKAGE2;
        (fastGlob as unknown as jest.Mock).mockClear();
    });

    beforeAll(() => {
        nodeEnvSaved = process.env.NODE_PATH;
    });

    afterAll(() => {
        if (nodeEnvSaved) {
            process.env.NODE_PATH = nodeEnvSaved;
        }
    });

    test('findInstalledPackages: VSCode custom location', async () => {
        let foundGenPackageInfo = await findInstalledPackages(TEST_PACKAGE2_NAME_SUBSTRING, {
            vscWorkspaceConfig: vscWrkspcConfigMock,
            keyword: TEST_PACKAGE2_KEYWORD
        });
        let searchPath = join(customInstallLoc, 'node_modules', TEST_PACKAGE2_NAME);
        expect(readPkgUp).toHaveBeenLastCalledWith({ cwd: searchPath });
        expect(foundGenPackageInfo[0]).toEqual({
            packageJsonPath: mockTestPackageInfoWithKeywords.path,
            packageInfo: mockTestPackageInfoWithKeywords.packageJson,
            path: join(customInstallLoc, '/node_modules', TEST_PACKAGE2_NAME, 'generators/app')
        });

        // Min version not met.
        let options = {
            minVersion: '1.2.4',
            vscWorkspaceConfig: vscWrkspcConfigMock
        };
        foundGenPackageInfo = await findInstalledPackages(TEST_PACKAGE2_NAME_SUBSTRING, options);
        searchPath = join(customInstallLoc, 'node_modules', TEST_PACKAGE2_NAME);
        expect(readPkgUp).toHaveBeenLastCalledWith({ cwd: searchPath });
        expect(foundGenPackageInfo.length).toBe(0);

        // Min version satisfied.
        options = {
            minVersion: '1.2.2',
            vscWorkspaceConfig: vscWrkspcConfigMock
        };
        foundGenPackageInfo = await findInstalledPackages(TEST_PACKAGE2_NAME_SUBSTRING, options);
        searchPath = join(customInstallLoc, 'node_modules', TEST_PACKAGE2_NAME);
        expect(readPkgUp).toHaveBeenLastCalledWith({ cwd: searchPath });
        expect(foundGenPackageInfo[0]).toEqual({
            packageJsonPath: mockTestPackageInfoWithKeywords.path,
            packageInfo: mockTestPackageInfoWithKeywords.packageJson,
            path: join(customInstallLoc, '/node_modules', TEST_PACKAGE2_NAME, 'generators/app')
        });

        // Alternative main generator path found in package.json
        const mockTestPackageInfoCopy = Object.assign({}, mockTestPackageInfoWithKeywords); // Shallow copy is ok since no object refs
        mockTestPackageInfoCopy.packageJson.main = 'generators/base/index.js';

        foundGenPackageInfo = await findInstalledPackages(TEST_PACKAGE2_NAME_SUBSTRING, {
            vscWorkspaceConfig: vscWrkspcConfigMock
        });
        searchPath = join(customInstallLoc, 'node_modules', TEST_PACKAGE2_NAME);
        expect(readPkgUp).toHaveBeenLastCalledWith({ cwd: searchPath });
        expect(foundGenPackageInfo[0]).toEqual({
            packageJsonPath: mockTestPackageInfoCopy.path,
            packageInfo: mockTestPackageInfoCopy.packageJson,
            path: join(customInstallLoc, '/node_modules', TEST_PACKAGE2_NAME, 'generators/base/index.js')
        });

        delete mockTestPackageInfoWithKeywords.packageJson.main; // restore to test default
    });

    test('findInstalledPackages: App Studio location', async () => {
        // This test should not run on Windows, the code it tests is only run on BAS
        // Only posix path.delimiter and path.separator are relevant
        if (process.platform !== 'win32') {
            mockIsAppStudio.mockReturnValueOnce(true); // Fake App Studio
            process.env.NODE_PATH = `/some/global/node_modules:/another/global/node_modules:/yet/another/global/node_modules:${appStudioInstallLoc}`;

            const npmGlobalNodeModules = '/global/node_modules';
            jest.spyOn(CommandRunner.prototype, 'run').mockImplementationOnce(async (cmd: string, args?: string[]) => {
                if (cmd.startsWith('npm') && args?.toString() === '-g,root') {
                    return npmGlobalNodeModules;
                }
            });

            fastGlobMockCondition = MOCK_FAST_GLOB_PATH.APP_STUDIO_PATH;

            const foundGenPackageInfo = await findInstalledPackages(TEST_PACKAGE2_NAME_SUBSTRING);
            // On BAS expect to look in npm global first
            expect(fastGlob).toHaveBeenNthCalledWith(1, `**/*${TEST_PACKAGE2_NAME_SUBSTRING}*`, {
                cwd: npmGlobalNodeModules,
                absolute: true,
                deep: 2,
                onlyDirectories: true
            });
            // There are 5 paths to check, the last one is the one we return as found hence '5'
            expect(fastGlob).toHaveBeenNthCalledWith(5, `**/*${TEST_PACKAGE2_NAME_SUBSTRING}*`, {
                cwd: appStudioInstallLoc,
                absolute: true,
                deep: 2,
                onlyDirectories: true
            });
            const extBinSearchPath = join(appStudioInstallLoc, TEST_PACKAGE2_NAME);
            expect(readPkgUp).toHaveBeenLastCalledWith({ cwd: extBinSearchPath });
            expect(foundGenPackageInfo[0]).toEqual({
                packageJsonPath: mockTestPackageInfoWithKeywords.path,
                packageInfo: mockTestPackageInfoWithKeywords.packageJson,
                path: join(appStudioInstallLoc, TEST_PACKAGE2_NAME, 'generators/app')
            });
            // Restore pre-test state
            if (nodeEnvSaved) {
                process.env.NODE_PATH = nodeEnvSaved;
            } else {
                delete process.env.NODE_PATH;
            }
        }
    });

    test('findInstalledPackages: npm global location', async () => {
        jest.spyOn(CommandRunner.prototype, 'run').mockImplementationOnce(async (cmd: string, args?: string[]) => {
            if (cmd.startsWith('npm') && args?.toString() === '-g,root') {
                return npmGlobalNodeModules;
            }
        });

        fastGlobMockCondition = MOCK_FAST_GLOB_PATH.GLOBAL_NM_PATH;

        const foundGenPackageInfo = await findInstalledPackages(TEST_PACKAGE2_NAME_SUBSTRING);

        const searchPath = join(npmGlobalNodeModules, TEST_PACKAGE2_NAME);
        expect(fastGlob).toHaveBeenNthCalledWith(1, `**/*${TEST_PACKAGE2_NAME_SUBSTRING}*`, {
            cwd: npmGlobalNodeModules,
            absolute: true,
            deep: 2,
            onlyDirectories: true
        });
        expect(readPkgUp).toHaveBeenLastCalledWith({ cwd: searchPath });
        expect(foundGenPackageInfo[0]).toEqual({
            packageJsonPath: mockTestPackageInfoWithKeywords.path,
            packageInfo: mockTestPackageInfoWithKeywords.packageJson,
            path: join(npmGlobalNodeModules, TEST_PACKAGE2_NAME, 'generators/app')
        });

        // npm not installed
        jest.spyOn(CommandRunner.prototype, 'run').mockImplementationOnce(async () => {
            throw Error('command `npm` not found');
        });
        expect((await findInstalledPackages(TEST_PACKAGE2_NAME_SUBSTRING)).length).toBe(0);
    });

    test('findInstalledPackages: pre-release versions', async () => {
        const npmGlobalNodeModules = '/global/node_modules';
        const foundPath = join(npmGlobalNodeModules, TEST_PACKAGE1_NAME, 'generators/app');
        jest.spyOn(CommandRunner.prototype, 'run').mockImplementation(async (cmd: string, args?: string[]) => {
            if (cmd.startsWith('npm') && args?.toString() === '-g,root') {
                return npmGlobalNodeModules;
            }
        });

        fastGlobMockCondition = MOCK_FAST_GLOB_PATH.GLOBAL_NM_PATH;
        readPkgUpMockCondition = MOCK_READ_PKG_UP.TEST_PACKAGE1;

        mockTestPackage1 = {
            packageJson: {
                name: TEST_PACKAGE1_NAME,
                version: '0.1.0-123456789.0'
            },
            path: foundPath
        };

        expect((await findInstalledPackages(TEST_PACKAGE1_NAME_SUBSTRING, { minVersion: '0.2.0' })).length).toBe(0);

        mockTestPackage1 = {
            packageJson: {
                name: TEST_PACKAGE1_NAME,
                version: '0.2.0-123456789.0'
            },
            path: foundPath
        };

        const foundGenPackageInfos = await findInstalledPackages(TEST_PACKAGE1_NAME_SUBSTRING, {
            minVersion: '0.2.0'
        });

        expect(foundGenPackageInfos[0]).toEqual({
            packageJsonPath: foundPath,
            packageInfo: mockTestPackage1.packageJson,
            path: join(npmGlobalNodeModules, TEST_PACKAGE1_NAME, 'generators/app')
        });
    });

    test('findInstalledPackages: package name and keyword', async () => {
        jest.spyOn(CommandRunner.prototype, 'run').mockImplementation(async (cmd: string, args?: string[]) => {
            if (cmd.startsWith('npm') && args?.toString() === '-g,root') {
                return mockNMPath;
            }
        });

        // Package name substring only
        expect(
            await findInstalledPackages(TEST_PACKAGE2_NAME_SUBSTRING /* , { keyword: TEST_PACKAGE2_KEYWORD } */)
        ).toEqual([
            {
                packageInfo: {
                    keywords: ['some', 'keywords', 'test_keyword_1234'],
                    name: '@fake-scope/fake-package-abcd-1234',
                    version: '1.2.3'
                },
                packageJsonPath: 'found/package2/path',
                path: join(mockNMPath, '/@fake-scope/fake-package-abcd-1234/generators/app')
            }
        ]);

        // Package name substring and keyword
        expect(await findInstalledPackages(TEST_PACKAGE2_NAME_SUBSTRING, { keyword: TEST_PACKAGE2_KEYWORD })).toEqual([
            {
                packageInfo: {
                    keywords: ['some', 'keywords', 'test_keyword_1234'],
                    name: '@fake-scope/fake-package-abcd-1234',
                    version: '1.2.3'
                },
                packageJsonPath: 'found/package2/path',
                path: join(mockNMPath, '/@fake-scope/fake-package-abcd-1234/generators/app')
            }
        ]);

        // Package name substring and keyword not matched
        expect(await findInstalledPackages(TEST_PACKAGE2_NAME_SUBSTRING, { keyword: 'non-existing-keyword' })).toEqual(
            []
        );
    });
});
