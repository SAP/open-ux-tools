import nock from 'nock';
import fs from 'fs';
import { DesigntimeAdaptationService, createForAbap, DTAConfig } from '../../src';

nock.disableNetConnect();

describe('DesigntimeAdaptationService', () => {
    const server = 'http://sap.example';
    const service = createForAbap({ baseURL: server }).designtimeAdaptation();

    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('deploy', () => {
        const config: DTAConfig = {
            name: 'apps/mybaseapp/appVariants/myvariantid/',
            package: 'MY_PACKAGE',
            transport: 'MYTRANSPORT'
        };

        // mock an existing and not existing app
        nock(server)
            .post(
                `${DesigntimeAdaptationService.PATH}?name=${encodeURIComponent(
                    config.name
                )}&layer=CUSTOMER_BASE&package=${config.package}&changeList=${config.transport}`
            )
            .reply(200);

        const archivePath = './dist/my-app.zip';
        const testData = Buffer.from('TestData');
        beforeAll(() => {
            jest.spyOn(fs, 'readFileSync').mockReturnValue(testData);
        });

        test('deploy new app', async () => {
            const response = await service.deploy(archivePath, config);
            expect(response.data).toBeDefined();
        });
    });
});
