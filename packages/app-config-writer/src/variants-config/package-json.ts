import { basename, join } from 'path';
import { getSapClientFromPackageJson, getUI5UrlParameters, getRTAUrl, getRTAServe } from './utils';
import type { Editor } from 'mem-fs-editor';
import { FileName, type Package } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';

const ERROR_MSG = `Script 'start-variants-management' cannot be written to package.json.`;

/**
 * Add the start-variants-management script to the package.json.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to application root, where package.json is
 * @param yamlPath - path to the ui5*.yaml file passed by cli
 * @param logger - logger
 * @returns Promise<void> - rejects in case variants management script can't be added to package.json
 */
export async function addVariantsManagementScript(
    fs: Editor,
    basePath: string,
    yamlPath?: string,
    logger?: ToolsLogger
): Promise<void> {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    const ui5YamlFileName = yamlPath ? basename(yamlPath) : FileName.Ui5Yaml;

    if (!packageJson) {
        throw new Error(`${ERROR_MSG} File 'package.json' not found at ${basePath}`);
    }

    if (!packageJson.scripts) {
        logger?.warn(`File 'package.json' does not contain a script section. Script section added.`);
        packageJson.scripts = {};
    }

    const urlParameters: Record<string, string> = {};
    const sapClient = getSapClientFromPackageJson(packageJson.scripts);
    if (sapClient) {
        urlParameters['sap-client'] = sapClient;
    }

    const url = await getRTAUrl(basePath, getUI5UrlParameters(urlParameters), ui5YamlFileName);
    const serveCommand = await getRTAServe(basePath, ui5YamlFileName, fs);

    if (!url) {
        throw new Error(`${ERROR_MSG} No RTA editor specified in ui5.yaml.`);
    }

    // set --config flag if default ui5.yaml is not used
    const yamlConfigFile = ui5YamlFileName !== FileName.Ui5Yaml ? ` --config ./${basename(ui5YamlFileName)}` : '';
    const startVariantsManagementScriptOld = packageJson.scripts['start-variants-management'] ?? undefined;
    const startVariantsManagementScriptNew = `${serveCommand}${yamlConfigFile} --open "${url}"`;

    if (!startVariantsManagementScriptOld) {
        logger?.debug(`Script 'start-variants-management' not found. Script will be added.`);
    } else if (startVariantsManagementScriptOld !== startVariantsManagementScriptNew) {
        logger?.warn(`Script 'start-variants-management' already exists but is outdated. Script will be updated.`);
    } else {
        logger?.info(`Script 'start-variants-management' is already up-to-date.`);
        return Promise.resolve();
    }

    packageJson.scripts['start-variants-management'] = startVariantsManagementScriptNew;
    fs.writeJSON(packageJsonPath, packageJson);
    logger?.debug(`Script 'start-variants-management' written to 'package.json'.`);
    return Promise.resolve();
}
