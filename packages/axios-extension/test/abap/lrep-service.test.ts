import nock from 'nock';
import fs from 'fs';
import type { Message } from '../../src/abap/lrep-service';
import { LayeredRepositoryService, createForAbap, AdaptationConfig } from '../../src';

nock.disableNetConnect();

describe('DesigntimeAdaptationService', () => {
    const server = 'http://sap.example';
    const service = createForAbap({ baseURL: server }).layeredRepository();

    nock(server)
        .get(`${LayeredRepositoryService.PATH}/actions/getcsrftoken/`)
        .reply(200, undefined, {
            'x-csrf-token': 'token'
        })
        .persist();

    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('deploy', () => {
        const config: AdaptationConfig = {
            namespace: 'apps/my.base.app/appVariants/customer.variant/',
            package: 'MY_PACKAGE',
            transport: 'MYTRANSPORT'
        };
        const archivePath = './dist/my-app.zip';
        const testData = Buffer.from('TestData');

        beforeAll(() => {
            jest.spyOn(fs, 'readFileSync').mockReturnValue(testData);
        });

        test('deploy new adapation project', async () => {
            nock(server)
                .get(
                    `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                        config.namespace as string
                    )}&layer=CUSTOMER_BASE`
                )
                .reply(404);

            nock(server)
                .post(
                    `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                        config.namespace as string
                    )}&layer=CUSTOMER_BASE&package=${config.package}&changeList=${config.transport}`
                )
                .reply(200);

            const response = await service.deploy(archivePath, config);
            expect(response.status).toBe(200);
        });

        test('update an existing adapation project', async () => {
            nock(server)
                .get(
                    `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                        config.namespace as string
                    )}&layer=CUSTOMER_BASE`
                )
                .reply(200);

            nock(server)
                .put(
                    `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                        config.namespace as string
                    )}&layer=CUSTOMER_BASE&package=${config.package}&changeList=${config.transport}`
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
});
