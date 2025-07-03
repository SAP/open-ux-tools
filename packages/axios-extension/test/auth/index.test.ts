import { ServiceProvider } from '../../src/base/service-provider';
import type { AbapServiceProvider } from '../../src';
import { createForDestination } from '../../src';
import type { ServiceInfo } from '../../src/auth';
import { attachUaaAuthInterceptor, getReentranceTicketAuthInterceptor } from '../../src/auth';
import * as rt from '../../src/auth/reentrance-ticket';
import type { InternalAxiosRequestConfig } from 'axios';
import { AxiosHeaders } from 'axios';
import { WebIDEUsage as WebIDEUsageType, type Destination } from '@sap-ux/btp-utils';

describe('getReentranceTicketAuthInterceptor', () => {
    const getReentranceTicketSpy = jest.spyOn(rt, 'getReentranceTicket');

    it('adds reentrance ticket to the header', async () => {
        const REENTRANCE_TICKET_VALUE = 'a_reentrance_ticket';
        getReentranceTicketSpy.mockResolvedValueOnce({ reentranceTicket: REENTRANCE_TICKET_VALUE });
        const provider = new ServiceProvider({ baseURL: 'base_url.example' });
        const request: InternalAxiosRequestConfig = { headers: new AxiosHeaders() };

        const interceptor = getReentranceTicketAuthInterceptor({ provider, ejectCallback: () => 0 });
        await interceptor(request);

        expect(request.headers.MYSAPSSO2).toBe(REENTRANCE_TICKET_VALUE);
    });

    it('changes provider baseURL if different to API host', async () => {
        const API_URL = 'api_url';
        const ORIGINAL_BASE_URL = 'base_url.example';
        getReentranceTicketSpy.mockResolvedValueOnce({ reentranceTicket: 'foo', apiUrl: API_URL });
        const provider = new ServiceProvider({ baseURL: ORIGINAL_BASE_URL });

        const interceptor = getReentranceTicketAuthInterceptor({ provider, ejectCallback: () => 0 });
        expect(provider.defaults.baseURL).toBe(ORIGINAL_BASE_URL);

        await interceptor({ headers: new AxiosHeaders() });

        expect(provider.defaults.baseURL).toBe(API_URL);
    });

    it('calls eject after running once', async () => {
        const provider = new ServiceProvider({ baseURL: 'base_url.example' });
        const ejectCallback = jest.fn();
        getReentranceTicketSpy.mockResolvedValueOnce({ reentranceTicket: 'foo' });

        const interceptor = getReentranceTicketAuthInterceptor({ provider, ejectCallback });
        await interceptor({ headers: new AxiosHeaders() });

        expect(ejectCallback).toHaveBeenCalledTimes(1);
    });
});

describe('attachUaaAuthInterceptor', () => {
    const destination: Destination = {
        Name: 'name',
        Type: 'HTTP',
        Authentication: 'NoAuthentication',
        ProxyType: 'OnPremise',
        Host: 'https://sap.example',
        Description: 'description'
    };
    const WebIDEUsage = WebIDEUsageType.ODATA_ABAP;
    const provider = createForDestination({}, { ...destination, WebIDEUsage }) as AbapServiceProvider;
    const uaa = {
        clientid: '~client',
        clientsecret: '~clientsecret',
        url: 'http://abap.example'
    };
    const service: ServiceInfo = {
        uaa,
        url: 'http://abap.example',
        catalogs: { abap: { path: 'abap_path', type: 'some_type' } }
    };
    const refreshToken = '~token';
    const callback = jest.fn();

    it('check interceptor request handlers length', () => {
        expect(Object.keys(provider.interceptors.request['handlers']).length).toEqual(2);
        attachUaaAuthInterceptor(provider, service, refreshToken, callback);
        expect(Object.keys(provider.interceptors.request['handlers']).length).toEqual(3);
    });
});
