import axios from 'axios';

import type { ToolsLogger } from '@sap-ux/logger';

/**
 * Number of seconds before token expiry to refresh the token (safety buffer).
 */
const TOKEN_REFRESH_BUFFER_SECONDS = 60;

/**
 * Manages OAuth2 token lifecycle with caching and automatic refresh.
 */
export class OAuthTokenManager {
    private token: string | null = null;
    private tokenExpiry: number = 0;

    /**
     * Creates a new OAuthTokenManager instance.
     *
     * @param {string} clientId - OAuth2 client ID
     * @param {string} clientSecret - OAuth2 client secret
     * @param {string} tokenEndpoint - OAuth2 token endpoint URL
     * @param {ToolsLogger} logger - Logger instance
     */
    constructor(
        private readonly clientId: string,
        private readonly clientSecret: string,
        private readonly tokenEndpoint: string,
        private readonly logger: ToolsLogger
    ) {}

    /**
     * Get a valid OAuth token, refreshing if necessary.
     *
     * @returns {Promise<string>} The access token.
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
            this.tokenExpiry = Date.now() + (response.data.expires_in - TOKEN_REFRESH_BUFFER_SECONDS) * 1000;

            this.logger.debug('OAuth2 token obtained successfully');
            return this.token ?? '';
        } catch (error: any) {
            const errorMessage = error.response?.data || error.message;
            this.logger.error(`Error fetching OAuth2 token: ${errorMessage}`);
            throw new Error('Failed to fetch OAuth2 token');
        }
    }
}
