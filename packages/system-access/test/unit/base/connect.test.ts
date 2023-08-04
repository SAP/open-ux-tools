import { createAbapServiceProvider } from '../../../src/base/connect';
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

    describe('createProvider', () => {
        test('on-premise url', async () => {
            mockedStoreService.read.mockResolvedValueOnce({
                username: '~user',
                password: '~pass'
            });
            expect(await createAbapServiceProvider(target, undefined, true, logger)).toBeDefined();
        });
        test('steampunk url', async () => {
            mockedStoreService.read.mockResolvedValueOnce({
                serviceKeys: {
                    uaa: { clientid: 'id', clientsecret: 'secret', url: 'url' }
                }
            });
            expect(
                await createAbapServiceProvider({ ...target, cloud: true }, { ignoreCertErrors: true }, false, logger)
            ).toBeDefined();
        });
    });
});
