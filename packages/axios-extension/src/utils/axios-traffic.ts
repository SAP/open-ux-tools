import { ToolsLogger } from '@sap-ux/logger';
import { Axios, AxiosRequestConfig, AxiosResponse } from 'axios';

// We call the actual function with once because we want sort of idempotency.
// For example when called in yo generator, the generator could be started multiple times
// by the Application Wizard while changing pages, so we want to patch the Axios.request()
// method only once not for each page visit.
export const logAxiosTraffic = once(logAxiosTrafficInternal);

const QUERY_PARAMS_PREFIX = '?';
const QUERY_PARAMS_SEPARATOR = '&';
const GET_REQUEST_METHOD = 'get';

type URLQueryParams = string | URLSearchParams | Record<string, string> | string[][];

function logAxiosTrafficInternal(logger: ToolsLogger): void {
    const prototype = Axios.prototype;
    const originalRequest = prototype.request;

    prototype.request = async function patchRequest<T = any, R = AxiosResponse<T, any, {}>, D = any>(
        this: Axios,
        config: AxiosRequestConfig<D>
    ): Promise<R> {
        // Thios config does not contain headers or query params added from interceptors.
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
        // internal axios interceptor sets a default method to GET so wee need to do the same here.
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

export function once<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => ReturnType<T> | undefined {
    let isCalled = false;
    let result: ReturnType<T>;

    return function (this: ThisParameterType<T>, ...args: Parameters<T>): ReturnType<T> | undefined {
        if (isCalled) return result;
        isCalled = true;
        result = fn.apply(this, args);
        return result;
    };
}
