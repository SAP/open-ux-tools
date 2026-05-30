import { jest } from '@jest/globals';
import type { AddressInfo } from 'node:net';
import type http from 'node:http';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import nock from 'nock';

const mockOpen = jest.fn<any>();
jest.unstable_mockModule('open', () => ({
    __esModule: true,
    default: mockOpen
}));

const actualRedirect = await import('../../../src/auth/reentrance-ticket/redirect');
const mockSetupRedirectHandling = jest.fn<any>();
jest.unstable_mockModule('../../../src/auth/reentrance-ticket/redirect', () => ({
    ...actualRedirect,
    setupRedirectHandling: mockSetupRedirectHandling
}));

const { getReentranceTicket } = await import('../../../src/auth/reentrance-ticket');

describe('getReentranceTicket()', () => {
    const serverOrigin = 'http://some_url.example';
    const REDIRECT_URL = 'http://redirect_url.example';
    const serverListenSpy = jest.fn();

    beforeEach(() => {
        jest.resetAllMocks();
        mockSetupRedirectHandling.mockImplementation(({ resolve, backend }: any) => {
            resolve({ reentranceTicket: 'some_ticket', backend });
            return {
                server: {
                    listen: serverListenSpy,
                    address: () => {
                        return { port: 42 } as AddressInfo;
                    }
                } as unknown as http.Server,
                redirectUrl: () => REDIRECT_URL
            };
        });
        nock(serverOrigin)
            .get('/sap/public/bc/icf/virtualhost')
            .reply(200, { relatedUrls: { API: serverOrigin, UI: serverOrigin } });
    });

    it('sets up a server to listen for the redirect', async () => {
        await getReentranceTicket({
            backendUrl: serverOrigin,
            logger: new ToolsLogger({ transports: [new NullTransport()] })
        });
        expect(serverListenSpy).toHaveBeenCalledTimes(1);
    });

    it("attempts to open URL in user's default browser for SAML login", async () => {
        const result = await getReentranceTicket({
            backendUrl: serverOrigin,
            logger: new ToolsLogger({ transports: [new NullTransport()] })
        });
        expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining(REDIRECT_URL));
        // default SCENARIO is FTO1 if none provided via env variable
        expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining('FTO1'));
        expect(result).toEqual({ reentranceTicket: 'some_ticket', backend: expect.any(Object) });
    });

    it('Sets scenario from env variable', async () => {
        process.env.FIORI_TOOLS_SCENARIO = 'MYSCENARIO';
        await getReentranceTicket({
            backendUrl: serverOrigin,
            logger: new ToolsLogger({ transports: [new NullTransport()] })
        });
        expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining('MYSCENARIO'));
        delete process.env.FIORI_TOOLS_SCENARIO;
    });
});
