import { join } from 'path';
import nock from 'nock';

import { AbapServiceProvider, ODataVersion, V4CatalogService } from '../../../src';

nock.restore();

const mockRespPath = join(__dirname, '../mockResponses');

describe('V4CatalogService', () => {
    const server = 'https://iccsrm.sap.com:44300';
    const config = {
        baseURL: server,
        auth: {
            username: 'USER',
            password: 'SECRET'
        }
    };
    nock.activate();

    describe('listServices', () => {
        const reqPath = `${V4CatalogService.PATH}/ServiceGroups`;

        beforeAll(() => {
            // configure a mocked catalog service for v4
            /*
            
            // mock response for paging
            for (let index = 1; index <= 4; index++) {
                nock(server)
                .get((path) => path.startsWith(path))
                .replyWithFile(200, join(mockRespPath, `v4ServiceGroupsPage-${index}.json`)).persist();
                nock(server)
                .get((path) => path.startsWith(path))
                .replyWithFile(200, join(mockRespPath, `v4RecommendedServiceGroupsPage-${index}.json`)).persist();
            }*/
        });

        test('service groups', async () => {
            const provider = AbapServiceProvider.create(config);
            provider.s4Cloud = false;
            const catalog = await provider.catalog(ODataVersion.v4);

            nock(server).get(`${V4CatalogService.PATH}/$metadata`).reply(200, join(__dirname, '<METADTA />'));
            nock(server)
                .get((path) => path.startsWith(reqPath))
                .replyWithFile(200, join(mockRespPath, 'v4ServiceGroups.json'));

            const services = await catalog.listServices();
            expect(services).toBeDefined();
            expect(services.length).toBeGreaterThan(0);

            // a 2nd request should return the same and not trigger another request
            const servicesFromCache = await catalog.listServices();
            expect(servicesFromCache).toBe(services);
        });

        test('service groups with paging', async () => {
            const provider = AbapServiceProvider.create(config);
            provider.s4Cloud = false;
            const catalog = await provider.catalog(ODataVersion.v4);

            // mock response for paging
            nock(server).get(`${V4CatalogService.PATH}/$metadata`).reply(200, join(__dirname, '<METADTA />'));
            nock(server)
                .get((path) => path.startsWith(path))
                .replyWithFile(200, join(mockRespPath, `v4ServiceGroupsPage-1.json`));
            for (let index = 2; index <= 4; index++) {
                nock(server)
                    .get((path) => path.startsWith(path) && path.includes(`$skip=${5 * (index - 1)}`))
                    .replyWithFile(200, join(mockRespPath, `v4ServiceGroupsPage-${index}.json`));
            }

            const services = await catalog.listServices();
            expect(services).toBeDefined();
            expect(services.length).toBeGreaterThan(0);
        });

        test('recommended service groups with paging', async () => {
            const provider = AbapServiceProvider.create(config);
            provider.s4Cloud = false;
            const catalog = await provider.catalog(ODataVersion.v4);

            nock(server)
                .get(`${V4CatalogService.PATH}/$metadata`)
                .replyWithFile(200, join(__dirname, '../mockResponses/v4-catalog-metadata.xml'));
            nock(server)
                .get((path) => path.startsWith(path))
                .replyWithFile(200, join(mockRespPath, `v4RecommendedServiceGroupsPage-1.json`));
            for (let index = 2; index <= 4; index++) {
                nock(server)
                    .get((path) => path.startsWith(path) && path.includes(`$skip=${5 * (index - 1)}`))
                    .replyWithFile(200, join(mockRespPath, `v4RecommendedServiceGroupsPage-${index}.json`));
            }

            const services = await catalog.listServices();
            expect(services).toBeDefined();
            expect(services.length).toBeGreaterThan(0);
        });
    });
});
