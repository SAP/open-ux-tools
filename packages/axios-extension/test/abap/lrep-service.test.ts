import nock from 'nock';
import fs from 'fs';
import type { Message } from '../../src/abap/lrep-service';
import type { AdaptationConfig } from '../../src';
import { LayeredRepositoryService, createForAbap } from '../../src';
import type { AxiosError } from '../../src';
import type { ToolsLogger } from '@sap-ux/logger';
import * as Logger from '@sap-ux/logger';

const loggerMock: ToolsLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
} as Partial<ToolsLogger> as ToolsLogger;
jest.spyOn(Logger, 'ToolsLogger').mockImplementation(() => loggerMock);

describe('LayeredRepositoryService', () => {
    const server = 'http://sap.example';
    const service = createForAbap({ baseURL: server }).getLayeredRepository();
    const config: AdaptationConfig = {
        namespace: 'apps/my.base.app/appVariants/customer.variant/',
        package: 'MY_PACKAGE',
        transport: 'MYTRANSPORT'
    } as AdaptationConfig;

    beforeAll(() => {
        nock.disableNetConnect();
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

    describe('deploy', () => {
        const archivePath = './dist/my-app.zip';
        const testData = Buffer.from('TestData');

        beforeAll(() => {
            jest.spyOn(fs, 'readFileSync').mockReturnValue(testData);
        });

        test('deploy new adaptation project with path', async () => {
            nock(server)
                .get((url) => {
                    return url.startsWith(
                        `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                            config.namespace as string
                        )}&layer=CUSTOMER_BASE`
                    );
                })
                .reply(404);

            nock(server)
                .post(
                    `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                        config.namespace as string
                    )}&layer=CUSTOMER_BASE&package=${config.package}&changelist=${config.transport}`
                )
                .reply(200);

            const response = await service.deploy(archivePath, config);
            expect(response.status).toBe(200);
        });

        test('deploy new adaptation project with archive', async () => {
            nock(server)
                .get((url) => {
                    return url.startsWith(
                        `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                            config.namespace as string
                        )}&layer=CUSTOMER_BASE`
                    );
                })
                .reply(404);

            nock(server)
                .post(
                    `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                        config.namespace as string
                    )}&layer=CUSTOMER_BASE&package=${config.package}&changelist=${config.transport}`
                )
                .reply(200);

            const response = await service.deploy(testData, config);
            expect(response.status).toBe(200);
        });

        test('update an existing adaptation project', async () => {
            nock(server)
                .get((url) => {
                    return url.startsWith(
                        `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                            config.namespace as string
                        )}&layer=CUSTOMER_BASE`
                    );
                })
                .reply(200, undefined, {
                    'x-csrf-token': 'token'
                });

            nock(server)
                .put(
                    `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                        config.namespace as string
                    )}&layer=CUSTOMER_BASE&package=${config.package}&changelist=${config.transport}`
                )
                .reply(200, {
                    result: {
                        id: '~id1',
                        severity: 'Success',
                        text: '~text'
                    } as Message,
                    messages: [
                        {
                            id: '~id2',
                            severity: 'Warning',
                            text: '~text'
                        } as Message
                    ]
                });

            const response = await service.deploy(archivePath, config);
            expect(response.status).toBe(200);
        });
        test('logError is called when request fails', async () => {
            const mockAxiosError = {
                response: {
                    status: 404,
                    data: 'Not found'
                },
                message: 'Request failed with status code 404'
            } as AxiosError;

            nock(server)
                .get((url) => {
                    return url.startsWith(
                        `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                            config.namespace as string
                        )}&layer=CUSTOMER_BASE`
                    );
                })
                .reply(404);

            // Force a request failure inside deploy
            nock(server)
                .post(
                    `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                        config.namespace as string
                    )}&layer=CUSTOMER_BASE&package=${config.package}&changelist=${config.transport}`
                )
                .replyWithError(mockAxiosError);

            try {
                await service.deploy(archivePath, config);
                fail('The function should have thrown an error.');
            } catch (error) {
                expect(error).toBeDefined();
                expect(loggerMock.error).toHaveBeenCalledWith(
                    expect.stringContaining(mockAxiosError.response?.data as string)
                );
            }
        });
    });

    describe('undeploy', () => {
        test('undeploy existing adapation project', async () => {
            nock(server)
                .get((url) => {
                    return url.startsWith(
                        `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                            config.namespace as string
                        )}&layer=CUSTOMER_BASE`
                    );
                })
                .reply(200, undefined, {
                    'x-csrf-token': 'token'
                });
            nock(server)
                .delete(
                    `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                        config.namespace as string
                    )}&layer=CUSTOMER_BASE&changelist=${config.transport}`
                )
                .reply(200, 'Response that throws an error when given to JSON.parse');

            const response = await service.undeploy(config);
            expect(response.status).toBe(200);
        });

        test('try undeploying a not existing adaptation project', async () => {
            nock(server)
                .get(
                    `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                        config.namespace as string
                    )}&layer=CUSTOMER_BASE`
                )
                .reply(404, undefined, {
                    'x-csrf-token': 'token'
                });

            try {
                await service.undeploy(config);
                fail('The function should have thrown an error.');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        test('try undeploying on a too old ABAP system', async () => {
            nock(server)
                .get((url) => {
                    return url.startsWith(
                        `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                            config.namespace as string
                        )}&layer=CUSTOMER_BASE`
                    );
                })
                .reply(200, undefined, {
                    'x-csrf-token': 'token'
                });
            nock(server)
                .delete(
                    `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                        config.namespace as string
                    )}&layer=CUSTOMER_BASE&changelist=${config.transport}`
                )
                .reply(405);
            try {
                await service.undeploy(config);
                fail('The function should have thrown an error.');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('getCsrfToken', () => {
        test('successful call', async () => {
            nock(server).get(`${LayeredRepositoryService.PATH}/actions/getcsrftoken/`).reply(200);
            const response = await service.getCsrfToken();
            expect(response).toBeDefined();
        });

        test('error is thrown', async () => {
            nock(server).get(`${LayeredRepositoryService.PATH}/actions/getcsrftoken/`).reply(403);
            try {
                await service.getCsrfToken();
                fail('The function should have thrown an error.');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('mergeAppDescriptorVariant', () => {
        const mockResult = { hello: 'world' };
        test('merge valid app variant', async () => {
            nock(server).put(`${LayeredRepositoryService.PATH}/appdescr_variant_preview/`).reply(200, mockResult);

            const mergedDescriptor = await service.mergeAppDescriptorVariant(Buffer.from('~test'));
            expect(mergedDescriptor).toEqual(mockResult);
        });

        test('error is thrown', async () => {
            nock(server).put(`${LayeredRepositoryService.PATH}/appdescr_variant_preview/`).reply(500);
            try {
                await service.mergeAppDescriptorVariant(Buffer.from('~test'));
                fail('The function should have thrown an error.');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('getSystemInfo', () => {
        const mockResult = {
            adaptationProjectTypes: ['onPremise', 'cloudReady'],
            activeLanguages: [{ sap: 'EN', description: 'EN Language', i18n: 'EN-en' }]
        };

        test('successful call with provided package and without provided language', async () => {
            nock(server)
                .get((path) => path.startsWith(`${LayeredRepositoryService.PATH}/dta_folder/system_info`))
                .reply(200, (_path) => {
                    return mockResult;
                });
            const systemInfo = await service.getSystemInfo('Z_TEST_PACKAGE');
            expect(systemInfo).toEqual(mockResult);
        });

        test('throws error when request fails', async () => {
            nock(server)
                .get((path) => path.startsWith(`${LayeredRepositoryService.PATH}/dta_folder/system_info`))
                .reply(500);
            try {
                await service.getSystemInfo('Z_TEST_PACKAGE');
                fail('The function should have thrown an error.');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });
});
