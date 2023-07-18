import { createProvider, getCredentials } from '../../../src/preview/service';
import type { BackendSystemKey } from '@sap-ux/store';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';

jest.mock('@sap-ux/btp-utils', () => {
    return {
        ...jest.requireActual('@sap-ux/btp-utils'),
        isAppStudio: jest.fn().mockReturnValue(false)
    };
});

const mockedStoreService = {
    read: jest.fn().mockReturnValue({})
};
jest.mock('@sap-ux/store', () => {
    return {
        ...jest.requireActual('@sap-ux/store'),
        getService: jest.fn().mockImplementation(() => Promise.resolve(mockedStoreService))
    };
});

describe('service', () => {
    const logger = new ToolsLogger({ transports: [new NullTransport()] });
    const target = {
        url: 'http://target.example',
        client: '001'
    };

    describe('getCredentials', () => {
        test('read credentials from store', async () => {
            const credentials = await getCredentials({ url: target.url });
            expect(credentials).toBeDefined();
        });

        test('fallback read without client parameter', async () => {
            mockedStoreService.read.mockImplementation((key: BackendSystemKey) =>
                key.getId().includes(target.client) ? undefined : {}
            );
            const credentials = await getCredentials(target);
            expect(credentials).toBeDefined();
        });
    });

    describe('createProvider', () => {
        test('on-premise url', async () => {
            mockedStoreService.read.mockResolvedValueOnce({
                username: '~user',
                password: '~pass'
            });
            expect(await createProvider({ target }, logger)).toBeDefined();
        });
        test('steampunk url', async () => {
            mockedStoreService.read.mockResolvedValueOnce({
                serviceKeys: {
                    uaa: { clientid: 'id', clientsecret: 'secret', url: 'url' }
                }
            });
            expect(await createProvider({ target: { ...target, scp: true } }, logger)).toBeDefined();
        });
    });
});
