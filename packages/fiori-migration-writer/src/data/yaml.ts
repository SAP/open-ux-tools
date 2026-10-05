import { DirName } from '../project-spec-types.js';
import { FIORI_TOOLS_PROXY, FIORI_TOOLS_APPRELOAD } from '../utils/index.js';

/**
 * Cleans up null URLs in backend configurations by replacing them with empty strings
 * This is needed because null URLs can cause issues in UI5 YAML processing
 *
 * @param ui5YamlJson - The parsed UI5 YAML configuration object
 */
export function cleanupBackendNullUrls(ui5YamlJson: any): void {
    ui5YamlJson?.server?.customMiddleware?.forEach((middleware: any, middlewareIndex: number) => {
        if (middleware.name === FIORI_TOOLS_PROXY) {
            ui5YamlJson.server.customMiddleware[middlewareIndex]?.configuration?.backend?.forEach(
                (backend: any, backendIndex: number) => {
                    if (backend?.url === null) {
                        ui5YamlJson.server.customMiddleware[middlewareIndex].configuration.backend[backendIndex].url =
                            '';
                    }
                }
            );
        }
    });
}

/**
 * Sets the webapp path in UI5 YAML configuration if it differs from the default 'webapp'
 *
 * @param ui5YamlJson - The parsed UI5 YAML configuration object
 * @param webappPath - The webapp path to set
 */
export function setWebappPath(ui5YamlJson: any, webappPath: string): void {
    if (webappPath !== DirName.Webapp) {
        ui5YamlJson.resources = {
            configuration: {
                paths: {
                    webapp: webappPath
                }
            }
        };
    }
}

/**
 * Sets the path for FIORI_TOOLS_APPRELOAD middleware configuration
 *
 * @param ui5YamlJson - The parsed UI5 YAML configuration object
 * @param webappPath - The webapp path to set for appreload
 */
export function setAppreloadPath(ui5YamlJson: any, webappPath: string): void {
    ui5YamlJson?.server?.customMiddleware?.forEach((middleware: any, index: number) => {
        if (middleware?.name === FIORI_TOOLS_APPRELOAD && ui5YamlJson.server.customMiddleware[index].configuration) {
            ui5YamlJson.server.customMiddleware[index].configuration.path = webappPath;
        }
    });
}

/**
 * Sets the UI5 version for FIORI_TOOLS_PROXY middleware configuration
 *
 * @param ui5YamlJson - The parsed UI5 YAML configuration object
 * @param ui5Version - The UI5 version to set
 */
export function setProxyUI5Version(ui5YamlJson: any, ui5Version: string | undefined): void {
    ui5YamlJson?.server?.customMiddleware?.forEach((middleware: any, index: number) => {
        if (middleware?.name === FIORI_TOOLS_PROXY) {
            ui5YamlJson.server.customMiddleware[index].configuration.ui5.version = ui5Version;
        }
    });
}
