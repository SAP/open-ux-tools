import nock from 'nock';
import type { AppInfo, AbapServiceProvider, ErrorMessage } from '../../src';
import { Ui5AbapRepositoryService, createForAbap, createForDestination } from '../../src';
import mockErrorDetails from './mockResponses/errordetails.json';
import type { ToolsLogger } from '@sap-ux/logger';
import * as Logger from '@sap-ux/logger';
import { WebIDEUsage as WebIDEUsageType, type Destination } from '@sap-ux/btp-utils';
import { type AxiosRequestConfig, type AxiosResponse } from 'axios';

const loggerMock: ToolsLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
} as Partial<ToolsLogger> as ToolsLogger;

jest.spyOn(Logger, 'ToolsLogger').mockImplementation(() => loggerMock);

describe('Ui5AbapRepositoryService', () => {
    const server = 'http://sap.example';
    const validApp = 'VALID_APP';
    const validAppNs = '/NS/VALID_APP';
    const notExistingApp = 'NOT_EXISTING_APP';
    const restrictedApp = 'RESTRICTED_APP';
    const validAppInfo: AppInfo = {
        Name: validApp,
        Package: 'my_package',
        ZipArchive: 'EncodeZippedDataHere'
    };
    const updateParams = `CodePage='UTF8'&CondenseMessagesInHttpResponseHeader=X&format=json`;
    const sapMessageHeader = JSON.stringify({
        code: '200',
        message: '~message',
        longtext_url: '~LongText',
        details: [{ code: '200', message: '~message', severity: 'info' }]
    });
    const service = createForAbap({ baseURL: server }).getUi5AbapRepository();
    const destination: Destination = {
        Name: 'name',
        Type: 'HTTP',
        Authentication: 'NoAuthentication',
        ProxyType: 'OnPremise',
        Host: 'https://destination.example',
        Description: 'description',
        WebIDEUsage: WebIDEUsageType.ODATA_ABAP
    };
    const destinationService = (createForDestination({}, destination) as AbapServiceProvider).getUi5AbapRepository();

    beforeAll(() => {
        nock.disableNetConnect();
        // mock an existing and not existing app
        nock(server)
            .get((url) => url.startsWith(`${Ui5AbapRepositoryService.PATH}/Repositories('${validApp}')`))
            .reply(200, { d: validAppInfo })
            .persist();
        nock(`https://${destination.Name}.dest`)
            .get(`${Ui5AbapRepositoryService.PATH}/Repositories('NOT_EXISTING_APP')?saml2=disabled&$format=json`)
            .reply(200, { d: validAppInfo })
            .persist();
        nock(server)
            .get((url) => url.startsWith(`${Ui5AbapRepositoryService.PATH}/Repositories('${notExistingApp}')`))
            .reply(404, 'the app does not exist')
            .persist();
        nock(server)
            .get(`${Ui5AbapRepositoryService.PATH}/Repositories('${restrictedApp}')?$format=json`)
            .reply(401, { d: validAppInfo })
            .persist();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getInfo', () => {
        test('Existing app', async () => {
            const info = await service.getInfo(validApp);
            expect(info).toBeDefined();
            expect(info).toEqual(validAppInfo);
        });

        test('Non-existing app returning 404', async () => {
            const info = await service.getInfo(notExistingApp);
            expect(info).toBeUndefined();
        });

        test('Not authorized to access app', async () => {
            await expect(service.getInfo(restrictedApp)).rejects.toThrowError();
        });
    });

    describe('downloadFiles', () => {
        test('Existing app', async () => {
            const data = await service.downloadFiles(validApp);
            expect(data).toBeDefined();
            expect(data.toString()).toEqual(validAppInfo.ZipArchive);
        });

        test('Non-existing app returning 404', async () => {
            const data = await service.downloadFiles(notExistingApp);
            expect(data).toBeUndefined();
        });
    });

    describe('deploy', () => {
        const archive = Buffer.from('TestData');
        test('deploy new app with destination', async () => {
            nock(`https://${destination.Name}.dest`)
                .defaultReplyHeaders({
                    'sap-message': sapMessageHeader
                })
                .put(
                    `${Ui5AbapRepositoryService.PATH}/Repositories('${notExistingApp}')?saml2=disabled&${updateParams}`,
                    (body) => body.indexOf(archive.toString('base64')) !== -1
                )
                .reply(200);
            const response = await destinationService.deploy({
                archive,
                bsp: { name: notExistingApp }
            });
            expect(response.data).toBeDefined();
            expect(loggerMock.info).toHaveBeenCalledTimes(7); // Ensures the logFullURL method is called to support destinations
            expect(loggerMock.warn).toHaveBeenCalledTimes(0);
            expect(loggerMock.error).toHaveBeenCalledTimes(0);
        });

        test('deploy new app with destination with 400 error', async () => {
            const error: ErrorMessage = {
                code: '400',
                message: {
                    value: '~message'
                },
                innererror: {
                    transactionid: '~id',
                    timestamp: '~time',
                    'Error_Resolution': {
                        abc: '~message'
                    },
                    errordetails: [
                        {
                            code: '1',
                            message: '~message',
                            severity: 'error',
                            longtext_url: '~longtext_url'
                        }
                    ]
                }
            };
            nock(`https://${destination.Name}.dest`)
                .defaultReplyHeaders({
                    'sap-message': sapMessageHeader
                })
                .put(
                    `${Ui5AbapRepositoryService.PATH}/Repositories('${notExistingApp}')?saml2=disabled&${updateParams}`,
                    (body) => body.indexOf(archive.toString('base64')) !== -1
                )
                .reply(400, JSON.stringify({ error }));
            await expect(destinationService.deploy({ archive, bsp: { name: notExistingApp } })).rejects.toThrowError();
            expect(loggerMock.info).toHaveBeenCalledTimes(4); // Ensures the logError flow is handled
        });

        test('deploy new app', async () => {
            nock(server)
                .defaultReplyHeaders({
                    'sap-message': sapMessageHeader
                })
                .post(
                    `${Ui5AbapRepositoryService.PATH}/Repositories?${updateParams}`,
                    (body) => body.indexOf(archive.toString('base64')) !== -1
                )
                .reply(200);

            const response = await service.deploy({ archive, bsp: { name: notExistingApp } });
            expect(response.data).toBeDefined();
        });

        test('deploy new app with additional parameter and info message', async () => {
            const transport = 'XYZ';
            nock(server)
                .defaultReplyHeaders({
                    'sap-message': sapMessageHeader
                })
                .post(
                    `${Ui5AbapRepositoryService.PATH}/Repositories?${updateParams}&TransportRequest=${transport}`,
                    (body) => body.indexOf(archive.toString('base64')) !== -1
                )
                .reply(200);

            const response = await service.deploy({ archive, bsp: { name: notExistingApp, transport } });
            expect(response.data).toBeDefined();
        });

        test('update existing app', async () => {
            nock(server)
                .put(
                    `${Ui5AbapRepositoryService.PATH}/Repositories('${validApp}')?${updateParams}`,
                    (body) => body.indexOf(archive.toString('base64')) !== -1
                )
                .reply(200);

            const response = await service.deploy({ archive, bsp: { name: validApp } });
            expect(response.data).toBeDefined();
        });

        test('deployment failed', async () => {
            nock(server)
                .put(
                    `${Ui5AbapRepositoryService.PATH}/Repositories('${validApp}')?${updateParams}`,
                    (body) => body.indexOf(archive.toString('base64')) !== -1
                )
                .reply(401, 'Deployment failed');
            await expect(service.deploy({ archive, bsp: { name: validApp } })).rejects.toThrowError();
        });
        it.each([{ code: 408 }, { code: 504 }])('retry deployment based on error codes', async ({ code }) => {
            const badService = createForAbap({ baseURL: server }).getUi5AbapRepository();
            const mockPut = jest.fn().mockRejectedValue({
                response: {
                    status: code
                }
            });
            badService.put = mockPut;
            try {
                await badService.deploy({ archive, bsp: { name: validApp } });
                fail('Function should have thrown an error');
            } catch (error) {
                expect(error.response?.status).toBe(code);
                // in case of 504 we retry 2 times
                expect(mockPut).toHaveBeenCalledTimes(3);
            }
        });

        test('retry deployment on 504 and 408', async () => {
            const badService = createForAbap({ baseURL: server }).getUi5AbapRepository();
            const mockPut = jest.fn().mockRejectedValue({
                response: {
                    status: 504
                }
            });
            badService.put = mockPut;
            try {
                await badService.deploy({ archive, bsp: { name: validApp } });
                fail('Function should have thrown an error');
            } catch (error) {
                expect(error.response?.status).toBe(504);
                // in case of 504 we retry 2 times
                expect(mockPut).toHaveBeenCalledTimes(3);
            }
        });

        test('should retry to update repo on timeout with partial data from getInfo on second attempt', async () => {
            // Create a subclass that exposes the protected updateRepoRequest method for testing only
            class TestableUi5AbapRepositoryService extends Ui5AbapRepositoryService {
                public async testUpdateRepoRequest(
                    isExisting: boolean,
                    appName: string,
                    payload: string,
                    config: AxiosRequestConfig,
                    tryCount: number
                ): Promise<AxiosResponse | undefined> {
                    return this.updateRepoRequest(isExisting, appName, payload, config, tryCount);
                }
            }

            const service = new Ui5AbapRepositoryService();
            service.log = { warn: jest.fn() } as any;
            const testUi5AbapRepositoryService = new TestableUi5AbapRepositoryService();
            const appName = 'test ';
            const payload = '{ "some" : "data" }';
            const config = {};
            testUi5AbapRepositoryService.getInfo = jest.fn().mockResolvedValue({});
            testUi5AbapRepositoryService.put = jest.fn().mockResolvedValue({ status: 200 });
            testUi5AbapRepositoryService.log = {
                warn: jest.fn()
            } as any;

            // Call the testUpdateRepoRequest method with tryCount = 2 to simulate the second attempt
            const response = await testUi5AbapRepositoryService.testUpdateRepoRequest(
                false,
                appName,
                payload,
                config,
                2
            );
            expect(response).toBeDefined();
            // Test if the put method was called to update the existing repo
            expect(testUi5AbapRepositoryService.put).toHaveBeenCalledWith(
                `/Repositories('${encodeURIComponent(appName)}')`,
                payload,
                config
            );
            // Check that the warning message was logged
            expect(testUi5AbapRepositoryService.log.warn).toHaveBeenCalledWith(
                'Warning: The BSP application deployment timed out while waiting for a response from the backend. This may indicate the deployment was not finished. To resolve this, consider increasing the value of the HTML5.Timeout property for the destination.'
            );
        });

        test('testMode enabled', async () => {
            nock(server)
                .put(
                    `${Ui5AbapRepositoryService.PATH}/Repositories('${validApp}')?${updateParams}&TestMode=true&SafeMode=true`
                )
                .reply(200);
            const response = await service.deploy({
                archive,
                bsp: { name: validApp },
                testMode: true,
                safeMode: true
            });
            expect(response.data).toBeDefined();
        });

        test('testMode enabled with error', async () => {
            nock(server)
                .put(
                    `${Ui5AbapRepositoryService.PATH}/Repositories('${validApp}')?${updateParams}&TestMode=true&SafeMode=true`
                )
                .reply(403, JSON.stringify(mockErrorDetails));
            const response = await service.deploy({
                archive,
                bsp: { name: validApp },
                testMode: true,
                safeMode: true
            });
            expect(response.data).toContain('CA-UI5-ABA-SAR');
        });
    });

    describe('undeploy', () => {
        beforeEach(() => {
            jest.resetAllMocks();
        });

        test('successful removal', async () => {
            nock(server)
                .delete(
                    `${Ui5AbapRepositoryService.PATH}/Repositories('${encodeURIComponent(validApp)}')?${updateParams}`
                )
                .reply(200);
            const response = await service.undeploy({ bsp: { name: validApp } });
            expect(response?.status).toBe(200);
        });

        test('successful removal - app name with namespace', async () => {
            nock(server)
                .get((url) =>
                    url.startsWith(`${Ui5AbapRepositoryService.PATH}/Repositories('${encodeURIComponent(validAppNs)}')`)
                )
                .reply(200, { d: validAppInfo })
                .persist();
            nock(server)
                .delete((url) =>
                    url.startsWith(`${Ui5AbapRepositoryService.PATH}/Repositories('${encodeURIComponent(validAppNs)}')`)
                )
                .reply(200);
            const response = await service.undeploy({ bsp: { name: validAppNs } });
            expect(response?.status).toBe(200);
        });

        test('successful with additional message', async () => {
            nock(server)
                .defaultReplyHeaders({
                    'sap-message': sapMessageHeader
                })
                .delete(`${Ui5AbapRepositoryService.PATH}/Repositories('${validApp}')?${updateParams}`)
                .reply(200);
            const response = await service.undeploy({ bsp: { name: validApp } });
            expect(response?.status).toBe(200);
            expect(loggerMock.info).toHaveBeenCalledTimes(4);
            expect(loggerMock.warn).toHaveBeenCalledTimes(0);
            expect(loggerMock.error).toHaveBeenCalledTimes(0);
        });

        test('successful undeploy with additional message using destination', async () => {
            nock(`https://${destination.Name}.dest`)
                .defaultReplyHeaders({
                    'sap-message': sapMessageHeader
                })
                .delete(
                    `${Ui5AbapRepositoryService.PATH}/Repositories('${notExistingApp}')?saml2=disabled&${updateParams}`
                )
                .reply(202);
            const response = await destinationService.undeploy({ bsp: { name: notExistingApp } });
            expect(response?.status).toBe(202);
            expect(loggerMock.debug).toHaveBeenCalledTimes(0);
            expect(loggerMock.info).toHaveBeenCalledTimes(5);
            expect(loggerMock.error).toHaveBeenCalledTimes(0);
        });

        test('failed removal', async () => {
            nock(server)
                .delete(`${Ui5AbapRepositoryService.PATH}/Repositories('${validApp}')?${updateParams}`)
                .replyWithError('Failed');
            await expect(service.undeploy({ bsp: { name: validApp } })).rejects.toThrowError();
        });

        test('failed removal, not authorised', async () => {
            const appName = 'TestApp';
            nock(server).get(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${appName}%27)?$format=json`).reply(401);
            await expect(service.undeploy({ bsp: { name: appName } })).rejects.toThrowError();
            expect(loggerMock.debug).toHaveBeenCalledTimes(1);
            expect(loggerMock.info).toHaveBeenCalledTimes(0);
            expect(loggerMock.error).toHaveBeenCalledTimes(0);
        });

        test('failed removal, application not found', async () => {
            const appName = 'TestApp';
            nock(server).get(`${Ui5AbapRepositoryService.PATH}/Repositories('${appName}')?$format=json`).reply(404);
            const response = await service.undeploy({ bsp: { name: appName } });
            expect(response).toBeUndefined();
        });

        test('failed removal but handle repeat request', async () => {
            const appName = 'TestAppRecursive';
            nock(server)
                .get(`${Ui5AbapRepositoryService.PATH}/Repositories('${appName}')?$format=json`)
                .reply(200, { d: { ...validAppInfo, Name: appName } });
            nock(server)
                .delete(`${Ui5AbapRepositoryService.PATH}/Repositories('${appName}')?${updateParams}`)
                .reply(400);
            nock(server)
                .delete(`${Ui5AbapRepositoryService.PATH}/Repositories('${appName}')?${updateParams}`)
                .reply(200);
            const response = await service.undeploy({ bsp: { name: appName } });
            expect(response?.status).toBe(200);
        });
    });

    describe('Validate Ui5AbapRepositoryService private methods', () => {
        test('Validate private methods', async () => {
            /**
             * Extension of Ui5AbapRepository class to make `createPayload` and `getAbapFrontendUrl` public and available for testing.
             */
            class ServiceForTesting extends Ui5AbapRepositoryService {
                public createPayload = super.createPayload;
                public getAbapFrontendUrl = super.getAbapFrontendUrl;
            }
            const publicUrl = 'http://sap.server';
            const service = new ServiceForTesting({ publicUrl });
            const inputDescription = `<my&special"'description>`;
            const xmlPayload = service.createPayload(Buffer.from('TestData'), 'special&name', inputDescription, '');
            // Ensure special characters are encoded
            expect(xmlPayload).not.toContain('special&name');
            expect(xmlPayload).toContain('special&amp;name');
            expect(xmlPayload).not.toContain(inputDescription);
            expect(xmlPayload).toContain('&lt;my&amp;special&quot;&apos;description&gt;');
            expect(xmlPayload).toContain(` xml:base="${publicUrl}"`);
            expect(xmlPayload).toContain(`<id>${publicUrl}/Repositories('special&amp;name')</id>`);
            // ABAP frontend reflects
            expect(service.getAbapFrontendUrl()).toEqual(publicUrl);

            const publicS4HanaCloudUrl = 'https://my12345-api.lab.s4hana.cloud.sap';
            const s4HanaCloudService = new ServiceForTesting({ publicUrl: publicS4HanaCloudUrl });
            expect(s4HanaCloudService.getAbapFrontendUrl()).toEqual('https://my12345.lab.s4hana.cloud.sap');
        });
    });
});
