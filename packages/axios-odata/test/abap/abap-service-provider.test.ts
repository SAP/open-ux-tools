import { join } from 'path';
import nock from 'nock';
import { createForAbap, V2CatalogService, ODataVersion } from '../../src';

nock.disableNetConnect();

describe('AbapServiceProvider', () => {
    const server = 'https://iccsrm.sap.com:44300';
    const config = {
        baseURL: server,
        auth: {
            username: 'USER',
            password: 'SECRET'
        }
    };

    describe('isS4Cloud', () => {
        test('S/4Cloud system', async () => {
            const s4Provider = createForAbap(config);

            nock(server)
                .get('/sap/bc/adt/ato/settings')
                .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsS4C.xml'));
            expect(await s4Provider.isS4Cloud()).toBe(true);
            // fetch the service again without triggering another request to the ATO service
            expect(await s4Provider.isS4Cloud()).toBe(true);
        });

        test('On premise system', async () => {
            nock(server)
                .get('/sap/bc/adt/ato/settings')
                .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsNotS4C.xml'));
            expect(await createForAbap(config).isS4Cloud()).toBe(false);
        });

        test('No request if known', async () => {
            const provider = createForAbap(config);
            provider.s4Cloud = false;
            expect(await provider.isS4Cloud()).toBe(false);
        });
    });

    describe('catalog', () => {
        test('V2', async () => {
            const provider = createForAbap(config);
            provider.s4Cloud = false;

            const catalog = await provider.catalog(ODataVersion.v2);
            expect(catalog).toBeDefined();
            expect(catalog.defaults.baseURL).toBe(`${server}${V2CatalogService.PATH}`);
            expect(await provider.catalog(ODataVersion.v2)).toEqual(catalog);
        });
    });
});
