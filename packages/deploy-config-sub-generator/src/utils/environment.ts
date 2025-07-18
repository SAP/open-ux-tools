// Legacy package, dependent on external dependencies for async operations and no 'type: module' defined in package.json
import hasbin = require('hasbin');
import {
    API_BUSINESS_HUB_ENTERPRISE_PREFIX,
    ApiHubType,
    loadManifest,
    type ApiHubConfig
} from '@sap-ux/cf-deploy-config-sub-generator';
import {
    ERROR_TYPE,
    ErrorHandler,
    generateDestinationName,
    mtaExecutable
} from '@sap-ux/deploy-config-generator-shared';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';

/**
 * Check if the MTA is installed.
 *
 * @param choice - the choice (CF or ABAP)
 * @param projectPath - path to the project
 * @returns - true if the MTA is installed, otherwise an error message
 */
export function isMTAInstalled(choice: string, projectPath: string): boolean | string {
    if (
        (choice === 'cf' && !hasbin.sync(mtaExecutable)) ||
        (choice === 'abap' && !hasbin.sync(mtaExecutable) && existsSync(join(projectPath, 'mta.yaml')))
    ) {
        ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_MTA_BIN);
        return ' ';
    }
    return true;
}

/**
 * Get the Api Hub Enterprise Key value from the node env if available.
 *
 * @returns The api hub enterprise config or undefined if the key is not found.
 */
export function getEnvApiHubConfig(): ApiHubConfig | undefined {
    const apiHubKey = process.env['API_HUB_API_KEY'];
    const apiHubType = process.env['API_HUB_TYPE'];

    // Legacy apps .env file will not define a type variable
    return apiHubKey
        ? {
              apiHubKey,
              apiHubType: apiHubType === ApiHubType.apiHubEnterprise ? ApiHubType.apiHubEnterprise : ApiHubType.apiHub
          }
        : undefined;
}

/**
 * Returns the destination name for API Hub Enterprise.
 *
 * @param memFs - reference to a mem-fs editor
 * @param opts -options representing the project app path and service path
 * @param opts.appPath - path to project
 * @param opts.servicePath - service path
 * @param apiHubConfig - API Hub Config
 * @returns - destination name
 */
export async function getApiHubOptions(
    memFs: Editor,
    { appPath, servicePath }: { appPath: string; servicePath: string | undefined },
    apiHubConfig?: ApiHubConfig
): Promise<{ destinationName: string | undefined; servicePath: string | undefined }> {
    let destinationName: string | undefined;
    if (apiHubConfig?.apiHubType === ApiHubType.apiHubEnterprise) {
        // appGenDestination may not have been passed in options e.g. launched from app modeler
        if (!servicePath) {
            // Load service path from manifest.json file
            const manifest = await loadManifest(memFs, appPath);
            servicePath = manifest?.['sap.app'].dataSources?.mainService?.uri;
        }
        destinationName = generateDestinationName(API_BUSINESS_HUB_ENTERPRISE_PREFIX, servicePath);
    }
    return { destinationName, servicePath };
}
