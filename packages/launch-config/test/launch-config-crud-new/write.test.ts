import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { enhanceLaunchJSON } from '../../src/launch-config-crud-new/write';
import { TestPaths } from '../test-data/utils';
import { DirName } from '@sap-ux/project-access';
import { LAUNCH_JSON_FILE } from '../../src';

describe('Write launch config to launch.json', () => {
    const memFs = create(createStorage());
    const projectRoot = join(TestPaths.tmpDir, 'fe-project');
    const memFilePath = join(projectRoot, DirName.VSCode, LAUNCH_JSON_FILE);

    beforeEach(() => {
        // make sure no existing launch.json files in memory before each test
        memFs.delete(memFilePath);
    });

    it('Update existing launch.json with new launch config', async () => {
        // mock existing launch.json file
        const memFileContent = {
            version: '',
            configurations: [
                {
                    name: 'dummy',
                    args: []
                }
            ]
        };
        memFs.writeJSON(memFilePath, memFileContent);
        const fioriOptions = {
            projectRoot,
            name: 'TEST_CONFIG',
            projectType: 'Edmx'
        };
        await enhanceLaunchJSON(projectRoot, fioriOptions, memFs);
        const result = memFs.readJSON(memFilePath);
        expect(result).toEqual({
            version: '',
            configurations: [
                {
                    name: 'dummy',
                    args: []
                },
                {
                    name: 'TEST_CONFIG',
                    console: 'internalConsole',
                    cwd: '${workspaceFolder}',
                    env: {
                        'run.config': `{\"handlerId\":\"fiori_tools\",\"runnableId\":${JSON.stringify(projectRoot)}}`
                    },
                    internalConsoleOptions: 'openOnSessionStart',
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

    it('Create new launch.json with new launch config', async () => {
        const fioriOptions = {
            projectRoot: join(TestPaths.tmpDir, 'fe-project'),
            name: 'TEST_CONFIG',
            projectType: 'Edmx'
        };
        await enhanceLaunchJSON(projectRoot, fioriOptions, memFs);
        const result = memFs.readJSON(memFilePath);
        expect(result).toEqual({
            version: '0.2.0',
            configurations: [
                {
                    name: 'TEST_CONFIG',
                    console: 'internalConsole',
                    cwd: '${workspaceFolder}',
                    env: {
                        'run.config': `{\"handlerId\":\"fiori_tools\",\"runnableId\":${JSON.stringify(projectRoot)}}`
                    },
                    internalConsoleOptions: 'openOnSessionStart',
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
