import { jest } from '@jest/globals';
import type { ExecuteFunctionalityInput } from '../../../src/types/index.js';
import path from 'node:path';

// Mock dependencies
const mockFindSystem = jest.fn<any>();
const mockGetServiceMetadata = jest.fn<any>();
jest.unstable_mockModule('../../../src/tools/services/sap-system', () => ({
    findSystem: mockFindSystem,
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

const mockIsAppStudio = jest.fn<() => boolean>().mockReturnValue(false);
const actualBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...actualBtpUtils,
    isAppStudio: mockIsAppStudio
}));

const { default: executeFunctionality } = await import('../../../src/tools/download-odata-service-metadata-impl.js');

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
        mockIsAppStudio.mockReturnValue(false);
        mockFindSystem.mockResolvedValue(mockSapSystem);
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

        expect(mockFindSystem).toHaveBeenCalledWith('TestSystem');
        expect(mockGetServiceMetadata).toHaveBeenCalledWith(mockSapSystem, mockServicePath);
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.join(mockAppPath, 'metadata.xml'), mockMetadata, 'utf-8');
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

        expect(mockFindSystem).toHaveBeenCalledWith('https://test.example.com?sap-client=100');
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

        expect(mockFindSystem).toHaveBeenCalledWith(mockServicePath);
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

        expect(mockFindSystem).toHaveBeenCalledWith(mockServicePath);
        expect(result.status).toBe('Success');
    });

    test('should return error when system not found', async () => {
        mockFindSystem.mockResolvedValue(undefined);

        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'Unknown',
                servicePath: mockServicePath
            }
        };

        const result = await executeFunctionality(params);
        expect(result.status).toBe('Error');
        expect(result.message).toBe('The requested system could not be found');
        expect(mockGetServiceMetadata).not.toHaveBeenCalled();
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    test('should return error when servicePath is missing', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'TestSystem'
            }
        };

        const result = await executeFunctionality(params);
        expect(result.status).toBe('Error');
        expect(result.message).toBe('Missing required parameter: servicePath');
        expect(mockFindSystem).not.toHaveBeenCalled();
        expect(mockGetServiceMetadata).not.toHaveBeenCalled();
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    test('should return error when servicePath is empty string', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'TestSystem',
                servicePath: ''
            }
        };

        const result = await executeFunctionality(params);
        expect(result.status).toBe('Error');
        expect(result.message).toBe('Missing required parameter: servicePath');
        expect(mockFindSystem).not.toHaveBeenCalled();
    });

    test('should return error when servicePath is whitespace only', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'TestSystem',
                servicePath: '   '
            }
        };

        const result = await executeFunctionality(params);
        expect(result.status).toBe('Error');
        expect(result.message).toBe('Missing required parameter: servicePath');
    });

    test('should return error response from findSystem failure', async () => {
        mockFindSystem.mockRejectedValue(new Error('System not found'));

        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'NonExistent',
                servicePath: mockServicePath
            }
        };

        const result = await executeFunctionality(params);
        expect(result.status).toBe('Error');
        expect(result.message).toBe('System not found');
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    test('should return error response from getServiceMetadata failure', async () => {
        mockGetServiceMetadata.mockRejectedValue(new Error('Metadata fetch failed'));

        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'fetch-service-metadata',
            parameters: {
                sapSystemQuery: 'TestSystem',
                servicePath: mockServicePath
            }
        };

        const result = await executeFunctionality(params);
        expect(result.status).toBe('Error');
        expect(result.message).toBe('Metadata fetch failed');
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    test('should handle system without client', async () => {
        const systemWithoutClient = {
            name: 'TestSystem',
            url: 'https://test.example.com',
            client: ''
        };
        mockFindSystem.mockResolvedValue(systemWithoutClient);

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

        expect(mockFindSystem).toHaveBeenCalledWith('TestSystem');
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

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.join(customAppPath, 'metadata.xml'), mockMetadata, 'utf-8');
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

        expect(mockFindSystem).toHaveBeenCalledWith('123');
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

    describe('AppStudio (BAS) destination handling', () => {
        const mockDestination = {
            Name: 'MY_DESTINATION',
            Host: 'https://bas-system.example.com',
            'sap-client': '200',
            Type: 'HTTP',
            Authentication: 'BasicAuthentication'
        };

        beforeEach(() => {
            mockIsAppStudio.mockReturnValue(true);
            mockFindSystem.mockResolvedValue(mockDestination);
        });

        test('should return destination name when isAppStudio is true', async () => {
            const params: ExecuteFunctionalityInput = {
                appPath: mockAppPath,
                functionalityId: 'fetch-service-metadata',
                parameters: {
                    sapSystemQuery: 'MY_DESTINATION',
                    servicePath: mockServicePath
                }
            };

            const result = await executeFunctionality(params);

            expect(result.status).toBe('Success');
            expect((result.parameters as any).destination).toBe('MY_DESTINATION');
        });

        test('should use destination Host as host when isAppStudio is true', async () => {
            const params: ExecuteFunctionalityInput = {
                appPath: mockAppPath,
                functionalityId: 'fetch-service-metadata',
                parameters: {
                    sapSystemQuery: 'MY_DESTINATION',
                    servicePath: mockServicePath
                }
            };

            const result = await executeFunctionality(params);

            expect((result.parameters as any).host).toBe('https://bas-system.example.com');
        });

        test('should use destination sap-client as client when isAppStudio is true', async () => {
            const params: ExecuteFunctionalityInput = {
                appPath: mockAppPath,
                functionalityId: 'fetch-service-metadata',
                parameters: {
                    sapSystemQuery: 'MY_DESTINATION',
                    servicePath: mockServicePath
                }
            };

            const result = await executeFunctionality(params);

            expect((result.parameters as any).client).toBe('200');
        });

        test('should not return destination when isAppStudio is false', async () => {
            mockIsAppStudio.mockReturnValue(false);
            mockFindSystem.mockResolvedValue(mockSapSystem);

            const params: ExecuteFunctionalityInput = {
                appPath: mockAppPath,
                functionalityId: 'fetch-service-metadata',
                parameters: {
                    sapSystemQuery: 'TestSystem',
                    servicePath: mockServicePath
                }
            };

            const result = await executeFunctionality(params);

            expect((result.parameters as any).destination).toBeUndefined();
            expect((result.parameters as any).host).toBe('https://test.example.com');
        });
    });
});
