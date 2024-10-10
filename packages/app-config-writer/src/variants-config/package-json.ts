import { join } from 'path';
import { getSapClientFromPackageJson, getUI5UrlParameters, getRTAUrl } from './utils';
import type { Editor } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';

/**
 * Add the start-variants-management script to the package.json.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to application root, where package.json is
 * @param logger - logger
 * @returns Promise<void> - rejects in case variants management script can't be added to package.json
 */
export async function addVariantsManagementScript(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;

    if (!packageJson) {
        return Promise.reject(new Error(`File 'package.json' not found at ${basePath}`));
    }

    if (packageJson?.scripts?.['start-variants-management']) {
        return Promise.reject(new Error(`Script already exists.`));
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

    const url = await getRTAUrl(basePath, getUI5UrlParameters(urlParameters));

    if (!url) {
        return Promise.reject(new Error(`No RTA editor specified in ui5.yaml.`));
    }

    packageJson.scripts['start-variants-management'] = `fiori run --open "${url}"`;
    fs.writeJSON(packageJsonPath, packageJson);
    logger?.debug(`Script 'start-variants-management' written to 'package.json'.`);
    return Promise.resolve();
}
