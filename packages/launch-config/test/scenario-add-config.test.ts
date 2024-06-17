import { createDirectory, deleteDirectory, findAllProjectRoots } from '@sap/ux-project-access';
import { DirName } from '@sap-ux/project-access';
import { copyFileSync } from 'fs';
import { dirname, join } from 'path';
import {
    getDefaultLaunchConfigOptionsForProject,
    getLaunchConfigFiles,
    addFioriElementsLaunchConfig,
    getLaunchConfigByName,
    getUI5VersionUri,
    launchConfigFile
} from '../src';
import { TestPaths } from './test-data/utils';
const feLaunchJsonCopy = join(TestPaths.tmpDir, DirName.VSCode, launchConfigFile);

afterAll(async () => {
    await deleteDirectory(TestPaths.tmpDir);
});

test('Add new launch config to existing launch.json file', async () => {
    // Prepare temp launch.json
    await deleteDirectory(TestPaths.tmpDir);
    await createDirectory(TestPaths.tmpDir);
    await createDirectory(dirname(feLaunchJsonCopy));
    copyFileSync(TestPaths.feProjectsLaunchConfig, feLaunchJsonCopy);

    // Get all projects
    const projectRoots = await findAllProjectRoots(TestPaths.workspaceRoots);
    expect(projectRoots.length).toBe(2);
    const projectRoot = projectRoots.find((p) => p.endsWith('v2lrop')) || '';
    expect(projectRoot).not.toBe('');

    // Select name
    const defaultOptions = await getDefaultLaunchConfigOptionsForProject(projectRoot);

    const name = defaultOptions.name;

    // Select UI5 version
    const ui5Version = 'myLatest';

    // Set ui5VersionUri
    const ui5VersionUri = getUI5VersionUri(ui5Version);

    // Select destination
    const backendConfigs = [{ path: 'TEST_PATH', name: 'TEST_DESTINAME' }];

    // Add the launch config
    await addFioriElementsLaunchConfig(TestPaths.tmpDir, {
        name,
        projectRoot,
        ui5Version,
        ui5VersionUri,
        backendConfigs
    });

    // Get launch config files in workspace
    const launchConfigs = getLaunchConfigFiles(TestPaths.tmpDir);
    expect(launchConfigs.length).toBe(1);
    const launchConfigPath = launchConfigs.pop() as string;

    const resultConfig = await getLaunchConfigByName(launchConfigPath, 'Launch Fiori app: v2lrop');
    expect(resultConfig.env.FIORI_TOOLS_BACKEND_CONFIG).toEqual('[{"path":"TEST_PATH","name":"TEST_DESTINAME"}]');
    expect(resultConfig.env.FIORI_TOOLS_UI5_VERSION).toEqual('myLatest');
    expect(resultConfig.env.FIORI_TOOLS_UI5_URI).toEqual('https://ui5.sap.com');
});

test('Create new launch config launch.json file', async () => {
    // Prepare directory for launch config
    await deleteDirectory(TestPaths.tmpDir);
    await createDirectory(TestPaths.tmpDir);
    await createDirectory(dirname(feLaunchJsonCopy));

    // Get all projects
    const projectRoots = await findAllProjectRoots(TestPaths.workspaceRoots);
    expect(projectRoots.length).toBe(2);
    const projectRoot = projectRoots.find((p) => p.endsWith('v2lrop')) || '';
    expect(projectRoot).not.toBe('');

    const name = `TEST_LAUNCH_CONFIG`;

    // Select UI5 version
    const ui5Version = '1.1.1';

    // Set ui5VersionUri
    const ui5VersionUri = getUI5VersionUri(ui5Version);

    // Select destination
    const backendConfigs = [{ path: 'TEST_PATH', url: 'TEST_URL', client: 'TEST_CLIENT' }];

    // Add the launch config
    await addFioriElementsLaunchConfig(TestPaths.tmpDir, {
        name,
        projectRoot,
        ui5Version,
        ui5VersionUri,
        backendConfigs
    });

    // Get launch config files in workspace
    const launchConfigs = getLaunchConfigFiles(TestPaths.tmpDir);
    expect(launchConfigs.length).toBe(1);
    const launchConfigPath = launchConfigs.pop() as string;

    const resultConfig = await getLaunchConfigByName(launchConfigPath, 'TEST_LAUNCH_CONFIG');
    expect(resultConfig.env.FIORI_TOOLS_BACKEND_CONFIG).toEqual(
        '[{"path":"TEST_PATH","url":"TEST_URL","client":"TEST_CLIENT"}]'
    );
    expect(resultConfig.env.FIORI_TOOLS_UI5_VERSION).toEqual('1.1.1');
    expect(resultConfig.env.FIORI_TOOLS_UI5_URI).toEqual('https://ui5.sap.com');
});
