import nock from 'nock';
import fs from 'fs';
import { LayeredRepositoryService, createForAbap, AdaptationConfig } from '../../src';

nock.disableNetConnect();

describe('DesigntimeAdaptationService', () => {
    const server = 'http://sap.example';
    const service = createForAbap({ baseURL: server }).layeredRepository();

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

        nock(server)
            .get(
                `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                    config.namespace as string
                )}&layer=CUSTOMER_BASE`
            )
            .reply(200);
        nock(server).get(`${LayeredRepositoryService.PATH}/actions/getcsrftoken/`).reply(200, undefined, {
            'x-csrf-token': 'token'
        });
        nock(server)
            .put(
                `${LayeredRepositoryService.PATH}/dta_folder/?name=${encodeURIComponent(
                    config.namespace as string
                )}&layer=CUSTOMER_BASE&package=${config.package}&changeList=${config.transport}`
            )
            .reply(200);

        beforeAll(() => {
            jest.spyOn(fs, 'readFileSync').mockReturnValue(testData);
        });

        test('deploy new app', async () => {
            const response = await service.deploy(archivePath, config);
            expect(response.data).toBeDefined();
        });
    });
});
