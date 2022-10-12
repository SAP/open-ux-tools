import { ServiceProvider } from '../../src/base/service-provider';
import { getReentranceTicketAuthInterceptor } from '../../src/auth';
import * as rt from '../../src/auth/reentrance-ticket';
import type { AxiosRequestConfig } from 'axios';

describe('getReentranceTicketAuthInterceptor', () => {
    const getReentranceTicketSpy = jest.spyOn(rt, 'getReentranceTicket');

    it('adds reentrance ticket to the header', async () => {
        const REENTRANCE_TICKET_VALUE = 'a_reentrance_ticket';
        getReentranceTicketSpy.mockResolvedValueOnce({ reentranceTicket: REENTRANCE_TICKET_VALUE });
        const provider = new ServiceProvider({ baseURL: 'base_url.example' });
        const request: AxiosRequestConfig = {};

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

        await interceptor({});

        expect(provider.defaults.baseURL).toBe(API_URL);
    });

    it('calls eject after running once', async () => {
        const provider = new ServiceProvider({ baseURL: 'base_url.example' });
        const ejectCallback = jest.fn();
        getReentranceTicketSpy.mockResolvedValueOnce({ reentranceTicket: 'foo' });

        const interceptor = getReentranceTicketAuthInterceptor({ provider, ejectCallback });
        await interceptor({});

        expect(ejectCallback).toBeCalledTimes(1);
    });
});
