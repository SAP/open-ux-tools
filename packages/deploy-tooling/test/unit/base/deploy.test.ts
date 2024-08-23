import prompts from 'prompts';
import AdmZip from 'adm-zip';
import { join } from 'path';
import { createTransportRequest, deploy, undeploy } from '../../../src/base/deploy';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import {
    mockedStoreService,
    mockedUi5RepoService,
    mockCreateForAbap,
    mockedAdtService,
    mockedLrepService
} from '../../__mocks__';
import { SummaryStatus } from '../../../src/base/validate';
import * as validate from '../../../src/base/validate';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { AbapTarget } from '@sap-ux/system-access';
import type { AbapDeployConfig } from '../../../src/types';

const validateBeforeDeployMock = jest.spyOn(validate, 'validateBeforeDeploy');
const showAdditionalInfoForOnPremMock = jest.spyOn(validate, 'showAdditionalInfoForOnPrem');

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
            mockedLrepService.deploy.mockReset();
            mockedAdtService.createTransportRequest.mockReset();
            validateBeforeDeployMock.mockReset();
            jest.clearAllMocks();
            jest.restoreAllMocks();
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
            expect(mockedUi5RepoService.deploy).toBeCalledWith({
                archive,
                bsp: app,
                testMode: true,
                safeMode: false
            });
            mockedUi5RepoService.deploy.mockClear();
            mockCreateForAbap.mockClear();

            const params = { hello: 'world' };
            await deploy(
                archive,
                { app, target: { ...target, params }, test: true, safe: false, credentials },
                nullLogger
            );
            expect(mockedUi5RepoService.deploy).toBeCalledWith({
                archive,
                bsp: app,
                testMode: true,
                safeMode: false
            });
            expect(mockCreateForAbap).toBeCalledWith(expect.objectContaining({ params }));
        });

        test('Log validation summaries regardless of validation result', async () => {
            const formatSummaryMock = jest.spyOn(validate, 'formatSummary');
            mockedStoreService.read.mockResolvedValueOnce(credentials);
            mockedUi5RepoService.deploy.mockResolvedValue(undefined);
            validateBeforeDeployMock.mockResolvedValueOnce({
                result: true,
                summary: [{ message: 'Test', status: SummaryStatus.Valid }]
            });

            await deploy(archive, { app, target }, nullLogger);
            expect(mockedUi5RepoService.deploy).toBeCalledWith({
                archive,
                bsp: app,
                testMode: undefined,
                safeMode: undefined
            });
            mockedUi5RepoService.deploy.mockClear();

            await deploy(archive, { app, target, test: true, safe: false, credentials }, nullLogger);
            expect(mockedUi5RepoService.deploy).toBeCalledWith({
                archive,
                bsp: app,
                testMode: true,
                safeMode: false
            });
            mockedUi5RepoService.deploy.mockClear();
            mockCreateForAbap.mockClear();

            const params = { hello: 'world' };
            await deploy(
                archive,
                { app, target: { ...target, params }, test: true, safe: false, credentials },
                nullLogger
            );
            expect(mockedUi5RepoService.deploy).toBeCalledWith({
                archive,
                bsp: app,
                testMode: true,
                safeMode: false
            });
            expect(mockCreateForAbap).toBeCalledWith(expect.objectContaining({ params }));
            expect(formatSummaryMock).toHaveBeenCalled();
        });

        test('Successful retry after known axios error', async () => {
            mockCreateForAbap.mockClear();
            mockedUi5RepoService.deploy.mockResolvedValue(undefined);
            mockedUi5RepoService.deploy.mockRejectedValueOnce(axiosError(412));
            await deploy(archive, { app, target, yes: true }, nullLogger);
            mockedUi5RepoService.deploy.mockRejectedValueOnce(axiosError(401));
            prompts.inject(['~username', '~password']);
            const warnSpy = jest.spyOn(nullLogger, 'warn');
            const infoSpy = jest.spyOn(nullLogger, 'info');
            await deploy(archive, { app, target, yes: true }, nullLogger);
            expect(mockCreateForAbap).toBeCalledWith(
                expect.objectContaining({ auth: { password: '~password', username: '~username' } })
            );
            expect(mockCreateForAbap).toBeCalledTimes(3);
            expect(warnSpy).toBeCalledTimes(3);
            expect(infoSpy).toBeCalledTimes(4);
        });

        test('Successful retry after known axios error (cloud target)', async () => {
            const configCloud = {
                app,
                target: {
                    scp: true,
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

        test('Handle 401 error with unsupported authentication type', async () => {
            const checkForCredentialsMock = jest.spyOn(validate, 'checkForCredentials').mockResolvedValue(true);
            const sameIdError = axiosError(401);
            mockedUi5RepoService.deploy.mockRejectedValueOnce(sameIdError);
            checkForCredentialsMock.mockResolvedValue(false);
            const warnSpy = jest.spyOn(nullLogger, 'warn');
            const infoSpy = jest.spyOn(nullLogger, 'info');
            try {
                await deploy(
                    archive,
                    { app, target: { ...target, destination: '~SAMLAssertionDestination' }, yes: true, retry: true },
                    nullLogger
                );
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBe(sameIdError);
            }
            expect(warnSpy).toBeCalledTimes(2);
            expect(infoSpy).toBeCalledTimes(1);
            expect(checkForCredentialsMock).toBeCalledTimes(1);
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
            expect(mockedAdtService.createTransportRequest).toBeCalledWith(
                expect.objectContaining({ description: 'For ABAP repository ~name, created by SAP Open UX Tools' })
            );
        });

        test('should truncate transport request description', async () => {
            const createTransportRequestMock = jest.fn();
            createTransportRequestMock.mockResolvedValueOnce('~transport123');
            const mockProvider = {
                getAdtService: () => {
                    return {
                        createTransportRequest: createTransportRequestMock
                    };
                }
            };

            const tr = await createTransportRequest(
                {
                    app: {
                        name: 'app-name-with-extra-chars',
                        package: 'package1'
                    }
                } as AbapDeployConfig,
                nullLogger,
                mockProvider as unknown as AbapServiceProvider
            );

            expect(tr).toBe('~transport123');
            expect(createTransportRequestMock).toBeCalledWith(
                expect.objectContaining({
                    description: 'For ABAP repository app-name-with-extra-chars, created by...'
                })
            );
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
        test('additional info logged', async () => {
            jest.spyOn(nullLogger, 'info');
            showAdditionalInfoForOnPremMock.mockResolvedValue(true);
            await deploy(archive, { app, target }, nullLogger);
            expect(nullLogger.info).toHaveBeenCalledTimes(2);
        });

        describe('adaptation projects', () => {
            const adpArchive = new AdmZip();
            adpArchive.addLocalFolder(join(__dirname, '../../fixtures/adp/webapp'));

            test('No errors deploying to LREP', async () => {
                mockedStoreService.read.mockResolvedValueOnce(credentials);
                mockedLrepService.deploy.mockResolvedValue(undefined);

                await deploy(adpArchive.toBuffer(), { app: {}, target }, nullLogger);
                expect(mockedLrepService.deploy).toBeCalledWith(expect.any(Buffer), {
                    layer: 'VENDOR',
                    namespace: 'apps/sap.ui.demoapps.rta.fiorielements/appVariants/adp.example/'
                });
            });

            test('Test mode not supporterd in LREP', async () => {
                try {
                    await deploy(adpArchive.toBuffer(), { app: {}, target, test: true }, nullLogger);
                    fail('Should have thrown an error');
                } catch (error) {
                    expect(error.message).toMatch(/test mode not supported/);
                }
            });

            test('Not an adaptation project but no app name provided', async () => {
                try {
                    await deploy(archive, { app: {}, target }, nullLogger);
                    fail('Should have thrown an error');
                } catch (error) {
                    expect(error.message).toMatch(/Invalid deployment configuration/);
                }
            });
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
