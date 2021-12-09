import { createForAbap, ODataVersion, V2CatalogService } from '../../../src';
import { join } from 'path';
import nock from 'nock';

nock.disableNetConnect();

describe('V2CatalogService', () => {
    const server = 'https://example.com';
    const config = {
        baseURL: server,
        auth: {
            username: 'USER',
            password: 'SECRET'
        }
    };

    describe('listServices', () => {
        test('classic', async () => {
            const provider = createForAbap(config);
            provider.s4Cloud = false;

            const catalog = await provider.catalog(ODataVersion.v2);

            nock(server)
                .get(`${V2CatalogService.PATH}/?$format=json`)
                .replyWithFile(200, join(__dirname, '../mockResponses/v2CatalogDocument.json'));

            nock(server)
                .get((path) => path.startsWith(`${V2CatalogService.PATH}/ServiceCollection?`))
                .replyWithFile(200, join(__dirname, '../mockResponses/v2ServiceCollection.json'));
            const services = await catalog.listServices();
            expect(services).toBeDefined();
        });
    });
});
