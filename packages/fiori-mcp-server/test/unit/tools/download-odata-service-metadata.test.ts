import { jest } from '@jest/globals';
import type { DownloadODataServiceMetadataInput } from '../../../src/types/index.js';
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

const { downloadODataServiceMetadata } = await import('../../../src/tools/download-odata-service-metadata.js');

describe('downloadODataServiceMetadata', () => {
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
        mockFindSystem.mockResolvedValue({ system: mockSapSystem });
        mockGetServiceMetadata.mockResolvedValue(mockMetadata);
        mockWriteFileSync.mockImplementation(() => {});
    });

    test('should successfully execute functionality with sapSystemQuery', async () => {
        const params: DownloadODataServiceMetadataInput = {
            appPath: mockAppPath,
            sapSystemQuery: 'TestSystem',
            servicePath: mockServicePath
        };

        const result = await downloadODataServiceMetadata(params);

        expect(mockFindSystem).toHaveBeenCalledWith('TestSystem');
        expect(mockGetServiceMetadata).toHaveBeenCalledWith(mockSapSystem, mockServicePath);
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.join(mockAppPath, 'metadata.xml'), mockMetadata, 'utf-8');
        expect(result).toMatchObject({
            status: 'Success',
            message: 'Service metadata downloaded successfully.',
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
        const params: DownloadODataServiceMetadataInput = {
            appPath: mockAppPath,
            sapSystemQuery: 'https://test.example.com?sap-client=100',
            servicePath: mockServicePath
        };

        const result = await downloadODataServiceMetadata(params);

        expect(mockFindSystem).toHaveBeenCalledWith('https://test.example.com?sap-client=100');
        expect(result.status).toBe('Success');
    });

    test('should successfully execute functionality without sapSystemQuery', async () => {
        const params: DownloadODataServiceMetadataInput = {
            appPath: mockAppPath,
            servicePath: mockServicePath
        };

        const result = await downloadODataServiceMetadata(params);

        expect(mockFindSystem).toHaveBeenCalledWith(mockServicePath);
        expect(result.status).toBe('Success');
    });

    test('should successfully execute functionality with empty sapSystemQuery', async () => {
        const params: DownloadODataServiceMetadataInput = {
            appPath: mockAppPath,
            sapSystemQuery: '',
            servicePath: mockServicePath
        };

        const result = await downloadODataServiceMetadata(params);

        expect(mockFindSystem).toHaveBeenCalledWith(mockServicePath);
        expect(result.status).toBe('Success');
    });

    test('should return error when system not found', async () => {
        mockFindSystem.mockResolvedValue({ system: undefined, message: 'No matching system found for: Unknown' });

        const params: DownloadODataServiceMetadataInput = {
            appPath: mockAppPath,
            sapSystemQuery: 'Unknown',
            servicePath: mockServicePath
        };

        const result = await downloadODataServiceMetadata(params);
        expect(result.status).toBe('Error');
        expect(result.message).toBe('No matching system found for: Unknown');
        expect(mockGetServiceMetadata).not.toHaveBeenCalled();
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    test('should return error when servicePath is missing', async () => {
        const params: DownloadODataServiceMetadataInput = {
            appPath: mockAppPath,
            sapSystemQuery: 'TestSystem',
            servicePath: undefined as any
        };

        const result = await downloadODataServiceMetadata(params);
        expect(result.status).toBe('Error');
        expect(result.message).toBe('Missing required parameter: servicePath must be provided');
        expect(mockFindSystem).not.toHaveBeenCalled();
        expect(mockGetServiceMetadata).not.toHaveBeenCalled();
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    test('should return error when servicePath is empty string', async () => {
        const params: DownloadODataServiceMetadataInput = {
            appPath: mockAppPath,
            sapSystemQuery: 'TestSystem',
            servicePath: ''
        };

        const result = await downloadODataServiceMetadata(params);
        expect(result.status).toBe('Error');
        expect(result.message).toBe('Missing required parameter: servicePath must be provided');
        expect(mockFindSystem).not.toHaveBeenCalled();
    });

    test('should return error when servicePath is whitespace only', async () => {
        const params: DownloadODataServiceMetadataInput = {
            appPath: mockAppPath,
            sapSystemQuery: 'TestSystem',
            servicePath: '   '
        };

        const result = await downloadODataServiceMetadata(params);
        expect(result.status).toBe('Error');
        expect(result.message).toBe('Missing required parameter: servicePath must be provided');
    });

    test('should return error response from findSystem failure', async () => {
        mockFindSystem.mockRejectedValue(new Error('System not found'));

        const params: DownloadODataServiceMetadataInput = {
            appPath: mockAppPath,
            sapSystemQuery: 'NonExistent',
            servicePath: mockServicePath
        };

        const result = await downloadODataServiceMetadata(params);
        expect(result.status).toBe('Error');
        expect(result.message).toBe('System not found');
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    test('should return error response from getServiceMetadata failure', async () => {
        mockGetServiceMetadata.mockRejectedValue(new Error('Metadata fetch failed'));

        const params: DownloadODataServiceMetadataInput = {
            appPath: mockAppPath,
            sapSystemQuery: 'TestSystem',
            servicePath: mockServicePath
        };

        const result = await downloadODataServiceMetadata(params);
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
        mockFindSystem.mockResolvedValue({ system: systemWithoutClient });

        const params: DownloadODataServiceMetadataInput = {
            appPath: mockAppPath,
            sapSystemQuery: 'TestSystem',
            servicePath: mockServicePath
        };

        const result = await downloadODataServiceMetadata(params);

        expect((result.parameters as any).client).toBe('');
    });

    test('should trim whitespace from parameters', async () => {
        const params: DownloadODataServiceMetadataInput = {
            appPath: mockAppPath,
            sapSystemQuery: '  TestSystem  ',
            servicePath: '  /sap/opu/odata4/test/service  '
        };

        await downloadODataServiceMetadata(params);

        expect(mockFindSystem).toHaveBeenCalledWith('TestSystem');
        expect(mockGetServiceMetadata).toHaveBeenCalledWith(mockSapSystem, '/sap/opu/odata4/test/service');
    });

    test('should write metadata file to correct path', async () => {
        const customAppPath = '/custom/app/path';
        const params: DownloadODataServiceMetadataInput = {
            appPath: customAppPath,
            sapSystemQuery: 'TestSystem',
            servicePath: mockServicePath
        };

        await downloadODataServiceMetadata(params);

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.join(customAppPath, 'metadata.xml'), mockMetadata, 'utf-8');
    });

    test('should handle non-string parameters gracefully', async () => {
        const params: DownloadODataServiceMetadataInput = {
            appPath: mockAppPath,
            sapSystemQuery: 123 as any,
            servicePath: 456 as any
        };

        await downloadODataServiceMetadata(params);

        expect(mockFindSystem).toHaveBeenCalledWith('123');
        expect(mockGetServiceMetadata).toHaveBeenCalledWith(mockSapSystem, '456');
    });

    test('should return timestamp in ISO format', async () => {
        const params: DownloadODataServiceMetadataInput = {
            appPath: mockAppPath,
            sapSystemQuery: 'TestSystem',
            servicePath: mockServicePath
        };

        const result = await downloadODataServiceMetadata(params);

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
            mockFindSystem.mockResolvedValue({ system: mockDestination });
        });

        test('should return error when isAppStudio is true', async () => {
            const params: DownloadODataServiceMetadataInput = {
                appPath: mockAppPath,
                sapSystemQuery: 'MY_DESTINATION',
                servicePath: mockServicePath
            };

            const result = await downloadODataServiceMetadata(params);

            expect(result.status).toBe('Error');
            expect(result.message).toContain('Service Center MCP');
        });

        test('should not call getServiceMetadata when isAppStudio is true', async () => {
            const params: DownloadODataServiceMetadataInput = {
                appPath: mockAppPath,
                sapSystemQuery: 'MY_DESTINATION',
                servicePath: mockServicePath
            };

            await downloadODataServiceMetadata(params);

            expect(mockGetServiceMetadata).not.toHaveBeenCalled();
        });

        test('should work normally when isAppStudio is false', async () => {
            mockIsAppStudio.mockReturnValue(false);
            mockFindSystem.mockResolvedValue({ system: mockSapSystem });

            const params: DownloadODataServiceMetadataInput = {
                appPath: mockAppPath,
                sapSystemQuery: 'TestSystem',
                servicePath: mockServicePath
            };

            const result = await downloadODataServiceMetadata(params);

            expect(result.status).toBe('Success');
            expect((result.parameters as any).host).toBe('https://test.example.com');
            expect((result.parameters as any).destination).toBeUndefined();
        });
    });
});
