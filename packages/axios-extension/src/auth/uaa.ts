/* eslint-disable @typescript-eslint/camelcase */
import open = require('open');
import http from 'http';
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import express from 'express';
import qs from 'qs';
import { Logger } from '@sap-ux/logger';
import { AddressInfo } from 'net';
import { ServiceInfo } from './service-info';
import { Redirect } from './redirect';
import { prettyPrintTimeInMs } from '../abap/message';
import { UAATimeoutError } from './error';
import { redirectSuccessHtml } from './static';

/** Connection timeout. Should be made configurable */
export const defaultTimeout = 60 * 1000; // 1 minute

export class Uaa {
    private readonly serviceInfo: ServiceInfo;

    constructor(serviceInfo: ServiceInfo, protected log: Logger) {
        this.validatePropertyExists(serviceInfo.uaa.clientid, 'Client ID missing');
        this.validatePropertyExists(serviceInfo.uaa.clientsecret, 'Client Secret missing');
        this.validatePropertyExists(serviceInfo.uaa.url, 'UAA URL missing');
        this.serviceInfo = serviceInfo;
    }

    private validatePropertyExists(property: string, errMsg: string): void {
        if (!property) {
            throw Error(errMsg);
        }
    }

    private get url(): string {
        return this.serviceInfo.uaa.url;
    }

    private get clientid(): string {
        return this.serviceInfo.uaa.clientid;
    }

    private get clientsecret(): string {
        return this.serviceInfo.uaa.clientsecret;
    }

    private get username(): string {
        return this.serviceInfo.uaa.username;
    }

    private get password(): string {
        return this.serviceInfo.uaa.password;
    }

    get logoutUrl(): string {
        return this.url + '/logout.do';
    }

    get systemId(): string {
        return this.serviceInfo.systemid;
    }

    public getAuthCodeUrl({ redirectUri }): string {
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

    public getTokenRequestForAuthCode({ redirectUri, authCode }): AxiosRequestConfig {
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

    public getAccessTokenRequestUsingClientCredential(): AxiosRequestConfig {
        return {
            url: this.url,
            method: 'POST',
            data: qs.stringify({
                grant_type: 'password',
                username: this.username,
                password: this.password
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
                Authorization: `Basic ${Buffer.from(this.clientid + ':' + this.clientsecret).toString('base64')}`
            }
        };
    }

    public getTokenRequestForRefreshToken(refreshToken): AxiosRequestConfig {
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

    public getUserinfoRequest(accessToken: string): AxiosRequestConfig {
        return {
            url: this.url + '/userinfo',
            method: 'GET',
            headers: {
                authorization: `bearer ${accessToken}`
            }
        };
    }

    private async getAuthCode(timeout: number = defaultTimeout): Promise<{ authCode: string; redirect: Redirect }> {
        return new Promise((resolve, reject) => {
            const app = express();
            const server = http.createServer(app);
            // eslint-disable-next-line prefer-const
            let redirect: Redirect;
            const handleTimeout = (): void => {
                server.close();
                reject(new UAATimeoutError(`Timeout. Did not get a response within ${prettyPrintTimeInMs(timeout)}`));
            };
            const timer = setTimeout(handleTimeout, timeout);
            app.get(Redirect.path, (req, res) => {
                res.set('Content-Type', 'text/html');
                res.send(Buffer.from(redirectSuccessHtml(this.logoutUrl, this.systemId)));
                this.log.info('Got authCode');
                resolve({ authCode: req.query.code + '', redirect });
                if (timer) {
                    clearTimeout(timer);
                }
                server.close();
            });

            // Start listening. Let the OS assign an available port
            server.listen();
            redirect = new Redirect((server.address() as AddressInfo).port);
            const oauthUrl = this.getAuthCodeUrl({ redirectUri: redirect.url() });
            open(oauthUrl);
        });
    }

    public async getAccessToken(refreshToken?: string): Promise<string> {
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
                } else {
                    if (refreshToken !== response.data.refresh_token) {
                        this.log.info('New refresh token issued');
                        newRefreshToken = response.data.refresh_token;
                    }
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
            this.log.info('Storing refresh token');
            newRefreshToken = response.data.refresh_token;
        }

        this.log.info('Got access token successfully');
        return response?.data?.access_token;
    }
}
