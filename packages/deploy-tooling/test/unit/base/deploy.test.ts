import prompts from 'prompts';
import { createTransportRequest, deploy, getCredentials, undeploy } from '../../../src/base/deploy';
import type { BackendSystemKey } from '@sap-ux/store';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import type { AbapDeployConfig, AbapTarget } from '../../../src/types';
import {
    mockedStoreService,
    mockIsAppStudio,
    mockedUi5RepoService,
    mockListDestinations,
    mockCreateForAbap,
    mockedAdtService
} from '../../__mocks__';
import { join } from 'path';
import type { Destination, ServiceInfo } from '@sap-ux/btp-utils';
import { readFileSync } from 'fs';

jest.setTimeout(360000);

describe('base/deploy', () => {
    const nullLogger = new ToolsLogger({ transports: [new NullTransport()] });
    const app: AbapDeployConfig['app'] = {
        name: '~name',
        description: '~description',
        package: '~package',
        transport: '~transport'
    };
    const target = {
        url: 'http://target.example',
        client: '001'
    };
    const credentials = { username: '~username', password: '~password' };

    describe('getCredentials', () => {
        test('AppStudio - no place to get credentials', async () => {
            mockIsAppStudio.mockReturnValueOnce(true);
            const credentials = await getCredentials(target);
            expect(credentials).toBeUndefined();
        });

        test('read credentials from store', async () => {
            mockIsAppStudio.mockReturnValue(false);
            const credentials = await getCredentials({ url: target.url });
            expect(credentials).toBeDefined();
        });

        test('fallback read without client parameter', async () => {
            mockIsAppStudio.mockReturnValue(false);
            mockedStoreService.read.mockImplementation((key: BackendSystemKey) =>
                key.getId().includes(target.client) ? undefined : {}
            );
            const credentials = await getCredentials(target);
            expect(credentials).toBeDefined();
        });
    });

    describe('deploy', () => {
        const archive = Buffer.from('TestData');
        const axiosError = (status: 401 | 412) => {
            return {
                isAxiosError: true,
                response: { status }
            };
        };

        beforeEach(() => {
            mockedUi5RepoService.deploy.mockReset();
            mockedAdtService.createTransportRequest.mockReset();
        });

        test('No errors locally with url', async () => {
            mockedStoreService.read.mockResolvedValueOnce(credentials);
            mockedUi5RepoService.deploy.mockResolvedValue(undefined);

            await deploy(archive, { app, target }, nullLogger);
            expect(mockedUi5RepoService.deploy).toBeCalledWith({
                archive,
                bsp: app,
                testMode: undefined,
                safeMode: undefined
            });
            mockedUi5RepoService.deploy.mockClear();

            await deploy(archive, { app, target, test: true, safe: false, credentials }, nullLogger);
            expect(mockedUi5RepoService.deploy).toBeCalledWith({ archive, bsp: app, testMode: true, safeMode: false });
            mockedUi5RepoService.deploy.mockClear();
            mockCreateForAbap.mockClear();

            const params = { hello: 'world' };
            await deploy(
                archive,
                { app, target: { ...target, params }, test: true, safe: false, credentials },
                nullLogger
            );
            expect(mockedUi5RepoService.deploy).toBeCalledWith({ archive, bsp: app, testMode: true, safeMode: false });
            expect(mockCreateForAbap).toBeCalledWith(expect.objectContaining({ params }));
        });

        test('Throw error in AppStudio if destination not found', async () => {
            const destination = '~destination';
            mockIsAppStudio.mockReturnValueOnce(true);
            mockListDestinations.mockReturnValue({});
            mockedUi5RepoService.deploy.mockResolvedValue(undefined);
            try {
                await deploy(archive, { app, target: { destination } }, nullLogger);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toStrictEqual(new Error(`Destination ${destination} not found on subaccount`));
            }
            expect(mockedUi5RepoService.deploy).not.toBeCalledWith();
        });

        test('No errors in AppStudio with destinations', async () => {
            const destination = 'testDestination';
            mockIsAppStudio.mockReturnValueOnce(true);
            mockListDestinations.mockReturnValue({ testDestination: { Name: destination } as Destination });
            mockedUi5RepoService.deploy.mockResolvedValue(undefined);
            await deploy(archive, { app, target: { destination, service: '/bc/my/service' } }, nullLogger);
            expect(mockedUi5RepoService.deploy).toBeCalledWith({
                archive,
                bsp: app,
                testMode: undefined,
                safeMode: undefined
            });
        });

        test('No errors locally with ABAP on BTP', async () => {
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
            mockedStoreService.read.mockResolvedValueOnce(credentials);
            mockedUi5RepoService.deploy.mockResolvedValue(undefined);
            await deploy(archive, { app, target: { ...target, cloud: true } }, nullLogger);
            expect(mockedUi5RepoService.deploy).toBeCalledWith({
                archive,
                bsp: app,
                testMode: undefined,
                safeMode: undefined
            });
        });

        test('Provide service key for ABAP on BTP as input', async () => {
            mockedUi5RepoService.deploy.mockResolvedValue(undefined);
            const serviceKey: ServiceInfo = JSON.parse(
                readFileSync(join(__dirname, '../../test-input/service-keys.json'), 'utf-8')
            );
            await deploy(archive, { app, target: { ...target, cloud: true, serviceKey } }, nullLogger);
            expect(mockedUi5RepoService.deploy).toBeCalledWith({
                archive,
                bsp: app,
                testMode: undefined,
                safeMode: undefined
            });
        });

        test('Handle missing service keys with ABAP on BTP', async () => {
            mockedStoreService.read.mockResolvedValue(undefined);
            mockedUi5RepoService.deploy.mockResolvedValue(undefined);
            prompts.inject([join(__dirname, '../../test-input/service-keys.json')]);
            await deploy(archive, { app, target: { ...target, cloud: true } }, nullLogger);
            expect(mockedUi5RepoService.deploy).toBeCalledWith({
                archive,
                bsp: app,
                testMode: undefined,
                safeMode: undefined
            });
        });

        test('Throws error when cloud system read from store but cloud target is not specified in params', async () => {
            mockedUi5RepoService.deploy.mockResolvedValue(undefined);
            await deploy(archive, { app, target, yes: true }, nullLogger);
            mockedStoreService.read.mockResolvedValueOnce({
                serviceKeys: {
                    'uaa': {},
                    'url': 'https://mock-url.com'
                }
            });

            try {
                await deploy(archive, { app, target, yes: true }, nullLogger);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBe(
                    'This is an ABAP Cloud system, please add the --cloud arg to ensure the correct deployment flow.'
                );
            }
        });

        test('Successful retry after known axios error', async () => {
            mockedUi5RepoService.deploy.mockResolvedValue(undefined);
            mockedUi5RepoService.deploy.mockRejectedValueOnce(axiosError(412));
            await deploy(archive, { app, target, yes: true }, nullLogger);
            mockedUi5RepoService.deploy.mockRejectedValueOnce(axiosError(401));
            prompts.inject(['~username', '~password']);
            await deploy(archive, { app, target, yes: true }, nullLogger);
        });

        test('Successful retry after known axios error (cloud target)', async () => {
            const configCloud = {
                app,
                target: {
                    cloud: true,
                    serviceKey: {
                        uaa: {
                            username: '~username',
                            password: '~password',
                            clientid: '~client',
                            clientsecret: '~clientsecret',
                            url: '~url'
                        }
                    },
                    url: '~targetUrl'
                } as AbapTarget,
                yes: true
            };

            mockedUi5RepoService.deploy.mockRejectedValueOnce(axiosError(401));
            prompts.inject(['~uaa-username', '~uaa-password']);

            await deploy(archive, configCloud, nullLogger);

            expect(configCloud.target.serviceKey?.uaa).toEqual({
                username: '~uaa-username',
                password: '~uaa-password',
                clientid: '~client',
                clientsecret: '~clientsecret',
                url: '~url'
            });

            expect(mockedUi5RepoService.deploy).toBeCalledWith({
                archive,
                bsp: app,
                testMode: undefined,
                safeMode: undefined
            });
        });

        test('Axios Error and no retry', async () => {
            const sameIdError = axiosError(412);
            mockedUi5RepoService.deploy.mockRejectedValueOnce(sameIdError);
            try {
                await deploy(archive, { app, target, retry: false }, nullLogger);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBe(sameIdError);
            }
        });

        test('Throw error after retries', async () => {
            const sameIdError = axiosError(412);
            mockedUi5RepoService.deploy.mockRejectedValue(sameIdError);
            try {
                await deploy(archive, { app, target, yes: true }, nullLogger);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBe(sameIdError);
            }
        });

        test('Throw unknown error', async () => {
            const unknownError = new Error();
            mockedUi5RepoService.deploy.mockRejectedValue(unknownError);
            try {
                await deploy(archive, { app, target }, nullLogger);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBe(unknownError);
            }
        });

        test('Creates new transport request during deployment and reset createTransport param', async () => {
            mockedStoreService.read.mockResolvedValueOnce(credentials);
            mockedUi5RepoService.deploy.mockResolvedValue(undefined);
            mockedAdtService.createTransportRequest.mockResolvedValueOnce('~transport123');
            const config = { app, target, test: true, safe: false, credentials, createTransport: true };
            await deploy(archive, config, nullLogger);
            expect(mockedUi5RepoService.deploy).toBeCalledWith({
                archive,
                bsp: { ...app, transport: '~transport123' },
                testMode: true,
                safeMode: false
            });
            expect(config.createTransport).toBe(false);
            expect(mockedAdtService.createTransportRequest).toBeCalledTimes(1);
        });

        test('Throws error if transport is not returned from ADT service', async () => {
            mockedAdtService.createTransportRequest.mockResolvedValueOnce(undefined);

            try {
                await deploy(
                    archive,
                    { app, target, test: true, safe: false, credentials, createTransport: true },
                    nullLogger
                );
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Transport request could not be created for application ~name.');
            }
            expect(mockedAdtService.createTransportRequest).toBeCalledTimes(1);
        });

        test('Throws error creating new transport request during deployment', async () => {
            mockedStoreService.read.mockResolvedValueOnce(credentials);
            mockedUi5RepoService.deploy.mockResolvedValue(undefined);
            mockedAdtService.createTransportRequest.mockRejectedValueOnce(new Error('ADT Service Not Found'));

            try {
                await deploy(
                    archive,
                    { app, target, test: true, safe: false, credentials, createTransport: true },
                    nullLogger
                );
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('ADT Service Not Found');
            }
            expect(mockedAdtService.createTransportRequest).toBeCalledTimes(1);
        });
    });

    describe('undeploy', () => {
        test('No errors', async () => {
            mockedUi5RepoService.undeploy.mockResolvedValue({});
            await undeploy({ app, target }, nullLogger);
            expect(mockedUi5RepoService.undeploy).toBeCalledWith({ bsp: app, testMode: undefined });
            await undeploy({ app, target, test: true }, nullLogger);
            expect(mockedUi5RepoService.undeploy).toBeCalledWith({ bsp: app, testMode: true });
        });
    });

    describe('createTransportRequest', () => {
        test('Returns a new transport request during deployment', async () => {
            mockedAdtService.createTransportRequest.mockResolvedValueOnce('~transport123');
            const transportRequest = await createTransportRequest({ app, target }, nullLogger);
            expect(transportRequest).toBe('~transport123');
        });
    });
});
