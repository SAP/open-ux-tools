import { join } from 'path';
import { createDirectory, deleteDirectory, readJSON, updateFile } from '@sap/ux-project-access';
import { createLaunchConfigFile, getLaunchConfigFiles } from '../../src';
import { TestPaths } from '../test-data/utils';
import { FileName } from '@sap-ux/project-access';

beforeEach(async () => {
    await deleteDirectory(TestPaths.tmpDir);
    await createDirectory(TestPaths.tmpDir);
    await createDirectory(join(TestPaths.tmpDir, 'fe-project'));
    await updateFile(join(TestPaths.tmpDir, 'fe-project', FileName.Package), '{}');
});

afterAll(async () => {
    await deleteDirectory(TestPaths.tmpDir);
});

test('Create empty launch.json', async () => {
    expect((await getLaunchConfigFiles(TestPaths.tmpDir)).length).toBe(0);
    await createLaunchConfigFile(TestPaths.tmpDir);
    const launchConfigFiles = await getLaunchConfigFiles(TestPaths.tmpDir);
    expect(launchConfigFiles.length).toBe(1);
    const content = await readJSON<{ configurations: object[] }>(launchConfigFiles[0]);
    expect(content.configurations).toEqual([]);
});

test('Create new launch.json with config', async () => {
    expect((await getLaunchConfigFiles(TestPaths.tmpDir)).length).toBe(0);
    const fioriOptions = {
        projectRoot: join(TestPaths.tmpDir, 'fe-project'),
        name: 'TEST_CONFIG',
        projectType: 'Edmx'
    };
    await createLaunchConfigFile(TestPaths.tmpDir, fioriOptions);
    const launchConfigFiles = await getLaunchConfigFiles(TestPaths.tmpDir);
    expect(launchConfigFiles.length).toBe(1);
    const content = await readJSON<{ configurations: { name: string }[] }>(launchConfigFiles[0]);
    expect(content.configurations[0]['name']).toBe('TEST_CONFIG');
});
