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
 */
export async function addVariantsManagementScript(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package;

    if (!packageJson.scripts || !packageJson.scripts['start-variants-management']) {
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

        const query = getUI5UrlParameters(urlParameters);
        const url = await getRTAUrl(basePath, query);

        if (url) {
            packageJson.scripts['start-variants-management'] = `fiori run --open "${url}"`;
            fs.writeJSON(packageJsonPath, packageJson);
            logger?.debug(`Script 'start-variants-management' written to 'package.json'.`);
        } else {
            logger?.warn(
                `Script 'start-variants-management' cannot be written to 'package.json. No RTA editor specified in ui5.yaml.`
            );
        }
    } else {
        logger?.warn(`Script 'start-variants-management' cannot be written to 'package.json. Script already exists'.`);
    }
}
