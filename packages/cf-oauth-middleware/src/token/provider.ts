import axios from 'axios';
import type { Request, Response, NextFunction } from 'express';

import type { ToolsLogger } from '@sap-ux/logger';

/**
 * Number of seconds before token expiry to refresh the token (safety buffer).
 */
const TOKEN_REFRESH_BUFFER_SECONDS = 60;

/**
 * Provides OAuth2 tokens with caching and automatic refresh.
 */
export class OAuthTokenProvider {
    private token: string | null = null;
    private tokenExpiry: number = 0;

    /**
     * Creates a new OAuthTokenProvider instance.
     *
     * @param {string} clientId - OAuth2 client ID.
     * @param {string} clientSecret - OAuth2 client secret.
     * @param {string} tokenEndpoint - OAuth2 token endpoint URL.
     * @param {ToolsLogger} logger - Logger instance.
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
    private async getAccessToken(): Promise<string> {
        if (this.token && Date.now() < this.tokenExpiry) {
            return this.token;
        }

        try {
            this.logger.debug('Fetching new OAuth2 token...');

            const formData = new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret
            });

            const response = await axios.post(this.tokenEndpoint, formData.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            this.token = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in - TOKEN_REFRESH_BUFFER_SECONDS) * 1000;

            this.logger.debug('OAuth2 token obtained successfully');
            return this.token ?? '';
        } catch (e) {
            throw new Error(`Failed to fetch OAuth2 token: ${e.message}`);
        }
    }

    /**
     * Creates an Express middleware function that adds OAuth Bearer token to requests.
     *
     * @returns {RequestHandler} Express middleware function.
     */
    createTokenMiddleware(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
        return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
            this.logger.debug(`Token middleware: req.url=${req.url}, req.originalUrl=${req.originalUrl}`);

            try {
                const token = await this.getAccessToken();
                req.headers.authorization = `Bearer ${token}`;
                this.logger.debug(`Added Bearer token to request: ${req.url}`);
            } catch (e) {
                this.logger.error(`Failed to get access token: ${e.message}`);
            }
            next();
        };
    }
}
