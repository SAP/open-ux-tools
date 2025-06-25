import { configureLaunchJsonFile } from '../../src/debug-config/config';
import type { DebugOptions, LaunchConfig, LaunchJSON, FioriOptions } from '../../src/types';
import path from 'path';
import { FIORI_TOOLS_LAUNCH_CONFIG_HANDLER_ID } from '../../src/types';
import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { FileName } from '@sap-ux/project-access';
import { TestPaths } from '../test-data/utils';
import { handleWorkspaceConfig } from '../../src/debug-config/workspaceManager';
import * as launchConfig from '../../src/launch-config-crud/create';

// Mock workspaceManager
jest.mock('../../src/debug-config/workspaceManager', () => ({
    ...jest.requireActual('../../src/debug-config/workspaceManager'),
    handleWorkspaceConfig: jest.fn()
}));

jest.mock('../../src/launch-config-crud/create', () => ({
    ...jest.requireActual('../../src/launch-config-crud/create'),
    updateWorkspaceFoldersIfNeeded: jest.fn()
}));

const projectName = 'project1';
const cwd = `\${workspaceFolder}`;
const projectPath = path.join(__dirname, projectName);

// Base configuration template
const baseConfigurationObj: Partial<LaunchConfig> = {
    type: 'node',
    request: 'launch',
    runtimeExecutable: 'npx',
    cwd,
    windows: { runtimeExecutable: 'npx.cmd' },
    runtimeArgs: ['fiori', 'run'],
    console: 'internalConsole',
    internalConsoleOptions: 'openOnSessionStart',
    outputCapture: 'std',
    env: { FIORI_TOOLS_URL_PARAMS: 'sap-ui-xx-viewCache=false' }
};

const liveConfigurationObj = {
    ...baseConfigurationObj,
    name: 'Start project1',
    env: { ...baseConfigurationObj.env, DEBUG: '--inspect' },
    args: ['--open', 'test/flpSandbox.html#project1-tile']
};

const mockConfigurationObj = {
    ...baseConfigurationObj,
    name: 'Start project1 Mock',
    args: ['--config', './ui5-mock.yaml', '--open', 'test/flpSandbox.html#project1-tile']
};

const localConfigurationObj = {
    ...baseConfigurationObj,
    name: 'Start project1 Local',
    args: ['--config', './ui5-local.yaml', '--open', 'test/flpSandbox.html#project1-tile']
};

// Utility function to find configuration by name
const findConfiguration = (launchFile: LaunchJSON, name: string) =>
    launchFile.configurations.find((item) => item.name === name);

describe('debug config tests', () => {
    let configOptions: DebugOptions;
    const vscodeMock = {
        workspace: {
            workspaceFolders: [{ uri: { fsPath: '' } }],
            workspaceFile: undefined,
            getWorkspaceFolder: undefined
        }
    };
    beforeEach(() => {
        configOptions = {
            vscode: vscodeMock,
            odataVersion: '2.0',
            sapClientParam: '',
            flpAppId: 'project1-tile',
            isFioriElement: true,
            flpSandboxAvailable: true
        } as DebugOptions;
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    it('Should return the correct configuration for OData v2', () => {
        const launchFile = configureLaunchJsonFile(projectPath, cwd, configOptions);
        expect(launchFile.configurations.length).toBe(3);

        expect(findConfiguration(launchFile, `Start ${projectName}`)).toEqual(liveConfigurationObj);
        expect(findConfiguration(launchFile, `Start ${projectName} Mock`)).toEqual(mockConfigurationObj);
        expect(findConfiguration(launchFile, `Start ${projectName} Local`)).toEqual(localConfigurationObj);
    });

    it('Should return the correct configuration for OData v4', () => {
        configOptions.odataVersion = '4.0';
        const launchFile = configureLaunchJsonFile(projectPath, cwd, configOptions);
        expect(launchFile.configurations.length).toBe(3);

        expect(findConfiguration(launchFile, `Start ${projectName}`)).toEqual(liveConfigurationObj);
        expect(findConfiguration(launchFile, `Start ${projectName} Mock`)).toEqual(mockConfigurationObj);
        expect(findConfiguration(launchFile, `Start ${projectName} Local`)).toEqual(localConfigurationObj);
    });

    it('Should return correct configuration for local metadata', () => {
        configOptions.addStartCmd = false;
        const launchFile = configureLaunchJsonFile(projectPath, cwd, configOptions);
        expect(launchFile.configurations.length).toBe(2);

        expect(findConfiguration(launchFile, `Start ${projectName}`)).toBeUndefined();
        expect(findConfiguration(launchFile, `Start ${projectName} Mock`)).toEqual(mockConfigurationObj);
        expect(findConfiguration(launchFile, `Start ${projectName} Local`)).toEqual(localConfigurationObj);
    });

    it('Should return correct configuration when project is being migrated', () => {
        configOptions.isMigrator = true;
        const launchFile = configureLaunchJsonFile(projectPath, cwd, configOptions);
        const mockConfigWithMigrator = {
            ...mockConfigurationObj,
            args: ['--open', 'test/flpSandbox.html#project1-tile']
        };
        expect(findConfiguration(launchFile, `Start ${projectName} Mock`)).toEqual(mockConfigWithMigrator);
    });

    it('Should return correct configuration when project is being migrated and targetMockHtmlFile is test/flpSandboxMockServer.html', () => {
        configOptions.isMigrator = true;
        configOptions.targetMockHtmlFile = 'test/flpSandboxMockServer.html';
        const launchFile = configureLaunchJsonFile(projectPath, cwd, configOptions);
        const mockConfigWithMigrator = {
            ...mockConfigurationObj,
            args: ['--open', 'test/flpSandboxMockServer.html#project1-tile']
        };
        expect(findConfiguration(launchFile, `Start ${projectName} Mock`)).toEqual(mockConfigWithMigrator);
    });

    it('Should return correct configuration when project is being migrated, targetMockHtmlFile and migratorMockIntent is provided', () => {
        configOptions.isMigrator = true;
        configOptions.targetMockHtmlFile = 'test/flpSandboxMockServer.html';
        configOptions.migratorMockIntent = 'flpSandboxMockFlpIntent';
        const launchFile = configureLaunchJsonFile(projectPath, cwd, configOptions);
        const mockConfigWithMigrator = {
            ...mockConfigurationObj,
            args: ['--open', 'test/flpSandboxMockServer.html#flpSandboxMockFlpIntent']
        };
        expect(findConfiguration(launchFile, `Start ${projectName} Mock`)).toEqual(mockConfigWithMigrator);
    });

    it('Should return correct configuration when project is not a fiori element, no flp Sandbox Available & no flp app id', () => {
        configOptions.isFioriElement = false;
        configOptions.flpSandboxAvailable = false;
        configOptions.flpAppId = '';
        const launchFile = configureLaunchJsonFile(projectPath, cwd, configOptions);
        const localConfig = {
            ...localConfigurationObj,
            args: ['--config', './ui5-local.yaml', '--open', 'index.html']
        };
        expect(findConfiguration(launchFile, `Start ${projectName} Local`)).toEqual(localConfig);
    });

    it('Should return correct configuration when flp start file is provided', () => {
        configOptions.flpSandboxAvailable = false;
        configOptions.flpAppId = 'app-preview';
        const launchFile = configureLaunchJsonFile(projectPath, cwd, configOptions, 'test/flp.html');
        const localConfig = {
            ...localConfigurationObj,
            args: ['--config', './ui5-local.yaml', '--open', 'test/flp.html#app-preview']
        };
        expect(findConfiguration(launchFile, `Start ${projectName} Local`)).toEqual(localConfig);
    });

    it('Should return correct configuration when migrator mock intent is provided', () => {
        configOptions.migratorMockIntent = 'flpSandboxMockFlpIntent';
        const launchFile = configureLaunchJsonFile(projectPath, cwd, configOptions);
        const localConfig = {
            ...localConfigurationObj,
            args: ['--config', './ui5-local.yaml', '--open', 'test/flpSandbox.html#flpSandboxMockFlpIntent']
        };
        expect(findConfiguration(launchFile, `Start ${projectName} Local`)).toEqual(localConfig);
    });

    it('Should return correct configuration on BAS and sapClientParam is available', () => {
        configOptions.odataVersion = '2.0';
        configOptions.sapClientParam = 'sapClientParam';
        configOptions.isAppStudio = true;

        const launchFile = configureLaunchJsonFile(path.join(__dirname, projectName), cwd, configOptions);
        expect(launchFile.configurations.length).toBe(3);

        const projectPath = path.join(__dirname, 'project1');
        const expectedRunConfig = JSON.stringify({
            handlerId: FIORI_TOOLS_LAUNCH_CONFIG_HANDLER_ID,
            runnableId: projectPath
        });
        const expectedEnv = {
            FIORI_TOOLS_URL_PARAMS: 'sapClientParam&sap-ui-xx-viewCache=false',
            'run.config': expectedRunConfig
        };

        const liveConfigWithRunConfig = {
            ...liveConfigurationObj,
            env: { ...liveConfigurationObj.env, ...expectedEnv }
        };
        expect(liveConfigWithRunConfig).toEqual(findConfiguration(launchFile, `Start ${projectName}`));

        const mockConfigWithRunConfig = { ...mockConfigurationObj, env: expectedEnv };
        expect(mockConfigWithRunConfig).toEqual(findConfiguration(launchFile, `Start ${projectName} Mock`));

        const localConfigWithRunConfig = { ...localConfigurationObj, env: expectedEnv };
        expect(localConfigWithRunConfig).toEqual(findConfiguration(launchFile, `Start ${projectName} Local`));
    });
});

describe('create', () => {
    const memFs = create(createStorage());
    const memFilePath = join(TestPaths.tmpDir, 'fe-projects', FileName.Package);
    const memFileContent = '{}\n';
    let mockVSCode: any;
    let launchJSONPath: string;
    let fioriOptions: FioriOptions;

    afterEach(async () => {
        memFs.delete(memFilePath);
    });

    beforeEach(() => {
        memFs.writeJSON(memFilePath, memFileContent);
        mockVSCode = {
            workspace: {
                workspaceFolders: [],
                updateWorkspaceFolders: jest.fn()
            }
        };
        launchJSONPath = join(TestPaths.tmpDir, '.vscode', 'launch.json');
        (handleWorkspaceConfig as jest.Mock).mockReturnValue({
            launchJsonPath: launchJSONPath,
            workspaceFolderUri: launchJSONPath,
            cwd: TestPaths.tmpDir,
            appNotInWorkspace: true
        });
        fioriOptions = {
            name: 'launch-config-test',
            projectRoot: join(TestPaths.tmpDir, 'fe-projects'),
            debugOptions: {
                vscode: mockVSCode
            } as DebugOptions
        };
    });

    test('should call updateWorkspaceFolders if enableVSCodeReload is true', async () => {
        await launchConfig.createLaunchConfig(
            TestPaths.tmpDir,
            { ...fioriOptions, enableVSCodeReload: true }, // reload enabled
            memFs
        );
        expect(mockVSCode.workspace.updateWorkspaceFolders).toHaveBeenCalledTimes(1);
    });

    test('should not call updateWorkspaceFolders if enableVSCodeReload is false', async () => {
        await launchConfig.createLaunchConfig(
            TestPaths.tmpDir,
            { ...fioriOptions, enableVSCodeReload: false }, // reload disabled,
            memFs
        );
        expect(mockVSCode.workspace.updateWorkspaceFolders).not.toHaveBeenCalled();
    });

    test('should call updateWorkspaceFolders if enableVSCodeReload is not provided (defaults to true)', async () => {
        await launchConfig.createLaunchConfig(TestPaths.tmpDir, fioriOptions, memFs);
        expect(mockVSCode.workspace.updateWorkspaceFolders).toHaveBeenCalledTimes(1);
    });
});
