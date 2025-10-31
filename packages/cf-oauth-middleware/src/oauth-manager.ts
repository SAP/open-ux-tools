import axios from 'axios';

import type { ToolsLogger } from '@sap-ux/logger';
import { getOrCreateServiceKeys } from '@sap-ux/adp-tooling';
import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import type { UI5YamlCustomTaskConfiguration, CfCredentials } from '@sap-ux/adp-tooling';

const CF_BUILD_TASK = 'app-variant-bundler-build';

/**
 * Manages OAuth2 token lifecycle with caching and automatic refresh.
 */
export class OAuthTokenManager {
    private token: string | null = null;
    private tokenExpiry: number = 0;
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly tokenEndpoint: string;
    private readonly logger: ToolsLogger;

    constructor(clientId: string, clientSecret: string, tokenEndpoint: string, logger: ToolsLogger) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.tokenEndpoint = tokenEndpoint;
        this.logger = logger;
    }

    /**
     * Get a valid OAuth token, refreshing if necessary.
     *
     * @returns Promise<string> - The access token
     */
    async getAccessToken(): Promise<string> {
        if (this.token && Date.now() < this.tokenExpiry) {
            return this.token;
        }

        try {
            this.logger.debug('Fetching new OAuth2 token...');

            const response = await axios.post(
                this.tokenEndpoint,
                `grant_type=client_credentials&client_id=${encodeURIComponent(
                    this.clientId
                )}&client_secret=${encodeURIComponent(this.clientSecret)}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.token = response.data.access_token;
            // Refresh token 60 seconds before expiry
            this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;

            this.logger.debug('OAuth2 token obtained successfully');
            return this.token ?? '';
        } catch (error: any) {
            const errorMessage = error.response?.data || error.message;
            this.logger.error(`Error fetching OAuth2 token: ${errorMessage}`);
            throw new Error('Failed to fetch OAuth2 token');
        }
    }

    /**
     * Create OAuthTokenManager from CF credentials.
     *
     * @param credentials - CF credentials containing UAA information
     * @param logger - Logger instance
     * @returns OAuthTokenManager instance
     */
    static fromCredentials(credentials: CfCredentials, logger: ToolsLogger): OAuthTokenManager {
        const { uaa } = credentials;
        const tokenEndpoint = uaa?.url ? `${uaa.url}/oauth/token` : '';
        if (!uaa?.clientid || !uaa?.clientsecret || !tokenEndpoint) {
            throw new Error('Invalid credentials: missing clientid, clientsecret, or url');
        }
        return new OAuthTokenManager(uaa.clientid, uaa.clientsecret, tokenEndpoint, logger);
    }

    /**
     * Create OAuthTokenManager from CF ADP project (auto-detection).
     *
     * @param projectPath - Path to the project root
     * @param logger - Logger instance
     * @returns Promise<OAuthTokenManager | null> - Manager instance or null if not CF ADP project
     */
    static async fromCfAdpProject(projectPath: string, logger: ToolsLogger): Promise<OAuthTokenManager | null> {
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

            return OAuthTokenManager.fromCredentials(credentials[0], logger);
        } catch (error: any) {
            logger.debug(`Error detecting CF ADP project: ${error.message}`);
            return null;
        }
    }
}
