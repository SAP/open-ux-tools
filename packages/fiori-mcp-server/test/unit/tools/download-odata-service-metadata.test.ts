import { jest } from '@jest/globals';

const mockExecuteDefault = jest.fn<any>();

jest.unstable_mockModule('../../../src/tools/download-odata-service-metadata-impl', () => ({
    default: mockExecuteDefault
}));

const { downloadODataServiceMetadata } = await import('../../../src/tools/download-odata-service-metadata.js');

describe('downloadODataServiceMetadata', () => {
    const mockAppPath = '/test/project';
    const mockServicePath = '/sap/opu/odata4/test/service';
    const mockResult = {
        functionalityId: 'fetch-service-metadata',
        status: 'Success',
        message: 'Fetched systems successfully.',
        changes: [],
        parameters: {
            host: 'https://example.com',
            client: '100',
            servicePath: mockServicePath,
            metadataFilePath: `${mockAppPath}/metadata.xml`
        },
        appPath: mockAppPath,
        timestamp: '2024-01-01T00:00:00.000Z'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockExecuteDefault.mockResolvedValue(mockResult);
    });

    test('should call execute function with mapped params when sapSystemQuery provided', async () => {
        const result = await downloadODataServiceMetadata({
            sapSystemQuery: 'TestSystem',
            servicePath: mockServicePath,
            appPath: mockAppPath
        });

        expect(mockExecuteDefault).toHaveBeenCalledWith({
            functionalityId: 'fetch-service-metadata',
            parameters: { sapSystemQuery: 'TestSystem', servicePath: mockServicePath },
            appPath: mockAppPath
        });
        expect(result).toEqual(mockResult);
    });

    test('should call execute function without sapSystemQuery when not provided', async () => {
        await downloadODataServiceMetadata({
            servicePath: mockServicePath,
            appPath: mockAppPath
        });

        expect(mockExecuteDefault).toHaveBeenCalledWith({
            functionalityId: 'fetch-service-metadata',
            parameters: { sapSystemQuery: undefined, servicePath: mockServicePath },
            appPath: mockAppPath
        });
    });

    test('should return error response from execute function on failure', async () => {
        const errorResult = {
            functionalityId: 'fetch-service-metadata',
            status: 'Error',
            message: 'Network error',
            parameters: { sapSystemQuery: undefined, servicePath: mockServicePath },
            appPath: mockAppPath,
            changes: [],
            timestamp: '2024-01-01T00:00:00.000Z'
        };
        mockExecuteDefault.mockResolvedValue(errorResult);

        const result = await downloadODataServiceMetadata({ servicePath: mockServicePath, appPath: mockAppPath });
        expect(result.status).toBe('Error');
        expect(result.message).toBe('Network error');
    });
});
