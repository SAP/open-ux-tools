import { jest } from '@jest/globals';
import type { BackendSystem, ConnectionType, SystemType } from '@sap-ux/store';
import type { ODataService } from '@sap-ux/axios-extension';
import { ODataVersion } from '@sap-ux/axios-extension';

// Mock dependencies
const mockGetService = jest.fn<any>();
const realStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getService: mockGetService
}));

const mockAbapServiceProvider = jest.fn<any>();
const mockCreateForDestination = jest.fn<any>();
const mockTlsPatchApply = jest.fn();
const mockTlsPatchIsPatchRequired = jest.fn<(url: string) => boolean>().mockReturnValue(false);
jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    AbapServiceProvider: mockAbapServiceProvider,
    createForDestination: mockCreateForDestination,
    ODataVersion,
    TlsPatch: {
        isPatchRequired: mockTlsPatchIsPatchRequired,
        apply: mockTlsPatchApply
    }
}));

const realLogger = await import('@sap-ux/logger');
jest.unstable_mockModule('@sap-ux/logger', () => ({
    ...realLogger,
    ToolsLogger: jest.fn().mockImplementation(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

const mockParseEdmx = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/edmx-parser', () => ({
    parse: mockParseEdmx
}));

const mockFormatXml = jest.fn<any>((xml: string) => xml);
jest.unstable_mockModule('xml-formatter', () => ({ default: mockFormatXml }));

const mockIsAppStudio = jest.fn<() => boolean>().mockReturnValue(false);
const mockListDestinations = jest.fn<any>();
const mockIsAbapODataDestination = jest.fn<any>().mockReturnValue(true);
const actualBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...actualBtpUtils,
    isAppStudio: mockIsAppStudio,
    listDestinations: mockListDestinations,
    isAbapODataDestination: mockIsAbapODataDestination
}));

const { findSystem, findService, getServiceMetadata, getSystemsOrDestinations } =
    await import('../../../src/tools/services/sap-system.js');

describe('service-metadata', () => {
    let mockGetAll: jest.Mock;
    const commonSystemProps: { connectionType: ConnectionType; systemType: SystemType } = {
        connectionType: 'abap_catalog',
        systemType: 'OnPrem'
    };
    const mockSystems: BackendSystem[] = [
        {
            name: 'TestSystem1',
            url: 'https://test1.example.com',
            client: '100',
            username: 'user1',
            password: 'pass1',
            ...commonSystemProps
        },
        {
            name: 'TestSystem2',
            url: 'https://test2.example.com',
            client: '200',
            username: 'user2',
            password: 'pass2',
            ...commonSystemProps
        },
        {
            name: 'ProductionSystem',
            url: 'https://prod.example.com',
            client: '300',
            username: 'produser',
            password: 'prodpass',
            ...commonSystemProps
        },
        {
            name: 'DevSystem',
            url: 'https://dev.example.com',
            client: '400',
            ...commonSystemProps
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockIsAppStudio.mockReturnValue(false);

        // Mock SystemService
        mockGetAll = jest.fn<any>().mockResolvedValue(mockSystems);
        mockGetService.mockImplementation(() => ({
            getAll: mockGetAll
        }));

        // Mock parseEdmx to return a valid parsed result by default
        mockParseEdmx.mockReturnValue({ edmx: 'parsedMetadata' });

        // Mock formatXml to return the input unchanged by default
        mockFormatXml.mockImplementation((xml: string) => xml);

        // Default: TlsPatch not required
        mockTlsPatchIsPatchRequired.mockReturnValue(false);
    });
    describe('findSystem', () => {
        test('should find system by exact name match', async () => {
            const result = await findSystem('TestSystem1');
            expect(result.system).toEqual(mockSystems[0]);
        });

        test('should find system by case-insensitive exact name match', async () => {
            const result = await findSystem('testsystem1');
            expect(result.system).toEqual(mockSystems[0]);
        });

        test('should find system by partial name match anywhere in name', async () => {
            const result = await findSystem('Production');
            expect(result.system).toEqual(mockSystems[2]);
        });

        test('should find system by URL with client', async () => {
            const result = await findSystem('https://test1.example.com?sap-client=100');
            expect(result.system).toEqual(mockSystems[0]);
        });

        test('should find system by URL without client', async () => {
            const result = await findSystem('https://test1.example.com');
            expect(result.system).toEqual(mockSystems[0]);
        });

        test('should find system by URL with different client (fallback)', async () => {
            const result = await findSystem('https://test1.example.com?sap-client=999');
            // Should still match by URL only
            expect(result.system).toEqual(mockSystems[0]);
        });

        test('should return raw system when URL not stored', async () => {
            const result = await findSystem('https://unknown.example.com?sap-client=500');
            expect(result.system).toEqual({
                name: 'https://unknown.example.com',
                url: 'https://unknown.example.com',
                client: '500'
            });
        });

        test('should return synthetic system when no matching system found', async () => {
            // Override mock to return empty array for this test
            mockGetAll.mockResolvedValueOnce([]);

            // When no match is found, matchSystemByUrl creates a synthetic system
            const result = await findSystem('https://nonexistent.example.com');
            expect(result.system?.url).toBe('https://nonexistent.example.com');
        });

        test('should find unique system by case-insensitive partial match', async () => {
            const result = await findSystem('dev');
            expect(result.system).toEqual(mockSystems[3]);
        });

        test('should return undefined system with message when multiple systems match by URL', async () => {
            // Two systems with the same host → URL-match returns multiple
            mockGetAll.mockResolvedValueOnce([
                { ...mockSystems[0], url: 'https://shared.example.com', client: '100', name: 'SharedA' },
                { ...mockSystems[1], url: 'https://shared.example.com', client: '200', name: 'SharedB' }
            ]);
            const result = await findSystem('https://shared.example.com');
            expect(result.system).toBeUndefined();
            expect(result.message).toMatch(/Multiple systems found matching/);
            expect(result.message).toContain('SharedA');
        });
    });

    describe('getServiceMetadata', () => {
        const mockMetadata =
            '<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">...</edmx:Edmx>';
        const mockService: Partial<ODataService> = {
            metadata: jest.fn<any>().mockResolvedValue(mockMetadata)
        };
        const mockServiceProvider = {
            catalog: jest.fn<any>().mockReturnValue({
                listServices: jest
                    .fn<any>()
                    .mockResolvedValue([{ path: '/sap/opu/odata4/service1' }, { path: '/sap/opu/odata4/service2' }])
            }),
            service: jest.fn<any>().mockReturnValue(mockService)
        };

        beforeEach(() => {
            mockAbapServiceProvider.mockImplementation(() => mockServiceProvider);
        });

        test('should apply TlsPatch when baseURL requires it', async () => {
            mockTlsPatchIsPatchRequired.mockReturnValue(true);
            const sapSystem: BackendSystem = {
                name: 'CorpSystem',
                url: 'https://corp-system.example.com',
                client: '000',
                ...commonSystemProps
            };

            await getServiceMetadata(sapSystem, '/sap/opu/odata4/service1');

            expect(mockTlsPatchIsPatchRequired).toHaveBeenCalledWith('https://corp-system.example.com');
            expect(mockTlsPatchApply).toHaveBeenCalledTimes(1);
        });

        test('should not apply TlsPatch when baseURL does not require it', async () => {
            mockTlsPatchIsPatchRequired.mockReturnValue(false);
            const sapSystem: BackendSystem = {
                name: 'PublicSystem',
                url: 'https://test.example.com',
                client: '100',
                ...commonSystemProps
            };

            await getServiceMetadata(sapSystem, '/sap/opu/odata4/service1');

            expect(mockTlsPatchIsPatchRequired).toHaveBeenCalledWith('https://test.example.com');
            expect(mockTlsPatchApply).not.toHaveBeenCalled();
        });

        test('should fetch service metadata successfully', async () => {
            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100',
                username: 'user',
                password: 'pass',
                ...commonSystemProps
            };

            const result = await getServiceMetadata(sapSystem, '/sap/opu/odata4/service1');

            expect(mockAbapServiceProvider).toHaveBeenCalledWith({
                baseURL: 'https://test.example.com',
                params: {
                    'sap-client': '100'
                },
                auth: {
                    username: 'user',
                    password: 'pass'
                }
            });
            expect(mockServiceProvider.catalog).toHaveBeenCalledWith(ODataVersion.v4);
            expect(mockServiceProvider.service).toHaveBeenCalledWith('/sap/opu/odata4/service1');
            expect(mockService.metadata).toHaveBeenCalled();
            expect(result).toBe(mockMetadata);
        });

        test('should fetch service metadata without auth credentials', async () => {
            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100',
                ...commonSystemProps
            };

            const result = await getServiceMetadata(sapSystem, '/sap/opu/odata4/service1');

            expect(mockAbapServiceProvider).toHaveBeenCalledWith({
                baseURL: 'https://test.example.com',
                params: {
                    'sap-client': '100'
                }
            });
            expect(result).toBe(mockMetadata);
        });

        test('should handle exact service path match', async () => {
            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100',
                ...commonSystemProps
            };

            await getServiceMetadata(sapSystem, '/sap/opu/odata4/service1');

            expect(mockServiceProvider.service).toHaveBeenCalledWith('/sap/opu/odata4/service1');
        });

        test('should handle service path not in catalog', async () => {
            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100',
                ...commonSystemProps
            };

            await getServiceMetadata(sapSystem, '/sap/opu/odata4/service3');

            expect(mockServiceProvider.service).toHaveBeenCalledWith('/sap/opu/odata4/service3');
        });

        test('should handle when catalog listing fails', async () => {
            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest.fn<any>().mockRejectedValue(new Error('Catalog not available'))
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100',
                ...commonSystemProps
            };

            const result = await getServiceMetadata(sapSystem, '/sap/opu/odata4/service1');

            expect(mockServiceProvider.service).toHaveBeenCalledWith('/sap/opu/odata4/service1');
            expect(result).toBe(mockMetadata);
        });

        test('should handle when no services found in catalog', async () => {
            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest.fn<any>().mockResolvedValue([])
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100',
                ...commonSystemProps
            };

            const result = await getServiceMetadata(sapSystem, '/sap/opu/odata4/service1');

            expect(mockServiceProvider.service).toHaveBeenCalledWith('/sap/opu/odata4/service1');
            expect(result).toBe(mockMetadata);
        });

        test('should throw error when multiple services match path', async () => {
            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest
                    .fn<any>()
                    .mockResolvedValue([{ path: '/sap/opu/odata4/service1' }, { path: '/sap/opu/odata4/service1' }])
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100',
                ...commonSystemProps
            };

            await expect(getServiceMetadata(sapSystem, '/sap/opu/odata4/service1')).rejects.toThrow(
                'Multiple OData V4 services found matching path: /sap/opu/odata4/service1'
            );
        });

        test('should handle service with client parameter', async () => {
            // Reset mock to original state to avoid duplicate path error
            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest
                    .fn<any>()
                    .mockResolvedValue([{ path: '/sap/opu/odata4/service1' }, { path: '/sap/opu/odata4/service2' }])
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '500',
                ...commonSystemProps
            };

            await getServiceMetadata(sapSystem, '/sap/opu/odata4/service1');

            expect(mockAbapServiceProvider).toHaveBeenCalledWith({
                baseURL: 'https://test.example.com',
                params: {
                    'sap-client': '500'
                }
            });
        });

        test('should handle full URL in servicePath', async () => {
            // Reset mock to original state
            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest
                    .fn<any>()
                    .mockResolvedValue([{ path: '/sap/opu/odata4/service1' }, { path: '/sap/opu/odata4/service2' }])
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100',
                ...commonSystemProps
            };

            await getServiceMetadata(sapSystem, 'https://test.example.com/sap/opu/odata4/service3');

            expect(mockServiceProvider.service).toHaveBeenCalledWith('/sap/opu/odata4/service3');
        });

        test('should throw error when metadata is invalid (parsing fails)', async () => {
            // Mock parseEdmx to throw an error
            mockParseEdmx.mockImplementationOnce(() => {
                throw new Error('Invalid XML');
            });

            // Reset catalog mock to avoid duplicate path error
            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest
                    .fn<any>()
                    .mockResolvedValue([{ path: '/sap/opu/odata4/service1' }, { path: '/sap/opu/odata4/service2' }])
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100'
            } as BackendSystem;

            await expect(getServiceMetadata(sapSystem, '/sap/opu/odata4/service1')).rejects.toThrow(
                'Failed to parse service metadata. The service may not be a valid OData V4 service.'
            );

            expect(mockParseEdmx).toHaveBeenCalledWith(mockMetadata);
        });

        test('should throw error when metadata parsing returns undefined', async () => {
            mockParseEdmx.mockReturnValueOnce(undefined);

            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest
                    .fn<any>()
                    .mockResolvedValue([{ path: '/sap/opu/odata4/service1' }, { path: '/sap/opu/odata4/service2' }])
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100'
            } as BackendSystem;

            await expect(getServiceMetadata(sapSystem, '/sap/opu/odata4/service1')).rejects.toThrow(
                'Failed to parse service metadata. The service may not be a valid OData V4 service.'
            );

            expect(mockParseEdmx).toHaveBeenCalledWith(mockMetadata);
        });

        test('should throw error when metadata parsing returns null', async () => {
            mockParseEdmx.mockReturnValueOnce(null);

            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest
                    .fn<any>()
                    .mockResolvedValue([{ path: '/sap/opu/odata4/service1' }, { path: '/sap/opu/odata4/service2' }])
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100'
            } as BackendSystem;

            await expect(getServiceMetadata(sapSystem, '/sap/opu/odata4/service1')).rejects.toThrow(
                'Failed to parse service metadata. The service may not be a valid OData V4 service.'
            );

            expect(mockParseEdmx).toHaveBeenCalledWith(mockMetadata);
        });

        test('should validate metadata is parseable before returning', async () => {
            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest
                    .fn<any>()
                    .mockResolvedValue([{ path: '/sap/opu/odata4/service1' }, { path: '/sap/opu/odata4/service2' }])
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100'
            } as BackendSystem;

            const result = await getServiceMetadata(sapSystem, '/sap/opu/odata4/service1');

            expect(mockParseEdmx).toHaveBeenCalledWith(mockMetadata);
            expect(result).toBe(mockMetadata);
        });

        test('should handle service fetch directly when path has query parameters', async () => {
            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest.fn<any>().mockResolvedValue([])
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100'
            } as BackendSystem;

            await getServiceMetadata(sapSystem, 'https://test.example.com/sap/opu/odata4/service1?param=value');

            expect(mockServiceProvider.service).toHaveBeenCalledWith('/sap/opu/odata4/service1');
        });

        test('should propagate error when service.metadata() fails', async () => {
            const mockFailingService: Partial<ODataService> = {
                metadata: jest.fn<any>().mockRejectedValue(new Error('Network error'))
            };
            mockServiceProvider.service.mockReturnValueOnce(mockFailingService);

            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest
                    .fn<any>()
                    .mockResolvedValue([{ path: '/sap/opu/odata4/service1' }, { path: '/sap/opu/odata4/service2' }])
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100'
            } as BackendSystem;

            await expect(getServiceMetadata(sapSystem, '/sap/opu/odata4/service1')).rejects.toThrow('Network error');
        });

        test('should handle system without client', async () => {
            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest
                    .fn<any>()
                    .mockResolvedValue([{ path: '/sap/opu/odata4/service1' }, { path: '/sap/opu/odata4/service2' }])
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: undefined as any
            } as BackendSystem;

            await getServiceMetadata(sapSystem, '/sap/opu/odata4/service1');

            expect(mockAbapServiceProvider).toHaveBeenCalledWith({
                baseURL: 'https://test.example.com',
                params: {
                    'sap-client': undefined
                }
            });
        });
    });

    describe('URL parsing edge cases', () => {
        test('should handle URL with multiple query parameters', async () => {
            const result = await findSystem('https://test1.example.com?sap-client=100&param=value');
            expect(result.system).toEqual(mockSystems[0]);
        });

        test('should find system when partial query at start matches single system', async () => {
            const result = await findSystem('Dev');
            expect(result.system).toEqual(mockSystems[3]);
        });

        test('should create synthetic system from valid URL not in storage', async () => {
            mockGetAll.mockResolvedValueOnce([]);
            const result = await findSystem('https://new-system.example.com?sap-client=999');
            expect(result.system).toEqual({
                name: 'https://new-system.example.com',
                url: 'https://new-system.example.com',
                client: '999'
            });
        });

        test('should return undefined system when URL is not http', async () => {
            mockGetAll.mockResolvedValueOnce([]);
            const result = await findSystem('not-a-url');
            expect(result.system).toBeUndefined();
        });
    });

    describe('findService', () => {
        const v4Services = [
            {
                id: '/DMO/SD_TRAVEL_MDSK',
                name: '/DMO/SB_TRAVEL_MDSK_O4 > /DMO/SD_TRAVEL_MDSK',
                group: '/DMO/SB_TRAVEL_MDSK_O4',
                path: '/sap/opu/odata4/dmo/sb_travel_mdsk_o4/srvd/dmo/sd_travel_mdsk/0001/',
                serviceVersion: '0001',
                odataVersion: ODataVersion.v4,
                serviceType: undefined
            },
            {
                id: '/DMO/SD_TRAVEL_MDSK_A',
                name: '/DMO/SB_TRAVEL_MDSK_A_O4 > /DMO/SD_TRAVEL_MDSK_A',
                group: '/DMO/SB_TRAVEL_MDSK_A_O4',
                path: '/sap/opu/odata4/dmo/sb_travel_mdsk_a_o4/srvd/dmo/sd_travel_mdsk_a/0001/',
                serviceVersion: '0001',
                odataVersion: ODataVersion.v4,
                serviceType: undefined
            }
        ];

        let mockV4Catalog: { listServices: jest.Mock<any> };
        let mockV2Catalog: { listServices: jest.Mock<any> };
        let mockFindServiceProvider: { catalog: jest.Mock<any>; service: jest.Mock<any> };

        beforeEach(() => {
            mockV4Catalog = { listServices: jest.fn<any>().mockResolvedValue(v4Services) };
            mockV2Catalog = { listServices: jest.fn<any>().mockResolvedValue([]) };
            mockFindServiceProvider = {
                catalog: jest
                    .fn<any>()
                    .mockImplementation((version: ODataVersion) =>
                        version === ODataVersion.v4 ? mockV4Catalog : mockV2Catalog
                    ),
                service: jest.fn<any>()
            };
            mockAbapServiceProvider.mockImplementation(() => mockFindServiceProvider);
        });

        test('should find service by exact case-insensitive id match and return full ODataServiceInfo', async () => {
            const system = mockSystems[0];
            const result = await findService(system, '/DMO/SD_TRAVEL_MDSK');
            expect(result.found).toBe(true);
            if (result.found) {
                expect(result.service).toEqual(v4Services[0]);
                expect(result.service.path).toBe('/sap/opu/odata4/dmo/sb_travel_mdsk_o4/srvd/dmo/sd_travel_mdsk/0001/');
            }
        });

        test('should match id case-insensitively', async () => {
            const system = mockSystems[0];
            const result = await findService(system, '/dmo/sd_travel_mdsk');
            expect(result.found).toBe(true);
        });

        test('should return suggestions when no exact match', async () => {
            const system = mockSystems[0];
            const result = await findService(system, 'TRAVEL_MDSK');
            expect(result.found).toBe(false);
            if (!result.found) {
                expect(result.suggestions.length).toBeGreaterThan(0);
                expect(result.suggestions[0]).toHaveProperty('id');
                expect(result.suggestions[0]).toHaveProperty('path');
                expect(result.suggestions[0]).toHaveProperty('serviceVersion');
                expect(result.suggestions[0]).toHaveProperty('odataVersion');
            }
        });

        test('should suggest services whose name starts with the query', async () => {
            const result = await findService(mockSystems[0], '/DMO/SB_TRAVEL');
            expect(result.found).toBe(false);
            if (!result.found) {
                expect(result.suggestions.some((s) => s.name.startsWith('/DMO/SB_TRAVEL'))).toBe(true);
            }
        });

        test('should suggest services whose name contains the query', async () => {
            const result = await findService(mockSystems[0], 'SD_TRAVEL_MDSK');
            expect(result.found).toBe(false);
            if (!result.found) {
                expect(result.suggestions.some((s) => s.name.includes('SD_TRAVEL_MDSK'))).toBe(true);
            }
        });

        test('should suggest services when query contains the service name', async () => {
            // query is longer but contains the service name — e.g. user types the full group path
            const result = await findService(mockSystems[0], '/DMO/SB_TRAVEL_MDSK_O4 > /DMO/SD_TRAVEL_MDSK');
            expect(result.found).toBe(false);
            if (!result.found) {
                // The name '/DMO/SB_TRAVEL_MDSK_O4 > /DMO/SD_TRAVEL_MDSK' is included in the query (exact case)
                expect(result.suggestions.length).toBeGreaterThan(0);
            }
        });

        test('should return full ODataServiceInfo objects in suggestions', async () => {
            const result = await findService(mockSystems[0], 'SD_TRAVEL');
            expect(result.found).toBe(false);
            if (!result.found) {
                for (const s of result.suggestions) {
                    expect(s).toHaveProperty('id');
                    expect(s).toHaveProperty('name');
                    expect(s).toHaveProperty('path');
                    expect(s).toHaveProperty('serviceVersion');
                    expect(s).toHaveProperty('odataVersion');
                }
            }
        });

        test('should return up to 5 suggestions', async () => {
            const manyServices = Array.from({ length: 10 }, (_, i) => ({
                ...v4Services[0],
                id: `/DMO/SRV_${i}`,
                name: `/DMO/GRP_${i} > /DMO/SRV_${i}`,
                path: `/sap/opu/odata4/svc${i}/`
            }));
            mockV4Catalog.listServices.mockResolvedValue(manyServices);

            const system = mockSystems[0];
            const result = await findService(system, 'DMO');
            expect(result.found).toBe(false);
            if (!result.found) {
                expect(result.suggestions.length).toBeLessThanOrEqual(5);
            }
        });

        test('should return empty suggestions when no partial match', async () => {
            const system = mockSystems[0];
            const result = await findService(system, 'ZZNONEXISTENT_XYZ');
            expect(result.found).toBe(false);
            if (!result.found) {
                expect(result.suggestions).toHaveLength(0);
            }
        });

        test('should check v4 and v2 catalogs in parallel', async () => {
            await findService(mockSystems[0], 'ANYTHING');

            expect(mockFindServiceProvider.catalog).toHaveBeenCalledWith(ODataVersion.v4);
            expect(mockFindServiceProvider.catalog).toHaveBeenCalledWith(ODataVersion.v2);
        });

        test('should return found from v2 catalog when v4 has no match', async () => {
            const v2Service = {
                id: 'ZMY_SRV',
                name: 'ZMY_SRV',
                group: 'DEFAULT',
                path: '/sap/opu/odata/sap/zmy_srv/',
                serviceVersion: '1',
                odataVersion: ODataVersion.v2,
                serviceType: undefined
            };
            mockV4Catalog.listServices.mockResolvedValue([]); // v4 empty
            mockV2Catalog.listServices.mockResolvedValue([v2Service]);

            const result = await findService(mockSystems[0], 'ZMY_SRV');
            expect(result.found).toBe(true);
            if (result.found) {
                expect(result.service).toEqual(v2Service);
            }
        });

        test('should continue when one catalog lookup fails', async () => {
            mockV2Catalog.listServices.mockRejectedValue(new Error('V2 unavailable'));

            const result = await findService(mockSystems[0], '/DMO/SD_TRAVEL_MDSK');
            expect(result.found).toBe(true);
        });
    });

    describe('BAS / AppStudio destination handling', () => {
        const mockDestinations = {
            DEST_A: {
                Name: 'DEST_A',
                Host: 'https://dest-a.example.com',
                'sap-client': '100',
                Authentication: 'BasicAuthentication',
                Type: 'HTTP'
            },
            DEST_B: {
                Name: 'DEST_B',
                Host: 'https://dest-b.example.com',
                'sap-client': '200',
                Authentication: 'BasicAuthentication',
                Type: 'HTTP'
            },
            DEST_HOST: {
                Name: 'HostDest',
                Host: 'https://host-match.example.com',
                'sap-client': '300',
                Authentication: 'BasicAuthentication',
                Type: 'HTTP'
            }
        };

        beforeEach(() => {
            mockIsAppStudio.mockReturnValue(true);
            mockListDestinations.mockResolvedValue(mockDestinations);
            mockIsAbapODataDestination.mockReturnValue(true);
        });

        describe('getSystemsOrDestinations', () => {
            test('should return filtered destinations in BAS', async () => {
                const result = await getSystemsOrDestinations();
                expect(mockListDestinations).toHaveBeenCalledWith({ stripS4HCApiHosts: true });
                expect(result).toHaveLength(3);
            });

            test('should filter out non-ABAP destinations', async () => {
                mockIsAbapODataDestination.mockReturnValue(false);
                const result = await getSystemsOrDestinations();
                expect(result).toHaveLength(0);
            });

            test('should filter out NoAuthentication destinations', async () => {
                mockListDestinations.mockResolvedValue({
                    ...mockDestinations,
                    NO_AUTH_DEST: {
                        Name: 'NO_AUTH_DEST',
                        Host: 'https://no-auth.example.com',
                        Authentication: 'NoAuthentication',
                        Type: 'HTTP'
                    }
                });
                const result = await getSystemsOrDestinations();
                expect((result as any[]).find((d: any) => d.Name === 'NO_AUTH_DEST')).toBeUndefined();
                expect(result).toHaveLength(3);
            });

            test('should return backend systems when not in BAS', async () => {
                mockIsAppStudio.mockReturnValue(false);
                const result = await getSystemsOrDestinations();
                expect(mockListDestinations).not.toHaveBeenCalled();
                expect(result).toEqual(mockSystems);
            });
        });

        describe('findSystem in BAS', () => {
            test('should find destination by exact name match', async () => {
                const result = await findSystem('DEST_A');
                expect(result.system).toEqual(mockDestinations.DEST_A);
            });

            test('should find destination by case-insensitive name match', async () => {
                const result = await findSystem('dest_a');
                expect(result.system).toEqual(mockDestinations.DEST_A);
            });

            test('should find destination by partial name (includes)', async () => {
                const result = await findSystem('DEST');
                expect(result.system).toEqual(mockDestinations.DEST_A);
            });

            test('should find destination by host URL', async () => {
                const result = await findSystem('https://dest-a.example.com');
                expect(result.system).toEqual(mockDestinations.DEST_A);
            });

            test('should return undefined system with message when no destination matches', async () => {
                const result = await findSystem('NONEXISTENT');
                expect(result.system).toBeUndefined();
                expect(result.message).toContain('NONEXISTENT');
            });

            test('should return undefined system with message when listDestinations throws', async () => {
                mockListDestinations.mockRejectedValue(new Error('BAS API unavailable'));
                const result = await findSystem('UNKNOWN');
                expect(result.system).toBeUndefined();
                expect(result.message).toContain('BAS API unavailable');
            });
        });

        describe('getServiceMetadata in BAS', () => {
            const mockMetadata =
                '<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">...</edmx:Edmx>';
            const mockService = { metadata: jest.fn<any>().mockResolvedValue(mockMetadata) };
            const mockDestServiceProvider = { service: jest.fn<any>().mockReturnValue(mockService) };

            beforeEach(() => {
                mockCreateForDestination.mockReturnValue(mockDestServiceProvider);
            });

            test('should use getServiceFromDestination when isAppStudio is true', async () => {
                const destination = mockDestinations.DEST_A;

                const result = await getServiceMetadata(destination, '/sap/opu/odata4/service1');

                expect(mockCreateForDestination).toHaveBeenCalledWith({}, destination);
                expect(mockDestServiceProvider.service).toHaveBeenCalledWith('/sap/opu/odata4/service1');
                expect(result).toBe(mockMetadata);
            });

            test('should strip $metadata suffix from service path', async () => {
                const destination = mockDestinations.DEST_A;

                await getServiceMetadata(destination, '/sap/opu/odata4/service1/$metadata');

                expect(mockDestServiceProvider.service).toHaveBeenCalledWith('/sap/opu/odata4/service1/');
            });

            test('should not use AbapServiceProvider when isAppStudio is true', async () => {
                const destination = mockDestinations.DEST_A;

                await getServiceMetadata(destination, '/sap/opu/odata4/service1');

                expect(mockAbapServiceProvider).not.toHaveBeenCalled();
            });
        });
    });
});
