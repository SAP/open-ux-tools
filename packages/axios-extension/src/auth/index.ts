import { ServiceInfo } from '@sap-ux/btp-utils';
import { Axios, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AbapServiceProvider } from '../abap';
import { RefreshTokenChanged, Uaa } from './uaa';

export * from './connection';
export * from './error';

export { ServiceInfo, RefreshTokenChanged, Uaa };

export function attachBasicAuthInterceptor(provider: Axios): void {
    let oneTimeInterceptorId: number;
    oneTimeInterceptorId = provider.interceptors.response.use((response: AxiosResponse) => {
        delete provider.defaults.auth;
        provider.interceptors.response.eject(oneTimeInterceptorId);
        return response;
    });
}

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
    let oneTimeInterceptorId: number;
    oneTimeInterceptorId = provider.interceptors.request.use(async (request: AxiosRequestConfig) => {
        token = token ?? (await uaa.getAccessToken(refreshToken, refreshTokenUpdateCb));
        // add token as auth header
        request.headers = request.headers ?? {};
        request.headers.authorization = `bearer ${token}`;
        // remove this interceptor since it is not needed anymore
        provider.interceptors.request.eject(oneTimeInterceptorId);
        return request;
    });
}
