import { basename, join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { createLaunchConfig } from '../../src/launch-config-crud/create';
import { DirName, FileName } from '@sap-ux/project-access';
import { TestPaths } from '../test-data/utils';
import type { DebugOptions } from '../../src/types';
import { LAUNCH_JSON_FILE } from '../../src/types';
import type { Logger } from '@sap-ux/logger';
import { t } from '../../src/i18n';
import { isFolderInWorkspace } from '../../src/debug-config/helpers';

// Mock the helpers
jest.mock('../../src/debug-config/helpers', () => ({
    ...jest.requireActual('../../src/debug-config/helpers'),
    isFolderInWorkspace: jest.fn()
}));

describe('create', () => {
    const memFs = create(createStorage());
    const memFilePath = join(TestPaths.tmpDir, 'fe-projects', FileName.Package);
    const memFileContent = '{}\n';
    const mockLog = {
        error: jest.fn(),
        info: jest.fn()
    } as unknown as Logger;

    const clearMemFsPaths = (path: string) => {
        if (memFs.exists(path)) {
            memFs.delete(path);
        }
    };

    beforeEach(() => {
        memFs.writeJSON(memFilePath, memFileContent);
    });

    afterEach(async () => {
        memFs.delete(memFilePath);
    });

    test('launch.json file is missing, create new file with new config', async () => {
        const result = await createLaunchConfig(
            TestPaths.tmpDir,
            { name: 'LaunchConfig_One', projectRoot: join(TestPaths.tmpDir, 'fe-projects') },
            memFs
        );
        const expectedEnv = {
            'run.config': JSON.stringify({
                handlerId: 'fiori_tools',
                runnableId: join(TestPaths.tmpDir, 'fe-projects')
            })
        };
        const launchJSONPath = join(TestPaths.tmpDir, '.vscode', 'launch.json');
        expect(result.exists(launchJSONPath)).toBe(true);
        expect(result.readJSON(launchJSONPath)).toStrictEqual({
            version: '0.2.0',
            configurations: [
                {
                    console: 'internalConsole',
                    cwd: join('${workspaceFolder}', 'fe-projects'),
                    env: expectedEnv,
                    internalConsoleOptions: 'openOnSessionStart',
                    name: 'LaunchConfig_One',
                    outputCapture: 'std',
                    request: 'launch',
                    runtimeArgs: ['fiori', 'run'],
                    runtimeExecutable: 'npx',
                    type: 'node',
                    windows: {
                        runtimeExecutable: 'npx.cmd'
                    }
                }
            ]
        });
    });

    test('launch.json file is missing, create new file with new config (include UI5 version and backend config)', async () => {
        const launchJSONPath = join(TestPaths.tmpDir, DirName.VSCode, 'launch.json');
        // delete existing file
        memFs.delete(launchJSONPath);
        // Select UI5 version
        const ui5Version = 'DUMMY_UI5_VERSION';
        // Set ui5VersionUri
        const ui5VersionUri = 'DUMMY_UI5_URI';
        // Select destination
        const backendConfigs = [{ path: 'TEST_PATH', name: 'TEST_DESTINAME', url: 'dummy' }];
        const result = await createLaunchConfig(
            TestPaths.tmpDir,
            {
                name: 'LaunchConfig_One',
                projectRoot: join(TestPaths.tmpDir, 'fe-projects'),
                ui5Version,
                ui5VersionUri,
                backendConfigs
            },
            memFs
        );
        const expectedEnv = {
            FIORI_TOOLS_BACKEND_CONFIG: JSON.stringify(backendConfigs),
            FIORI_TOOLS_UI5_URI: ui5VersionUri,
            FIORI_TOOLS_UI5_VERSION: ui5Version,
            'run.config': JSON.stringify({
                handlerId: 'fiori_tools',
                runnableId: join(TestPaths.tmpDir, 'fe-projects')
            })
        };
        expect(result.exists(launchJSONPath)).toBe(true);
        expect(result.readJSON(launchJSONPath)).toStrictEqual({
            version: '0.2.0',
            configurations: [
                {
                    console: 'internalConsole',
                    cwd: join('${workspaceFolder}', 'fe-projects'),
                    env: expectedEnv,
                    internalConsoleOptions: 'openOnSessionStart',
                    name: 'LaunchConfig_One',
                    outputCapture: 'std',
                    request: 'launch',
                    runtimeArgs: ['fiori', 'run'],
                    runtimeExecutable: 'npx',
                    type: 'node',
                    windows: {
                        runtimeExecutable: 'npx.cmd'
                    }
                }
            ]
        });
    });

    test('launch.json file already exists, enhance file with new config', async () => {
        const launchJSONPath = join(TestPaths.tmpDir, '.vscode', 'launch.json');
        memFs.writeJSON(launchJSONPath, {
            version: '0.2.0',
            configurations: [
                {
                    name: 'LaunchConfig_One'
                }
            ]
        });
        const result = await createLaunchConfig(
            TestPaths.tmpDir,
            { name: 'LaunchConfig_Two', projectRoot: join(TestPaths.tmpDir, 'fe-projects') },
            memFs
        );
        const expectedEnv = {
            'run.config': JSON.stringify({
                handlerId: 'fiori_tools',
                runnableId: join(TestPaths.tmpDir, 'fe-projects')
            })
        };
        expect(result.exists(launchJSONPath)).toBe(true);
        expect(result.readJSON(launchJSONPath)).toStrictEqual({
            version: '0.2.0',
            configurations: [
                {
                    name: 'LaunchConfig_One'
                },
                {
                    console: 'internalConsole',
                    cwd: join('${workspaceFolder}', 'fe-projects'),
                    env: expectedEnv,
                    internalConsoleOptions: 'openOnSessionStart',
                    name: 'LaunchConfig_Two',
                    outputCapture: 'std',
                    request: 'launch',
                    runtimeArgs: ['fiori', 'run'],
                    runtimeExecutable: 'npx',
                    type: 'node',
                    windows: {
                        runtimeExecutable: 'npx.cmd'
                    }
                }
            ]
        });
    });

    test('launch.json file is missing, create new file with new config when debug options is provided', async () => {
        const projectPath = join(TestPaths.tmpDir, 'test-projects');
        const launchConfigPath = join(projectPath, '.vscode', 'launch.json');
        if (memFs.exists(launchConfigPath)) {
            memFs.delete(launchConfigPath);
        }
        const fs = await createLaunchConfig(
            projectPath,
            {
                name: 'test-projects',
                projectRoot: projectPath,
                debugOptions: {
                    vscode: true
                } as DebugOptions
            },
            memFs,
            mockLog
        );

        expect(fs.exists(launchConfigPath)).toBe(true);
        expect(mockLog.info).toHaveBeenCalledWith(
            t('info.startServerMessage', {
                folder: basename(projectPath),
                npmCommand: 'run start-mock'
            })
        );
        expect(fs.readJSON(launchConfigPath)).toStrictEqual({
            version: '0.2.0',
            configurations: [
                {
                    name: 'Start test-projects',
                    type: 'node',
                    request: 'launch',
                    cwd: '${workspaceFolder}',
                    runtimeExecutable: 'npx',
                    windows: {
                        runtimeExecutable: 'npx.cmd'
                    },
                    runtimeArgs: ['fiori', 'run'],
                    args: ['--open', 'index.htmlundefined'],
                    console: 'internalConsole',
                    internalConsoleOptions: 'openOnSessionStart',
                    outputCapture: 'std',
                    env: {
                        'DEBUG': '--inspect',
                        'FIORI_TOOLS_URL_PARAMS': 'sap-ui-xx-viewCache=false'
                    }
                },
                {
                    name: 'Start test-projects Local',
                    type: 'node',
                    request: 'launch',
                    cwd: '${workspaceFolder}',
                    runtimeExecutable: 'npx',
                    windows: {
                        runtimeExecutable: 'npx.cmd'
                    },
                    runtimeArgs: ['fiori', 'run'],
                    args: ['--config', './ui5-local.yaml', '--open', 'index.htmlundefined'],
                    console: 'internalConsole',
                    internalConsoleOptions: 'openOnSessionStart',
                    outputCapture: 'std',
                    env: {
                        'FIORI_TOOLS_URL_PARAMS': 'sap-ui-xx-viewCache=false'
                    }
                }
            ]
        });
    });

    test('Should create launch.json or run in Yeoman CLI or if vscode not found', async () => {
        const projectPath = join(TestPaths.tmpDir, 'test-projects');
        const launchConfigPath = join(projectPath, DirName.VSCode, LAUNCH_JSON_FILE);
        clearMemFsPaths(launchConfigPath);
        const fs = await createLaunchConfig(
            TestPaths.tmpDir,
            {
                name: 'test-projects',
                projectRoot: projectPath,
                debugOptions: {
                    vscode: false
                } as DebugOptions
            },
            memFs,
            mockLog
        );
        expect(fs.exists(launchConfigPath)).toBe(false);
    });

    test('launch.json file already exists, update file with debig config when debug options is provided and app is created out of', async () => {
        const projectPath = join(TestPaths.tmpDir, 'test', 'test-projects');
        const launchJSONPath = join(TestPaths.tmpDir, 'test', '.vscode', 'launch.json');
        clearMemFsPaths(launchJSONPath);
        memFs.writeJSON(launchJSONPath, {
            version: '0.2.0',
            configurations: [
                {
                    name: 'LaunchConfig_One'
                }
            ]
        });
        (isFolderInWorkspace as jest.Mock).mockReturnValue(true);
        const result: any = await createLaunchConfig(
            projectPath,
            {
                name: 'test-projects',
                projectRoot: projectPath,
                debugOptions: {
                    vscode: {
                        workspace: {
                            workspaceFile: { scheme: 'file' }
                        }
                    } as any,
                    isAppStudio: false
                } as DebugOptions
            },
            memFs
        );
        expect(result.exists(launchJSONPath)).toBe(true);
        const expectedLaunchConfigPath = join(TestPaths.tmpDir, 'test', '.vscode', 'launch.json');
        const updatedJson = result.readJSON(expectedLaunchConfigPath);
        expect(updatedJson).toStrictEqual({
            version: '0.2.0',
            configurations: [
                {
                    name: 'LaunchConfig_One'
                },
                {
                    name: 'Start test-projects',
                    type: 'node',
                    request: 'launch',
                    cwd: '${workspaceFolder}/test-projects',
                    runtimeExecutable: 'npx',
                    windows: {
                        runtimeExecutable: 'npx.cmd'
                    },
                    runtimeArgs: ['fiori', 'run'],
                    args: ['--open', 'index.htmlundefined'],
                    console: 'internalConsole',
                    internalConsoleOptions: 'openOnSessionStart',
                    outputCapture: 'std',
                    env: {
                        DEBUG: '--inspect',
                        FIORI_TOOLS_URL_PARAMS: 'sap-ui-xx-viewCache=false'
                    }
                },
                {
                    name: 'Start test-projects Local',
                    type: 'node',
                    request: 'launch',
                    cwd: '${workspaceFolder}/test-projects',
                    runtimeExecutable: 'npx',
                    windows: {
                        runtimeExecutable: 'npx.cmd'
                    },
                    runtimeArgs: ['fiori', 'run'],
                    args: ['--config', './ui5-local.yaml', '--open', 'index.htmlundefined'],
                    console: 'internalConsole',
                    internalConsoleOptions: 'openOnSessionStart',
                    outputCapture: 'std',
                    env: {
                        FIORI_TOOLS_URL_PARAMS: 'sap-ui-xx-viewCache=false'
                    }
                }
            ]
        });
    });

    test('launch.json file already exists, update file with debig config when debug options is provided', async () => {
        const projectPath = join(TestPaths.tmpDir, 'test', 'test-projects');
        const launchJSONPath = join(TestPaths.tmpDir, 'test', '.vscode', 'launch.json');
        clearMemFsPaths(launchJSONPath);
        memFs.writeJSON(launchJSONPath, {
            version: '0.2.0',
            configurations: [
                {
                    name: 'LaunchConfig_One'
                }
            ]
        });
        (isFolderInWorkspace as jest.Mock).mockReturnValue(true);
        const result: any = await createLaunchConfig(
            projectPath,
            {
                name: 'test-projects',
                projectRoot: projectPath,
                debugOptions: {
                    vscode: {
                        workspace: {
                            workspaceFile: { scheme: 'file' }
                        }
                    } as any,
                    isAppStudio: false
                } as DebugOptions
            },
            memFs
        );
        expect(result.exists(launchJSONPath)).toBe(true);
        const expectedLaunchConfigPath = join(TestPaths.tmpDir, 'test', '.vscode', 'launch.json');
        const updatedJson = result.readJSON(expectedLaunchConfigPath);
        expect(updatedJson).toStrictEqual({
            version: '0.2.0',
            configurations: [
                {
                    name: 'LaunchConfig_One'
                },
                {
                    name: 'Start test-projects',
                    type: 'node',
                    request: 'launch',
                    cwd: '${workspaceFolder}/test-projects',
                    runtimeExecutable: 'npx',
                    windows: {
                        runtimeExecutable: 'npx.cmd'
                    },
                    runtimeArgs: ['fiori', 'run'],
                    args: ['--open', 'index.htmlundefined'],
                    console: 'internalConsole',
                    internalConsoleOptions: 'openOnSessionStart',
                    outputCapture: 'std',
                    env: {
                        DEBUG: '--inspect',
                        FIORI_TOOLS_URL_PARAMS: 'sap-ui-xx-viewCache=false'
                    }
                },
                {
                    name: 'Start test-projects Local',
                    type: 'node',
                    request: 'launch',
                    cwd: '${workspaceFolder}/test-projects',
                    runtimeExecutable: 'npx',
                    windows: {
                        runtimeExecutable: 'npx.cmd'
                    },
                    runtimeArgs: ['fiori', 'run'],
                    args: ['--config', './ui5-local.yaml', '--open', 'index.htmlundefined'],
                    console: 'internalConsole',
                    internalConsoleOptions: 'openOnSessionStart',
                    outputCapture: 'std',
                    env: {
                        FIORI_TOOLS_URL_PARAMS: 'sap-ui-xx-viewCache=false'
                    }
                }
            ]
        });
    });
});
