import { jest } from '@jest/globals';
import type { Extension } from 'vscode';

const mockIsAppStudio = jest.fn();
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: mockIsAppStudio
}));

const mockReaddirSync = jest.fn();
const mockExistsSync = jest.fn();
const mockReadFile = jest.fn();
jest.unstable_mockModule('node:fs', () => ({
    __esModule: true,
    default: {
        readdirSync: (...args: any[]) => mockReaddirSync(...args),
        existsSync: (...args: any[]) => mockExistsSync(...args),
        promises: {
            readFile: (...args: any[]) => mockReadFile(...args)
        }
    },
    readdirSync: (...args: any[]) => mockReaddirSync(...args),
    existsSync: (...args: any[]) => mockExistsSync(...args),
    promises: {
        readFile: (...args: any[]) => mockReadFile(...args)
    }
}));

const mockSpawnCommand = jest.fn<(...args: any[]) => any>();
jest.unstable_mockModule('../../src/command', () => ({
    spawnCommand: mockSpawnCommand,
    npmCommand: 'npm'
}));

const { getCFCliToolVersion, getFioriGenVersion, getInstalledExtensions, getProcessVersions } =
    await import('../../src/checks/get-installed');
const { getLogger } = await import('../../src/logger');
const { t } = await import('../../src/i18n');

describe('Test install functions', () => {
    const mockPackageJson =
        '{  "name": "@sap/generator-fiori",  "displayName": "SAP Fiori application",  "version": "1.7.5",  "description": "Create an SAPUI5 application using SAP Fiori elements or a freestyle approach"  }';

    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('getInstalledExtensions() (BAS)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        const expectedResult = {
            'vscode-ui5-language-assistant': { version: '3.3.0' },
            'sap-ux-application-modeler-extension': { version: '1.7.4' },
            'yeoman-ui': { version: '1.7.11' },
            'xml-toolkit': { version: '1.1.0' }
        };
        mockReaddirSync.mockImplementationOnce(() => {
            return [
                `sap-ux-application-modeler-extension-1.7.4.vsix`,
                `yeoman-ui-1.7.11.vsix`,
                `xml-toolkit-1.1.0.vsix`,
                `vscode-dependencies-validation-1.8.0.vsix`,
                `vscode-ui5-language-assistant-3.3.0.vsix`
            ] as any;
        });

        const result = await getInstalledExtensions();
        expect(result).toStrictEqual(expectedResult);
    });

    test('getInstalledExtensions() (VSCODE)', async () => {
        mockIsAppStudio.mockReturnValue(false);
        const expectedResult = {
            'yeoman-ui': { version: '2' },
            'vscode-ui5-language-assistant': { version: '2' },
            'xml-toolkit': { version: '2' }
        };

        const output = `SAPOS.yeoman-ui@2\nSAPOSS.vscode-ui5-language-assistant@2\nSAPOSS.xml-toolkit@2`;
        mockSpawnCommand.mockResolvedValueOnce(output);
        const result = await getInstalledExtensions();
        expect(result).toStrictEqual(expectedResult);
    });

    test('getInstalledExtensions() (throw error)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockReaddirSync.mockImplementation(() => {
            throw new Error('Could not read directory');
        });
        const result = await getInstalledExtensions();
        expect(result).toBe(undefined);
    });

    test('getInstalledExtensions() (throw error with logger)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        const logger = getLogger();
        mockReaddirSync.mockImplementation(() => {
            throw new Error('Could not read directory');
        });
        const result = await getInstalledExtensions(undefined, logger);
        const messages = logger.getMessages();
        expect(result).toBe(undefined);
        expect(messages).toStrictEqual([
            {
                'severity': 'error',
                'text': 'An error occurred when retrieving the installed extensions: Could not read directory'
            }
        ]);
    });

    test('getInstalledExtensions() (extensions passed in)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        const expectedResult = {
            'vscode-ui5-language-assistant': { version: '3.3.0' },
            'sap-ux-application-modeler-extension': { version: '1.7.4' },
            'yeoman-ui': { version: '1.7.11' }
        };
        const logger = getLogger();
        const extensions = [
            {
                id: 'SAPOS.yeoman-ui',
                packageJSON: {
                    name: 'yeoman-ui',
                    version: '1.7.11'
                }
            },
            {
                id: 'SAPSE.sap-ux-application-modeler-extension',
                packageJSON: {
                    name: 'sap-ux-application-modeler-extension',
                    version: '1.7.4'
                }
            },
            {
                id: 'SAPSE.vscode-ui5-language-assistant',
                packageJSON: {
                    name: 'vscode-ui5-language-assistant',
                    version: '3.3.0'
                }
            }
        ] as any as readonly Extension<any>[];

        const result = await getInstalledExtensions(extensions, logger);
        expect(result).toStrictEqual(expectedResult);
    });

    test('getCFCliToolVersion()', async () => {
        const expectedResult = '7.2.0';

        const output = `cf version 7.2.0+be4a5ce2b.2020-12-10`;
        mockSpawnCommand.mockResolvedValueOnce(output);
        const result = await getCFCliToolVersion();
        expect(result).toStrictEqual(expectedResult);
    });

    test('getCFCliToolVersion() (throw error)', async () => {
        mockSpawnCommand.mockImplementation(async () => {
            throw new Error('Command not found');
        });
        const result = await getCFCliToolVersion();
        expect(result).toStrictEqual('Not installed or found.');
    });

    test('getFioriGenVersion() (VSCODE)', async () => {
        mockIsAppStudio.mockReturnValue(false);
        const expectedResult = '1.7.5';

        const output = `some/path/to/lib/node_modules`;
        mockSpawnCommand.mockResolvedValueOnce(output);
        mockExistsSync.mockReturnValue(true);
        mockReadFile.mockResolvedValueOnce(mockPackageJson);
        const result = await getFioriGenVersion();
        expect(result).toStrictEqual(expectedResult);
    });

    test('getFioriGenVersion() (not installed) (VSCODE)', async () => {
        mockIsAppStudio.mockReturnValue(false);
        const output = `some/path/to/lib/node_modules`;
        mockSpawnCommand.mockResolvedValueOnce(output);
        mockExistsSync.mockReturnValue(false);

        const result = await getFioriGenVersion();
        expect(result).toStrictEqual('Not installed or found.');
    });

    test('getFioriGenVersion() (throw error) (VSCODE)', async () => {
        mockIsAppStudio.mockReturnValue(false);
        mockSpawnCommand.mockImplementation(async () => {
            throw new Error('Command not found');
        });
        const result = await getFioriGenVersion();
        expect(result).toStrictEqual('Not installed or found.');
    });

    test('getFioriGenVersion() (BAS)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        const expectedResult = '1.7.5';
        const output = `some/path/to/lib/node_modules`;
        mockSpawnCommand.mockResolvedValueOnce(output);
        mockExistsSync.mockReturnValue(true);
        mockReadFile.mockResolvedValueOnce(mockPackageJson);
        const result = await getFioriGenVersion();
        expect(result).toStrictEqual(expectedResult);
    });

    test('getFioriGenVersion() (npm --location=global WARN BAS)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        const expectedResult = '1.7.5';
        const outputWarning = `npm WARN config global --global, --local are deprecated. Use --location=global instead --some/path/to/lib/node_modules`;
        const output = `some/path/to/lib/node_modules`;

        mockSpawnCommand.mockResolvedValueOnce(outputWarning);
        mockSpawnCommand.mockResolvedValueOnce(output);

        mockExistsSync.mockReturnValue(true);
        mockReadFile.mockResolvedValueOnce(mockPackageJson);
        const result = await getFioriGenVersion();
        expect(result).toStrictEqual(expectedResult);
    });

    test('getFioriGenVersion() (not installed) (BAS)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockExistsSync.mockReturnValue(false);
        mockSpawnCommand.mockResolvedValue('MOCK_NPM_ROOT');

        const result = await getFioriGenVersion();
        expect(result).toStrictEqual(t('info.notInstalledOrNotFound'));
    });

    test('getFioriGenVersion() (BAS) installed to NODE_PATH location', async () => {
        // This test should not run on Windows, the code it tests is only run on BAS
        // Only posix path.delimiter and path.separator are relevant
        if (process.platform !== 'win32') {
            mockIsAppStudio.mockReturnValue(true);
            const expectedResult = '1.7.5';
            const installedPath = `/installed/path/node_modules`;
            const nodePathSaved = process.env.NODE_PATH;
            process.env.NODE_PATH = `/some/global/node_modules:/another/global/node_modules:/yet/another/global/node_modules:${installedPath}`;

            mockSpawnCommand.mockResolvedValueOnce('/not/installed/path');
            mockExistsSync.mockImplementation((filePath: any) => {
                // Mocks finding the package at `installedPath`
                if ((filePath as string).startsWith(installedPath)) {
                    return true;
                }
                return false;
            });
            mockReadFile.mockResolvedValueOnce(mockPackageJson);

            let result = await getFioriGenVersion();
            expect(result).toStrictEqual(expectedResult);

            // Neg tests, NODE_PATH not set
            process.env.NODE_PATH = '';
            result = await getFioriGenVersion();
            expect(result).toEqual(t('info.notInstalledOrNotFound'));

            delete process.env.NODE_PATH;
            result = await getFioriGenVersion();
            expect(result).toEqual(t('info.notInstalledOrNotFound'));

            if (nodePathSaved) {
                process.env.NODE_PATH = nodePathSaved;
            } else {
                delete process.env.NODE_PATH;
            }
        }
    });

    test('getProcessVersions() (VSCODE)', async () => {
        mockSpawnCommand.mockImplementationOnce(async () => {
            return `{"node":"16.17.0","v8":"9.4.146.26-node.22","uv":"1.43.0","zlib":"1.2.11","brotli":"1.0.9"}`;
        });
        const result = await getProcessVersions();
        expect(result).toStrictEqual({
            node: '16.17.0',
            v8: '9.4.146.26-node.22',
            uv: '1.43.0',
            zlib: '1.2.11',
            brotli: '1.0.9'
        });
    });

    test('getProcessVersions() errror', async () => {
        mockSpawnCommand.mockImplementation(() => {
            throw new Error('spawn error');
        });
        const result = await getProcessVersions();
        expect(result).toStrictEqual({});
    });

    test('getProcessVersions() (error with logger)', async () => {
        mockSpawnCommand.mockImplementation(() => {
            throw new Error('spawn error');
        });
        const logger = getLogger();
        const result = await getProcessVersions(logger);
        const messages = logger.getMessages();
        expect(result).toStrictEqual({});
        expect(messages).toStrictEqual([
            { 'severity': 'error', 'text': 'An error occurred when retrieving the process versions: spawn error' }
        ]);
    });

    test('getInstalledExtensions() (VSCODE-Insiders)', async () => {
        mockIsAppStudio.mockReturnValue(false);
        process.env['VSCODE_IPC_HOOK'] = 'VSCode-main-insider';
        const expectedResult = {
            'yeoman-ui': { version: '2' },
            'vscode-ui5-language-assistant': { version: '2' },
            'xml-toolkit': { version: '2' }
        };

        const output = `SAPOS.yeoman-ui@2\nSAPOSS.vscode-ui5-language-assistant@2\nSAPOSS.xml-toolkit@2`;
        mockSpawnCommand.mockResolvedValueOnce(output);
        const result = await getInstalledExtensions();
        expect(result).toStrictEqual(expectedResult);
    });

    test('getInstalledExtensions() (VSCODE-Insiders 2)', async () => {
        mockIsAppStudio.mockReturnValue(false);
        process.env['TERM_PROGRAM_VERSION'] = '1.72.0-insider';
        const expectedResult = {
            'yeoman-ui': { version: '2' },
            'vscode-ui5-language-assistant': { version: '2' },
            'xml-toolkit': { version: '2' }
        };

        const output = `SAPOS.yeoman-ui@2\nSAPOSS.vscode-ui5-language-assistant@2\nSAPOSS.xml-toolkit@2`;
        mockSpawnCommand.mockResolvedValueOnce(output);
        const result = await getInstalledExtensions();
        expect(result).toStrictEqual(expectedResult);
    });
});
