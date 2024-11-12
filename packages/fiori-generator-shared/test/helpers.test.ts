import { join } from 'path';
import os from 'os';
import fs from 'fs';
import { getBootstrapResourceUrls } from '../src/index';
import { YEOMANUI_TARGET_FOLDER_CONFIG_PROP } from '../src/constants';
import { getDefaultTargetFolder, removeApiHostname } from '../src/helpers';

describe('getResourceUrlsForUi5Bootstrap', () => {
    it('should return relative paths for Edmx projects', () => {
        const result = getBootstrapResourceUrls(true);
        expect(result).toEqual({
            uShellBootstrapResourceUrl: '../test-resources/sap/ushell/bootstrap/sandbox.js',
            uiBootstrapResourceUrl: '../resources/sap-ui-core.js'
        });
    });

    it('should return framework paths when frameworkUrl and version are provided for non-Edmx projects', () => {
        const result = getBootstrapResourceUrls(false, 'https://ui5.sap.com', '1.84.0');
        expect(result).toEqual({
            uShellBootstrapResourceUrl: 'https://ui5.sap.com/1.84.0/test-resources/sap/ushell/bootstrap/sandbox.js',
            uiBootstrapResourceUrl: 'https://ui5.sap.com/1.84.0/resources/sap-ui-core.js'
        });
    });

    it('should return absolute paths when frameworkUrl is not provided for non-Edmx projects', () => {
        const result = getBootstrapResourceUrls(false);
        expect(result).toEqual({
            uShellBootstrapResourceUrl: '../test-resources/sap/ushell/bootstrap/sandbox.js',
            uiBootstrapResourceUrl: '../resources/sap-ui-core.js'
        });
    });

    it('should handle cases where only frameworkUrl is provided without version', () => {
        const result = getBootstrapResourceUrls(false, 'https://ui5.sap.com');
        expect(result).toEqual({
            uShellBootstrapResourceUrl: 'https://ui5.sap.com/test-resources/sap/ushell/bootstrap/sandbox.js',
            uiBootstrapResourceUrl: 'https://ui5.sap.com/resources/sap-ui-core.js'
        });
    });

    it('should handle cases where only version is provided without frameworkUrl', () => {
        // Not a typical scenario, but included for completeness
        const result = getBootstrapResourceUrls(false, undefined, '1.84.0');
        expect(result).toEqual({
            uShellBootstrapResourceUrl: '../test-resources/sap/ushell/bootstrap/sandbox.js',
            uiBootstrapResourceUrl: '../resources/sap-ui-core.js'
        });
    });
});

describe('getDefaultTargetFolder', () => {
    // rootPath exists only in SBAS
    const vscodeMock = {
        workspace: {
            workspaceFolders: [
                { uri: { fsPath: '/1st/workspace/path', scheme: 'file' } },
                { uri: { fsPath: '/2nd/workspace/path', scheme: 'file' } }
            ],
            workspaceFile: undefined,
            getConfiguration: (id: string): object => {
                if (id) {
                    return { configurations: [] };
                }
                return {
                    update: (): void => {
                        return;
                    },
                    get: (): void => {
                        return undefined;
                    }
                };
            }
        }
    };

    test('getDefaultTargetFolder', () => {
        expect(getDefaultTargetFolder(vscodeMock)).toBe('/1st/workspace/path');

        // Has a saved workspace, the first path is still used
        Object.assign(vscodeMock.workspace, { workspaceFile: 'workspace-file.json' });
        expect(getDefaultTargetFolder(vscodeMock)).toBe('/1st/workspace/path');

        // No folders added to workspace
        jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
        Object.assign(vscodeMock.workspace, { workspaceFolders: [] });
        expect(getDefaultTargetFolder(vscodeMock)).toBe(join(os.homedir(), 'projects'));

        vscodeMock.workspace.getConfiguration = (id: string): object => {
            if (id) {
                return { configurations: [] };
            }
            return {
                update: (): void => {
                    return;
                },
                get: (val: void): void => {
                    return val;
                }
            };
        };
        expect(getDefaultTargetFolder(undefined)).toBeUndefined();
        expect(getDefaultTargetFolder(vscodeMock)).toBe(YEOMANUI_TARGET_FOLDER_CONFIG_PROP);
    });
});

describe('removeApiHostname', () => {
    it('should remove -api from url', () => {
        const url = 'https://example-api.com';
        const result = removeApiHostname(url);
        expect(result).toBe('https://example.com');
    });
});
