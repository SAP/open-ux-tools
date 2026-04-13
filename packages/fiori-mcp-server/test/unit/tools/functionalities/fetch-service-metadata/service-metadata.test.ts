import { jest } from '@jest/globals';
import type { BackendSystem, ConnectionType, SystemType } from '@sap-ux/store';
import type { ODataService } from '@sap-ux/axios-extension';
import { ODataVersion } from '@sap-ux/axios-extension';

// Mock dependencies
const mockGetService = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/store', () => ({
    getService: mockGetService
}));

const mockAbapServiceProvider = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    AbapServiceProvider: mockAbapServiceProvider,
    ODataVersion
}));

jest.unstable_mockModule('@sap-ux/logger', () => ({
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

const { findSapSystem, getServiceMetadata } =
    await import('../../../../../src/tools/functionalities/fetch-service-metadata/service-metadata');

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

        // Mock SystemService
        mockGetAll = jest.fn<any>().mockResolvedValue(mockSystems);
        mockGetService.mockImplementation(() => ({
            getAll: mockGetAll
        }));

        // Mock parseEdmx to return a valid parsed result by default
        mockParseEdmx.mockReturnValue({ edmx: 'parsedMetadata' });
    });
    describe('findSapSystem', () => {
        test('should find system by exact name match', async () => {
            const result = await findSapSystem('TestSystem1');
            expect(result).toEqual(mockSystems[0]);
        });

        test('should find system by case-insensitive exact name match', async () => {
            const result = await findSapSystem('testsystem1');
            expect(result).toEqual(mockSystems[0]);
        });

        test('should find system by partial name match anywhere in name', async () => {
            const result = await findSapSystem('Production');
            expect(result).toEqual(mockSystems[2]);
        });

        test('should find system by URL with client', async () => {
            const result = await findSapSystem('https://test1.example.com?sap-client=100');
            expect(result).toEqual(mockSystems[0]);
        });

        test('should find system by URL without client', async () => {
            const result = await findSapSystem('https://test1.example.com');
            expect(result).toEqual(mockSystems[0]);
        });

        test('should find system by URL with different client (fallback)', async () => {
            const result = await findSapSystem('https://test1.example.com?sap-client=999');
            // Should still match by URL only
            expect(result).toEqual(mockSystems[0]);
        });

        test('should return raw system when URL not stored', async () => {
            const result = await findSapSystem('https://unknown.example.com?sap-client=500');
            expect(result).toEqual({
                name: 'https://unknown.example.com',
                url: 'https://unknown.example.com',
                client: '500'
            });
        });

        test('should return synthetic system when no matching system found', async () => {
            // Override mock to return empty array for this test
            mockGetAll.mockResolvedValueOnce([]);

            // When no match is found, matchSystemByUrl creates a synthetic system
            const result = await findSapSystem('https://nonexistent.example.com');
            expect(result.url).toBe('https://nonexistent.example.com');
        });

        test('should find unique system by case-insensitive partial match', async () => {
            const result = await findSapSystem('dev');
            expect(result).toEqual(mockSystems[3]);
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
                'Multiple ODATA V4 Services found matching path: /sap/opu/odata4/service1'
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
            const result = await findSapSystem('https://test1.example.com?sap-client=100&param=value');
            expect(result).toEqual(mockSystems[0]);
        });

        test('should find system when partial query at start matches single system', async () => {
            const result = await findSapSystem('Dev');
            expect(result).toEqual(mockSystems[3]);
        });

        test('should create synthetic system from valid URL not in storage', async () => {
            mockGetAll.mockResolvedValueOnce([]);
            const result = await findSapSystem('https://new-system.example.com?sap-client=999');
            expect(result).toEqual({
                name: 'https://new-system.example.com',
                url: 'https://new-system.example.com',
                client: '999'
            });
        });
    });
});
