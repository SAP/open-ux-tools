import { Axios, AxiosResponse, AxiosRequestConfig } from 'axios';
import { ConnectionError } from './error';

export enum CSRF {
    requestHeaderName = 'X-Csrf-Token',
    requestHeaderValue = 'Fetch',
    responseHeaderName = 'x-csrf-token'
}

/**
 * Helper class for managing cookies.
 */
export class Cookies {
    private readonly cookies: { [key: string]: string } = {};
    /**
     * Update the cookies based on 'set-cookie' headers of a response.
     * @param response http response containing a headers object
     */
    public setCookies(response: AxiosResponse): Cookies {
        if (response.headers && response.headers['set-cookie']) {
            response.headers['set-cookie'].forEach((cookieString) => this.addCookie(cookieString));
        }
        return this;
    }

    /**
     * Update cookies based on a string representing a cookie
     * @param cookieString string representing a cookie
     */
    public addCookie(cookieString: string): Cookies {
        const cookie = cookieString.split(';');
        const [, key, value] = cookie[0].match(/(.*?)=(.*)/);
        if (cookieString.indexOf('Max-Age=0') >= 0) {
            delete this.cookies[key];
        } else {
            if (key && value) this.cookies[key] = value;
        }
        return this;
    }

    /**
     * Serialize all cookies as string formatted for the 'Cookie' header.
     */
    public toString(): string {
        const cookies: string[] = [];
        Object.keys(this.cookies).forEach((key) => {
            cookies.push(`${key}=${this.cookies[key]}`);
        });
        return cookies.join('; ');
    }
}

export function attachCookieInterceptor(provider: Axios) {
    const cookies = new Cookies();

    // fetch xsrf token with the first request
    let oneTimeReqInterceptorId: number;
    oneTimeReqInterceptorId = provider.interceptors.request.use((request: AxiosRequestConfig) => {
        request.headers = request.headers ?? {};
        request.headers[CSRF.requestHeaderName] = CSRF.requestHeaderValue;
        provider.interceptors.request.eject(oneTimeReqInterceptorId);
        return request;
    });

    // throw error on connection issues and remove interceptor if successfully connected
    let oneTimeRespInterceptorId: number;
    oneTimeRespInterceptorId = provider.interceptors.response.use((response: AxiosResponse) => {
        if (response.status >= 400) {
            throw new ConnectionError(response.statusText, response);
        } else {
            // remember xsrf token
            if (response.headers?.[CSRF.responseHeaderName]) {
                provider.defaults.headers.common[CSRF.requestHeaderName] = response.headers[CSRF.responseHeaderName];
            }
            provider.interceptors.response.eject(oneTimeRespInterceptorId);
            return response;
        }
    });

    // always add cookies to outgoing requests
    provider.interceptors.request.use((request: AxiosRequestConfig) => {
        request.headers = request.headers ?? {};
        request.headers.cookie = cookies.toString();
        return request;
    });

    // remember new cookies from each new response
    provider.interceptors.response.use((response: AxiosResponse) => {
        cookies.setCookies(response);
        return response;
    });
}
