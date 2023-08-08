import prompts from 'prompts';
import { createTransportRequest, deploy, undeploy } from '../../../src/base/deploy';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import type { AbapDeployConfig, AbapTarget } from '../../../src/types';
import { mockedStoreService, mockedUi5RepoService, mockCreateForAbap, mockedAdtService } from '../../__mocks__';

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

        test('Successful retry after known axios error', async () => {
            mockedUi5RepoService.deploy.mockResolvedValue(undefined);
            mockedUi5RepoService.deploy.mockRejectedValueOnce(axiosError(412));
            await deploy(archive, { app, target, yes: true }, nullLogger);
            mockedUi5RepoService.deploy.mockRejectedValueOnce(axiosError(401));
            prompts.inject(['~username', '~password']);
            await deploy(archive, { app, target, yes: true }, nullLogger);
            expect(mockCreateForAbap).toBeCalledWith(
                expect.objectContaining({ auth: { password: '~password', username: '~username' } })
            );
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
        beforeEach(() => {
            mockedUi5RepoService.undeploy.mockReset();
            mockedAdtService.createTransportRequest.mockReset();
        });
        test('No errors', async () => {
            mockedUi5RepoService.undeploy.mockResolvedValue({});
            await undeploy({ app, target }, nullLogger);
            expect(mockedUi5RepoService.undeploy).toBeCalledWith({ bsp: app, testMode: undefined });
            await undeploy({ app, target, test: true }, nullLogger);
            expect(mockedUi5RepoService.undeploy).toBeCalledWith({ bsp: app, testMode: true });
        });

        test('Creates new transport request during undeployment and reset createTransport param', async () => {
            mockedStoreService.read.mockResolvedValueOnce(credentials);
            mockedUi5RepoService.undeploy.mockResolvedValue(undefined);
            mockedAdtService.createTransportRequest.mockResolvedValueOnce('~transport123');
            const config = { app, target, createTransport: true };
            await undeploy(config, nullLogger);
            expect(mockedUi5RepoService.undeploy).toBeCalledWith({
                bsp: { ...app, transport: '~transport123' },
                testMode: undefined
            });
            expect(config.createTransport).toBe(false);
            expect(mockedAdtService.createTransportRequest).toBeCalledTimes(1);
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
