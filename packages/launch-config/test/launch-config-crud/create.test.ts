import { join } from 'path';
import { promises as fs } from 'fs';
import { FileName } from '@sap-ux/project-access';
import { createLaunchConfigFile, getLaunchConfigFiles } from '../../src';
import { TestPaths } from '../test-data/utils';
import { parse } from 'jsonc-parser';

beforeEach(async () => {
    await fs.mkdir(TestPaths.tmpDir);
    await fs.mkdir(join(TestPaths.tmpDir, 'fe-project'));
    await fs.writeFile(join(TestPaths.tmpDir, 'fe-project', FileName.Package), '{}');
});

afterEach(async () => {
    await fs.rm(TestPaths.tmpDir, { recursive: true });
});

test('Create empty launch.json', async () => {
    expect((await getLaunchConfigFiles(TestPaths.tmpDir)).length).toBe(0);
    await createLaunchConfigFile(TestPaths.tmpDir);
    const launchConfigFiles = await getLaunchConfigFiles(TestPaths.tmpDir);
    expect(launchConfigFiles.length).toBe(1);
    const content = parse(await fs.readFile(launchConfigFiles[0], { encoding: 'utf8' }));
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
    const content = parse(await fs.readFile(launchConfigFiles[0], { encoding: 'utf8' }));
    expect(content.configurations[0]['name']).toBe('TEST_CONFIG');
});
