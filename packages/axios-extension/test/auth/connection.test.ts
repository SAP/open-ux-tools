import { jest } from '@jest/globals';
import type { AxiosError, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse, HeadersDefaults } from 'axios';

const mockIsAppStudio = jest.fn<() => boolean>().mockReturnValue(false);
const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio
}));

// Set env var before module is imported — isMockAdpAbapAuthHeaderInjectionEnabled is read at load time
process.env.ENABLE_MOCK_ADP_ABAP_AUTH_HEADER_INJECTION = 'true';

const { ServiceProvider } = await import('../../src/base/service-provider.js');
const { attachConnectionHandler, Cookies, CSRF } = await import('../../src/auth/connection.js');

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
            expect(() => new Cookies().setCookies(response)).not.toThrow();
        });

        it('do not crash if cookie string is empty string', () => {
            const response = {
                ...newAxiosResponseWithCookies(),
                headers: { 'set-cookie': [''] } as unknown as AxiosRequestHeaders
            };
            expect(() => new Cookies().setCookies(response)).not.toThrow();
        });
    });

    describe('attachConnectionHandler', () => {
        let testProvider: ServiceProvider;
        let respHandlers: AxiosInterceptor<AxiosResponse>[];
        let reqHandlers: AxiosInterceptor<AxiosRequestConfig>[];
        let spyOnRequestEject;

        beforeEach(() => {
            mockIsAppStudio.mockReturnValue(false);
            testProvider = new ServiceProvider();
            testProvider.defaults = { headers: { common: {} } as HeadersDefaults };
            attachConnectionHandler(testProvider);

            respHandlers = (testProvider.interceptors.response as unknown)['handlers'];
            reqHandlers = (testProvider.interceptors.request as unknown)['handlers'];
            spyOnRequestEject = testProvider.interceptors.request.eject = jest.fn();
        });

        it('handlers correctly attached outside BAS (no mock ADP interceptor)', () => {
            expect(reqHandlers.length).toBe(2);
            expect(respHandlers.length).toBe(2);
        });

        it('handlers correctly attached in BAS (includes mock ADP interceptor)', () => {
            mockIsAppStudio.mockReturnValue(true);
            const basProvider = new ServiceProvider();
            basProvider.defaults = { headers: { common: {} } as HeadersDefaults };
            attachConnectionHandler(basProvider);
            const basReqHandlers = (basProvider.interceptors.request as unknown)['handlers'];
            expect(basReqHandlers.length).toBe(3);
        });

        it('request: do not cause problem for normal responses', () => {
            const request = {} as AxiosRequestConfig;
            reqHandlers.forEach((handler) => {
                expect(handler.fulfilled(request)).toBe(request);
            });
            expect(spyOnRequestEject).toHaveBeenCalledTimes(0);
        });

        it('response: do not cause problem for errors without response property', () => {
            const response = {} as AxiosResponse;
            const error = { message: '~test' } as AxiosError;
            respHandlers.forEach((handler) => {
                expect(handler.fulfilled(response)).toBe(response);
                if (handler.rejected) {
                    expect(() => handler.rejected(error)).toThrow(error.message);
                }
            });
            expect(spyOnRequestEject).toHaveBeenCalledTimes(0);
        });

        it('response: do not cause problem for normal responses', () => {
            const response = { headers: { [CSRF.ResponseHeaderName]: '~test' } } as unknown as AxiosResponse;
            const error = { response, message: '~test' } as AxiosError;
            respHandlers.forEach((handler) => {
                expect(handler.fulfilled(response)).toBe(response);
                if (handler.rejected) {
                    expect(() => handler.rejected(error)).toThrow(error.message);
                }
            });
            expect(spyOnRequestEject).toHaveBeenCalledTimes(2);
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
            expect(spyOnRequestEject).toHaveBeenCalledTimes(1);
        });

        describe('m-adp-abap-authorization header', () => {
            let basProvider: ServiceProvider;
            let basReqHandlers: AxiosInterceptor<AxiosRequestConfig>[];

            beforeEach(() => {
                mockIsAppStudio.mockReturnValue(true);
                basProvider = new ServiceProvider();
                basProvider.defaults = { headers: { common: {} } as HeadersDefaults };
                attachConnectionHandler(basProvider);
                basReqHandlers = (basProvider.interceptors.request as unknown)['handlers'];
            });

            const mockAdpInterceptor = () => basReqHandlers[2];

            it('sets header from provider defaults.auth when credentials are present', () => {
                basProvider.defaults.auth = { username: 'user', password: 'pass' };
                const request = { headers: undefined } as unknown as AxiosRequestConfig;
                mockAdpInterceptor().fulfilled(request);
                expect((request as any).headers.get('m-adp-abap-authorization')).toBe(
                    `Basic ${Buffer.from('user:pass').toString('base64')}`
                );
            });

            it('sets header from request.auth when present, taking precedence over defaults.auth', () => {
                basProvider.defaults.auth = { username: 'default', password: 'default' };
                const request = { auth: { username: 'req', password: 'secret' } } as unknown as AxiosRequestConfig;
                mockAdpInterceptor().fulfilled(request);
                expect((request as any).headers.get('m-adp-abap-authorization')).toBe(
                    `Basic ${Buffer.from('req:secret').toString('base64')}`
                );
            });

            it('does not set header when no auth credentials are present', () => {
                const request = { headers: undefined } as unknown as AxiosRequestConfig;
                mockAdpInterceptor().fulfilled(request);
                expect((request as any).headers).toBeUndefined();
            });

            it('does not set header when username or password is missing', () => {
                basProvider.defaults.auth = { username: 'user', password: '' };
                const request = { headers: undefined } as unknown as AxiosRequestConfig;
                mockAdpInterceptor().fulfilled(request);
                expect((request as any).headers).toBeUndefined();
            });

            it('does not inject interceptor outside BAS', () => {
                mockIsAppStudio.mockReturnValue(false);
                const nonBasProvider = new ServiceProvider();
                nonBasProvider.defaults = { headers: { common: {} } as HeadersDefaults };
                attachConnectionHandler(nonBasProvider);
                const handlers = (nonBasProvider.interceptors.request as unknown)['handlers'];
                expect(handlers.length).toBe(2);
            });
        });
    });
});
