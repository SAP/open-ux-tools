import type { AxiosRequestHeaders, AxiosResponse } from 'axios';
import { Cookies } from '../../src/auth/connection';

describe('Cookies', () => {
    const newAxiosResponseWithCookies = (cookies: string[]): AxiosResponse => {
        return {
            data: undefined,
            status: undefined,
            statusText: undefined,
            config: undefined,
            headers: { 'set-cookie': cookies } as unknown as AxiosRequestHeaders
            // Casting to unknown first as the TS compiler complains about `set-cookie` not having the correct type
            // despite the definition
        };
    };

    it('ignore immeditely expiring cookies (max-age = 0)', () => {
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
});
