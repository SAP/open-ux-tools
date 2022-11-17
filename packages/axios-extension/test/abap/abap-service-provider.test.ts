import { join } from 'path';
import nock from 'nock';
import {
    createForAbap,
    V2CatalogService,
    ODataVersion,
    TenantType,
    V4CatalogService,
    Ui5AbapRepositoryService,
    AppIndexService,
    LayeredRepositoryService
} from '../../src';

/**
 * URL are specific to the discovery schema.
 * Keep the URL paths same as those in packages/axios-extension/test/abap/mockResponses/discovery.xml
 */
enum AdtServices {
    DISCOVERY = '/sap/bc/adt/discovery',
    ATO_SETTINGS = '/sap/bc/adt/ato/settings',
    TRANSPORT_CHECKS = '/sap/bc/adt/cts/transportchecks',
    TRANSPORT_REQUEST = '/sap/bc/adt/cts/transports'
}

describe('AbapServiceProvider', () => {
    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    const server = 'https://server.example';
    const config = {
        baseURL: server,
        auth: {
            username: 'USER',
            password: 'SECRET'
        }
    };

    describe('getter/setter', () => {
        let provider = createForAbap(config);

        test('user', async () => {
            expect(await provider.user()).toBe(config.auth.username);
        });

        test('AtoInfo', async () => {
            const ato = { tenantType: TenantType.SAP };
            provider.setAtoInfo(ato);

            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'));
            expect(await provider.getAtoInfo()).toBe(ato);
        });

        test('AtoInfo - Invalid XML response', async () => {
            // Clean copy of provider without cached ATO setting info
            provider = createForAbap(config);

            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .get(AdtServices.ATO_SETTINGS)
                .reply(200, 'Some error message');
            expect(await provider.getAtoInfo()).toStrictEqual({});
        });
    });

    describe('isS4Cloud', () => {
        test('S/4Cloud system', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .get(AdtServices.ATO_SETTINGS)
                .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsS4C.xml'));
            expect(await createForAbap(config).isS4Cloud()).toBe(true);
        });

        test('On premise system', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .get(AdtServices.ATO_SETTINGS)
                .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsNotS4C.xml'));
            expect(await createForAbap(config).isS4Cloud()).toBe(false);
        });

        test('No request if known', async () => {
            const provider = createForAbap(config);
            provider.s4Cloud = false;
            expect(await provider.isS4Cloud()).toBe(provider.s4Cloud);
        });

        test('Request failed', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .get(AdtServices.ATO_SETTINGS)
                .replyWithError('Something went wrong');
            expect(await createForAbap(config).isS4Cloud()).toBe(false);
        });
    });

    describe('catalog', () => {
        test('V2', () => {
            const provider = createForAbap(config);
            provider.s4Cloud = false;

            const catalog = provider.catalog(ODataVersion.v2);
            expect(catalog).toBeDefined();
            expect(catalog.defaults.baseURL).toBe(`${server}${V2CatalogService.PATH}`);
            expect(provider.catalog(ODataVersion.v2)).toEqual(catalog);
        });

        test('V4', () => {
            const provider = createForAbap(config);
            provider.s4Cloud = false;

            const catalog = provider.catalog(ODataVersion.v4);
            expect(catalog).toBeDefined();
            expect(catalog.defaults.baseURL).toBe(`${server}${V4CatalogService.PATH}`);
            expect(provider.catalog(ODataVersion.v4)).toEqual(catalog);
        });

        test('Invalid version', async () => {
            const provider = createForAbap(config);
            provider.s4Cloud = false;
            try {
                provider.catalog('v9' as ODataVersion);
                fail('Error should have been thrown');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('services', () => {
        const provider = createForAbap(config);
        test('Ui5AbapRepository', () => {
            const service = provider.getUi5AbapRepository();
            expect(service).toBe(provider.service(Ui5AbapRepositoryService.PATH));
        });
        test('Ui5AbapRepository with alias', () => {
            const alias = '/alias/path';
            const service = provider.getUi5AbapRepository(alias);
            expect(service).toBe(provider.service(alias));
        });
        test('AppIndex', () => {
            const service = provider.getAppIndex();
            expect(service).toBe(provider.service(AppIndexService.PATH));
        });
        test('LayeredRepositoryService', () => {
            const service = provider.getLayeredRepository();
            expect(service).toBe(provider.service(LayeredRepositoryService.PATH));
        });
    });
});
