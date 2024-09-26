import { join } from 'path';
import { getSapClientFromPackageJson, getUi5UrlParameters, getPreviewUrl } from './utils';
import type { Editor } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';

/**
 * Add the start-variants-management script to the package.json.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to application root, where package.json is
 * @param logger - logger
 */
export async function addVariantsManagementScript(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package;

    const urlParameters: Record<string, string> = {};

    if (!packageJson.scripts) {
        logger?.warn(`File 'package.json' does not contain a script section. Script section added.`);
        packageJson.scripts = {};
    } else {
        // check if sap-client is needed when starting the app
        const sapClient = getSapClientFromPackageJson(packageJson.scripts);
        if (sapClient) {
            urlParameters['sap-client'] = sapClient;
        }
    }

    const query = getUi5UrlParameters(urlParameters);
    const url = await getPreviewUrl(basePath, query);

    packageJson.scripts['start-variants-management'] = `fiori run --open "${url}"`;
    fs.writeJSON(packageJsonPath, packageJson);
    logger?.debug(`Script 'start-variants-management' written to 'package.json'.`);
}
