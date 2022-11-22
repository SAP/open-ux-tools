import type { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';
import type { ServiceProvider } from '../base/service-provider';
import detectContentType from 'detect-content-type';

export enum CSRF {
    RequestHeaderName = 'X-Csrf-Token',
    RequestHeaderValue = 'Fetch',
    ResponseHeaderName = 'x-csrf-token'
}
/** Default connection timeout (milliseconds) */
export const defaultTimeout = 60 * 1000; // 1 minute

/**
 * Helper class for managing cookies.
 */
export class Cookies {
    private readonly cookies: { [key: string]: string } = {};
    /**
     * Update the cookies based on 'set-cookie' headers of a response.
     *
     * @param response http response containing a headers object
     * @returns cookies object
     */
    public setCookies(response: AxiosResponse): Cookies {
        if (response.headers?.['set-cookie']) {
            response.headers['set-cookie'].forEach((cookieString) => this.addCookie(cookieString));
        }
        return this;
    }

    /**
     * Update cookies based on a string representing a cookie.
     *
     * @param cookieString string representing a cookie
     * @returns cookies object
     */
    public addCookie(cookieString: string): Cookies {
        const cookie = cookieString.split(';');
        const [key, ...values] = cookie[0]?.split('=');
        const value = values?.join('='); // Account for embedded '=' in the value
        if (key && cookieString.indexOf('Max-Age=0') >= 0) {
            delete this.cookies[key];
        } else if (key && value) {
            this.cookies[key] = value;
        }
        return this;
    }

    /**
     * Serialize all cookies as string formatted for the 'Cookie' header.
     *
     * @returns serialized cookies
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
 * Check the response if SAML is required.
 *
 * @param response response from the backend
 * @returns true if SAML is required
 */
function isSamlLogonNeeded(response: AxiosResponse): boolean {
    return (
        response?.status === 200 &&
        isHtmlResponse(response) &&
        typeof response.data === 'string' &&
        !!response.data.match(/saml/i)
    );
}

/**
 * SAP systems can choose to respond with a 200 and an HTML login page that the module cannot handle, therefore, convert it into a 401.
 *
 * @param response response from the backend
 * @throws an error with status 401 if an HTML form is returned
 */
function throwIfHtmlLoginForm(response: AxiosResponse): void {
    if (response?.status !== 200) {
        return;
    }
    if (response.headers['sap-err-id'] === 'ICFLOGONREQUIRED' || isHtmlLoginForm(response)) {
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
 * @param response AxiosResponse
 * @returns true if the contents are determined to be HTML
 */
function isHtmlResponse(response: AxiosResponse): boolean {
    return getContentType(response.headers['content-type'], response.data).startsWith('text/html');
}

/**
 * @param response AxiosResponse
 * @returns true if we get an HTML login form
 */
function isHtmlLoginForm(response: AxiosResponse): boolean {
    return isHtmlResponse(response) && typeof response.data === 'string' && !!response.data.match(/log[io]n/i);
}

/**
 * @param contentTypeHeader contents of Content-Type header (https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type)
 * @param responseData data receievd in HTTP response. This is used to infer the Content-Type, if the header is missing or ambiguous
 * @returns content type
 */
function getContentType(contentTypeHeader: string | undefined, responseData: any): string {
    if (contentTypeHeader) {
        return contentTypeHeader.toLowerCase();
    } else if (typeof responseData === 'string') {
        // Try to infer it from the data
        return detectContentType(Buffer.from(responseData))?.toLowerCase() ?? '';
    } else {
        return '';
    }
}

/**
 * Attach a connection handler to the given service provider.
 *
 * @param provider any service provider
 */
export function attachConnectionHandler(provider: ServiceProvider) {
    // fetch xsrf token with the first request
    const oneTimeReqInterceptorId = provider.interceptors.request.use((request: AxiosRequestConfig) => {
        request.headers = request.headers ?? {};
        request.headers[CSRF.RequestHeaderName] = CSRF.RequestHeaderValue;
        provider.interceptors.request.eject(oneTimeReqInterceptorId);
        return request;
    });

    // throw error if the user is unauthorized otherwise, remove interceptor if successfully connected
    const oneTimeRespInterceptorId = provider.interceptors.response.use(
        (response: AxiosResponse) => {
            // if a redirect to a SAML login page happened try again with disable saml param
            if (isSamlLogonNeeded(response) && provider.defaults.params?.saml2 !== 'disabled') {
                provider.defaults.params = provider.defaults.params ?? {};
                provider.defaults.params.saml2 = 'disabled';
                return provider.request(response.config);
            } else {
                throwIfHtmlLoginForm(response);
                // remember xsrf token
                if (response.headers?.[CSRF.ResponseHeaderName]) {
                    provider.defaults.headers.common[CSRF.RequestHeaderName] =
                        response.headers[CSRF.ResponseHeaderName];
                }
                provider.interceptors.response.eject(oneTimeRespInterceptorId);
                return response;
            }
        },
        (error: AxiosError) => {
            // remember xsrf token if provided even on error
            if (error.response.headers?.[CSRF.ResponseHeaderName]) {
                provider.defaults.headers.common[CSRF.RequestHeaderName] =
                    error.response.headers[CSRF.ResponseHeaderName];
            }
            throw error;
        }
    );

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
