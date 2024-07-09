import { DirName, findFioriArtifacts } from '@sap-ux/project-access';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import {
    createLaunchConfig,
    getLaunchConfigByName,
    getUI5VersionUri,
    LAUNCH_JSON_FILE,
    getDefaultLaunchConfigOptionsForProject
} from '../src';
import { TestPaths } from './test-data/utils';
import { getLaunchJSONFilePaths } from '../src/launch-config-crud/read';

const getApplicationRoot = async (appName = 'v2lrop'): Promise<string> => {
    // Get all projects
    const applications = await findFioriArtifacts({
        wsFolders: TestPaths.workspaceRoots,
        artifacts: ['applications']
    });
    const allApplications = applications.applications;
    expect(allApplications?.length).toBe(2);
    // get specific application from workspace
    const application = allApplications?.find((p) => p.appRoot.endsWith(appName));
    expect(application).toBeDefined();
    return application?.appRoot || '';
};

describe('add config scenario', () => {
    const memFs = create(createStorage());
    const feLaunchJsonCopy = join(TestPaths.tmpDir, DirName.VSCode, LAUNCH_JSON_FILE);

    afterAll(async () => {
        memFs.delete(TestPaths.tmpDir);
    });
    test('Add new launch config to existing launch.json file', async () => {
        // Prepare temp launch.json
        memFs.copy(TestPaths.feProjectsLaunchConfig, feLaunchJsonCopy);

        const projectRoot = await getApplicationRoot('v2lrop');

        // Select name
        const defaultOptions = await getDefaultLaunchConfigOptionsForProject(projectRoot);

        const name = defaultOptions.name;

        // Select UI5 version
        const ui5Version = 'myLatest';

        // // Set ui5VersionUri
        const ui5VersionUri = getUI5VersionUri(ui5Version);

        // // Select destination
        const backendConfigs = [{ path: 'TEST_PATH', name: 'TEST_DESTINAME', url: 'dummy' }];

        // // Add the launch config
        await createLaunchConfig(
            TestPaths.tmpDir,
            {
                name,
                projectRoot,
                ui5Version,
                ui5VersionUri,
                backendConfigs
            },
            memFs
        );

        // // Get launch config files in workspace
        const launchConfigs = await getLaunchJSONFilePaths(TestPaths.tmpDir, memFs);
        expect(launchConfigs.length).toBe(1);
        const launchConfigPath = launchConfigs.pop() as string;

        const resultConfig = await getLaunchConfigByName(launchConfigPath, 'Launch Fiori app: v2lrop', memFs);
        expect(resultConfig.env.FIORI_TOOLS_BACKEND_CONFIG).toEqual(
            '[{"path":"TEST_PATH","name":"TEST_DESTINAME","url":"dummy"}]'
        );
        expect(resultConfig.env.FIORI_TOOLS_UI5_VERSION).toEqual('myLatest');
        expect(resultConfig.env.FIORI_TOOLS_UI5_URI).toEqual('https://ui5.sap.com');
    });

    test('Create new launch config launch.json file', async () => {
        const projectRoot = await getApplicationRoot('v2lrop');

        const name = `TEST_LAUNCH_CONFIG`;

        // Select UI5 version
        const ui5Version = '1.1.1';

        // Set ui5VersionUri
        const ui5VersionUri = getUI5VersionUri(ui5Version);

        // Select destination
        const backendConfigs = [{ path: 'TEST_PATH', url: 'TEST_URL', client: 'TEST_CLIENT' }];

        // Add the launch config
        await createLaunchConfig(
            TestPaths.tmpDir,
            {
                name,
                projectRoot,
                ui5Version,
                ui5VersionUri,
                backendConfigs
            },
            memFs
        );

        // Get launch config files in workspace
        const launchConfigs = await getLaunchJSONFilePaths(TestPaths.tmpDir, memFs);
        expect(launchConfigs.length).toBe(1);
        const launchConfigPath = launchConfigs.pop() as string;

        const resultConfig = await getLaunchConfigByName(launchConfigPath, 'TEST_LAUNCH_CONFIG', memFs);
        expect(resultConfig.env.FIORI_TOOLS_BACKEND_CONFIG).toEqual(
            '[{"path":"TEST_PATH","url":"TEST_URL","client":"TEST_CLIENT"}]'
        );
        expect(resultConfig.env.FIORI_TOOLS_UI5_VERSION).toEqual('1.1.1');
        expect(resultConfig.env.FIORI_TOOLS_UI5_URI).toEqual('https://ui5.sap.com');
    });
});
