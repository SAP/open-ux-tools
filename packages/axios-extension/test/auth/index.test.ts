import { ServiceProvider } from '../../src/base/service-provider';
import type { AbapServiceProvider } from '../../src';
import { createForDestination } from '../../src';
import type { ServiceInfo } from '../../src/auth';
import { attachUaaAuthInterceptor, getReentranceTicketAuthInterceptor } from '../../src/auth';
import * as rt from '../../src/auth/reentrance-ticket';
import type { InternalAxiosRequestConfig } from 'axios';
import { AxiosHeaders } from 'axios';
import { WebIDEUsage as WebIDEUsageType, type Destination } from '@sap-ux/btp-utils';
import type { ABAPVirtualHostProvider } from '../../src/auth/reentrance-ticket/abap-virtual-host-provider';

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

    it('Should update provider baseURL to api host', async () => {
        const API_ORIGIN = 'http://api_host.example';
        const ORIGINAL_ORIGIN = 'http://base_url.example';
        const backendMock = {
            apiHostname: jest.fn().mockReturnValue(API_ORIGIN)
        };
        getReentranceTicketSpy.mockResolvedValueOnce({
            reentranceTicket: 'foo',
            backend: backendMock as unknown as ABAPVirtualHostProvider
        });
        const provider = new ServiceProvider({ baseURL: ORIGINAL_ORIGIN });

        const interceptor = getReentranceTicketAuthInterceptor({ provider, ejectCallback: () => 0 });
        expect(provider.defaults.baseURL).toBe(ORIGINAL_ORIGIN);

        await interceptor({ headers: new AxiosHeaders() });

        expect(provider.defaults.baseURL).toBe(API_ORIGIN);
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
        expect(Object.keys((provider.interceptors.request as any)['handlers']).length).toEqual(2);
        attachUaaAuthInterceptor(provider, service, refreshToken, callback);
        expect(Object.keys((provider.interceptors.request as any)['handlers']).length).toEqual(3);
    });
});
