import { createForAbap, ODataVersion, V2CatalogService, ServiceType } from '../../../src';
import { join } from 'path';
import nock from 'nock';

describe('V2CatalogService', () => {
    const server = 'https://sap.example';
    const config = {
        baseURL: server,
        auth: {
            username: 'USER',
            password: 'SECRET'
        }
    };

    beforeAll(() => {
        nock.disableNetConnect();
        nock(server)
            .get('/sap/bc/adt/ato/settings')
            .replyWithFile(200, join(__dirname, '../mockResponses/atoSettingsNotS4C.xml'))
            .persist();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    describe('listServices', () => {
        const provider = createForAbap(config);

        test('classic', async () => {
            nock(server)
                .get(`${V2CatalogService.PATH}/?$format=json`)
                .reply(200, { d: { EntitySets: ['ServiceCollection'] } });
            nock(server)
                .get((path) => path.startsWith(`${V2CatalogService.PATH}/ServiceCollection?`))
                .replyWithFile(200, join(__dirname, '../mockResponses/v2ServiceCollection.json'));

            const catalog = provider.catalog(ODataVersion.v2);
            const services = await catalog.listServices();
            expect(services).toBeDefined();
        });

        test('cloud', async () => {
            nock(server)
                .get(`${V2CatalogService.PATH}/?$format=json`)
                .reply(200, { d: { EntitySets: ['RecommendedServiceCollection'] } });
            nock(server)
                .get((path) => path.startsWith(`${V2CatalogService.PATH}/RecommendedServiceCollection?`))
                .replyWithFile(200, join(__dirname, '../mockResponses/v2RecommendedServiceCollection.json'));

            const catalog = provider.catalog(ODataVersion.v2);
            const services = await catalog.listServices();
            expect(services).toBeDefined();
        });

        test('error', async () => {
            nock(server)
                .get(`${V2CatalogService.PATH}/?$format=json`)
                .reply(200, { d: { EntitySets: ['RecommendedServiceCollection'] } });
            nock(server)
                .get((path) => path.startsWith(`${V2CatalogService.PATH}/RecommendedServiceCollection?`))
                .reply(200, {
                    error: {
                        code: '42',
                        message: 'OData service error'
                    }
                });

            const provider = createForAbap(config);
            const catalog = provider.catalog(ODataVersion.v2);
            try {
                await catalog.listServices();
                fail('Should have thrown an error.');
            } catch (error) {
                expect(error['message']).toBeDefined();
            }
        });
    });

    describe('getAnnotations', () => {
        // test service properties
        const id = 'TEST_SERVICE';
        const title = 'TEST_SERVICE';
        const path = `/TEST/${title}`;
        const anno = 'TEST_SERVICE_ANNO';
        const pathWithSegParams = `/TEST/${title};v=0001`;

        // create a catalog for testing
        const provider = createForAbap(config);
        const catalog = provider.catalog(ODataVersion.v2);

        beforeAll(() => {
            nock(server)
                .get(`${V2CatalogService.PATH}/?$format=json`)
                .replyWithFile(200, join(__dirname, '../mockResponses/v2CatalogDocument.json'))
                .persist();
            nock(server)
                .get((path) => path.startsWith(`${V2CatalogService.PATH}/ServiceCollection('${id}')/Annotations`))
                .replyWithFile(200, join(__dirname, '../mockResponses/v2ServiceAnnotations.json'))
                .persist();
            nock(server)
                .get((path) =>
                    path.startsWith(`${V2CatalogService.PATH}/Annotations(TechnicalName='${anno}',Version='0001')`)
                )
                .replyWithFile(200, join(__dirname, '../mockResponses/v2Annotations.xml'))
                .persist();
        });

        test('invalid parameters', async () => {
            await expect(catalog.getAnnotations({})).rejects.toThrowError();
            await expect(catalog.getAnnotations({ path: '/' })).rejects.toThrowError();
        });

        test('find by id', async () => {
            const annotations = await catalog.getAnnotations({ id });
            expect(annotations).toBeDefined();
            expect(annotations.length).toBe(1);
            expect(annotations[0].Definitions).toBeDefined();
        });

        test('find by path or title', async () => {
            nock(server)
                .get(
                    `${V2CatalogService.PATH}/ServiceCollection?$format=json&$filter=Title eq '${title}' and TechnicalServiceVersion eq 1`
                )
                .reply(200, {
                    d: {
                        results: [
                            {
                                ID: id,
                                ServiceUrl: path
                            },
                            {}
                        ]
                    }
                })
                .persist();

            const annotations = await catalog.getAnnotations({ path });
            expect(annotations).toBeDefined();
            expect(annotations.length).toBe(1);
            expect(annotations[0].Definitions).toBeDefined();
            const annotationsByTitle = await catalog.getAnnotations({ title });
            expect(annotationsByTitle[0].Definitions).toBe(annotations[0].Definitions);
            // service uri contains segment parameters
            const annotationsByPathWithSegParams = await catalog.getAnnotations({ path: pathWithSegParams });
            expect(annotationsByPathWithSegParams[0].Definitions).toBe(annotations[0].Definitions);
        });
    });

    describe('getServiceType', () => {
        // test service properties
        const id = 'TEST_SERVICE';
        const title = 'TEST_SERVICE';
        const path = `/TEST/${title}`;

        // create a catalog for testing
        const provider = createForAbap(config);
        const catalog = provider.catalog(ODataVersion.v2);

        it('get the service type', async () => {
            nock(server)
                .get(
                    `${V2CatalogService.PATH}/ServiceCollection?$format=json&$filter=Title eq '${title}' and TechnicalServiceVersion eq 1`
                )
                .reply(200, {
                    d: {
                        results: [
                            {
                                ID: id,
                                ServiceUrl: path,
                                ServiceType: 'Not Determined'
                            },
                            {}
                        ]
                    }
                });

            nock(server)
                .get(`${V2CatalogService.PATH}/ServiceTypeForHUBServices('${encodeURIComponent(id)}')?$format=json`)
                .reply(200, {
                    d: { ServiceIdentifier: id, ServiceName: title, ServiceVersion: '002', ServiceType: 'UI' }
                });

            const serviceType = catalog.getServiceType(path);
            await expect(serviceType).resolves.toBe(ServiceType.UI);
        });
    });
});
