import { DirName } from '@sap-ux/project-access';
import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { createLaunchConfig, LAUNCH_JSON_FILE, updateLaunchConfig } from '../../src';
import { TestPaths } from '../test-data/utils';
import { parse } from 'jsonc-parser';

const feLaunchJsonCopy = join(TestPaths.tmpDir, DirName.VSCode, LAUNCH_JSON_FILE);

function checkJSONComments(launchJsonString: string) {
    expect(launchJsonString).toMatch('// test json with comments - comment 1');
    for (let i = 2; i < 12; i++) {
        expect(launchJsonString).toMatch(`// comment ${i}`);
    }
}

describe('update', () => {
    const memFs = create(createStorage());

    beforeAll(async () => {
        memFs.copy(TestPaths.feProjectsLaunchConfig, feLaunchJsonCopy);
    });

    afterEach(async () => {
        const launchJsonString = memFs.read(feLaunchJsonCopy);
        checkJSONComments(launchJsonString);
    });

    afterAll(async () => {
        memFs.delete(TestPaths.tmpDir);
    });

    test('Create and then update existing launch config in launch.json', async (): Promise<void> => {
        // create a new
        const launchJSONPath = join(TestPaths.feProjectsLaunchConfig);
        let result = await createLaunchConfig(
            TestPaths.feProjects,
            { name: 'LaunchConfig_One', projectRoot: TestPaths.feProjects },
            memFs
        );
        let launchJSONString = result.read(launchJSONPath);
        let launchJSON = parse(launchJSONString);
        const expectedEnv = {
            'run.config': JSON.stringify({
                handlerId: 'fiori_tools',
                runnableId: join(TestPaths.feProjects)
            })
        };
        expect(launchJSON.configurations[6]).toStrictEqual({
            console: 'internalConsole',
            cwd: '${workspaceFolder}',
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
        });
        // update created
        result = await updateLaunchConfig(
            TestPaths.feProjects,
            {
                name: 'Changed config during test',
                projectRoot: TestPaths.feProjects,
                useMockData: true
            },
            6,
            memFs
        );
        launchJSONString = result.read(launchJSONPath);
        launchJSON = parse(launchJSONString);
        expect(launchJSON.configurations[6]).toStrictEqual({
            console: 'internalConsole',
            cwd: '${workspaceFolder}',
            env: expectedEnv,
            internalConsoleOptions: 'openOnSessionStart',
            name: 'Changed config during test',
            outputCapture: 'std',
            request: 'launch',
            runtimeArgs: ['fiori', 'run'],
            runtimeExecutable: 'npx',
            type: 'node',
            windows: {
                runtimeExecutable: 'npx.cmd'
            }
        });
    });

    test('Update existing launch config in launch.json that has commented code', async (): Promise<void> => {
        const launchJSONPath = join(TestPaths.feProjectsLaunchConfig);
        const result = await updateLaunchConfig(
            TestPaths.feProjects,
            {
                name: 'Existing config changed',
                projectRoot: TestPaths.feProjects,
                backendConfigs: [
                    {
                        path: 'PATH_CHANGED',
                        url: 'NEW_TEST_URL'
                    }
                ],
                ui5Version: 'TEST_UI5_VERSION_UPDATED',
                ui5VersionUri: 'https://ui5.sap.com.updated'
            },
            5,
            memFs
        );
        const expectedEnv = {
            'run.config': JSON.stringify({
                handlerId: 'fiori_tools',
                runnableId: join(TestPaths.feProjects)
            }),
            FIORI_TOOLS_BACKEND_CONFIG: JSON.stringify([{ path: 'PATH_CHANGED', url: 'NEW_TEST_URL' }]),
            FIORI_TOOLS_UI5_URI: 'https://ui5.sap.com.updated',
            FIORI_TOOLS_UI5_VERSION: 'TEST_UI5_VERSION_UPDATED'
        };
        const launchJSONString = result.read(launchJSONPath);
        const launchJSON = parse(launchJSONString);
        expect(launchJSON.configurations[5]).toStrictEqual({
            console: 'internalConsole',
            cwd: '${workspaceFolder}',
            env: expectedEnv,
            internalConsoleOptions: 'openOnSessionStart',
            name: 'Existing config changed',
            outputCapture: 'std',
            request: 'launch',
            runtimeArgs: ['fiori', 'run'],
            runtimeExecutable: 'npx',
            type: 'node',
            windows: {
                runtimeExecutable: 'npx.cmd'
            }
        });
    });

    test('Update existing launch config in launch.json - deselct mock data', async (): Promise<void> => {
        const launchJSONPath = join(TestPaths.feProjectsLaunchConfig);
        const result = await updateLaunchConfig(
            TestPaths.feProjects,
            {
                name: 'Existing config changed 2',
                projectRoot: TestPaths.feProjects,
                useMockData: false,
                ui5Version: 'TEST_UI5_VERSION_UPDATED2',
                ui5VersionUri: 'https://ui5.sap.com.updated2'
            },
            6,
            memFs
        );
        const expectedEnv = {
            'run.config': JSON.stringify({
                handlerId: 'fiori_tools',
                runnableId: join(TestPaths.feProjects)
            }),
            FIORI_TOOLS_UI5_URI: 'https://ui5.sap.com.updated2',
            FIORI_TOOLS_UI5_VERSION: 'TEST_UI5_VERSION_UPDATED2'
        };
        const launchJSONString = result.read(launchJSONPath);
        const launchJSON = parse(launchJSONString);
        expect(launchJSON.configurations[6]).toStrictEqual({
            console: 'internalConsole',
            cwd: '${workspaceFolder}',
            env: expectedEnv,
            internalConsoleOptions: 'openOnSessionStart',
            name: 'Existing config changed 2',
            outputCapture: 'std',
            request: 'launch',
            runtimeArgs: ['fiori', 'run'],
            runtimeExecutable: 'npx',
            type: 'node',
            windows: {
                runtimeExecutable: 'npx.cmd'
            }
        });
    });

    test('Update existing launch config in launch.json - select ui5 local sources with snapshot', async (): Promise<void> => {
        const launchJSONPath = join(TestPaths.feProjectsLaunchConfig);
        const result = await updateLaunchConfig(
            TestPaths.feProjects,
            {
                name: 'Existing config changed 3',
                projectRoot: TestPaths.feProjects,
                ui5Local: true,
                ui5Version: 'TEST_UI5_VERSION_UPDATED',
                ui5VersionUri: 'https://ui5.sap.com.updated',
                ui5LocalVersion: 'snapshot'
            },
            6,
            memFs
        );
        const expectedEnv = {
            'run.config': JSON.stringify({
                handlerId: 'fiori_tools',
                runnableId: join(TestPaths.feProjects)
            })
        };
        const launchJSONString = result.read(launchJSONPath);
        const launchJSON = parse(launchJSONString);
        expect(launchJSON.configurations[6]).toStrictEqual({
            console: 'internalConsole',
            cwd: '${workspaceFolder}',
            env: expectedEnv,
            internalConsoleOptions: 'openOnSessionStart',
            name: 'Existing config changed 3',
            outputCapture: 'std',
            request: 'launch',
            runtimeArgs: ['fiori', 'run'],
            runtimeExecutable: 'npx',
            type: 'node',
            windows: {
                runtimeExecutable: 'npx.cmd'
            }
        });
    });
});
