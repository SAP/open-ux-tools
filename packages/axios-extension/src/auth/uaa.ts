import open = require('open');
import type { AxiosResponse, AxiosRequestConfig } from 'axios';
import axios from 'axios';
import http from 'http';
import type { AddressInfo } from 'net';
import qs from 'qs';
import type { Logger } from '@sap-ux/logger';
import type { ServiceInfo } from '@sap-ux/btp-utils';
import { Redirect } from './redirect';
import { prettyPrintTimeInMs } from '../abap/message';
import { UAATimeoutError } from './error';
import { redirectSuccessHtml } from './static';
import { defaultTimeout } from './connection';

export type RefreshTokenChanged = (refreshToken?: string) => void | Promise<void>;

/**
 * A class representing interactions with an SAP BTP UAA service
 */
export class Uaa {
    protected readonly serviceInfo: ServiceInfo;

    /**
     * @param serviceInfo service Information
     * @param log logger
     */
    constructor(serviceInfo: ServiceInfo, protected log: Logger) {
        this.validatePropertyExists(serviceInfo.uaa.clientid, 'Client ID missing');
        this.validatePropertyExists(serviceInfo.uaa.clientsecret, 'Client Secret missing');
        this.validatePropertyExists(serviceInfo.uaa.url, 'UAA URL missing');
        this.serviceInfo = serviceInfo;
    }

    /**
     * @param property property
     * @param errMsg error message
     */
    protected validatePropertyExists(property: string, errMsg: string): void {
        if (!property) {
            throw Error(errMsg);
        }
    }

    /**
     * Getter for uaa url.
     *
     * @returns uaa url
     */
    protected get url(): string {
        return this.serviceInfo.uaa.url;
    }

    /**
     * Getter for client id.
     *
     * @returns client id
     */
    protected get clientid(): string {
        return this.serviceInfo.uaa.clientid;
    }

    /**
     * Getter for client secret.
     *
     * @returns client secret
     */
    protected get clientsecret(): string {
        return this.serviceInfo.uaa.clientsecret;
    }

    /**
     * Getter for logout url.
     *
     * @returns logout url
     */
    protected get logoutUrl(): string {
        return this.url + '/logout.do';
    }

    /**
     * Getter for system id.
     *
     * @returns system id
     */
    protected get systemId(): string {
        return this.serviceInfo.systemid;
    }

    /**
     * Generates a request url based on the provided redirect url.
     *
     * @param params config parameters
     * @param params.redirectUri redirect url
     * @returns authentication code request url
     */
    protected getAuthCodeUrl({ redirectUri }): string {
        return (
            this.url +
            '/oauth/authorize?' +
            qs.stringify({
                response_type: 'code',
                redirect_uri: redirectUri,
                client_id: this.clientid
            })
        );
    }

    /**
     * Generate an Axios token request configuration for fetching a token.
     *
     * @param params config parameters
     * @param params.redirectUri redirect url
     * @param params.authCode authentication code
     * @returns an axios request config
     */
    protected getTokenRequestForAuthCode({ redirectUri, authCode }): AxiosRequestConfig {
        return {
            url: this.url + '/oauth/token',
            auth: { username: this.clientid, password: this.clientsecret },
            method: 'POST',
            data: qs.stringify({
                code: authCode,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                response_type: 'token'
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json'
            }
        };
    }

    /**
     * Generate an Axios token request configuration for fetching a token.
     *
     * @param refreshToken existing refresh token
     * @returns an axios request config
     */
    protected getTokenRequestForRefreshToken(refreshToken): AxiosRequestConfig {
        return {
            url: this.url + '/oauth/token',
            auth: { username: this.clientid, password: this.clientsecret },
            method: 'POST',
            data: qs.stringify({
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json'
            }
        };
    }

    /**
     * Get user information.
     *
     * @param accessToken valid access token
     * @returns user name or undefined
     */
    public async getUserInfo(accessToken: string): Promise<string | undefined> {
        const userInfoResp = await axios.request({
            url: this.url + '/userinfo',
            method: 'GET',
            headers: {
                authorization: `bearer ${accessToken}`
            }
        });
        return userInfoResp?.data?.email || userInfoResp?.data?.name;
    }

    /**
     * Get an authentication code.
     *
     * @param timeout timeout
     * @returns an object containing an authentication code and a redirect object
     */
    protected async getAuthCode(timeout: number = defaultTimeout): Promise<{ authCode: string; redirect: Redirect }> {
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line prefer-const
            let redirect: Redirect;
            // eslint-disable-next-line prefer-const
            let server: http.Server;
            const handleTimeout = (): void => {
                server?.close();
                reject(new UAATimeoutError(`Timeout. Did not get a response within ${prettyPrintTimeInMs(timeout)}`));
            };
            const timer = setTimeout(handleTimeout, timeout);
            server = http.createServer((req, res) => {
                const reqUrl = new URL(req.url, `http://${req.headers.host}`);
                if (reqUrl.pathname === Redirect.path) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(Buffer.from(redirectSuccessHtml(this.logoutUrl, this.systemId)));
                    this.log.info('Got authCode');
                    resolve({ authCode: reqUrl.searchParams.get('code') + '', redirect });
                    if (timer) {
                        clearTimeout(timer);
                    }
                    server.close();
                }
            });

            // Start listening. Let the OS assign an available port
            server.listen();
            redirect = new Redirect((server.address() as AddressInfo).port);
            const oauthUrl = this.getAuthCodeUrl({ redirectUri: redirect.url() });
            open(oauthUrl);
        });
    }

    /**
     * @param refreshToken refreshToken
     * @param refreshTokenChangedCb refreshTokenChanged callback function
     * @returns an access token.
     */
    public async getAccessToken(refreshToken?: string, refreshTokenChangedCb?: RefreshTokenChanged): Promise<string> {
        let response: AxiosResponse;
        let startFreshLogin = false;
        let newRefreshToken: string;

        if (refreshToken) {
            this.log.info('Refresh token passed in');
            const tokenRequest = this.getTokenRequestForRefreshToken(refreshToken);
            try {
                response = await axios.request(tokenRequest);

                // Has refresh token expired?
                if (response.status === 401 || response.data.error === 'invalid_token') {
                    startFreshLogin = true;
                    this.log.warn('Cannot use stored refresh token. Starting fresh request');
                } else if (refreshToken !== response.data.refresh_token) {
                    this.log.info('New refresh token issued');
                    newRefreshToken = response.data.refresh_token;
                }
            } catch (e) {
                startFreshLogin = true;
            }
        }

        if (!refreshToken || startFreshLogin) {
            const { authCode, redirect } = await this.getAuthCode();
            const tokenRequest = this.getTokenRequestForAuthCode({
                redirectUri: redirect.url(), // Redirection URL needs to match
                authCode
            });
            response = await axios.request(tokenRequest);
            this.log.info('Refresh token issued');
            newRefreshToken = response.data.refresh_token;
        }

        if (newRefreshToken && refreshTokenChangedCb) {
            this.log.info('Sending notification that refresh token changed');
            refreshTokenChangedCb(newRefreshToken);
        }

        this.log.info('Got access token successfully');
        return response?.data?.access_token;
    }
}
