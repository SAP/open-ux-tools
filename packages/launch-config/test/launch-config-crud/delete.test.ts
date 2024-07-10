import { DirName } from '@sap-ux/project-access';
import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { LAUNCH_JSON_FILE, deleteLaunchConfig } from '../../src';
import { TestPaths } from '../test-data/utils';
import { parse } from 'jsonc-parser';

const feLaunchJsonCopy = join(TestPaths.tmpDir, DirName.VSCode, LAUNCH_JSON_FILE);

describe('delete', () => {
    const memFs = create(createStorage());

    beforeAll(async () => {
        memFs.copy(TestPaths.feProjectsLaunchConfig, feLaunchJsonCopy);
    });

    afterAll(async () => {
        memFs.delete(TestPaths.tmpDir);
    });

    test('Delete existing launch config in launch.json', async (): Promise<void> => {
        const launchJSONPath = join(TestPaths.feProjectsLaunchConfig);
        let launchJSONString = memFs.read(launchJSONPath);
        let launchJSON = parse(launchJSONString);
        expect(launchJSON.configurations.length).toBe(7);

        const result = await deleteLaunchConfig(TestPaths.feProjects, 6, memFs);
        launchJSONString = result.read(launchJSONPath);
        launchJSON = parse(launchJSONString);
        expect(launchJSON.configurations.length).toBe(6);
    });
});
