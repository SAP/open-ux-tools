export interface PartialHttpResponse {
    headers?: {
        'set-cookie'?: string[];
    };
}

/**
 * Helper class for managing cookies
 */
export class Cookies {
    private readonly cookies: { [key: string]: string } = {};
    /**
     * Update the cookies based on 'set-cookie' headers of a response.
     *
     * @param response http response
     * @returns cookies object
     */
    public setCookies(response?: PartialHttpResponse): Cookies {
        response.headers?.['set-cookie']?.forEach((cookieString) => this.addCookie(cookieString));
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
