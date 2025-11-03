import type { ToolsLogger } from '@sap-ux/logger';
import { getOrCreateServiceKeys } from '@sap-ux/adp-tooling';
import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import type { UI5YamlCustomTaskConfiguration, CfCredentials } from '@sap-ux/adp-tooling';

import { OAuthTokenManager } from './oauth-manager';

const CF_BUILD_TASK = 'app-variant-bundler-build';

/**
 * Creates an OAuthTokenManager from CF credentials.
 *
 * @param {CfCredentials} credentials - CF credentials containing UAA information.
 * @param {ToolsLogger} logger - Logger instance.
 * @returns {OAuthTokenManager} OAuthTokenManager instance.
 * @throws {Error} If credentials are invalid.
 */
export function createManagerFromCredentials(credentials: CfCredentials, logger: ToolsLogger): OAuthTokenManager {
    const { uaa } = credentials;
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
 * @returns {Promise<OAuthTokenManager | null>} Manager instance or null if not CF ADP project.
 */
export async function createManagerFromCfAdpProject(
    projectPath: string,
    logger: ToolsLogger
): Promise<OAuthTokenManager | null> {
    try {
        const ui5Yaml = await readUi5Yaml(projectPath, FileName.Ui5Yaml);
        const cfBuildTask = ui5Yaml.findCustomTask<UI5YamlCustomTaskConfiguration>(CF_BUILD_TASK)?.configuration;

        if (!cfBuildTask) {
            return null;
        }

        const name = cfBuildTask.serviceInstanceName;
        const guid = cfBuildTask.serviceInstanceGuid;
        if (!name || !guid) {
            return null;
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
            return null;
        }

        return createManagerFromCredentials(credentials[0], logger);
    } catch (error: any) {
        logger.debug(`Error detecting CF ADP project: ${error.message}`);
        return null;
    }
}
