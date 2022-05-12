import type { Options } from 'http-proxy-middleware';
import * as hpm from 'http-proxy-middleware';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import { getBackendProxy, enhanceConfigsForDestination } from '../../src/base/proxy';

// mock required btp-utils functions
import {
    listDestinations,
    getDestinationUrlForAppStudio,
    WebIDEUsage,
    getUserForDestinationService
} from '@sap-ux/btp-utils';
import { DestinationBackendConfig } from '../../src/base/types';
jest.mock('@sap-ux/btp-utils', () => ({
    ...(jest.requireActual('@sap-ux/btp-utils') as object),
    listDestinations: jest.fn(),
    getUserForDestinationService: jest.fn()
}));
const mockListDestinations = listDestinations as jest.Mock;
const mockGetUserForDestinationService = getUserForDestinationService as jest.Mock;

const createProxyMiddlewareSpy = jest.spyOn(hpm, 'createProxyMiddleware').mockImplementation(jest.fn());

describe('proxy', () => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'ui5-proxy-middleware' })]
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('enhanceConfigsForDestination', () => {
        const backend = {
            destination: '~destination',
            path: '/sap/xyz'
        };
        test('unknown destination', async () => {
            try {
                await enhanceConfigsForDestination({}, backend);
                fail('Unknown destination should have resulted in an error.');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        test('simple common destination', async () => {
            mockListDestinations.mockResolvedValueOnce({
                [backend.destination]: {}
            });
            const proxyOptions: Options = {};

            const authNeeded = await enhanceConfigsForDestination(proxyOptions, backend);
            expect(authNeeded).toBe(false);
            expect(proxyOptions.target).toBe(getDestinationUrlForAppStudio(backend.destination));
        });

        test('destination with authentication required', async () => {
            mockListDestinations.mockResolvedValueOnce({
                [backend.destination]: {
                    Authentication: 'NoAuthentication'
                }
            });
            const proxyOptions: Options = {};

            const authNeeded = await enhanceConfigsForDestination(proxyOptions, backend);
            expect(authNeeded).toBe(true);
        });

        test('destination with full url', async () => {
            mockListDestinations.mockResolvedValueOnce({
                [backend.destination]: {
                    Host: 'http://backend.example/sap',
                    WebIDEUsage: `${WebIDEUsage.ODATA_GENERIC},${WebIDEUsage.FULL_URL}`
                }
            });
            const proxyOptions: Options = {};
            const modifiedBackend: DestinationBackendConfig = { ...backend };

            await enhanceConfigsForDestination(proxyOptions, modifiedBackend);
            expect(proxyOptions.target).toBe(getDestinationUrlForAppStudio(backend.destination));
            expect(modifiedBackend.pathPrefix).toBe('/xyz');
        });

        test('destination provided by a destination service instance', async () => {
            mockListDestinations.mockResolvedValueOnce({
                [backend.destination]: {
                    Host: 'http://backend.example'
                }
            });
            const cred = '~base64EncodedCredentials';
            mockGetUserForDestinationService.mockResolvedValue(cred);
            const proxyOptions: Options = {};

            await enhanceConfigsForDestination(proxyOptions, {
                ...backend,
                destinationInstance: '~destinationInstance'
            });
            expect(proxyOptions.target).toBe(`https://${cred}@${backend.destination}.dest`);
        });
    });

    describe('getBackendProxy', () => {
        test.skip('TBD', () => {
            const backend = {} as any;
            const common = {} as any;

            getBackendProxy(backend, common, logger);
            expect(createProxyMiddlewareSpy).toHaveBeenCalledTimes(1);
        });
    });
});
