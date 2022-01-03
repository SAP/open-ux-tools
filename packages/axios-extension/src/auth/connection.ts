import { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';
import { ServiceProvider } from '../base/service-provider';
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
     *
     * @param response http response containing a headers object
     */
    public setCookies(response: AxiosResponse): Cookies {
        if (response.headers && response.headers['set-cookie']) {
            response.headers['set-cookie'].forEach((cookieString) => this.addCookie(cookieString));
        }
        return this;
    }

    /**
     * Update cookies based on a string representing a cookie.
     *
     * @param cookieString string representing a cookie
     */
    public addCookie(cookieString: string): Cookies {
        const cookie = cookieString.split(';');
        const [, key, value] = cookie[0].match(/(.*?)=(.*)/);
        if (cookieString.indexOf('Max-Age=0') >= 0) {
            delete this.cookies[key];
        } else if (key && value) {
            this.cookies[key] = value;
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

/**
 * @param response
 */
function isSamlLogonNeeded(response: AxiosResponse): boolean {
    return (
        response?.status === 200 &&
        response.headers['content-type']?.toLowerCase().startsWith('text/html') &&
        typeof response.data === 'string' &&
        !!response?.data.match(/saml/i)
    );
}

/**
 * SAP systems can choose to respond with a 200 and an HTML login page that the module cannot handle, therefore, convert it into a 401.
 *
 * @param response
 */
function throwIfHtmlLoginForm(response: AxiosResponse): void {
    if (
        response?.status === 200 &&
        response.headers['content-type']?.toLowerCase().startsWith('text/html') &&
        (response['sap-err-id'] === 'ICFLOGONREQUIRED' ||
            (typeof response.data === 'string' && !!response?.data.match(/login/i)))
    ) {
        const err = new Error() as AxiosError;
        err.response = { status: 401 } as AxiosResponse;
        err.isAxiosError = true;
        err.toJSON = (): object => {
            return { status: 401 };
        };
        throw err;
    }
}

/**
 * @param provider
 */
export function attachConnectionHandler(provider: ServiceProvider) {
    // fetch xsrf token with the first request
    const oneTimeReqInterceptorId = provider.interceptors.request.use((request: AxiosRequestConfig) => {
        request.headers = request.headers ?? {};
        request.headers[CSRF.requestHeaderName] = CSRF.requestHeaderValue;
        provider.interceptors.request.eject(oneTimeReqInterceptorId);
        return request;
    });

    // throw error on connection issues and remove interceptor if successfully connected
    const oneTimeRespInterceptorId = provider.interceptors.response.use((response: AxiosResponse) => {
        if (response.status >= 400) {
            throw new ConnectionError(response.statusText, response);
        } else {
            // if a redirect to a SAML login page happened try again with disable saml param
            if (isSamlLogonNeeded(response) && provider.defaults.params?.saml2 !== 'disabled') {
                provider.defaults.params = provider.defaults.params ?? {};
                provider.defaults.params.saml2 = 'disabled';
                return provider.request(response.config);
            } else {
                throwIfHtmlLoginForm(response);
                // remember xsrf token
                if (response.headers?.[CSRF.responseHeaderName]) {
                    provider.defaults.headers = provider.defaults.headers ?? {
                        common: {},
                        delete: {},
                        put: {},
                        get: {},
                        post: {},
                        head: {},
                        patch: {}
                    };
                    provider.defaults.headers.common[CSRF.requestHeaderName] =
                        response.headers[CSRF.responseHeaderName];
                }
                provider.interceptors.response.eject(oneTimeRespInterceptorId);
                return response;
            }
        }
    });

    // always add cookies to outgoing requests
    provider.interceptors.request.use((request: AxiosRequestConfig) => {
        request.headers = request.headers ?? {};
        request.headers.cookie = provider.cookies.toString();
        return request;
    });

    // remember new cookies from each new response
    provider.interceptors.response.use((response: AxiosResponse) => {
        provider.cookies.setCookies(response);
        return response;
    });
}
