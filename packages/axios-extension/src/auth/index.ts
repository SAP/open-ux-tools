import { AxiosHeaders } from 'axios';
import type { Axios, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ServiceProvider } from '../base/service-provider';
import { getReentranceTicket } from './reentrance-ticket';

export * from './connection';
export * from './error';
export { ServiceInfo } from '@sap-ux/btp-utils';

/**
 * @deprecated Soon to be removed. No longer needed as Service Key based auth support (UAA) has been removed
 */
export type RefreshTokenChanged = (refreshToken?: string, accessToken?: string) => void | Promise<void>;

/**
 * @param provider Basic Auth Provider
 */
export function attachBasicAuthInterceptor(provider: Axios): void {
    const oneTimeInterceptorId = provider.interceptors.response.use((response: AxiosResponse) => {
        delete provider.defaults.auth;
        provider.interceptors.response.eject(oneTimeInterceptorId);
        return response;
    });
}

/**
 * Get the reentrace ticket from the backend and add it to the header.
 *
 * @param options options
 * @param options.provider an instance of an ABAP service provider
 */
export function attachReentranceTicketAuthInterceptor({ provider }: { provider: ServiceProvider }): void {
    /* This cannot be a const like eslint claims */
    /* eslint-disable prefer-const */
    let oneTimeInterceptorId: number;
    const ejectCallback = () => provider.interceptors.request.eject(oneTimeInterceptorId);
    oneTimeInterceptorId = provider.interceptors.request.use(
        getReentranceTicketAuthInterceptor({ provider, ejectCallback })
    );
}

/**
 * Get the interceptor that fetches and uses reentrance tickets from the backend.
 *
 * @param options options
 * @param options.provider an instance of an ABAP service provider
 * @param options.ejectCallback  eject Callback Function
 * @returns the interceptor function to fetch and use reentrace tickets
 */
export function getReentranceTicketAuthInterceptor({
    provider,
    ejectCallback
}: {
    provider: ServiceProvider;
    ejectCallback: () => void;
}): (request: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig<any>> {
    return async (request: InternalAxiosRequestConfig) => {
        const { reentranceTicket, backend } = await getReentranceTicket({
            backendUrl: provider.defaults.baseURL,
            logger: provider.log
        });
        // Update the base host (provided system url) to the API host for subsequent calls as only this should be used with re-entrance tickets to generate a secure session
        provider.defaults.baseURL = (await backend?.apiHostname()) ?? provider.defaults.baseURL;
        request.headers = request.headers ?? new AxiosHeaders();
        request.headers.MYSAPSSO2 = reentranceTicket;
        // Request a secure session using the reentrance token
        request.headers['x-sap-security-session'] = 'create';
        // remove this interceptor since it is not needed anymore
        ejectCallback();
        return request;
    };
}
