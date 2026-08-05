import { create } from '@sap-ux/axios-extension';
import { discoverHttpsEndpoint } from '../../../src/utils/abapEndpointDiscovery';

jest.mock('@sap-ux/axios-extension', () => ({
    create: jest.fn()
}));

const createMock = create as jest.Mock;

const LOGON_RESPONSE = [
    'version 1.0',
    'app_SID_00',
    'HTTP\tapp.example.com\t50000\t',
    'HTTPS\tapp.example.com\t44300\t'
].join('\n');

/**
 * Builds a fake axios-extension provider whose `get` is driven by a handler that maps
 * (baseURL, path) to either a text body or an HTTP status. Faithfully models the real
 * `create()`: because it forces `validateStatus: status < 400`, any status >= 400 is THROWN
 * as an AxiosError-like error carrying `response.status` (rather than resolved).
 *
 * @param handler - returns `{ data }` for text GETs or `{ status }` for status GETs, or throws
 * @returns a create() implementation
 */
function fakeProvider(handler: (baseURL: string, path: string) => { data?: string; status?: number }) {
    return (config: { baseURL: string }) => ({
        get: async (path: string) => {
            const result = handler(config.baseURL, path);
            const status = result.status ?? 200;
            if (status >= 400) {
                // Mirror axios-extension: >=400 rejects with an error carrying the response.
                throw Object.assign(new Error(`Request failed with status code ${status}`), {
                    response: { status }
                });
            }
            return { data: result.data ?? '', status };
        }
    });
}

describe('discoverHttpsEndpoint', () => {
    afterEach(() => jest.clearAllMocks());

    it('resolves the HTTPS endpoint from the message server logon list', async () => {
        createMock.mockImplementation(
            fakeProvider((baseURL, path) => {
                // Message server HTTP port bootstrap: only 8101 answers the logon list.
                if (path === '/msgserver/text/logon') {
                    if (baseURL === 'http://msg.example.com:8101') {
                        return { data: LOGON_RESPONSE };
                    }
                    throw new Error('connection refused');
                }
                // ADT ping verification of the advertised HTTPS app server.
                if (baseURL === 'https://app.example.com:44300') {
                    return { status: 401 };
                }
                throw new Error('connection refused');
            })
        );

        const endpoint = await discoverHttpsEndpoint('msg.example.com', '000');

        expect(endpoint).toEqual({
            url: 'https://app.example.com:44300',
            host: 'app.example.com',
            port: '44300'
        });
    });

    it('brute-forces common HTTPS ports when the message server list is unreachable', async () => {
        createMock.mockImplementation(
            fakeProvider((baseURL, path) => {
                // Message server logon endpoint never answers on any port.
                if (path === '/msgserver/text/logon') {
                    throw new Error('connection refused');
                }
                // Only the standard HTTPS port 44300 answers the ADT ping.
                if (baseURL === 'https://msg.example.com:44300') {
                    return { status: 200 };
                }
                throw new Error('connection refused');
            })
        );

        const endpoint = await discoverHttpsEndpoint('msg.example.com', '000');

        expect(endpoint).toEqual({
            url: 'https://msg.example.com:44300',
            host: 'msg.example.com',
            port: '44300'
        });
    });

    it('returns undefined when nothing responds', async () => {
        createMock.mockImplementation(
            fakeProvider(() => {
                throw new Error('connection refused');
            })
        );

        const endpoint = await discoverHttpsEndpoint('unreachable.host', '000');

        expect(endpoint).toBeUndefined();
    });
});
