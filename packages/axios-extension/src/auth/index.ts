import { Axios, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AbapServiceProvider } from '../abap/abap-service-provider';
import { ServiceInfo } from './service-info';
import { Uaa } from './uaa';

export * from './service-info';
export * from './cookies';

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
    refreshToken?: string
): void {
    let oneTimeInterceptorId: number;
    oneTimeInterceptorId = provider.interceptors.request.use(async (request: AxiosRequestConfig) => {
        const uaa = new Uaa(service, provider.log);
        const token = await uaa.getAccessToken(refreshToken);
        request.headers = request.headers ?? {};
        request.headers.authorization = `bearer ${token}`;
        provider.interceptors.request.eject(oneTimeInterceptorId);
        return request;
    });
}
