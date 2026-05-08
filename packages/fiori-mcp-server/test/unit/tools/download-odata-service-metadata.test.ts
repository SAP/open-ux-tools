import { downloadODataServiceMetadata } from '../../../src/tools/download-odata-service-metadata';
import * as executeFetchServiceMetadata from '../../../src/tools/functionalities/fetch-service-metadata/execute-functionality';

jest.mock('../../../src/tools/functionalities/fetch-service-metadata/execute-functionality');

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
        (executeFetchServiceMetadata.default as jest.Mock).mockResolvedValue(mockResult);
    });

    test('should call execute function with mapped params when sapSystemQuery provided', async () => {
        const result = await downloadODataServiceMetadata({
            sapSystemQuery: 'TestSystem',
            servicePath: mockServicePath,
            appPath: mockAppPath
        });

        expect(executeFetchServiceMetadata.default).toHaveBeenCalledWith({
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

        expect(executeFetchServiceMetadata.default).toHaveBeenCalledWith({
            functionalityId: 'fetch-service-metadata',
            parameters: { sapSystemQuery: undefined, servicePath: mockServicePath },
            appPath: mockAppPath
        });
    });

    test('should propagate errors from execute function', async () => {
        (executeFetchServiceMetadata.default as jest.Mock).mockRejectedValue(new Error('Network error'));

        await expect(
            downloadODataServiceMetadata({ servicePath: mockServicePath, appPath: mockAppPath })
        ).rejects.toThrow('Network error');
    });
});
