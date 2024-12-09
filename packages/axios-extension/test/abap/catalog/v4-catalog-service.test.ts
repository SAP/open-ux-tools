import { join } from 'path';
import nock from 'nock';
import { createForAbap, ODataVersion, V4CatalogService } from '../../../src';

const mockRespPath = join(__dirname, '../mockResponses');

describe('V4CatalogService', () => {
    beforeAll(() => {
        nock.disableNetConnect();
    });

    beforeEach(() => {
        nock.cleanAll();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    const server = 'https://iccsrm.sap.com:44300';
    const config = {
        baseURL: server,
        auth: {
            username: 'USER',
            password: 'SECRET'
        }
    };

    describe('listServices', () => {
        const reqPath = `${V4CatalogService.PATH}/ServiceGroups`;

        test('service groups', async () => {
            const provider = createForAbap(config);
            const catalog = provider.catalog(ODataVersion.v4);

            nock(server).get(`${V4CatalogService.PATH}/$metadata`).reply(200, join(__dirname, '<METADTA />'));
            nock(server)
                .get((path) => path.startsWith(reqPath))
                .replyWithFile(200, join(mockRespPath, 'v4ServiceGroups.json'), { 'Content-Type': 'application/json' });

            const services = await catalog.listServices();
            expect(services).toBeDefined();
            expect(services.length).toBeGreaterThan(0);

            // a 2nd request should return the same and not trigger another request
            const servicesFromCache = await catalog.listServices();
            expect(servicesFromCache).toBe(services);
        });

        test('service groups with paging', async () => {
            const provider = createForAbap(config);
            const catalog = provider.catalog(ODataVersion.v4);

            // mock response for paging
            nock(server).get(`${V4CatalogService.PATH}/$metadata`).reply(200, join(__dirname, '<METADATA />'));
            nock(server)
                .get((path) => path.startsWith(reqPath) && !path.includes('$skiptoken'))
                .replyWithFile(200, join(mockRespPath, `v4ServiceGroupsPage-1.json`), {
                    'Content-Type': 'application/json'
                });
            for (let index = 2; index <= 4; index++) {
                nock(server)
                    .get((path) => path.startsWith(reqPath))
                    .query((query) => {
                        return query['$skiptoken'] === `${5 * (index - 1)}`;
                    })
                    .replyWithFile(200, join(mockRespPath, `v4ServiceGroupsPage-${index}.json`), {
                        'Content-Type': 'application/json'
                    });
            }

            const services = await catalog.listServices();
            expect(services.length).toEqual(31);
        });

        test('recommended service groups with paging', async () => {
            const provider = createForAbap(config);
            const catalog = provider.catalog(ODataVersion.v4);

            nock(server)
                .get(`${V4CatalogService.PATH}/$metadata`)
                .replyWithFile(200, join(__dirname, '../mockResponses/v4-catalog-metadata.xml'));
            nock(server)
                .get((path) => path.startsWith(reqPath))
                .replyWithFile(200, join(mockRespPath, `v4RecommendedServiceGroupsPage-1.json`), {
                    'Content-Type': 'application/json'
                });
            for (let index = 2; index <= 4; index++) {
                nock(server)
                    .get((path) => path.startsWith(reqPath))
                    .query((query) => {
                        return query['$skiptoken'] === `${5 * (index - 1)}`;
                    })
                    .replyWithFile(200, join(mockRespPath, `v4RecommendedServiceGroupsPage-${index}.json`), {
                        'Content-Type': 'application/json'
                    });
            }

            const services = await catalog.listServices();
            expect(services).toBeDefined();
            expect(services.length).toBeGreaterThan(0);
        });

        test('service returns an error', async () => {
            nock(server).get(`${V4CatalogService.PATH}/$metadata`).reply(200, join(__dirname, '<METADATA />'));
            nock(server)
                .get((path) => path.startsWith(reqPath))
                .reply(200, {
                    error: {
                        code: '42',
                        message: 'OData service error'
                    }
                });

            const provider = createForAbap(config);
            const catalog = provider.catalog(ODataVersion.v4);
            try {
                await catalog.listServices();
                fail('Should have thrown an error.');
            } catch (error) {
                expect(error['message']).toBeDefined();
            }
        });
    });

    describe('getServiceType', () => {
        // create a catalog for testing
        const provider = createForAbap(config);
        const catalog = provider.catalog(ODataVersion.v4);

        it('get the service type', async () => {
            const serviceType = catalog.getServiceType('mock/v4/service');
            await expect(serviceType).resolves.toBe(undefined);
        });
    });
});
