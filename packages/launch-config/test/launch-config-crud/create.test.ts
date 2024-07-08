import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { createLaunchConfig } from '../../src/launch-config-crud/create';
import { FileName } from '@sap-ux/project-access';
import { TestPaths } from '../test-data/utils';

describe('create', () => {
    const memFs = create(createStorage());
    const memFilePath = join(TestPaths.tmpDir, 'fe-project', FileName.Package);
    const memFileContent = '{}\n';

    beforeEach(() => {
        memFs.writeJSON(memFilePath, memFileContent);
    });

    afterEach(async () => {
        memFs.delete(memFilePath);
    });

    test('launch.json file is missing, create new file with new config', async () => {
        const result = await createLaunchConfig(
            TestPaths.tmpDir,
            { name: 'LaunchConfig_One', projectRoot: join(TestPaths.tmpDir, 'fe-project') },
            memFs
        );
        const expectedEnv = {
            'run.config': JSON.stringify({
                handlerId: 'fiori_tools',
                runnableId: join(TestPaths.tmpDir, 'fe-project')
            })
        };
        const launchJSONPath = join(TestPaths.tmpDir, '.vscode', 'launch.json');
        expect(result.exists(launchJSONPath));
        expect(result.readJSON(launchJSONPath)).toStrictEqual({
            version: '0.2.0',
            configurations: [
                {
                    console: 'internalConsole',
                    cwd: join('${workspaceFolder}', 'fe-project'),
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
            { name: 'LaunchConfig_Two', projectRoot: join(TestPaths.tmpDir, 'fe-project') },
            memFs
        );
        const expectedEnv = {
            'run.config': JSON.stringify({
                handlerId: 'fiori_tools',
                runnableId: join(TestPaths.tmpDir, 'fe-project')
            })
        };
        expect(result.exists(launchJSONPath));
        expect(result.readJSON(launchJSONPath)).toStrictEqual({
            version: '0.2.0',
            configurations: [
                {
                    name: 'LaunchConfig_One'
                },
                {
                    console: 'internalConsole',
                    cwd: join('${workspaceFolder}', 'fe-project'),
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
});
