import { join } from 'path';
import { stringify } from 'querystring';
import { FIORI_TOOLS_RTA_MODE_TRUE } from '../types';
import { checkDeprecatedPreviewMiddleware } from './utils';
import type { Editor } from 'mem-fs-editor';
import type { FioriToolsRtaMode } from '../types';
import type { Package } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';

/**
 * Extracts sap client string from existing scripts in package.json.
 *
 * @param scripts - script section of the package.json
 * @returns sap client
 */
function getSapClientFromPackageJson(scripts: Partial<Record<string, string>>): string | undefined {
    let sapClient;
    Object.values(scripts).forEach((script) => {
        const match = script?.match(/sap-client=([0-9]{3})/);
        if (match) {
            sapClient = match[1];
        }
    });
    return sapClient;
}

/**
 * Returns the UI5 url parameters.
 *
 * @param rtaMode - RTA Mode parameters
 * @param overwritingParams - parameters to be overwritten
 * @returns - UI5 url parameters
 */
function getUi5UrlParameters(rtaMode: FioriToolsRtaMode, overwritingParams: Record<string, string> = {}): string {
    const parameters: Record<string, string> = {
        'fiori-tools-rta-mode': rtaMode,
        'sap-ui-rta-skip-flex-validation': 'true',
        'sap-ui-xx-condense-changes': 'true'
    };
    return stringify(Object.assign(parameters, overwritingParams));
}

/**
 * Returns the preview url parameters.
 *
 * @param basePath - path to project root, where package.json and ui5.yaml is
 * @param query - query to create fragment
 * @returns - review url parameters
 */
async function getPreviewUrl(basePath: string, query?: string): Promise<string> {
    const queryFragment = query ? `?${query}` : '';
    // checks if a ui5.yaml configuration is deprecated and therefore needs a different hash
    const previewHash = (await checkDeprecatedPreviewMiddleware(basePath)) ? 'preview-app' : 'app-preview';
    return `/preview.html${queryFragment}#${previewHash}`;
}

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

    const scripts = packageJson.scripts ?? {};
    const urlParameters: Record<string, string> = {};

    if (!packageJson.scripts) {
        logger?.warn(`File 'package.json' does not contain a script section. Script section added.`);
        packageJson['scripts'] = scripts;
    } else {
        // check if sap-client is needed when starting the app
        const sapClient = getSapClientFromPackageJson(packageJson.scripts);
        if (sapClient) {
            urlParameters['sap-client'] = sapClient;
        }
    }

    const query = getUi5UrlParameters(FIORI_TOOLS_RTA_MODE_TRUE, urlParameters);
    const url = await getPreviewUrl(basePath, query);

    scripts['start-variants-management'] = `fiori run --open "${url.slice(1)}"`;
    fs.writeJSON(packageJsonPath, packageJson);
    logger?.info(`Script 'start-variants-management' written to 'package.json'.`);
}
