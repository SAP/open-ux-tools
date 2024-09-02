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
import { getFioriToolsDirectory } from '@sap-ux/store';
import type { Logger } from '@sap-ux/logger';
import { existsSync, mkdir } from 'fs';
import fs from 'fs';

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
    write: jest.fn()
} as unknown as Editor;
const mockPath = '/mock/project/path';
// Define a variable to control the behavior of writeFileSync
let writeFileSyncMockBehavior: 'success' | 'error';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    //mkdirSync: jest.fn(),
    existsSync: jest.fn().mockReturnValue(true), 
    readFileSync: jest.fn((path: string, encoding: string) => {
        console.log(" I AM BEING MOCKED !!!!!", path)
        // Mock different behaviors based on the path
        if (path) {
            return JSON.stringify({ latestGeneratedFiles: [] }); // Mock file content
        }
        throw new Error('Simulated read error');
    }),
    writeFileSync: jest.fn().mockImplementation(() => {
        if (writeFileSyncMockBehavior === 'error') {
            throw new Error('Simulated write error'); // Throw an error for `writeFileSync` when behavior is 'error'
        }
        // Otherwise, assume it succeeds
    })
}));

// Function to set the behavior for writeFileSync
const setWriteFileSyncBehavior = (behavior: 'success' | 'error') => {
    writeFileSyncMockBehavior = behavior;
    // Reinitialize the mock to apply the new behavior
    fs.writeFileSync = jest.fn().mockImplementation(() => {
        if (writeFileSyncMockBehavior === 'error') {
            throw new Error();
        }
    });
};

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
        it('should write application info settings to appInfo.json', () => {
            writeApplicationInfoSettings(mockPath, mockLog);
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                getFioriToolsDirectory(),
                JSON.stringify({ latestGeneratedFiles: [mockPath] }, null, 2)
            );
        });

        it('should handle error while writing to appInfo.json', () => {
            setWriteFileSyncBehavior('error');
            writeApplicationInfoSettings(mockPath, mockLog);
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
            updateWorkspaceFoldersIfNeeded(updateOptions, '/root/folder/path', mockLog);
            expect(updateOptions.vscode.workspace.updateWorkspaceFolders).toHaveBeenCalledWith(0, undefined, {
                name: 'Test Project',
                uri: '/mock/uri'
            });
        });

        it('should not update workspace folders if no options are provided', () => {
            const updateOptions: UpdateWorkspaceFolderOptions | undefined = undefined;
            updateWorkspaceFoldersIfNeeded(updateOptions, '/root/folder/path', mockLog);
            // No updateWorkspaceFolders call expected hence no app info json written
            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });
    });

    describe('createOrUpdateLaunchConfigJSON', () => {
        it('should create a new launch.json file if it does not exist', () => {
            const rootFolderPath = '/root/folder';
            fs.mkdirSync = jest.fn().mockReturnValue(rootFolderPath);
            fs.existsSync = jest.fn().mockReturnValue(false);
            createOrUpdateLaunchConfigJSON(rootFolderPath, launchJson, undefined, mockLog);
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                join(rootFolderPath, DirName.VSCode, LAUNCH_JSON_FILE),
                JSON.stringify(launchJson, null, 4),
                'utf8'
            );
        });

        it('should update an existing launch.json file', () => {
            const rootFolderPath = '/root/folder';
            fs.existsSync = jest.fn().mockReturnValue(true);
            createOrUpdateLaunchConfigJSON(rootFolderPath, launchJson, undefined, mockLog);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
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

            setWriteFileSyncBehavior('error');
            createOrUpdateLaunchConfigJSON(rootFolderPath, launchJson, undefined, mockLog);
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
            configureLaunchConfig(mockOptions, mockLog);

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
            configureLaunchConfig(options, mockLog);
            expect(mockLog.info).toHaveBeenCalledWith(
                t('startApp', { npmStart: '`npm start`', cdsRun: '`cds run --in-memory`' })
            );
        });

        it('Should not run in Yeoman CLI or if vscode not found', () => {
            const options = {
                datasourceType: DatasourceType.metadataFile,
                projectPath: 'some/path',
                vscode: false
            } as DebugOptions;
            configureLaunchConfig(options, mockLog);
            expect(mockLog.info).not.toHaveBeenCalled();
        });
    });
});
