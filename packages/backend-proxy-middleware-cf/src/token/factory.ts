import type { ToolsLogger } from '@sap-ux/logger';
import { extractCfBuildTask, getOrCreateServiceKeys } from '@sap-ux/adp-tooling';
import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import type { ServiceKeys } from '@sap-ux/adp-tooling';

import { OAuthTokenProvider } from './provider';
import type { CfOAuthMiddlewareConfig } from '../types';

const OAUTH_TOKEN_PATH = '/oauth/token';

/**
 * Constructs the OAuth token endpoint URL from a base URL.
 *
 * @param {string} baseUrl - Base URL of the OAuth service.
 * @returns {string} Full token endpoint URL.
 */
function buildTokenEndpoint(baseUrl: string): string {
    return `${baseUrl}${OAUTH_TOKEN_PATH}`;
}

/**
 * Creates an OAuthTokenProvider from service keys (extracted from Cloud Foundry service instance).
 *
 * @param {ServiceKeys} serviceKeys - Service keys containing UAA information.
 * @param {ToolsLogger} logger - Logger instance.
 * @returns {OAuthTokenProvider} OAuthTokenProvider instance.
 * @throws {Error} If service keys are invalid.
 */
export function createManagerFromServiceKeys(serviceKeys: ServiceKeys, logger: ToolsLogger): OAuthTokenProvider {
    const { uaa } = serviceKeys.credentials;

    if (!uaa?.url) {
        throw new Error('Invalid credentials: missing UAA URL');
    }

    if (!uaa.clientid) {
        throw new Error('Invalid credentials: missing client ID');
    }

    if (!uaa.clientsecret) {
        throw new Error('Invalid credentials: missing client secret');
    }

    const tokenEndpoint = buildTokenEndpoint(uaa.url);
    return new OAuthTokenProvider(uaa.clientid, uaa.clientsecret, tokenEndpoint, logger);
}

/**
 * Creates an OAuthTokenProvider from direct OAuth credentials (provided in configuration).
 *
 * @param {string} clientId - OAuth2 client ID.
 * @param {string} clientSecret - OAuth2 client secret.
 * @param {string} baseUrl - Base URL for the OAuth service (token endpoint will be constructed as {baseUrl}/oauth/token).
 * @param {ToolsLogger} logger - Logger instance.
 * @returns {OAuthTokenProvider} OAuthTokenProvider instance.
 */
export function createManagerFromDirectCredentials(
    clientId: string,
    clientSecret: string,
    baseUrl: string,
    logger: ToolsLogger
): OAuthTokenProvider {
    const tokenEndpoint = buildTokenEndpoint(baseUrl);
    return new OAuthTokenProvider(clientId, clientSecret, tokenEndpoint, logger);
}

/**
 * Creates an OAuth token provider based on configuration.
 *
 * @param {CfOAuthMiddlewareConfig} config - Configuration options.
 * @param {ToolsLogger} logger - Logger instance.
 * @returns {Promise<OAuthTokenProvider>} Token provider instance.
 * @throws {Error} If token provider cannot be created.
 */
export async function createTokenProvider(
    config: CfOAuthMiddlewareConfig,
    logger: ToolsLogger
): Promise<OAuthTokenProvider> {
    if (config.credentials) {
        logger.info('Initializing backend proxy middleware (CF) with provided credentials');
        const { clientId, clientSecret, url } = config.credentials;
        return createManagerFromDirectCredentials(clientId, clientSecret, url, logger);
    }

    logger.info('Attempting to auto-detect CF ADP project for OAuth credentials');
    const tokenProvider = await createManagerFromCfAdpProject(process.cwd(), logger);
    logger.info('CF ADP project detected, OAuth middleware enabled');
    return tokenProvider;
}

/**
 * Creates an OAuthTokenProvider from CF ADP project configuration (auto-detection).
 *
 * @param {string} projectPath - Path to the project root.
 * @param {ToolsLogger} logger - Logger instance.
 * @returns {Promise<OAuthTokenProvider>} Token provider instance.
 */
export async function createManagerFromCfAdpProject(
    projectPath: string,
    logger: ToolsLogger
): Promise<OAuthTokenProvider> {
    const buildTask = extractCfBuildTask(await readUi5Yaml(projectPath, FileName.Ui5Yaml));
    const name = buildTask.serviceInstanceName;
    const guid = buildTask.serviceInstanceGuid;

    if (!name || !guid) {
        throw new Error('No service instance name or guid found in CF adaptation project build task');
    }

    const credentials = await getOrCreateServiceKeys(
        {
            name,
            guid
        },
        logger
    );

    if (!credentials || credentials.length === 0) {
        throw new Error('No service keys found for CF ADP project');
    }

    return createManagerFromServiceKeys(credentials[0], logger);
}
