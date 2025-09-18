import type { Editor } from 'mem-fs-editor';

import { addPackageDevDependency, updatePackageScript } from '@sap-ux/project-access';

import { BUILD_SCRIPT, DEPLOY_SCRIPT, RIMRAF, RIMRAF_VERSION, UNDEPLOY_SCRIPT } from './constants';
import { isTsProject } from './file';

/**
 * Updates the scripts in the package.json file with the provided scripts object.
 *
 * @param {string} basePath - The path to the base directory.
 * @param {string} deployConfigFile - The path to the deploy config file.
 * @param {Editor} fs - The file system editor.
 */
export async function updateScripts(basePath: string, deployConfigFile: string, fs: Editor): Promise<void> {
    // package.json
    // deploy script
    const deployScript = `${BUILD_SCRIPT} && ${DEPLOY_SCRIPT} --config ${deployConfigFile}`;
    await updatePackageScript(basePath, 'deploy', deployScript, fs);
    // undeploy script
    const undeployScript = `${BUILD_SCRIPT} && ${UNDEPLOY_SCRIPT} --config ${deployConfigFile}`;
    await updatePackageScript(basePath, 'undeploy', undeployScript, fs);
    // test mode script
    const deployTestModeScript = `${BUILD_SCRIPT} && ${DEPLOY_SCRIPT} --config ${deployConfigFile} --testMode true`;
    await updatePackageScript(basePath, 'deploy-test', deployTestModeScript, fs);

    // dependencies
    await addPackageDevDependency(basePath, RIMRAF, RIMRAF_VERSION, fs);
}

/**
 * Updates the scripts in the package.json file for ADP projects with conditional build scripts.
 *
 * @param {string} basePath - The path to the base directory.
 * @param {string} deployConfigFile - The path to the deploy config file.
 * @param {string} lrep - The LREP namespace.
 * @param {Editor} fs - The file system editor.
 */
export async function updateScriptsForAdp(
    basePath: string,
    deployConfigFile: string,
    lrep: string | undefined,
    fs: Editor
): Promise<void> {
    let shouldAddBuildScript = true;
    if (lrep) {
        shouldAddBuildScript = false;
    }
    if (isTsProject(fs, basePath)) {
        shouldAddBuildScript = true;
    }
    if (shouldAddBuildScript) {
        await updateScripts(basePath, deployConfigFile, fs);
    } else {
        // deploy script
        const deployScript = `${DEPLOY_SCRIPT} --config ${deployConfigFile}`;
        await updatePackageScript(basePath, 'deploy', deployScript, fs);
        // undeploy script
        const undeployScript = `${UNDEPLOY_SCRIPT} --config ${deployConfigFile}`;
        await updatePackageScript(basePath, 'undeploy', undeployScript, fs);
        // test mode script
        const deployTestModeScript = `${DEPLOY_SCRIPT} --config ${deployConfigFile} --testMode true`;
        await updatePackageScript(basePath, 'deploy-test', deployTestModeScript, fs);

        // dependencies
        await addPackageDevDependency(basePath, RIMRAF, RIMRAF_VERSION, fs);
    }
}
