import type { BackendSystem } from '@sap-ux/store';
import type { ODataService } from '@sap-ux/axios-extension';
import {
    findSapSystem,
    getServiceMetadata
} from '../../../../../src/tools/functionalities/fetch-service-metadata/serevice-metadata';
import { SystemService } from '@sap-ux/store/dist/services/backend-system';
import { AbapServiceProvider, ODataVersion } from '@sap-ux/axios-extension';

// Mock dependencies
jest.mock('@sap-ux/store/dist/services/backend-system');
jest.mock('@sap-ux/axios-extension');
jest.mock('@sap-ux/logger');

describe('serevice-metadata', () => {
    let mockGetAll: jest.Mock;
    const mockSystems: BackendSystem[] = [
        {
            name: 'TestSystem1',
            url: 'https://test1.example.com',
            client: '100',
            username: 'user1',
            password: 'pass1'
        },
        {
            name: 'TestSystem2',
            url: 'https://test2.example.com',
            client: '200',
            username: 'user2',
            password: 'pass2'
        },
        {
            name: 'ProductionSystem',
            url: 'https://prod.example.com',
            client: '300',
            username: 'produser',
            password: 'prodpass'
        },
        {
            name: 'DevSystem',
            url: 'https://dev.example.com',
            client: '400'
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock SystemService
        mockGetAll = jest.fn().mockResolvedValue(mockSystems);
        (SystemService as jest.Mock).mockImplementation(() => ({
            getAll: mockGetAll
        }));
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
            metadata: jest.fn().mockResolvedValue(mockMetadata)
        };
        const mockServiceProvider = {
            catalog: jest.fn().mockReturnValue({
                listServices: jest
                    .fn()
                    .mockResolvedValue([{ path: '/sap/opu/odata4/service1' }, { path: '/sap/opu/odata4/service2' }])
            }),
            service: jest.fn().mockReturnValue(mockService)
        };

        beforeEach(() => {
            (AbapServiceProvider as jest.Mock).mockImplementation(() => mockServiceProvider);
        });

        test('should fetch service metadata successfully', async () => {
            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100',
                username: 'user',
                password: 'pass'
            };

            const result = await getServiceMetadata(sapSystem, '/sap/opu/odata4/service1');

            expect(AbapServiceProvider).toHaveBeenCalledWith({
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
                client: '100'
            };

            const result = await getServiceMetadata(sapSystem, '/sap/opu/odata4/service1');

            expect(AbapServiceProvider).toHaveBeenCalledWith({
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
                client: '100'
            };

            await getServiceMetadata(sapSystem, '/sap/opu/odata4/service1');

            expect(mockServiceProvider.service).toHaveBeenCalledWith('/sap/opu/odata4/service1');
        });

        test('should handle service path not in catalog', async () => {
            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100'
            };

            await getServiceMetadata(sapSystem, '/sap/opu/odata4/service3');

            expect(mockServiceProvider.service).toHaveBeenCalledWith('/sap/opu/odata4/service3');
        });

        test('should throw error when no services found', async () => {
            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest.fn().mockResolvedValue([])
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100'
            };

            await expect(getServiceMetadata(sapSystem, '/sap/opu/odata4/service1')).rejects.toThrow(
                'No ODATA V4 Services found on the matched system.'
            );
        });

        test('should throw error when multiple services match path', async () => {
            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest
                    .fn()
                    .mockResolvedValue([{ path: '/sap/opu/odata4/service1' }, { path: '/sap/opu/odata4/service1' }])
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100'
            };

            await expect(getServiceMetadata(sapSystem, '/sap/opu/odata4/service1')).rejects.toThrow(
                'Multiple ODATA V4 Services found matching path: /sap/opu/odata4/service1'
            );
        });

        test('should handle service with client parameter', async () => {
            // Reset mock to original state to avoid duplicate path error
            mockServiceProvider.catalog.mockReturnValue({
                listServices: jest
                    .fn()
                    .mockResolvedValue([{ path: '/sap/opu/odata4/service1' }, { path: '/sap/opu/odata4/service2' }])
            });

            const sapSystem: BackendSystem = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '500'
            };

            await getServiceMetadata(sapSystem, '/sap/opu/odata4/service1');

            expect(AbapServiceProvider).toHaveBeenCalledWith({
                baseURL: 'https://test.example.com',
                params: {
                    'sap-client': '500'
                }
            });
        });
    });

    describe('URL parsing edge cases', () => {
        test('should handle URL with multiple query parameters', async () => {
            const result = await findSapSystem('https://test1.example.com?sap-client=100&param=value');
            expect(result).toEqual(mockSystems[0]);
        });
    });
});
