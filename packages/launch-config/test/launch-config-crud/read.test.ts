import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { getLaunchConfigs, getLaunchConfigByName } from '../../src';
import { TestPaths } from '../test-data/utils';
import { getAllLaunchConfigs, getLaunchJSONFilePaths } from '../../src/launch-config-crud/read';
import { DirName } from '@sap-ux/project-access';
import type { Logger } from '@sap-ux/logger';

describe('read', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return launch configuration files', async () => {
        const launchConfigs = await getLaunchJSONFilePaths(TestPaths.workspaceRoots);
        expect(launchConfigs).toEqual([
            join(TestPaths.feProjects, DirName.VSCode, 'launch.json'),
            join(TestPaths.freestyleProjects, DirName.VSCode, 'launch.json')
        ]);
    });

    it('should return all launch configurations', async () => {
        const allLaunchConfigs = await getLaunchConfigs(TestPaths.feProjects);
        expect(allLaunchConfigs?.length).toBe(7);
    });

    it('should not return launch configurations from dummy path', async () => {
        const allLaunchConfigs = await getLaunchConfigs('dummy');
        expect(allLaunchConfigs).toBeUndefined();
    });

    it('should return undefined launch configurations if launch.json is empty', async () => {
        expect(await getLaunchConfigs(TestPaths.emptyJson)).toBeUndefined();
    });

    it('should throw an error if launch.json is invalid', async () => {
        try {
            await getLaunchConfigs(TestPaths.invalidJson);
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    it('should return launch configurations info', async () => {
        let allLaunchConfigs = await getAllLaunchConfigs(TestPaths.workspaceRoots);

        expect(allLaunchConfigs.length).toBe(2);
        expect(allLaunchConfigs[0].launchConfigs[0].name).toBe('Start fiori-elements-v4');
        expect(allLaunchConfigs[0].launchConfigs[1].name).toBe('Start fiori-elements-v2');
        expect(allLaunchConfigs[1].launchConfigs[0].name).toBe('Start freestyle');

        allLaunchConfigs = await getAllLaunchConfigs(TestPaths.freestyleProjects);
        expect(allLaunchConfigs[0].launchConfigs[0].name).toBe('Start freestyle');
    });

    it('should return launch config by name', async () => {
        const launchConfig = await getLaunchConfigByName(TestPaths.feProjectsLaunchConfig, 'Start fiori-elements-v2');
        expect(launchConfig).toMatchSnapshot();
    });

    it('should try to get invalid launch config', async () => {
        const logger = {
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;
        try {
            await getLaunchConfigByName('WRONG_PATH', 'Start fiori-elements-v2', { logger });
            fail('Get a launch config from non existing path did not threw error.');
        } catch (error) {
            expect(error.message).toContain('WRONG_PATH');
        }
        expect(logger.error).toBeCalledTimes(1);

        jest.clearAllMocks();

        try {
            await getLaunchConfigByName(TestPaths.feProjectsLaunchConfig, 'NON EXISTING CONFIG', { logger });
            fail('Get a launch config from non existing path did not threw error.');
        } catch (error) {
            expect(error.message).toContain('NON EXISTING CONFIG');
        }
        expect(logger.error).toBeCalledTimes(1);
    });

    describe('using memfs', () => {
        const memFs = create(createStorage());
        it('should return launch configuration files', async () => {
            const launchConfigs = await getLaunchJSONFilePaths(TestPaths.workspaceRoots, memFs);
            expect(launchConfigs).toEqual([
                join(TestPaths.feProjects, DirName.VSCode, 'launch.json'),
                join(TestPaths.freestyleProjects, DirName.VSCode, 'launch.json')
            ]);
        });

        it('should return all launch configurations', async () => {
            const allLaunchConfigs = await getLaunchConfigs(TestPaths.feProjects, memFs);
            expect(allLaunchConfigs?.length).toBe(7);
        });

        it('should not return launch configurations from dummy path', async () => {
            const allLaunchConfigs = await getLaunchConfigs('dummy', memFs);
            expect(allLaunchConfigs).toBeUndefined();
        });

        it('should throw an error if launch.json is invalid', async () => {
            try {
                await getLaunchConfigs(TestPaths.invalidJson, memFs);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        it('should return launch configurations info', async () => {
            let allLaunchConfigs = await getAllLaunchConfigs(TestPaths.workspaceRoots, memFs);

            expect(allLaunchConfigs.length).toBe(2);
            expect(allLaunchConfigs[0].launchConfigs[0].name).toBe('Start fiori-elements-v4');
            expect(allLaunchConfigs[0].launchConfigs[1].name).toBe('Start fiori-elements-v2');
            expect(allLaunchConfigs[1].launchConfigs[0].name).toBe('Start freestyle');

            allLaunchConfigs = await getAllLaunchConfigs(TestPaths.freestyleProjects, memFs);
            expect(allLaunchConfigs[0].launchConfigs[0].name).toBe('Start freestyle');
        });

        it('should return launch config by name', async () => {
            const launchConfig = await getLaunchConfigByName(
                TestPaths.feProjectsLaunchConfig,
                'Start fiori-elements-v2',
                { memFs }
            );
            expect(launchConfig).toMatchSnapshot();
        });

        it('should try to get invalid launch config', async () => {
            const logger = {
                info: jest.fn(),
                error: jest.fn()
            } as unknown as Logger;
            try {
                await getLaunchConfigByName('WRONG_PATH', 'Start fiori-elements-v2', { memFs, logger });
                fail('Get a launch config from non existing path did not threw error.');
            } catch (error) {
                expect(error.message).toContain('WRONG_PATH');
            }
            expect(logger.error).toBeCalledTimes(1);

            jest.clearAllMocks();

            try {
                await getLaunchConfigByName(TestPaths.feProjectsLaunchConfig, 'NON EXISTING CONFIG', { memFs, logger });
                fail('Get a launch config from non existing path did not threw error.');
            } catch (error) {
                expect(error.message).toContain('NON EXISTING CONFIG');
            }
            expect(logger.error).toBeCalledTimes(1);
        });
    });
});
