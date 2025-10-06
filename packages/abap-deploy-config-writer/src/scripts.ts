import type { Editor } from 'mem-fs-editor';

import { addPackageDevDependency, updatePackageScript } from '@sap-ux/project-access';

import type { DeployConfigOptions } from './types';
import { BUILD_SCRIPT, DEPLOY_SCRIPT, RIMRAF, RIMRAF_VERSION, UNDEPLOY_SCRIPT } from './constants';

/**
 * Updates the scripts in the package.json file with the provided scripts object.
 *
 * @param {string} basePath - The path to the base directory.
 * @param {string} deployConfigFile - The path to the deploy config file.
 * @param {Editor} fs - The file system editor.
 * @param {DeployConfigOptions} options - The deploy config options.
 */
export async function updateScripts(
    basePath: string,
    deployConfigFile: string,
    fs: Editor,
    options?: DeployConfigOptions
): Promise<void> {
    const buildPrefix = options?.addBuildToUndeployScript ?? true ? `${BUILD_SCRIPT} && ` : '';

    // deploy script
    const deployScript = `${BUILD_SCRIPT} && ${DEPLOY_SCRIPT} --config ${deployConfigFile}`;
    await updatePackageScript(basePath, 'deploy', deployScript, fs);

    // undeploy script
    const undeployScript = `${buildPrefix}${UNDEPLOY_SCRIPT} --config ${deployConfigFile}`;
    await updatePackageScript(basePath, 'undeploy', undeployScript, fs);

    // test mode script
    const deployTestModeScript = `${BUILD_SCRIPT} && ${DEPLOY_SCRIPT} --config ${deployConfigFile} --testMode true`;
    await updatePackageScript(basePath, 'deploy-test', deployTestModeScript, fs);

    // dependencies
    await addPackageDevDependency(basePath, RIMRAF, RIMRAF_VERSION, fs);
}
