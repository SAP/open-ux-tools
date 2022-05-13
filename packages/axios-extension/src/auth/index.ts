import { ServiceInfo } from '@sap-ux/btp-utils';
import type { Axios, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { AbapServiceProvider } from '../abap';
import { getReentranceTicket } from './reentrance-ticket';
import { RefreshTokenChanged, Uaa } from './uaa';

export * from './connection';
export * from './error';

export { ServiceInfo, RefreshTokenChanged, Uaa };

/**
 * @param provider
 */
export function attachBasicAuthInterceptor(provider: Axios): void {
    const oneTimeInterceptorId = provider.interceptors.response.use((response: AxiosResponse) => {
        delete provider.defaults.auth;
        provider.interceptors.response.eject(oneTimeInterceptorId);
        return response;
    });
}

/**
 * @param provider
 * @param service
 * @param refreshToken
 * @param refreshTokenUpdateCb
 */
export function attachUaaAuthInterceptor(
    provider: AbapServiceProvider,
    service: ServiceInfo,
    refreshToken?: string,
    refreshTokenUpdateCb?: RefreshTokenChanged
): void {
    const uaa = new Uaa(service, provider.log);
    let token: string;
    // provide function to fetch user infos from UAA if needed
    provider.user = async () => {
        token = token ?? (await uaa.getAccessToken(refreshToken, refreshTokenUpdateCb));
        return uaa.getUserInfo(token);
    };

    const oneTimeInterceptorId = provider.interceptors.request.use(async (request: AxiosRequestConfig) => {
        token = token ?? (await uaa.getAccessToken(refreshToken, refreshTokenUpdateCb));
        // add token as auth header
        request.headers = request.headers ?? {};
        request.headers.authorization = `bearer ${token}`;
        // remove this interceptor since it is not needed anymore
        provider.interceptors.request.eject(oneTimeInterceptorId);
        return request;
    });
}

/**
 * Get the reentrace ticket from the backend and add it to the header
 * @param options
 * @param options.provider an instance of an ABAP service provider
 */
export function attachReentranceTicketAuthInterceptor({ provider }: { provider: AbapServiceProvider }): void {
    const oneTimeInterceptorId = provider.interceptors.request.use(async (request: AxiosRequestConfig) => {
        const { reentranceTicket, apiUrl } = await getReentranceTicket({
            backendUrl: provider.defaults.baseURL,
            logger: provider.log
        });
        if (apiUrl && apiUrl != provider.defaults.baseURL) {
            // Reentrance tickets work with API hostnames. If the original URL was not one, this will replace it
            // with the API hostname returned
            provider.log.warn(
                `Replacing provider's default base URL (${provider.defaults.baseURL}) with API URL: ${apiUrl}`
            );
            provider.defaults.baseURL = apiUrl;
        }
        request.headers = request.headers ?? {};
        request.headers.MYSAPSSO2 = reentranceTicket;
        // remove this interceptor since it is not needed anymore
        provider.interceptors.request.eject(oneTimeInterceptorId);
        return request;
    });
}
