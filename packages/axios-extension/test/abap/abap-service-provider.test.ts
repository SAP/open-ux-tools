import { join } from 'node:path';
import nock from 'nock';
import type { AbapServiceProvider } from '../../src';
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
import { UI5VersionService } from '../../src/abap/ui5-version-service';

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
            const ato = {
                tenantType: TenantType.Customer,
                'developmentPackage': 'TEST_XYZ_DEFAULT',
                'developmentPrefix': 'XYZ_',
                'isConfigured': true,
                'isExtensibilityDevelopmentSystem': true,
                'isManagedExtensibilityActive': false,
                'isNotificationAllowed': true,
                'isPrefixNamespace': false,
                'isTransportRequestRequired': false,
                'operationsType': 'C',
                'sandboxPackage': 'TEST_XYZ_DEFAULT',
                'sandboxPrefix': 'XYZ_',
                'tenantRole': 7,
                'transportationMode': 'COL'
            };
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .get(AdtServices.ATO_SETTINGS)
                .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsS4C.xml'));
            const abapSrvProvider = await createForAbap(config);
            expect(await abapSrvProvider.isAbapCloud()).toBe(true);
            expect(await abapSrvProvider.getAtoInfo()).toStrictEqual(ato);
        });

        test('On premise system', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .get(AdtServices.ATO_SETTINGS)
                .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsNotS4C.xml'));
            expect(await createForAbap(config).isAbapCloud()).toBe(false);
        });

        test('No request if known', async () => {
            const provider = createForAbap(config);
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .get(AdtServices.ATO_SETTINGS)
                .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsS4C.xml'));
            await provider.isAbapCloud();
            expect(await provider.isAbapCloud()).toBe(true);
        });

        test('Request failed', async () => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .get(AdtServices.ATO_SETTINGS)
                .replyWithError('Something went wrong');
            expect(await createForAbap(config).isAbapCloud()).toBe(false);
        });
    });

    describe('catalog', () => {
        beforeEach(() => {
            nock(server)
                .get(AdtServices.DISCOVERY)
                .replyWithFile(200, join(__dirname, 'mockResponses/discovery-1.xml'))
                .get(AdtServices.ATO_SETTINGS)
                .replyWithFile(200, join(__dirname, 'mockResponses/atoSettingsNotS4C.xml'));
        });

        test('V2', () => {
            const provider = createForAbap(config);

            const catalog = provider.catalog(ODataVersion.v2);
            expect(catalog).toBeDefined();
            expect(catalog.defaults.baseURL).toBe(`${server}${V2CatalogService.PATH}`);
            expect(provider.catalog(ODataVersion.v2).services).toEqual(catalog.services);
        });

        test('V4', () => {
            const provider = createForAbap(config);

            const catalog = provider.catalog(ODataVersion.v4);
            expect(catalog).toBeDefined();
            expect(catalog.defaults.baseURL).toBe(`${server}${V4CatalogService.PATH}`);
            expect(provider.catalog(ODataVersion.v4).services).toEqual(catalog.services);
        });

        test('Invalid version', async () => {
            const provider = createForAbap(config);
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
        test('LayeredRepositoryService with alias', () => {
            const alias = '/alias/path';
            const service = provider.getLayeredRepository(alias);
            expect(service).toBe(provider.service(alias));
        });
        test('UI5VersionService', () => {
            const service = provider.getUI5VersionService();
            expect(service).toBe(provider.service(UI5VersionService.PATH));
        });
    });

    describe('getODataServiceGenerator', () => {
        let provider: any;
        let mockRapGeneratorService: any;
        let mockGenerator: any;
        const packageName = 'Z_MY_PKG';
        const config = {
            category: {
                term: 'ABAP RESTful Application Programming Model',
                label: 'Services of ABAP RESTful Application Programming Model (RAP).'
            },
            content: {
                'type': 'application/vnd.sap.adt.repository.generator.v1+json',
                'src': 'published-x-ui-service'
            },
            id: 'published-x-ui-service',
            link: [
                {
                    'href': '/sap/bc/adt/rap/generators/webapi/published-x-ui-service/content',
                    'rel': 'http://www.sap.com/adt/repository/generator/content',
                    'type': 'application/vnd.sap.adt.serverdriven.content.v1+json; framework=generators.v1'
                }
            ],
            'published': '2024-06-13T00:00:00Z',
            'summary':
                'An OData UI service makes it possible to consume a RAP service with a Fiori Elements UI or other UI clients',
            'title': 'API OData UI Service From Scratch',
            'updated': '2024-06-13T00:00:00Z',
            'referencedObjectTypes': ''
        };

        beforeEach(() => {
            mockRapGeneratorService = {
                getRAPGeneratorConfig: jest.fn().mockResolvedValue(config)
            };
            mockGenerator = {
                setContentType: jest.fn(),
                configure: jest.fn()
            };
            provider = createForAbap({
                baseURL: 'https://server.example',
                auth: { username: 'USER', password: 'SECRET' }
            });
            // Mock methods
            provider.getAdtService = jest.fn().mockResolvedValue(mockRapGeneratorService);
            provider.createService = jest.fn().mockReturnValue(mockGenerator);
        });

        test('should create and configure ODataServiceGenerator', async () => {
            const result = await provider.getODataServiceGenerator(packageName);
            expect(provider.getAdtService).toHaveBeenCalledWith(expect.any(Function));
            expect(mockRapGeneratorService.getRAPGeneratorConfig).toHaveBeenCalled();
            expect(provider.createService).toHaveBeenCalledWith(
                '/sap/bc/adt/rap/generators/webapi/published-x-ui-service',
                expect.any(Function)
            );
            expect(mockGenerator.setContentType).toHaveBeenCalledWith(
                'application/vnd.sap.adt.serverdriven.content.v1+json; framework=generators.v1'
            );
            expect(mockGenerator.configure).toHaveBeenCalledWith(config, packageName);
            expect(result).toBe(mockGenerator);
        });

        test('should use $TMP if packageName is falsy', async () => {
            await provider.getODataServiceGenerator('');
            expect(mockGenerator.configure).toHaveBeenCalledWith(config, '$TMP');
        });

        test('should throw if RAP Generator not supported', async () => {
            provider.getAdtService = jest.fn().mockResolvedValue(null);
            await expect(provider.getODataServiceGenerator(packageName)).rejects.toThrow(
                'RAP Generator are not support on this system'
            );
        });
    });
    describe('fetchValueListReferenceServices', () => {
        let provider: AbapServiceProvider;

        beforeEach(() => {
            provider = createForAbap({
                baseURL: 'https://server.example',
                auth: { username: 'USER', password: 'SECRET' }
            });
        });

        test('should return value list data', async () => {
            const metadataSpy = jest.fn().mockResolvedValue('metadata');
            const serviceSpy = jest.spyOn(provider, 'service').mockReturnValue({
                metadata: metadataSpy
            } as any);
            const result = await provider.fetchExternalServices([
                {
                    type: 'value-list',
                    target: 'target',
                    serviceRootPath: '/sap/opu/odata/sap/ZMY_SERVICE_SRV/',
                    value: '../../srv_f4/$metadata'
                }
            ]);

            expect(result).toMatchSnapshot();
            expect(serviceSpy).toHaveBeenCalledWith('/sap/opu/odata/srv_f4');
            expect(metadataSpy).toHaveBeenCalled();
        });

        test('should return code list data', async () => {
            const metadataSpy = jest.fn().mockResolvedValue('metadata');
            const serviceSpy = jest.spyOn(provider, 'service').mockReturnValue({
                metadata: metadataSpy
            } as any);
            const result = await provider.fetchExternalServices([
                {
                    type: 'code-list',
                    collectionPath: 'Currencies',
                    serviceRootPath: '/sap/opu/odata/sap/ZMY_SERVICE_SRV/',
                    value: '../../srv_f4/$metadata'
                }
            ]);

            expect(result).toMatchSnapshot();
            expect(serviceSpy).toHaveBeenCalledWith('/sap/opu/odata/srv_f4');
            expect(metadataSpy).toHaveBeenCalled();
        });

        test('should not crash if promise rejects', async () => {
            const metadataSpy = jest.fn().mockResolvedValue('metadata');
            jest.spyOn(provider, 'service').mockImplementation((path) => {
                if (path === '/sap/opu/odata/srv_f4/one') {
                    throw new Error('Error creating service');
                }
                return {
                    metadata: metadataSpy
                } as any;
            });
            const result = await provider.fetchExternalServices([
                {
                    type: 'value-list',
                    target: 'target',
                    serviceRootPath: '/sap/opu/odata/sap/ZMY_SERVICE_SRV/',
                    value: '../../srv_f4/one/$metadata'
                },
                {
                    type: 'value-list',
                    target: 'target',
                    serviceRootPath: '/sap/opu/odata/sap/ZMY_SERVICE_SRV/',
                    value: '../../srv_f4/two/$metadata'
                }
            ]);

            expect(result).toMatchSnapshot();
        });
        test('should log if metadata loading fails', async () => {
            const metadataSpy = jest.fn().mockResolvedValue('metadata');
            const logSpy = jest.spyOn(provider.log, 'warn');
            const serviceSpy = jest.spyOn(provider, 'service').mockImplementation((path) => {
                if (path === '/sap/opu/odata/srv_f4/one') {
                    return {
                        metadata: jest.fn().mockRejectedValue(new Error('Server error'))
                    } as any;
                }
                return {
                    metadata: metadataSpy
                } as any;
            });
            const result = await provider.fetchExternalServices([
                {
                    type: 'value-list',
                    target: 'target',
                    serviceRootPath: '/sap/opu/odata/sap/ZMY_SERVICE_SRV/',
                    value: '../../srv_f4/one/$metadata'
                },
                {
                    type: 'value-list',
                    target: 'target',
                    serviceRootPath: '/sap/opu/odata/sap/ZMY_SERVICE_SRV/',
                    value: '../../srv_f4/two/$metadata'
                }
            ]);

            expect(result).toMatchSnapshot();
            expect(logSpy).toHaveBeenCalledWith(
                'Could not fetch value list reference metadata from /sap/opu/odata/srv_f4/one, Server error'
            );
            expect(serviceSpy).toHaveBeenCalledWith('/sap/opu/odata/srv_f4/one');
        });
    });
});
