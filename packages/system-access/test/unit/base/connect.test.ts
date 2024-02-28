import { createAbapServiceProvider, isUrlTarget } from '../../../src/base/connect';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { mockedStoreService, mockIsAppStudio, mockListDestinations, mockReadFileSync } from '../../__mocks__';
import type { Destination } from '@sap-ux/btp-utils';
import type { AbapTarget } from '../../../src/types';
import prompts from 'prompts';

describe('service', () => {
    const logger = new ToolsLogger({ transports: [new NullTransport()] });
    const target = {
        url: 'http://target.example',
        client: '001'
    };
    const username = '~user';
    const password = '~pass';

    describe('createProvider', () => {
        beforeAll(() => {
            mockIsAppStudio.mockReturnValue(false);
        });

        describe('ABAP on-premise', () => {
            test('credentials available from store', async () => {
                mockedStoreService.read.mockResolvedValueOnce({ username, password });
                const provider = await createAbapServiceProvider(target, undefined, true, logger);
                expect(provider).toBeDefined();
            });

            test('prompt credentials if not available in store', async () => {
                prompts.inject([username, password]);
                const provider = await createAbapServiceProvider(target, undefined, true, logger);
                expect(provider).toBeDefined();
                expect(process.env.FIORI_TOOLS_USER).toBe(username);
                expect(process.env.FIORI_TOOLS_PASSWORD).toBe(password);
            });

            test('invalid target', async () => {
                try {
                    await createAbapServiceProvider({ destination: '~destination' }, undefined, true, logger);
                    fail('Should have thrown an error');
                } catch (error) {
                    expect(error.message).toBe('Unable to handle the configuration in the current environment.');
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
                    expect(error.message).toBe('Service keys required for ABAP Cloud environment.');
                }
            });

            test('throw error when cloud system read from store but cloud target is not specified in params', async () => {
                mockedStoreService.read.mockResolvedValueOnce(credentials);
                try {
                    await createAbapServiceProvider({ ...target, scp: false }, undefined, true, logger);
                    fail('Should have thrown an error');
                } catch (error) {
                    expect(error.message).toBe('This is an ABAP Cloud system, please correct your configuration.');
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
