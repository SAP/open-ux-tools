import { DirName, FileName } from '@sap-ux/project-access';
import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { LaunchConfig } from '../../src';
import {
    addFioriElementsLaunchConfig,
    getAllLaunchConfigs,
    launchConfigFile,
    updateFioriElementsLaunchConfig
} from '../../src';
import { TestPaths } from '../test-data/utils';

const feLaunchJsonCopy = join(TestPaths.tmpDir, DirName.VSCode, launchConfigFile);
//const freestyleLaunchJsonCopy = join(TestPaths.tmpDir, 'freestyle-launch.json');

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

    test('Add launch config', async (): Promise<void> => {
        await addFioriElementsLaunchConfig(
            TestPaths.tmpDir,
            {
                name: 'Added config during test',
                projectRoot: TestPaths.v2lrop,
                backendConfigs: [{ path: 'TEST_PATH', url: 'TEST_URL' }],
                ui5Version: 'TEST_UI5_VERSION',
                ui5VersionUri: 'https://ui5.sap.com',
                useMockData: true,
                urlParameters: 'sap-ui-xx-viewCache=false'
            },
            memFs
        );

        const launchConfigs = await getAllLaunchConfigs(TestPaths.tmpDir, memFs);
        const addedConfig = launchConfigs[0].launchConfigs.find((c) => c.name === 'Added config during test');
        expect(addedConfig?.cwd).toBe(TestPaths.v2lrop);
        expect(addedConfig?.env.FIORI_TOOLS_BACKEND_CONFIG).toEqual('[{"path":"TEST_PATH","url":"TEST_URL"}]');
        expect(addedConfig?.env.FIORI_TOOLS_UI5_VERSION).toEqual('TEST_UI5_VERSION');
        expect(addedConfig?.env.FIORI_TOOLS_UI5_URI).toEqual('https://ui5.sap.com');
        expect(addedConfig?.env.FIORI_TOOLS_URL_PARAMS).toEqual('sap-ui-xx-viewCache=false');
        expect(addedConfig?.args![0]).toEqual('--config');
        expect(addedConfig?.args![1]).toEqual('ui5-mock.yaml');
    });

    // test('Update added launch config', async (): Promise<void> => {
    //     let launchConfigs = await getAllLaunchConfigs(TestPaths.tmpDir, memFs);
    //     const addedConfigIndex = launchConfigs[0].launchConfigs.findIndex((c) => c.name === 'Added config during test');
    //     await updateFioriElementsLaunchConfig(
    //         TestPaths.tmpDir,
    //         addedConfigIndex,
    //         {
    //             name: 'Changed config during test',
    //             projectRoot: TestPaths.tmpDir,
    //             useMockData: true
    //         },
    //         memFs
    //     );
    //     launchConfigs = await getAllLaunchConfigs(TestPaths.tmpDir, memFs);
    //     const changedConfigIndex = launchConfigs[0].launchConfigs.findIndex(
    //         (c: LaunchConfig) => c.name === 'Changed config during test'
    //     );
    //     expect(addedConfigIndex).toBe(changedConfigIndex);
    //     const changedConfig = launchConfigs[0].launchConfigs[changedConfigIndex];
    //     expect(changedConfig?.args![0]).toEqual('--config');
    //     expect(changedConfig?.args![1]).toEqual('ui5-mock.yaml');
    // });

    // test('Update existing launch config with comments', async (): Promise<void> => {
    //     let launchConfigs = await getAllLaunchConfigs(TestPaths.tmpDir);
    //     const existingConfigIndex = launchConfigs[0].launchConfigs.findIndex(
    //         (c) => c.name === 'Existing launch config with json comments'
    //     );
    //     const updatedConfig = {
    //         name: 'Existing config changed',
    //         projectRoot: TestPaths.tmpDir,
    //         backendConfigs: [
    //             {
    //                 path: 'PATH_CHANGED',
    //                 url: 'NEW_TEST_URL'
    //             }
    //         ],
    //         ui5Version: 'TEST_UI5_VERSION_UPDATED',
    //         ui5VersionUri: 'https://ui5.sap.com.updated'
    //     };
    //     await updateFioriElementsLaunchConfig(TestPaths.tmpDir, existingConfigIndex, updatedConfig);
    //     launchConfigs = await getAllLaunchConfigs(TestPaths.tmpDir);
    //     const changedConfigIndex = launchConfigs[0].launchConfigs.findIndex(
    //         (c: LaunchConfig) => c.name === 'Existing config changed'
    //     );
    //     expect(existingConfigIndex).toBe(changedConfigIndex);

    //     const changedConfig = launchConfigs[0].launchConfigs[changedConfigIndex];
    //     expect(changedConfig.env.FIORI_TOOLS_BACKEND_CONFIG).toEqual('[{"path":"PATH_CHANGED","url":"NEW_TEST_URL"}]');
    //     expect(changedConfig.env.FIORI_TOOLS_UI5_VERSION).toEqual('TEST_UI5_VERSION_UPDATED');
    //     expect(changedConfig.env.FIORI_TOOLS_UI5_URI).toEqual('https://ui5.sap.com.updated');
    // });

    // test('Update added launch config - deselct mock data', async (): Promise<void> => {
    //     let launchConfigs = await getAllLaunchConfigs(TestPaths.tmpDir);
    //     const configIndex = launchConfigs[0].launchConfigs.findIndex((c) => c.name === 'Changed config during test');
    //     await updateFioriElementsLaunchConfig(TestPaths.tmpDir, configIndex, {
    //         name: 'Changed config during test 2',
    //         projectRoot: TestPaths.tmpDir,
    //         useMockData: false,
    //         ui5Version: 'TEST_UI5_VERSION2',
    //         ui5VersionUri: 'https://ui5.sap.com.updated2'
    //     });
    //     launchConfigs = await getAllLaunchConfigs(TestPaths.tmpDir);
    //     const changedConfigIndex = launchConfigs[0].launchConfigs.findIndex(
    //         (c) => c.name === 'Changed config during test 2'
    //     );
    //     expect(configIndex).toBe(changedConfigIndex);

    //     const changedConfig = launchConfigs[0].launchConfigs[changedConfigIndex];
    //     expect(changedConfig.args?.length).toBe(0);
    //     expect(changedConfig.env.FIORI_TOOLS_UI5_VERSION).toEqual('TEST_UI5_VERSION2');
    //     expect(changedConfig.env.FIORI_TOOLS_UI5_URI).toEqual('https://ui5.sap.com.updated2');
    // });

    // test('Update added launch config - select ui5 local sources with snapshot', async (): Promise<void> => {
    //     let launchConfigs = await getAllLaunchConfigs(TestPaths.tmpDir);
    //     const configIndex = launchConfigs[0].launchConfigs.findIndex((c) => c.name === 'Changed config during test 2');
    //     await updateFioriElementsLaunchConfig(TestPaths.tmpDir, configIndex, {
    //         name: 'Changed config during test 3',
    //         projectRoot: TestPaths.tmpDir,
    //         ui5Local: true,
    //         ui5Version: 'TEST_UI5_VERSION_UPDATED',
    //         ui5VersionUri: 'https://ui5.sap.com.updated',
    //         ui5LocalVersion: 'snapshot'
    //     });
    //     launchConfigs = await getAllLaunchConfigs(TestPaths.tmpDir);
    //     const changedConfigIndex = launchConfigs[0].launchConfigs.findIndex(
    //         (c) => c.name === 'Changed config during test 3'
    //     );
    //     expect(configIndex).toBe(changedConfigIndex);

    //     const changedConfig = launchConfigs[0].launchConfigs[changedConfigIndex];
    //     expect(changedConfig?.args![0]).toEqual('--config');
    //     expect(changedConfig?.args![1]).toEqual('ui5-local.yaml');
    //     expect(changedConfig?.args![2]).toEqual('--framework-version');
    //     expect(changedConfig?.args![3]).toEqual('snapshot');
    //     expect(changedConfig.env.FIORI_TOOLS_UI5_VERSION).toBeUndefined();
    //     expect(changedConfig.env.FIORI_TOOLS_UI5_URI).toBeUndefined();
    // });

    // test('Delete added launch config', async (): Promise<void> => {
    //     let launchConfigs = await getAllLaunchConfigs(TestPaths.tmpDir);
    //     let addedConfigIndex = launchConfigs[0].launchConfigs.findIndex(
    //         (c: LaunchConfig) => c.name === 'Changed config during test 3'
    //     );
    //     expect(addedConfigIndex).toBe(6);
    //     await updateFioriElementsLaunchConfig(TestPaths.tmpDir, addedConfigIndex);
    //     launchConfigs = await getAllLaunchConfigs(TestPaths.tmpDir);
    //     addedConfigIndex = launchConfigs[0].launchConfigs.findIndex((c) => c.name === 'Changed config during test 3');
    //     expect(addedConfigIndex).toBe(-1);
    // });
});
