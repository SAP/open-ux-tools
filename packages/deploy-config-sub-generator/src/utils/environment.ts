// Legacy package, dependent on external dependencies for async operations and no 'type: module' defined in package.json
import hasbin = require('hasbin');
import { ApiHubType, type ApiHubConfig } from '@sap-ux/cf-deploy-config-sub-generator';
import { ERROR_TYPE, ErrorHandler, mtaExecutable } from '@sap-ux/deploy-config-generator-shared';
import { existsSync } from 'fs';
import { join } from 'path';

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
