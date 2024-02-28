import nock from 'nock';
import fs from 'fs';
import type { Message } from '../../src/abap/lrep-service';
import type { AdaptationConfig } from '../../src';
import { LayeredRepositoryService, createForAbap } from '../../src';

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
});
