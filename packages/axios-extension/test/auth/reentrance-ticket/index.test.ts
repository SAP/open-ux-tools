import * as redirect from '../../../src/auth/reentrance-ticket/redirect';
import type { AddressInfo } from 'net';
import type http from 'http';
import { getReentranceTicket } from '../../../src/auth/reentrance-ticket';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import open = require('open');

jest.mock('open');
const mockOpen = jest.mocked(open);

describe('getReentranceTicket()', () => {
    const REDIRECT_URL = 'http://redirect_url.example';
    const serverListenSpy = jest.fn();

    beforeEach(() => {
        jest.resetAllMocks();
        jest.spyOn(redirect, 'setupRedirectHandling').mockImplementation(({ resolve }) => {
            process.nextTick(() => resolve());
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
    });

    it('sets up a server to listen for the redirect', async () => {
        await getReentranceTicket({
            backendUrl: 'http://some_url.example',
            logger: new ToolsLogger({ transports: [new NullTransport()] })
        });
        expect(serverListenSpy).toBeCalledTimes(1);
    });

    it("attempts to open URL in user's default browser for SAML login", async () => {
        await getReentranceTicket({
            backendUrl: 'http://some_url.example',
            logger: new ToolsLogger({ transports: [new NullTransport()] })
        });
        expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining(REDIRECT_URL));
    });
});
