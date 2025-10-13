import type { ToolsLogger } from '@sap-ux/logger';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Axios } from 'axios';
import type { WriteStream } from 'fs';
import fs from 'fs';
import { rename } from 'fs/promises';
import { once } from 'lodash';
import os from 'os';
import path from 'path';

// We call the actual function with once because we want sort of idempotency.
// For example when called in yo generator, the generator could be started multiple times
// by the Application Wizard while changing pages, so we want to patch the Axios.request()
// method only once not for each page visit.
export const logAxiosTraffic = once(logAxiosTrafficInternal);

const QUERY_PARAMS_PREFIX = '?';
const QUERY_PARAMS_SEPARATOR = '&';
const GET_REQUEST_METHOD = 'get';
const SAP_CLIENT_QUERY_PARAM_NAME = 'sap-client';
const TEMP_MUAB_CONFIG_PATH = path.join(os.tmpdir(), 'temp-muab-config.txt');

type URLQueryParams = string | URLSearchParams | Record<string, string> | string[][];

interface MuabResponse {
    relativeUrl: string;
    method: string;
    statusCode: number;
    body: any;
}

function logAxiosTrafficInternal(logger: ToolsLogger) {
    const prototype = Axios.prototype;
    const originalRequest = prototype.request;
    const muabConfigStream = fs.createWriteStream(TEMP_MUAB_CONFIG_PATH, { flags: 'w' });

    appendNewLine(muabConfigStream, `## Automated muab config file.`);

    prototype.request = async function patchRequest<T = any, R = AxiosResponse<T, any, {}>, D = any>(
        this: Axios,
        config: AxiosRequestConfig<D>
    ): Promise<R> {
        // This config does not contain headers or query params added from interceptors.
        const mergedConfig = {
            ...this.defaults,
            ...config,
            headers: {
                ...(this.defaults?.headers || {}),
                ...(config.headers || {})
            }
        };
        const requestUrl = getFullUrlString(mergedConfig.baseURL ?? '', mergedConfig.url ?? '', mergedConfig.params);
        // If the developer omits the request method when dooes a call to the .request() method
        // an internal axios interceptor sets the default method to a GET method,
        // so wee need to do the same here.
        const method = (mergedConfig.method ?? GET_REQUEST_METHOD).toUpperCase();

        logger.info(`[axios][=>][${method}] ${requestUrl}`);
        if (mergedConfig.headers) {
            logger.info(`[axios] headers: ${mergedConfig.headers}`);
        }
        if (mergedConfig.data) {
            logger.info(`[axios] body: ${mergedConfig.data}`);
        }

        try {
            const response = await originalRequest.call(this, config);
            // This config contains all data added from interceptors.
            const responseConfig = response.config ?? {};
            const responseUrl = getFullUrlString(
                responseConfig.baseURL ?? '',
                responseConfig.url ?? '',
                responseConfig.params
            );

            logger.info(`[axios][<=][${response.status}] ${responseUrl}`);
            if (response.headers) {
                logger.info(`[axios] headers: ${response.headers}`);
            }
            if (response.data) {
                logger.info(`[axios] body: ${response.data}`);
            }

            appendMuabResponse(muabConfigStream, {
                relativeUrl: response.request.path,
                method,
                statusCode: parseInt(response.status, 10),
                body: response.data
            });

            return response;
        } catch (error) {
            logger.error(`[axios][error] ${requestUrl} ${error.message}`);
            if (error.response) {
                logger.error(`[axios] status: ${error.response.status}`);
                logger.error(`[axios] headers: ${error.response.headers}`);
                logger.error(`[axios] body: ${error.response.data}`);
            }
            throw error;
        }
    };

    return {
        saveMuabConfig: (muabConfigPath: string) => {
            saveMuabConfig(muabConfigStream, muabConfigPath);
        }
    };
}

function getFullUrlString(baseURL: string, relativeUrl: string, queryParams?: URLQueryParams): string {
    try {
        let fullUrl = new URL(relativeUrl, baseURL).toString();
        const paramsToString = queryParams ? new URLSearchParams(queryParams).toString() : '';
        if (paramsToString) {
            const paramsPrefix = fullUrl.includes(QUERY_PARAMS_PREFIX) ? QUERY_PARAMS_SEPARATOR : QUERY_PARAMS_PREFIX;
            const decodedParams = decodeURIComponent(paramsToString);
            fullUrl += `${paramsPrefix}${decodedParams}`;
        }

        return fullUrl;
    } catch {
        return `${baseURL}${relativeUrl}`;
    }
}

function appendMuabResponse(stream: WriteStream, response: MuabResponse): void {
    appendNewLine(stream, '# [axios] response');
    appendNewLine(
        stream,
        `${removeQueryParamFromPath(response.relativeUrl, SAP_CLIENT_QUERY_PARAM_NAME)};${response.method}|${
            response.statusCode
        };body=${response.body}`
    );
}

function appendNewLine(stream: WriteStream, message: string): void {
    stream.write(`${message}\n\n`);
}

function saveMuabConfig(stream: WriteStream, muabConfigPath: string): void {
    stream.end(async () => {
        await rename(TEMP_MUAB_CONFIG_PATH, muabConfigPath);
    });
}

/**
 * Removes a query parameter from a URL path string.
 *
 * @param path - The URL path with optional query string
 * @param paramName - The query parameter to remove
 * @returns The path without the specified query parameter
 */
export function removeQueryParamFromPath(path: string, paramName: string): string {
    // Use a dummy base so URL can parse relative paths
    const url = new URL(path, 'http://dummy');

    // Remove the parameter
    url.searchParams.delete(paramName);

    // Return path + remaining query string
    const newPath = url.pathname + decodeURIComponent(url.search); // exclude host and protocol
    return newPath;
}
