import { join } from 'path';
import nock from 'nock';
import {
    createForAbap,
    V2CatalogService,
    ODataVersion,
    TenantType,
    V4CatalogService,
    Ui5AbapRepositoryService,
    AppIndexService
} from '../../src';
import { ATO_CATALOG_URL_PATH } from '../../src/abap/ato';

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
        const provider = createForAbap(config);

        test('user', async () => {
            expect(await provider.user()).toBe(config.auth.username);
        });

        test('AtoInfo', async () => {
            const ato = { tenantType: TenantType.SAP };
            provider.setAtoInfo(ato);
            expect(await provider.getAtoInfo()).toBe(ato);
        });
    });

    describe('isS4Cloud', () => {
        test('S/4Cloud system', async () => {
            nock(server)
                .get(ATO_CATALOG_URL_PATH)
                .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsS4C.xml'));
            expect(await createForAbap(config).isS4Cloud()).toBe(true);
        });

        test('On premise system', async () => {
            nock(server)
                .get(ATO_CATALOG_URL_PATH)
                .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsNotS4C.xml'));
            expect(await createForAbap(config).isS4Cloud()).toBe(false);
        });

        test('No request if known', async () => {
            const provider = createForAbap(config);
            provider.s4Cloud = false;
            expect(await provider.isS4Cloud()).toBe(provider.s4Cloud);
        });

        test('Request failed', async () => {
            nock(server).get(ATO_CATALOG_URL_PATH).replyWithError('Something went wrong');
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
        test('ui5AbapRepository', () => {
            const service = provider.ui5AbapRepository();
            expect(service).toBe(provider.service(Ui5AbapRepositoryService.PATH));
        });
        test('appIndex', () => {
            const service = provider.appIndex();
            expect(service).toBe(provider.service(AppIndexService.PATH));
        });
    });
});
