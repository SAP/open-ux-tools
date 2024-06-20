import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import cloneDeep from 'lodash/cloneDeep';
import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import { getDeployConfig, updateBaseConfig } from './config';
import { addPackageDevDependency, addUi5Dependency, updatePackageScript, writeUi5RepositoryFiles } from './file';
import {
    BUILD_SCRIPT,
    DEPLOY_SCRIPT,
    RIMRAF,
    RIMRAF_VERSION,
    UI5_TASK_FLATTEN_LIB,
    UI5_TASK_FLATTEN_LIB_VERSION,
    UNDEPLOY_SCRIPT
} from './constants';
import type { DeployConfigOptions } from './types';
import type { Editor } from 'mem-fs-editor';
import type { AbapDeployConfig } from '@sap-ux/ui5-config';

/**
 * Writes the template to the memfs editor instance.
 *
 * @param basePath - the base path
 * @param abapDeployConfig - the abap deploy config
 * @param options - the deploy config options
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
async function generate(
    basePath: string,
    abapDeployConfig: AbapDeployConfig,
    options?: DeployConfigOptions,
    fs?: Editor
): Promise<Editor> {
    const abapConfig = cloneDeep(abapDeployConfig);

    if (!fs) {
        fs = create(createStorage());
    }

    // base config
    const baseConfigFile = options?.baseFile ?? FileName.Ui5Yaml;
    const baseConfig = await readUi5Yaml(basePath, baseConfigFile, fs);
    const baseConfigPath = join(basePath, baseConfigFile);
    updateBaseConfig(baseConfigPath, baseConfig, fs);

    // deploy config
    const deployConfigFile = options?.deployFile ?? FileName.UI5DeployYaml;
    const deployFilePath = join(basePath, deployConfigFile);
    const deployConfig = await getDeployConfig(abapConfig, baseConfig);
    fs.write(deployFilePath, deployConfig.toString());

    // package.json
    // deploy script
    const deployScript = `${BUILD_SCRIPT} && ${DEPLOY_SCRIPT} --config ${deployConfigFile} && ${RIMRAF} archive.zip`;
    updatePackageScript(fs, basePath, 'deploy', deployScript);
    // undeploy script
    const undeployScript = `${BUILD_SCRIPT} && ${UNDEPLOY_SCRIPT} --config ${deployConfigFile}`;
    updatePackageScript(fs, basePath, 'undeploy', undeployScript);
    // test mode script
    const deployTestModeScript = `${BUILD_SCRIPT} && ${DEPLOY_SCRIPT} --config ${deployConfigFile} --testMode true`;
    updatePackageScript(fs, basePath, 'deploy-test', deployTestModeScript);
    // dependencies
    addPackageDevDependency(fs, basePath, RIMRAF, RIMRAF_VERSION);
    addPackageDevDependency(fs, basePath, UI5_TASK_FLATTEN_LIB, UI5_TASK_FLATTEN_LIB_VERSION);
    addUi5Dependency(fs, basePath, UI5_TASK_FLATTEN_LIB);

    // ui5 repo files
    await writeUi5RepositoryFiles(fs, basePath);

    return fs;
}

export { generate };
