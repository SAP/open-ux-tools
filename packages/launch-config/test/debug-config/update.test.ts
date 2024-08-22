import { join } from 'path';
import { handleWorkspaceConfig } from '../../src/debug-config/workspaceManager';
import type { DebugOptions, UpdateWorkspaceFolderOptions, LaunchJSON } from '../../src/types';
import { LAUNCH_JSON_FILE } from '../../src/types';
import {
    writeApplicationInfoSettings,
    updateWorkspaceFoldersIfNeeded,
    createOrUpdateLaunchConfigJSON,
    configureLaunchConfig
} from '../../src/launch-config-crud/create';
import { t } from '../../src/i18n';
import { DatasourceType } from '@sap-ux/odata-service-inquirer';
import type { Editor } from 'mem-fs-editor';
import { DirName } from '@sap-ux/project-access';
import { homedir } from 'os';
import type { Logger } from '@sap-ux/logger';

// Mock dependencies
jest.mock('mem-fs');
jest.mock('mem-fs-editor');
jest.mock('jsonc-parser', () => ({
    parse: jest.fn().mockReturnValue({
        configurations: [{ name: 'Existing Config', type: 'node' }]
    })
}));
jest.mock('../../src/debug-config/workspaceManager', () => ({
    handleWorkspaceConfig: jest.fn()
}));
jest.mock('../../src/debug-config/config', () => ({
    configureLaunchJsonFile: jest.fn(),
    writeApplicationInfoSettings: jest.requireActual('../../src/debug-config/config').writeApplicationInfoSettings
}));
const mockLog = {
    error: jest.fn(),
    info: jest.fn()
} as unknown as Logger;

const mockEditor = {
    exists: jest.fn().mockReturnValue(false),
    read: jest.fn(),
    write: jest.fn().mockImplementation(() => {
        throw new Error();
    })
} as unknown as Editor;

describe('Config Functions', () => {
    const launchJson = {
        configurations: [{ name: 'New Config', type: 'node' }]
    } as LaunchJSON;

    const existingLaunchJson = {
        configurations: [{ name: 'Existing Config', type: 'node' }]
    } as LaunchJSON;

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('writeApplicationInfoSettings', () => {
        const mockPath = '/mock/project/path';
        it('should write application info settings to appInfo.json', () => {
            writeApplicationInfoSettings(mockPath, mockEditor, mockLog);
            expect(mockEditor.write).toHaveBeenCalledWith(
                join(homedir(), '.fioritools', 'appInfo.json'),
                JSON.stringify({ latestGeneratedFiles: [mockPath] }, null, 2)
            );
        });

        it('should handle error while writing to appInfo.json', () => {
            writeApplicationInfoSettings(mockPath, mockEditor, mockLog);
            expect(mockLog.error).toHaveBeenCalledWith(t('errorAppInfoFile'));
        });
    });

    describe('updateWorkspaceFoldersIfNeeded', () => {
        it('should update workspace folders if options are provided', () => {
            const updateOptions = {
                uri: '/mock/uri',
                vscode: {
                    workspace: {
                        workspaceFolders: [],
                        updateWorkspaceFolders: jest.fn()
                    }
                },
                projectName: 'Test Project'
            } as UpdateWorkspaceFolderOptions;
            updateWorkspaceFoldersIfNeeded(updateOptions, '/root/folder/path', mockEditor, mockLog);
            expect(updateOptions.vscode.workspace.updateWorkspaceFolders).toHaveBeenCalledWith(0, undefined, {
                name: 'Test Project',
                uri: '/mock/uri'
            });
        });

        it('should not update workspace folders if no options are provided', () => {
            const updateOptions: UpdateWorkspaceFolderOptions | undefined = undefined;
            updateWorkspaceFoldersIfNeeded(updateOptions, '/root/folder/path', mockEditor, mockLog);
            // No updateWorkspaceFolders call expected
            expect(mockEditor.exists).not.toHaveBeenCalled();
        });
    });

    describe('createOrUpdateLaunchConfigJSON', () => {
        it('should create a new launch.json file if it does not exist', () => {
            const rootFolderPath = '/root/folder';
            createOrUpdateLaunchConfigJSON(rootFolderPath, launchJson, undefined, mockEditor, mockLog);
            expect(mockEditor.write).toHaveBeenCalledWith(
                join(rootFolderPath, DirName.VSCode, LAUNCH_JSON_FILE),
                JSON.stringify(launchJson, null, 4)
            );
        });

        it('should update an existing launch.json file', () => {
            const rootFolderPath = '/root/folder';

            const mockEditor = {
                exists: jest.fn().mockReturnValue(true),
                read: jest.fn().mockReturnValue(JSON.stringify(existingLaunchJson)),
                write: jest.fn()
            } as unknown as Editor;

            createOrUpdateLaunchConfigJSON(rootFolderPath, launchJson, undefined, mockEditor, mockLog);

            expect(mockEditor.write).toHaveBeenCalledWith(
                join(rootFolderPath, DirName.VSCode, LAUNCH_JSON_FILE),
                JSON.stringify(
                    {
                        configurations: [...existingLaunchJson.configurations, ...launchJson.configurations]
                    },
                    null,
                    4
                )
            );
        });

        it('should handle errors while writing launch.json file', () => {
            const rootFolderPath = '/root/folder';

            const mockEditor = {
                exists: jest.fn().mockReturnValue(false),
                write: jest.fn().mockImplementation(() => {
                    throw new Error();
                })
            } as unknown as Editor;
            createOrUpdateLaunchConfigJSON(rootFolderPath, launchJson, undefined, mockEditor, mockLog);
            expect(mockLog.error).toHaveBeenCalledWith(t('errorLaunchFile'));
        });
    });

    describe('configureLaunchConfig', () => {
        it('should configure launch config and update workspace folders', () => {
            const mockOptions = {
                projectPath: '/mock/project/path',
                writeToAppOnly: true,
                vscode: {
                    workspace: {
                        workspaceFolders: [],
                        updateWorkspaceFolders: jest.fn()
                    }
                } as any
            } as DebugOptions;

            const mockEditor = {
                exists: jest.fn(),
                read: jest.fn(),
                write: jest.fn()
            } as unknown as Editor;

            const mockLog = {
                info: jest.fn(),
                error: jest.fn()
            } as unknown as Logger;

            // Mock handleWorkspaceConfig to return a specific launchJsonPath and cwd
            (handleWorkspaceConfig as jest.Mock).mockReturnValue({
                launchJsonPath: '/mock/launch.json',
                cwd: '${workspaceFolder}/path',
                workspaceFolderUri: '/mock/launch.json'
            });

            // Call the function under test
            configureLaunchConfig(mockOptions, mockEditor, mockLog);

            // Expectations to ensure that workspace folders are updated correctly
            expect(mockOptions.vscode.workspace.updateWorkspaceFolders).toHaveBeenCalledWith(0, undefined, {
                uri: '/mock/launch.json',
                name: 'path'
            });
        });

        it('should log startApp message when datasourceType is capProject', () => {
            const options = {
                datasourceType: DatasourceType.capProject,
                projectPath: 'some/path'
            } as DebugOptions;
            configureLaunchConfig(options, undefined, mockLog);
            expect(mockLog.info).toHaveBeenCalledWith(
                t('startApp', { npmStart: '`npm start`', cdsRun: '`cds run --in-memory`' })
            );
        });

        it('Should NOT run in Yeoman CLI or if vscode not found', () => {
            const options = {
                datasourceType: DatasourceType.metadataFile,
                projectPath: 'some/path',
                vscode: false
            } as DebugOptions;
            configureLaunchConfig(options, undefined, mockLog);
            expect(mockLog.info).not.toHaveBeenCalled();
        });
    });
});
