import { jest } from '@jest/globals';
import {
    mockedStoreService,
    mockIsAppStudio,
    mockListDestinations,
    mockReadFileSync,
    mockCreateForAbap,
    mockCreateForAbapOnCloud,
    mockCreateForDestination,
    MockToolsLogger,
    MockNullTransport
} from '../../__mocks__';
import type { Destination } from '@sap-ux/btp-utils';
import type { AbapTarget } from '../../../src/types';

// Dynamic imports after mocks are set up
const { AuthenticationType } = await import('@sap-ux/store');
const { default: prompts } = await import('prompts');
const { createAbapServiceProvider, isUrlTarget } = await import('../../../src/base/connect');

/**
 * Create a mock ABAP service provider with the given options.
 *
 * @param options provider options
 * @returns mock provider
 */
function createMockProvider(options: any = {}): any {
    const interceptors = {
        response: {
            use: jest.fn(),
            eject: jest.fn()
        }
    };
    return {
        defaults: { ...options, params: options.params ?? {} },
        interceptors,
        getAtoInfo: jest.fn(),
        request: jest.fn()
    };
}

describe('connect', () => {
    const logger = new MockToolsLogger({ transports: [new MockNullTransport()] }) as any;
    const target = {
        url: 'http://target.example',
        client: '001'
    };
    const username = '~user';
    const password = '~pass';

    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateForAbap.mockImplementation((opts: any) => createMockProvider(opts));
        mockCreateForAbapOnCloud.mockImplementation((opts: any) => createMockProvider(opts));
        mockCreateForDestination.mockImplementation((opts: any) => createMockProvider(opts));
    });

    describe('createProvider', () => {
        beforeAll(() => {
            mockIsAppStudio.mockReturnValue(false);
        });

        beforeEach(() => {
            delete process.env.FIORI_TOOLS_USER;
            delete process.env.FIORI_TOOLS_PASSWORD;
        });

        describe('ABAP on-premise', () => {
            test('credentials available from store', async () => {
                process.env.FIORI_TOOLS_USER = '~ignoredusername';
                process.env.FIORI_TOOLS_PASSWORD = '~ignoredpassword';
                mockedStoreService.read.mockResolvedValueOnce({ username, password });
                const provider = await createAbapServiceProvider(target, undefined, true, logger);
                expect(provider).toBeDefined();
                expect(provider.defaults.auth?.username).toBe(username);
                expect(provider.defaults.auth?.password).toBe(password);
            });

            test('use credentials from CI/CD env variables', async () => {
                process.env.FIORI_TOOLS_USER = username;
                process.env.FIORI_TOOLS_PASSWORD = password;
                const provider = await createAbapServiceProvider(target, undefined, true, logger);
                expect(provider).toBeDefined();
                expect(provider.defaults.auth?.username).toBe(username);
                expect(provider.defaults.auth?.password).toBe(password);
            });

            test('prompt credentials if not available in store', async () => {
                prompts.inject([AuthenticationType.Basic, username, password]);
                const provider = await createAbapServiceProvider(target, undefined, true, logger);
                expect(provider).toBeDefined();
                expect(process.env.FIORI_TOOLS_USER).toBe(username);
                expect(process.env.FIORI_TOOLS_PASSWORD).toBe(password);
            });

            test('prompt S/4Cloud system if not available in store', async () => {
                prompts.inject([AuthenticationType.ReentranceTicket]);
                const provider = await createAbapServiceProvider({ ...target }, undefined, true, logger);
                expect(provider).toBeDefined();
            });

            test('invalid target', async () => {
                try {
                    await createAbapServiceProvider({ destination: '~destination' }, undefined, true, logger);
                    fail('Should have thrown an error');
                } catch (error) {
                    expect((error as Error).message).toBe(
                        'Unable to handle the configuration in the current environment.'
                    );
                }
            });
        });

        describe('ABAP on BTP', () => {
            const credentials = {
                serviceKeys: {
                    uaa: {
                        clientid: '~client',
                        clientsecret: '~clientsecret',
                        url: target.url
                    }
                },
                url: target.url
            };

            test('valid configuration', async () => {
                mockedStoreService.read.mockResolvedValueOnce(credentials);
                const provider = await createAbapServiceProvider({ ...target, scp: true }, undefined, true, logger);
                expect(provider).toBeDefined();
            });

            test('provide service key as input', async () => {
                const provider = await createAbapServiceProvider(
                    {
                        ...target,
                        scp: true,
                        serviceKey: credentials.serviceKeys as AbapTarget['serviceKey']
                    },
                    undefined,
                    true,
                    logger
                );
                expect(provider).toBeDefined();
            });

            test('handle missing service keys', async () => {
                mockReadFileSync.mockReturnValueOnce(JSON.stringify(credentials.serviceKeys));
                prompts.inject(['/a/mocked/path/service-keys.json']);
                const provider = await createAbapServiceProvider({ ...target, scp: true }, undefined, true, logger);
                expect(provider).toBeDefined();
            });

            test('missing service keys and no prompt leads to error', async () => {
                try {
                    await createAbapServiceProvider({ ...target, scp: true }, undefined, false, logger);
                    fail('Should have thrown an error');
                } catch (error) {
                    expect((error as Error).message).toBe('Service keys required for ABAP Cloud environment.');
                }
            });

            test('throw error when cloud system read from store but cloud target is not specified in params', async () => {
                mockedStoreService.read.mockResolvedValueOnce(credentials);
                try {
                    await createAbapServiceProvider({ ...target, scp: false }, undefined, false, logger);
                    fail('Should have thrown an error');
                } catch (error) {
                    expect((error as Error).message).toBe(
                        'This is an ABAP Cloud system, please correct your configuration.'
                    );
                }
            });
        });

        describe('AppStudio', () => {
            beforeAll(() => {
                mockIsAppStudio.mockReturnValue(true);
            });

            afterAll(() => {
                mockIsAppStudio.mockReturnValue(false);
            });

            test('valid destination', async () => {
                const destination = 'testDestination';
                mockListDestinations.mockReturnValue({ testDestination: { Name: destination } as Destination });
                const provider = await createAbapServiceProvider({ destination }, undefined, false, logger);
                expect(provider).toBeDefined();
            });

            test('valid destination but auth required', async () => {
                const destination = {
                    Name: 'testdestination',
                    'sap-platform': 'abap'
                } as Destination;
                mockListDestinations.mockReturnValue({ [destination.Name]: destination });

                // Set up mock provider that simulates 401 -> retry with auth
                const mockProvider = createMockProvider();
                mockProvider.interceptors.response.use.mockImplementation(
                    (_onFulfilled: any, onRejected: any) => {
                        // Store the error handler for later invocation
                        mockProvider._onRejected = onRejected;
                        return 0;
                    }
                );
                mockCreateForDestination.mockReturnValue(mockProvider);

                const provider = await createAbapServiceProvider(
                    { destination: destination.Name },
                    undefined,
                    true,
                    logger
                );

                // Simulate the 401 error that triggers auth prompt
                prompts.inject([username, password]);
                const error401 = { response: { status: 401 }, config: {} };
                await provider._onRejected(error401);
                expect(provider.defaults.auth).toStrictEqual({ username, password });
            });

            test('error if destination not found', async () => {
                const destination = '~destination';
                mockListDestinations.mockReturnValue({});
                try {
                    await createAbapServiceProvider({ destination }, undefined, false, logger);
                    fail('Should have thrown an error');
                } catch (error) {
                    expect(error).toStrictEqual(new Error(`Destination ${destination} not found on subaccount`));
                }
            });
        });
    });

    describe('isUrlTarget', () => {
        test('validate input parameters', () => {
            expect(isUrlTarget(target)).toBe(true);
            expect(isUrlTarget({} as AbapTarget)).toBe(false);
        });
    });
});
