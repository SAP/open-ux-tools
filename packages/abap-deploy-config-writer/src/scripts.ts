import type { Editor } from 'mem-fs-editor';

import { addPackageDevDependency, updatePackageScript } from '@sap-ux/project-access';

import { BUILD_SCRIPT, DEPLOY_SCRIPT, RIMRAF, RIMRAF_VERSION, UNDEPLOY_SCRIPT } from './constants';

/**
 * Updates the scripts in the package.json file with the provided scripts object.
 *
 * @param {string} basePath - The path to the base directory.
 * @param {string} deployConfigFile - The path to the deploy config file.
 * @param {Editor} fs - The file system editor.
 * @param {boolean} includeBuildScript - Whether to include build script in deploy commands.
 */
export async function updateScripts(
    basePath: string,
    deployConfigFile: string,
    fs: Editor,
    includeBuildScript: boolean = true
): Promise<void> {
    const buildPrefix = includeBuildScript ? `${BUILD_SCRIPT} && ` : '';

    // deploy script
    const deployScript = `${buildPrefix}${DEPLOY_SCRIPT} --config ${deployConfigFile}`;
    await updatePackageScript(basePath, 'deploy', deployScript, fs);

    // undeploy script
    const undeployScript = `${buildPrefix}${UNDEPLOY_SCRIPT} --config ${deployConfigFile}`;
    await updatePackageScript(basePath, 'undeploy', undeployScript, fs);

    // test mode script
    const deployTestModeScript = `${buildPrefix}${DEPLOY_SCRIPT} --config ${deployConfigFile} --testMode true`;
    await updatePackageScript(basePath, 'deploy-test', deployTestModeScript, fs);

    // dependencies
    await addPackageDevDependency(basePath, RIMRAF, RIMRAF_VERSION, fs);
}
