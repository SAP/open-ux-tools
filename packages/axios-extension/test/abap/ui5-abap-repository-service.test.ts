import nock from 'nock';
import fs from 'fs';
import { Ui5AbapRepositoryService, createForAbap, AppInfo } from '../../src';

describe('Ui5AbapRepositoryService', () => {
    const server = 'http://sap.example';
    const validApp = 'VALID_APP';
    const notExistingApp = 'NOT_EXISTING_APP';
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
    const service = createForAbap({ baseURL: server }).ui5AbapRepository;

    beforeAll(() => {
        nock.disableNetConnect();
        // mock an existing and not existing app
        nock(server)
            .get(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?$format=json`)
            .reply(200, { d: validAppInfo })
            .persist();
        nock(server)
            .get(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${notExistingApp}%27)?$format=json`)
            .replyWithError('the app does not exist')
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

        test('Not existing app', async () => {
            const info = await service.getInfo(notExistingApp);
            expect(info).toBeUndefined();
        });
    });

    describe('deploy', () => {
        const archivePath = './dist/my-app.zip';
        const testData = Buffer.from('TestData');
        beforeAll(() => {
            jest.spyOn(fs, 'readFileSync').mockReturnValue(testData);
        });

        test('deploy new app', async () => {
            nock(server)
                .post(
                    `${Ui5AbapRepositoryService.PATH}/Repositories?${updateParams}`,
                    (body) => body.indexOf(testData) !== -1
                )
                .reply(200);

            const response = await service.deploy(archivePath, { name: notExistingApp });
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
                    (body) => body.indexOf(testData) !== -1
                )
                .reply(200);

            const response = await service.deploy(archivePath, { name: notExistingApp, transport });
            expect(response.data).toBeDefined();
        });

        test('update existing app', async () => {
            nock(server)
                .put(
                    `${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?${updateParams}`,
                    (body) => body.indexOf(testData) !== -1
                )
                .reply(200);

            const response = await service.deploy(archivePath, { name: validApp });
            expect(response.data).toBeDefined();
        });

        test('deployment failed', async () => {
            nock(server)
                .put(
                    `${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?${updateParams}`,
                    (body) => body.indexOf(testData) !== -1
                )
                .replyWithError('Deployment failed');
            await expect(service.deploy(archivePath, { name: validApp })).rejects.toThrowError();
        });

        test('retry deployment on 504', async () => {
            const badService = createForAbap({ baseURL: server }).ui5AbapRepository;
            const mockPut = jest.fn().mockRejectedValue({
                response: {
                    status: 504
                }
            });
            badService.put = mockPut;
            try {
                await badService.deploy(archivePath, { name: validApp });
                fail('Function should have thrown an error');
            } catch (error) {
                expect(error.response?.status).toBe(504);
                // in case of 504 we retry 2 times
                expect(mockPut).toHaveBeenCalledTimes(3);
            }
        });

        test('testMode', async () => {
            nock(server)
                .put(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?${updateParams}&TestMode=true`)
                .reply(200);
            const response = await service.deploy(archivePath, { name: validApp }, true);
            expect(response.data).toBeDefined();
        });
    });

    describe('undeploy', () => {
        test('successful removal', async () => {
            nock(server)
                .delete(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?${updateParams}`)
                .reply(200);
            const response = await service.undeploy({ name: validApp });
            expect(response.status).toBe(200);
        });

        test('successful with additional message', async () => {
            nock(server)
                .defaultReplyHeaders({
                    'sap-message': sapMessageHeader
                })
                .delete(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?${updateParams}`)
                .reply(200);
            const response = await service.undeploy({ name: validApp });
            expect(response.status).toBe(200);
        });

        test('failed removal', async () => {
            nock(server)
                .delete(`${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?${updateParams}`)
                .replyWithError('Failed');
            await expect(service.undeploy({ name: validApp })).rejects.toThrowError();
        });
    });
});
