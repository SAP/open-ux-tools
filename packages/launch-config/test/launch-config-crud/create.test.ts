import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { FileName } from '@sap-ux/project-access';
import { createLaunchConfigFile, getLaunchConfigFiles } from '../../src';
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

    test('Create empty launch.json - mem-fs-editor', async () => {
        await createLaunchConfigFile(TestPaths.tmpDir, undefined, memFs);
        const launchConfigFiles = await getLaunchConfigFiles(TestPaths.tmpDir, memFs);
        expect(launchConfigFiles.length).toBe(1);
        const result = memFs.readJSON(launchConfigFiles[0]);
        expect(result).toEqual({
            version: '0.2.0',
            configurations: []
        });
    });

    test('Create new launch.json with config - mem-fs-editor', async () => {
        const fioriOptions = {
            projectRoot: join(TestPaths.tmpDir, 'fe-project'),
            name: 'TEST_CONFIG',
            projectType: 'Edmx'
        };
        await createLaunchConfigFile(TestPaths.tmpDir, fioriOptions, memFs);
        const launchConfigFiles = await getLaunchConfigFiles(TestPaths.tmpDir, memFs);
        expect(launchConfigFiles.length).toBe(1);
        const result = memFs.readJSON(launchConfigFiles[0]);
        const expectedRunnableId = JSON.stringify(join(TestPaths.tmpDir, 'fe-project'));
        expect(result).toEqual({
            version: '0.2.0',
            configurations: [
                {
                    name: 'TEST_CONFIG',
                    cwd: '${workspaceFolder}\\fe-project',
                    runtimeArgs: ['fiori', 'run'],
                    type: 'node',
                    request: 'launch',
                    runtimeExecutable: 'npx',
                    windows: {
                        runtimeExecutable: 'npx.cmd'
                    },
                    console: 'internalConsole',
                    internalConsoleOptions: 'openOnSessionStart',
                    outputCapture: 'std',
                    env: {
                        'run.config': `{\"handlerId\":\"fiori_tools\",\"runnableId\":${expectedRunnableId}}`
                    }
                }
            ]
        });
    });
});
