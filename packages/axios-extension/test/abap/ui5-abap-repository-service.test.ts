import nock from 'nock';
import type { AppInfo } from '../../src';
import { Ui5AbapRepositoryService, createForAbap } from '../../src';
import mockErrorDetails from './mockResponses/errordetails.json';

describe('Ui5AbapRepositoryService', () => {
    const server = 'http://sap.example';
    const validApp = 'VALID_APP';
    const notExistingApp = 'NOT_EXISTING_APP';
    const restrictedApp = 'RESTRICTED_APP';
    const validAppInfo: AppInfo = {
        Name: validApp,
        Package: 'my_package'
    };
    const updateParams = `CodePage='UTF8'&CondenseMessagesInHttpResponseHeader=X&format=json`;
    const sapMessageHeader = JSON.stringify({
        code: '200',
        message: '~message',
        details: [{ code: '200', message: '~message', severity: 'info' }]
    });
    const service = createForAbap({ baseURL: server }).getUi5AbapRepository();

    beforeAll(() => {
        nock.disableNetConnect();
        // mock an existing and not existing app
        nock(server)
            .get(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?$format=json`)
            .reply(200, { d: validAppInfo })
            .persist();
        nock(server)
            .get(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${notExistingApp}%27)?$format=json`)
            .reply(404, 'the app does not exist')
            .persist();
        nock(server)
            .get(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${restrictedApp}%27)?$format=json`)
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
            const info = await service.getInfo(validApp);
            expect(info).toBeDefined();
        });

        test('Not authorized to access app', async () => {
            await expect(service.getInfo(restrictedApp)).rejects.toThrowError();
        });
    });

    describe('deploy', () => {
        const archive = Buffer.from('TestData');

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
                    `${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?${updateParams}`,
                    (body) => body.indexOf(archive.toString('base64')) !== -1
                )
                .reply(200);

            const response = await service.deploy({ archive, bsp: { name: validApp } });
            expect(response.data).toBeDefined();
        });

        test('deployment failed', async () => {
            nock(server)
                .put(
                    `${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?${updateParams}`,
                    (body) => body.indexOf(archive.toString('base64')) !== -1
                )
                .reply(401, 'Deployment failed');
            await expect(service.deploy({ archive, bsp: { name: validApp } })).rejects.toThrowError();
        });

        test('retry deployment on 504', async () => {
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

        test('testMode enabled', async () => {
            nock(server)
                .put(
                    `${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?${updateParams}&TestMode=true&SafeMode=true`
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
                    `${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?${updateParams}&TestMode=true&SafeMode=true`
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
        test('successful removal', async () => {
            nock(server)
                .delete(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?${updateParams}`)
                .reply(200);
            const response = await service.undeploy({ bsp: { name: validApp } });
            expect(response?.status).toBe(200);
        });

        test('successful with additional message', async () => {
            nock(server)
                .defaultReplyHeaders({
                    'sap-message': sapMessageHeader
                })
                .delete(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?${updateParams}`)
                .reply(200);
            const response = await service.undeploy({ bsp: { name: validApp } });
            expect(response?.status).toBe(200);
        });

        test('failed removal', async () => {
            nock(server)
                .delete(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?${updateParams}`)
                .replyWithError('Failed');
            await expect(service.undeploy({ bsp: { name: validApp } })).rejects.toThrowError();
        });

        test('failed removal, application not found', async () => {
            const appName = 'TestApp';
            nock(server).get(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${appName}%27)?$format=json`).reply(404);
            const response = await service.undeploy({ bsp: { name: appName } });
            expect(response).toBeUndefined();
        });

        test('failed removal but handle repeat request', async () => {
            const appName = 'TestAppRecursive';
            nock(server)
                .get(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${appName}%27)?$format=json`)
                .reply(200, { d: { ...validAppInfo, Name: appName } });
            nock(server)
                .delete(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${appName}%27)?${updateParams}`)
                .reply(400);
            nock(server)
                .delete(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${appName}%27)?${updateParams}`)
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
        });
    });
});
