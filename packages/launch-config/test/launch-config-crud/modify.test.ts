import type { LaunchConfig } from '../../src';
import { convertOldLaunchConfigToFioriRun, generateNewFioriLaunchConfig } from '../../src';
import { TestPaths } from '../test-data/utils';

describe('modify', () => {
    const runnableId = JSON.stringify({
        runnableId: TestPaths.v2
    });
    it('should modify old config that uses run-scripts without args defined', async () => {
        const launchConfig: LaunchConfig = {
            name: '',
            cwd: '',
            runtimeArgs: ['run-script', 'start'],
            type: 'node',
            request: 'launch',
            runtimeExecutable: 'npm',
            args: [],
            windows: {
                runtimeExecutable: 'npm.cmd'
            },
            console: 'internalConsole',
            internalConsoleOptions: 'openOnSessionStart',
            outputCapture: 'std',
            env: {
                'run.config': runnableId
            }
        };
        const modified = await convertOldLaunchConfigToFioriRun(launchConfig);
        expect(modified.args).toEqual([
            '--open',
            'test/flpSandbox.html?sap-client=100#masterDetail-display',
            '--config',
            'ui5.yaml'
        ]);
        expect(modified.env).toEqual({
            'run.config': runnableId
        });
        expect(modified.runtimeExecutable).toEqual('npx');
        expect(modified.windows.runtimeExecutable).toEqual('npx.cmd');
        expect(modified.runtimeArgs).toEqual(['fiori', 'run']);
    });

    it('should modify old config that uses run-scripts without args defined: start script contains short args keys', async () => {
        const launchConfig: LaunchConfig = {
            name: '',
            cwd: '',
            runtimeArgs: ['run-script', 'start'],
            type: 'node',
            request: 'launch',
            runtimeExecutable: 'npm',
            args: [],
            windows: {
                runtimeExecutable: 'npm.cmd'
            },
            console: 'internalConsole',
            internalConsoleOptions: 'openOnSessionStart',
            outputCapture: 'std',
            env: {
                'run.config': JSON.stringify({
                    runnableId: TestPaths.freestyleProjects
                })
            }
        };
        const modified = await convertOldLaunchConfigToFioriRun(launchConfig);
        expect(modified.args).toEqual([
            '--open',
            'test/flpSandbox.html?sap-client=100#masterDetail-display',
            '--config',
            'ui5.yaml'
        ]);
        expect(modified.env).toEqual({
            'run.config': JSON.stringify({
                runnableId: TestPaths.freestyleProjects
            })
        });
        expect(modified.runtimeExecutable).toEqual('npx');
        expect(modified.windows.runtimeExecutable).toEqual('npx.cmd');
        expect(modified.runtimeArgs).toEqual(['fiori', 'run']);
    });

    it('should modify old config that uses run-scripts with args defined', async () => {
        const launchConfig: LaunchConfig = {
            name: '',
            cwd: '',
            runtimeArgs: ['run-script', 'start'],
            type: 'node',
            request: 'launch',
            runtimeExecutable: 'npm',
            args: [
                '--',
                '--ui5Uri https://ui5.sap.com --ui5 1.90.7',
                '--backendConfig',
                '[{"path":"","url":"","client":""}]'
            ],
            windows: {
                runtimeExecutable: 'npm.cmd'
            },
            console: 'internalConsole',
            internalConsoleOptions: 'openOnSessionStart',
            outputCapture: 'std',
            env: {
                'run.config': runnableId
            }
        };
        const modified = await convertOldLaunchConfigToFioriRun(launchConfig);
        expect(modified.args).toEqual([
            '--open',
            'test/flpSandbox.html?sap-client=100#masterDetail-display',
            '--config',
            'ui5.yaml'
        ]);
        expect(modified.env).toEqual({
            'run.config': runnableId,
            FIORI_TOOLS_UI5_VERSION: '1.90.7',
            FIORI_TOOLS_UI5_URI: 'https://ui5.sap.com',
            FIORI_TOOLS_BACKEND_CONFIG: '[{"path":"","url":"","client":""}]'
        });
        expect(modified.runtimeExecutable).toEqual('npx');
        expect(modified.windows.runtimeExecutable).toEqual('npx.cmd');
        expect(modified.runtimeArgs).toEqual(['fiori', 'run']);
    });

    it('should modify old config that uses run-scripts with no start script and args defined', async () => {
        const launchConfig: LaunchConfig = {
            name: '',
            cwd: '',
            runtimeArgs: ['run-script', 'not-start'],
            type: 'node',
            request: 'launch',
            runtimeExecutable: 'npm',
            args: [],
            windows: {
                runtimeExecutable: 'npm.cmd'
            },
            console: 'internalConsole',
            internalConsoleOptions: 'openOnSessionStart',
            outputCapture: 'std',
            env: {
                'run.config': runnableId
            }
        };
        const modified = await convertOldLaunchConfigToFioriRun(launchConfig);
        expect(modified.args).toEqual([]);
        expect(modified.env).toEqual({
            'run.config': runnableId
        });
        expect(modified.runtimeExecutable).toEqual('npx');
        expect(modified.windows.runtimeExecutable).toEqual('npx.cmd');
        expect(modified.runtimeArgs).toEqual(['fiori', 'run']);
    });

    it('should modify nothing, launch config is defined for fiori run', async () => {
        const launchConfig = generateNewFioriLaunchConfig('WORKSPACE_FOLDER', {
            name: 'TEST_NAME',
            projectRoot: TestPaths.v2,
            ui5Version: 'DUMMY_UI5_VERSION',
            ui5VersionUri: 'DUMMY_UI5_URI'
        });
        // clone object to create a new reference
        const expected: LaunchConfig = Object.assign({}, launchConfig);
        const modified = await convertOldLaunchConfigToFioriRun(launchConfig);
        expect(modified).toStrictEqual(expected);
    });

    it('should not modify other types of run configurations', async () => {
        const launchConfig = {
            name: 'Some run config',
            type: 'node',
            request: 'launch',
            program: '${workspaceFolder}/index.js',
            cwd: '${workspaceFolder}/myproject',
            args: [],
            envFile: '${workspaceFolder}/myproject/.env'
        };
        // clone object to create a new reference
        const expected = Object.assign({}, launchConfig);
        const modified = await convertOldLaunchConfigToFioriRun(launchConfig as any);
        expect(modified).toStrictEqual(expected);
    });

    it('should not modify, only if no project root', async () => {
        const launchConfig = {
            name: 'Some run config',
            runtimeArgs: ['run-script', 'start'],
            type: 'node',
            request: 'launch',
            program: '${workspaceFolder}/index.js',
            cwd: '${workspaceFolder}/myproject',
            envFile: '${workspaceFolder}/myproject/.env'
        };
        // clone object to create a new reference
        const expected = Object.assign({}, launchConfig);
        const modified = await convertOldLaunchConfigToFioriRun(launchConfig as any);
        expect(modified).toStrictEqual(expected);
    });
});
