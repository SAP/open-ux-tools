import type { AxiosError, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse, HeadersDefaults } from 'axios';
import { ServiceProvider } from '../../src/base/service-provider';
import { attachConnectionHandler, Cookies, CSRF } from '../../src/auth/connection';

interface AxiosInterceptor<T> {
    fulfilled(response: T);
    rejected?(error: AxiosError);
}

describe('connection', () => {
    describe('Cookies', () => {
        const newAxiosResponseWithCookies = (cookies?: string[]): AxiosResponse => {
            return {
                data: undefined,
                status: undefined,
                statusText: undefined,
                config: undefined,
                headers: cookies ? ({ 'set-cookie': cookies } as unknown as AxiosRequestHeaders) : undefined
                // Casting to unknown first as the TS compiler complains about `set-cookie` not having the correct type
                // despite the definition
            };
        };

        it('ignore immediately expiring cookies (max-age = 0)', () => {
            const response = newAxiosResponseWithCookies(['valid=true;Max-Age=1234', 'invalid=false;Max-Age=0']);
            const cookies = new Cookies();
            cookies.setCookies(response);
            const cookieString = cookies.toString();
            expect(cookieString).toBe('valid=true');
        });

        it('Handle "=" in cookie value', () => {
            const response = newAxiosResponseWithCookies(['sap-usercontext=sap-client=200; path=/']);
            const cookies = new Cookies().setCookies(response);
            expect(cookies.toString()).toBe('sap-usercontext=sap-client=200');
        });

        it('Do not crash if the response has no headers', () => {
            const response = newAxiosResponseWithCookies();
            expect(() => new Cookies().setCookies(response)).not.toThrowError();
        });
    });

    describe('attachConnectionHandler', () => {
        let testProvider: ServiceProvider;
        let respHandlers: AxiosInterceptor<AxiosResponse>[];
        let reqHandlers: AxiosInterceptor<AxiosRequestConfig>[];

        beforeEach(() => {
            testProvider = new ServiceProvider();
            testProvider.defaults = { headers: { common: {} } as HeadersDefaults };
            attachConnectionHandler(testProvider);

            respHandlers = (testProvider.interceptors.response as unknown)['handlers'];
            reqHandlers = (testProvider.interceptors.request as unknown)['handlers'];
        });

        it('handlers correctly attached', () => {
            expect(reqHandlers.length).toBe(2);
            expect(respHandlers.length).toBe(2);
        });

        it('request: do not cause problem for normal responses', () => {
            const request = {} as AxiosRequestConfig;
            reqHandlers.forEach((handler) => {
                expect(handler.fulfilled(request)).toBe(request);
            });
        });

        it('response: do not cause problem for normal responses', () => {
            const response = {} as AxiosResponse;
            const error = { response, message: '~test' } as AxiosError;
            respHandlers.forEach((handler) => {
                expect(handler.fulfilled(response)).toBe(response);
                if (handler.rejected) {
                    expect(() => handler.rejected(error)).toThrow(error.message);
                }
            });
        });

        it('response: extract CSRF header even if the backend returned an error', () => {
            const response = { headers: { [CSRF.ResponseHeaderName]: '~test' } } as unknown as AxiosResponse;
            const error = { response, message: 'test' } as AxiosError;
            respHandlers.forEach((handler) => {
                if (handler.rejected) {
                    expect(() => handler.rejected(error)).toThrow(error);
                }
            });
            expect(testProvider.defaults.headers.common[CSRF.RequestHeaderName]).toBe(
                response.headers[CSRF.ResponseHeaderName]
            );
        });
    });
});
