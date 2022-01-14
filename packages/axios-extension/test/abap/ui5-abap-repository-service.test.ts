import nock from 'nock';
import fs from 'fs';
import { Ui5AbapRepositoryService, createForAbap } from '../../src';

nock.disableNetConnect();

describe('Ui5AbapRepositoryService', () => {
    const server = 'http://sap.example';
    const validApp = 'VALID_APP';
    const notExistingApp = 'NOT_EXISTING_APP';
    const validAppInfo = {
        Name: validApp,
        Package: 'my_package'
    };
    const service = createForAbap({ baseURL: server }).ui5AbapRepository();

    beforeAll(() => {
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
                    `${Ui5AbapRepositoryService.PATH}/Repositories?CodePage='UTF8'&CondenseMessagesInHttpResponseHeader=X&format=json`,
                    (body) => body.indexOf(testData) !== -1
                )
                .reply(200);

            const response = await service.deploy(archivePath, { name: notExistingApp });
            expect(response.data).toBeDefined();
        });

        test('update existing app', async () => {
            nock(server)
                .put(
                    `${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?CodePage='UTF8'&CondenseMessagesInHttpResponseHeader=X&format=json`,
                    (body) => body.indexOf(testData) !== -1
                )
                .reply(200);

            const response = await service.deploy(archivePath, { name: validApp });
            expect(response.data).toBeDefined();
        });

        test('testMode', async () => {
            nock(server)
                .put(
                    `${Ui5AbapRepositoryService.PATH}/Repositories(%27${validApp}%27)?CodePage='UTF8'&CondenseMessagesInHttpResponseHeader=X&format=json&TestMode=true`
                )
                .reply(200);
            const response = await service.deploy(archivePath, { name: validApp }, true);
            expect(response.data).toBeDefined();
        });
    });
    /*
    it('Test error message logging', () => {
        const fakeUi5AbapRepository = new FakeUi5AbapRepository();
        expect(
            fakeUi5AbapRepository.testGetAbapFrontendUrl(
                'https://mytest-api.s4hana.ondemand.com/sap/bc/ui5_ui5/sap/yy1_deba_fe'
            )
        ).toEqual('https://mytest.s4hana.ondemand.com/sap/bc/ui5_ui5/sap/yy1_deba_fe');
        expect(
            fakeUi5AbapRepository.testGetAbapFrontendUrl(
                'https://mytest.abap.ondemand.com/sap/bc/ui5_ui5/sap/yy1_deba_fe'
            )
        ).toEqual('https://mytest.abap-web.ondemand.com/sap/bc/ui5_ui5/sap/yy1_deba_fe');
    });

    it('Test deployment step timeout status on all attempts for an existing app', async () => {
        const fakeUi5AbapRepository = new FakeUi5AbapRepository();
        const localMockHttpPut = jest.fn().mockImplementation(async () => {
            return Promise.reject({
                response: { status: 504 }
            });
        });
        const httpClient = { put: localMockHttpPut } as unknown as AxiosInstance;
        await expect(fakeUi5AbapRepository.testUpdateRepoRequest(true, 'TestApp', httpClient, 'Payload', {})).rejects
            .toMatchInlineSnapshot(`
                    Object {
                      "response": Object {
                        "status": 504,
                      },
                    }
                `);
        expect(localMockHttpPut).toBeCalledTimes(3); // Three attempts
        expect(mockHttpGet).toBeCalledTimes(0);
        expect(consoleWarnSpy).toBeCalledTimes(1);
    });

    it('Test deployment step timeout status on first attempt for an existing app', async () => {
        const fakeUi5AbapRepository = new FakeUi5AbapRepository();
        const localMockHttpPut = jest
            .fn()
            .mockImplementationOnce(async () => {
                return Promise.reject({
                    response: { status: 504 }
                });
            })
            .mockImplementationOnce(async () => {
                return Promise.resolve('TestPassed');
            });
        const httpClient = { put: localMockHttpPut } as unknown as AxiosInstance;
        await expect(
            fakeUi5AbapRepository.testUpdateRepoRequest(true, 'TestApp', httpClient, 'Payload', {})
        ).resolves.toMatch('TestPassed');
        expect(localMockHttpPut).toBeCalledTimes(2);
        expect(mockHttpGet).toBeCalledTimes(0);
        expect(consoleWarnSpy).toBeCalledTimes(1);
    });

    it('Test deployment step timeout status on first attempt for a new app', async () => {
        const fakeUi5AbapRepository = new FakeUi5AbapRepository();
        const localMockGetInfo = jest.fn().mockResolvedValueOnce({ Name: 'Name', Package: 'Package' } as AppInfo); // App is now deployed
        fakeUi5AbapRepository.getInfo = localMockGetInfo;
        const localMockHttpPost = jest
            .fn()
            .mockImplementationOnce(async () => {
                return Promise.reject({
                    response: { status: 504 }
                });
            })
            .mockImplementationOnce(async () => {
                return Promise.resolve('App Updated');
            });
        const httpClient = { post: localMockHttpPost } as unknown as AxiosInstance;
        // Setting isExisting to false calls the POST http call
        await expect(
            fakeUi5AbapRepository.testUpdateRepoRequest(false, 'TestApp', httpClient, 'Payload', {})
        ).resolves.toBeUndefined(); // App was deployed even though it threw a timeout error
        expect(localMockHttpPost).toBeCalledTimes(1);
        expect(localMockGetInfo).toBeCalledTimes(1);
        expect(consoleWarnSpy).toBeCalledTimes(1);
    });

    it('Test get app info', async () => {
        const fakeUi5AbapRepository = new FakeUi5AbapRepository();
        const appInfo = await fakeUi5AbapRepository.testGetInfo('TestApp');
        expect(appInfo).toBeUndefined();
    });

    it('Test deploy app', async () => {
        const readFileMock = (mockedFs.readFileSync = jest
            .fn()
            .mockResolvedValue(Promise.resolve(Buffer.from('TestData').toString('base64'))));
        const fakeUi5AbapRepository = new FakeUi5AbapRepository();
        const getClientSpy = jest.spyOn(fakeUi5AbapRepository, 'getClient');
        const axiosRes = await fakeUi5AbapRepository.testDeploy('/testPath', appConfig);
        expect(axiosRes).toMatchInlineSnapshot(`
            Object {
              "data": "result",
              "headers": Object {
                "sap-message": "{\\"x-sap\\": \\"test-account\\"}",
              },
            }
        `);
        expect(getClientSpy).toBeCalledTimes(2); // 1 - Deploy 2 - GetInfo
        expect(readFileMock).toBeCalledTimes(1);
        expect(readFileMock).toHaveBeenCalledWith('/testPath', { encoding: 'base64' });
    });

    it('Test undeploy for existing app', async () => {
        const fakeUi5AbapRepository = new FakeUi5AbapRepository();
        const axiosRes = await fakeUi5AbapRepository.testUndeploy(appConfig);
        expect(axiosRes).toMatchInlineSnapshot(`
            Object {
              "data": "result",
              "headers": Object {
                "sap-message": "{\\"x-sap\\": \\"test-account\\"}",
              },
            }
        `);
        expect(mockHttpDelete).toHaveBeenCalledWith("/Repositories('TestApp')", {
            headers: { 'Content-Type': 'application/atom+xml', charset: 'UTF8', type: 'entry' },
            params: {
                CodePage: "'UTF8'",
                CondenseMessagesInHttpResponseHeader: 'X',
                TestMode: true,
                TransportRequest: 'Y11K900374',
                format: 'json'
            }
        });
        expect(mockHttpDelete).toBeCalledTimes(1);
    });

    it('Test undeploy for existing app, test recursive flow is executed', async () => {
        const deleteFailed = { message: 'failed recursive test', response: { status: 400 } };
        const mockHttpDelete = jest.fn().mockRejectedValue(deleteFailed); // Handle as undefined in Ui5AbapRepository
        const localMockAxiosInstance = {
            delete: mockHttpDelete
        } as unknown as AxiosInstance;

        const fakeUi5AbapRepository = new FakeUi5AbapRepository();
        jest.spyOn(fakeUi5AbapRepository, 'getClient').mockResolvedValue(localMockAxiosInstance as any);
        await expect(fakeUi5AbapRepository.testUndeploy(appConfig)).rejects.toEqual(deleteFailed);
        expect(mockHttpDelete).toBeCalledTimes(2); // Validates the request was executed twice
        expect(consoleErrorSpy).toBeCalledTimes(1);
        expect(consoleWarnSpy).toBeCalledTimes(1);
    });

    it('Test undeploy for existing app, test non-recursive flow', async () => {
        const deleteFailed = { message: 'failed non-recursive test' };
        const mockHttpDelete = jest.fn().mockRejectedValue(deleteFailed); // Handle as undefined in Ui5AbapRepository
        const localMockAxiosInstance = {
            delete: mockHttpDelete
        } as unknown as AxiosInstance;
        const fakeUi5AbapRepository = new FakeUi5AbapRepository();
        jest.spyOn(fakeUi5AbapRepository, 'getClient').mockResolvedValue(localMockAxiosInstance as any);
        await expect(fakeUi5AbapRepository.testUndeploy(appConfig)).rejects.toEqual(deleteFailed);
        expect(mockHttpDelete).toBeCalledTimes(1);
        expect(consoleErrorSpy).toBeCalledTimes(1);
        expect(consoleWarnSpy).toBeCalledTimes(0);
    });*/
});
