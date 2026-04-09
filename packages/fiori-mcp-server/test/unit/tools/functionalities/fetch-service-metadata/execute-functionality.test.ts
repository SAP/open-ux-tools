import { jest } from '@jest/globals';
import type { ExecuteFunctionalityInput } from '../../../../../src/types';
import path from 'node:path';

// Mock dependencies
const mockFindSapSystem = jest.fn<any>();
const mockGetServiceMetadata = jest.fn<any>();
jest.unstable_mockModule('../../../../../src/tools/functionalities/fetch-service-metadata/service-metadata', () => ({
    findSapSystem: mockFindSapSystem,
    getServiceMetadata: mockGetServiceMetadata
}));

const mockWriteFileSync = jest.fn<any>();
const actualFs = await import('node:fs');
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    default: {
        ...actualFs,
        writeFileSync: mockWriteFileSync
    },
    writeFileSync: mockWriteFileSync
}));
jest.unstable_mockModule('fs', () => ({
    ...actualFs,
    default: {
        ...actualFs,
        writeFileSync: mockWriteFileSync
    },
    writeFileSync: mockWriteFileSync
}));

const { default: executeFunctionality } = await import(
    '../../../../../src/tools/functionalities/fetch-service-metadata/execute-functionality'
);

describe('execute-functionality', () => {
    const mockAppPath = '/test/app/path';
    const mockServicePath = '/sap/opu/odata4/test/service';
    const mockMetadata = '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx>...</edmx:Edmx>';
    const mockSapSystem = {
        name: 'TestSystem',
        url: 'https://test.example.com',
        client: '100',
        username: 'user',
        password: 'pass'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockFindSapSystem.mockResolvedValue(mockSapSystem);
        mockGetServiceMetadata.mockResolvedValue(mockMetadata);
        mockWriteFileSync.mockImplementation(() => {});
    });

    test('should successfully execute functionality with sapSystemQuery', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'TestSystem',
                servicePath: mockServicePath
            }
        };

        const result = await executeFunctionality(params);

        expect(mockFindSapSystem).toHaveBeenCalledWith('TestSystem');
        expect(mockGetServiceMetadata).toHaveBeenCalledWith(mockSapSystem, mockServicePath);
        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.join(mockAppPath, 'metadata.xml'),
            mockMetadata,
            'utf-8'
        );
        expect(result).toMatchObject({
            functionalityId: 'fetch-service-metadata',
            status: 'Success',
            message: 'Fetched systems successfully.',
            changes: [],
            parameters: {
                host: 'https://test.example.com',
                client: '100',
                servicePath: mockServicePath,
                metadataFilePath: path.join(mockAppPath, 'metadata.xml') as string
            },
            appPath: mockAppPath
        });
        expect(result.timestamp).toBeDefined();
    });

    test('should successfully execute functionality with URL as sapSystemQuery', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'https://test.example.com?sap-client=100',
                servicePath: mockServicePath
            }
        };

        const result = await executeFunctionality(params);

        expect(mockFindSapSystem).toHaveBeenCalledWith('https://test.example.com?sap-client=100');
        expect(result.status).toBe('Success');
    });

    test('should successfully execute functionality without sapSystemQuery', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                servicePath: mockServicePath
            }
        };

        const result = await executeFunctionality(params);

        expect(mockFindSapSystem).toHaveBeenCalledWith(mockServicePath);
        expect(result.status).toBe('Success');
    });

    test('should successfully execute functionality with empty sapSystemQuery', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: '',
                servicePath: mockServicePath
            }
        };

        const result = await executeFunctionality(params);

        expect(mockFindSapSystem).toHaveBeenCalledWith(mockServicePath);
        expect(result.status).toBe('Success');
    });

    test('should throw error when servicePath is missing', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'TestSystem'
            }
        };

        await expect(executeFunctionality(params)).rejects.toThrow('Missing required parameter: servicePath');
        expect(mockFindSapSystem).not.toHaveBeenCalled();
        expect(mockGetServiceMetadata).not.toHaveBeenCalled();
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    test('should throw error when servicePath is empty string', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'TestSystem',
                servicePath: ''
            }
        };

        await expect(executeFunctionality(params)).rejects.toThrow('Missing required parameter: servicePath');
        expect(mockFindSapSystem).not.toHaveBeenCalled();
    });

    test('should throw error when servicePath is whitespace only', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'TestSystem',
                servicePath: '   '
            }
        };

        await expect(executeFunctionality(params)).rejects.toThrow('Missing required parameter: servicePath');
    });

    test('should propagate error from findSapSystem', async () => {
        mockFindSapSystem.mockRejectedValue(new Error('System not found'));

        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'NonExistent',
                servicePath: mockServicePath
            }
        };

        await expect(executeFunctionality(params)).rejects.toThrow('System not found');
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    test('should propagate error from getServiceMetadata', async () => {
        mockGetServiceMetadata.mockRejectedValue(new Error('Metadata fetch failed'));

        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'TestSystem',
                servicePath: mockServicePath
            }
        };

        await expect(executeFunctionality(params)).rejects.toThrow('Metadata fetch failed');
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    test('should handle system without client', async () => {
        const systemWithoutClient = {
            name: 'TestSystem',
            url: 'https://test.example.com',
            client: ''
        };
        mockFindSapSystem.mockResolvedValue(systemWithoutClient);

        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'TestSystem',
                servicePath: mockServicePath
            }
        };

        const result = await executeFunctionality(params);

        expect((result.parameters as any).client).toBe('');
    });

    test('should trim whitespace from parameters', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: '  TestSystem  ',
                servicePath: '  /sap/opu/odata4/test/service  '
            }
        };

        await executeFunctionality(params);

        expect(mockFindSapSystem).toHaveBeenCalledWith('TestSystem');
        expect(mockGetServiceMetadata).toHaveBeenCalledWith(mockSapSystem, '/sap/opu/odata4/test/service');
    });

    test('should write metadata file to correct path', async () => {
        const customAppPath = '/custom/app/path';
        const params: ExecuteFunctionalityInput = {
            appPath: customAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'TestSystem',
                servicePath: mockServicePath
            }
        };

        await executeFunctionality(params);

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.join(customAppPath, 'metadata.xml'),
            mockMetadata,
            'utf-8'
        );
    });

    test('should handle non-string parameters gracefully', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 123 as any,
                servicePath: 456 as any
            }
        };

        await executeFunctionality(params);

        expect(mockFindSapSystem).toHaveBeenCalledWith('123');
        expect(mockGetServiceMetadata).toHaveBeenCalledWith(mockSapSystem, '456');
    });

    test('should return timestamp in ISO format', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'TestSystem',
                servicePath: mockServicePath
            }
        };

        const result = await executeFunctionality(params);

        expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
});
