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
    createForAbapOnCloud,
    AbapCloudEnvironment
} from '../../src';
import * as auth from '../../src/auth';

/**
 * URL are specific to the discovery schema.
 * Keep the URL paths same as those in packages/axios-extension/test/abap/mockResponses/discovery.xml
 */
 enum AdtServices {
    DISCOVERY = '/sap/bc/adt/discovery',
    ATO_SETTINGS = '/sap/bc/adt/ato/settings',
    TRANSPORT_CHECKS = '/sap/bc/adt/cts/transportchecks',
    TRANSPORT_REQUEST = '/sap/bc/adt/cts/transportrequest',
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
    const existingCookieConfig = {
        baseURL: server,
        cookies: 'sap-usercontext=sap-client=100;SAP_SESSIONID_Y05_100=abc'
    };
    const configForAbapOnCloud = {
        service: {},
        environment: AbapCloudEnvironment.Standalone
    };
    const existingCookieConfigForAbapOnCloud = {
        service: {},
        cookies: 'sap-usercontext=sap-client=100;SAP_SESSIONID_Y05_100=abc',
        environment: AbapCloudEnvironment.Standalone
    };

    const testPackage = 'ZSPD';
    const testLocalPackage = '$TMP';
    const testNewPakcage = 'NEWPACKAGE';
    const testNewProject = 'zdummyexample';
    const testExistProject = 'zdummyexist';

    // Discovery schema is cached, so separate this test suite from other ADT service tests
    describe('ADT Services unavailable in discovery', () => {
        const provider = createForAbap(config);

        test('Services unavailable in discovery', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-2.xml'));

            expect(await provider.getAtoInfo()).toStrictEqual({});
            expect(await provider.getTransportRequests(testPackage, testNewProject)).toStrictEqual([]);
        });
    });

    describe('ADT discovery service errors', () => {
        const provider = createForAbap(config);

        test('ATO service - Invalid discovery schema format', async () => {
            nock(server).get(AdtServices.DISCOVERY).reply(200, 'Invalid non-XML text');
            expect(await provider.getAtoInfo()).toStrictEqual({});
        });

        test('ATO service - Invalid discovery schema content', async () => {
            nock(server).get(AdtServices.DISCOVERY).reply(200, '<root>Error message</root>');
            expect(await provider.getAtoInfo()).toStrictEqual({});
        });

        test('CTS service - Invalid discovery schema format', async () => {
            nock(server).get(AdtServices.DISCOVERY).reply(200, 'Invalid non-XML text');
            expect(await provider.getTransportRequests(testPackage, testNewProject)).toStrictEqual([]);
        });

        test('CTS service - Invalid discovery schema content', async () => {
            nock(server).get(AdtServices.DISCOVERY).reply(200, '<root>Error message</root>');
            expect(await provider.getTransportRequests(testPackage, testNewProject)).toStrictEqual([]);
        });
    });

    describe('Transport checks', () => {
        const provider = createForAbap(config);

        test('Unexpected response - invalid XML', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .post(AdtServices.TRANSPORT_CHECKS)
                .reply(200, 'Some error message from backend');
            expect(await provider.getTransportRequests(testPackage, testNewProject)).toStrictEqual([]);
        });

        test('Unexpected response - error or unknown XML', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .post(AdtServices.TRANSPORT_CHECKS)
                .reply(200, '<unknown></unknown>');
            expect(await provider.getTransportRequests(testPackage, testNewProject)).toStrictEqual([]);
        });

        test('Valid package name, new project name', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .post(AdtServices.TRANSPORT_CHECKS)
                .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-1.xml'));
            expect(await provider.getTransportRequests(testPackage, testNewProject)).toStrictEqual([
                expect.objectContaining({
                    transportNumber: 'EC1K900294',
                    user: 'TESTUSER',
                    description: 'Fiori tools'
                }),
                expect.objectContaining({
                    transportNumber: 'EC1K900295',
                    user: 'TESTUSER2',
                    description: 'Fiori tools'
                })
            ]);
        });

        test('Valid package name, existing project name', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .post(AdtServices.TRANSPORT_CHECKS)
                .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-2.xml'));
            expect(await provider.getTransportRequests(testPackage, testExistProject)).toStrictEqual([
                expect.objectContaining({
                    transportNumber: 'EC1K900294',
                    user: 'TESTUSER',
                    description: 'Fiori tools'
                })
            ]);
        });

        test('Valid package name, existing project name - no transport number', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .post(AdtServices.TRANSPORT_CHECKS)
                .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-5.xml'));
            expect(await provider.getTransportRequests(testPackage, testExistProject)).toStrictEqual([]);
        });

        test('Local package: no transport number required for deploy for both new and exist project', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .post(AdtServices.TRANSPORT_CHECKS)
                .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-3.xml'));
            expect(await provider.getTransportRequests(testLocalPackage, testExistProject)).toStrictEqual([]);
        });

        test('New package name: no transport number available', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .post(AdtServices.TRANSPORT_CHECKS)
                .replyWithFile(200, join(__dirname, 'mockResponses/transportChecks-4.xml'));
            expect(await provider.getTransportRequests(testNewPakcage, testNewProject)).toStrictEqual([]);
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

    describe('Use existing connection session', () => {
        const attachUaaAuthInterceptorSpy = jest.spyOn(auth, 'attachUaaAuthInterceptor');

        test('abap service provider', async () => {
            const provider = createForAbap(existingCookieConfig);
            expect(provider.cookies.toString()).toBe('sap-usercontext=sap-client=100; SAP_SESSIONID_Y05_100=abc');
        });

        test('abap service provider for cloud', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .get(AdtServices.ATO_SETTINGS)
                .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsS4C.xml'));

            const provider = createForAbapOnCloud(existingCookieConfigForAbapOnCloud as any);
            expect(provider.cookies.toString()).toBe('sap-usercontext=sap-client=100; SAP_SESSIONID_Y05_100=abc');
            expect(await provider.isS4Cloud()).toBe(false);
            expect(attachUaaAuthInterceptorSpy.mockImplementation(jest.fn())).toBeCalledTimes(0);
        });

        test('abap service provider for cloud - require authentication', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .get(AdtServices.ATO_SETTINGS)
                .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsS4C.xml'));

            const provider = createForAbapOnCloud(configForAbapOnCloud as any);
            expect(await provider.isS4Cloud()).toBe(false);
            expect(attachUaaAuthInterceptorSpy.mockImplementation(jest.fn())).toBeCalledTimes(1);
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
            const service = provider.ui5AbapRepository;
            expect(service).toBe(provider.service(Ui5AbapRepositoryService.PATH));
        });
        test('appIndex', () => {
            const service = provider.appIndex;
            expect(service).toBe(provider.service(AppIndexService.PATH));
        });
    });
});
