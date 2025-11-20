import type { ToolsLogger } from '@sap-ux/logger';
import { getOrCreateServiceKeys } from '@sap-ux/adp-tooling';
import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import type { UI5YamlCustomTaskConfiguration, ServiceInfo, ServiceKeys } from '@sap-ux/adp-tooling';

import { OAuthTokenManager } from './oauth-manager';

const CF_BUILD_TASK = 'app-variant-bundler-build';

/**
 * Creates an OAuthTokenManager from service keys.
 *
 * @param {ServiceKeys} serviceKeys - Service keys containing UAA information.
 * @param {ToolsLogger} logger - Logger instance.
 * @returns {OAuthTokenManager} OAuthTokenManager instance.
 * @throws {Error} If service keys are invalid.
 */
export function createManagerFromCredentials(serviceKeys: ServiceKeys, logger: ToolsLogger): OAuthTokenManager {
    const { uaa } = serviceKeys.credentials;
    const tokenEndpoint = uaa?.url ? `${uaa.url}/oauth/token` : '';

    if (!uaa?.clientid || !uaa?.clientsecret || !tokenEndpoint) {
        throw new Error('Invalid credentials: missing clientid, clientsecret, or url');
    }

    return new OAuthTokenManager(uaa.clientid, uaa.clientsecret, tokenEndpoint, logger);
}

/**
 * Creates an OAuthTokenManager from direct OAuth credentials.
 *
 * @param {string} clientId - OAuth2 client ID.
 * @param {string} clientSecret - OAuth2 client secret.
 * @param {string} url - Base URL for the OAuth service (token endpoint will be constructed as {url}/oauth/token).
 * @param {ToolsLogger} logger - Logger instance.
 * @returns {OAuthTokenManager} OAuthTokenManager instance.
 */
export function createManagerFromOAuthCredentials(
    clientId: string,
    clientSecret: string,
    url: string,
    logger: ToolsLogger
): OAuthTokenManager {
    const tokenEndpoint = `${url}/oauth/token`;
    return new OAuthTokenManager(clientId, clientSecret, tokenEndpoint, logger);
}

/**
 * Creates an OAuthTokenManager from CF ADP project configuration (auto-detection).
 *
 * @param {string} projectPath - Path to the project root.
 * @param {ToolsLogger} logger - Logger instance.
 * @returns {Promise<OAuthTokenManager>} Manager instance.
 */
export async function createManagerFromCfAdpProject(
    projectPath: string,
    logger: ToolsLogger
): Promise<OAuthTokenManager> {
    try {
        const ui5Yaml = await readUi5Yaml(projectPath, FileName.Ui5Yaml);
        const cfBuildTask = ui5Yaml.findCustomTask<UI5YamlCustomTaskConfiguration>(CF_BUILD_TASK)?.configuration;

        if (!cfBuildTask) {
            throw new Error('No CF ADP project found');
        }

        const name = cfBuildTask.serviceInstanceName;
        const guid = cfBuildTask.serviceInstanceGuid;
        if (!name || !guid) {
            throw new Error('No service instance name or guid found in CF ADP project');
        }

        const credentials = await getOrCreateServiceKeys(
            {
                name,
                guid
            },
            logger
        );

        if (!credentials || credentials.length === 0) {
            logger.warn('No service keys found for CF ADP project');
            throw new Error('No service keys found for CF ADP project');
        }

        return createManagerFromCredentials(credentials[0], logger);
    } catch (e) {
        logger.debug(`Error detecting CF ADP project: ${e.message}`);
        throw new Error(`Error detecting CF ADP project: ${e.message}`);
    }
}
