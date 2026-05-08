import { generateFioriAppOData } from '../../../src/tools/generate-fiori-app-odata';
import * as executeOData from '../../../src/tools/functionalities/generate-fiori-ui-application/execute-functionality';

jest.mock('../../../src/tools/functionalities/generate-fiori-ui-application/execute-functionality');

describe('generateFioriAppOData', () => {
    const mockResult = {
        functionalityId: 'generate-fiori-ui-application',
        status: 'Success',
        message: 'Generation completed successfully.',
        parameters: {},
        appPath: '/project/myapp',
        changes: [],
        timestamp: '2024-01-01T00:00:00.000Z'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (executeOData.default as jest.Mock).mockResolvedValue(mockResult);
    });

    test('should call OData execute function with args wrapped in parameters', async () => {
        const args = {
            floorplan: 'FE_LROP',
            project: { name: 'myapp', description: 'Test app', targetFolder: '/project', ui5Version: '1.120.0' },
            service: { host: 'https://example.com', servicePath: '/sap/opu/odata/sap/MY_SERVICE/' }
        };

        const result = await generateFioriAppOData(args);

        expect(executeOData.default).toHaveBeenCalledWith({
            functionalityId: 'generate-fiori-ui-application',
            parameters: args,
            appPath: '/project'
        });
        expect(result).toEqual(mockResult);
    });

    test('should use empty string for appPath when project.targetFolder is missing', async () => {
        const args = { floorplan: 'FF_SIMPLE', project: { name: 'myapp', description: 'Test' } };

        await generateFioriAppOData(args);

        expect(executeOData.default).toHaveBeenCalledWith(
            expect.objectContaining({ appPath: '' })
        );
    });

    test('should propagate errors from execute function', async () => {
        (executeOData.default as jest.Mock).mockRejectedValue(new Error('Generator not installed'));

        await expect(generateFioriAppOData({ floorplan: 'FE_LROP', project: { targetFolder: '/p' } })).rejects.toThrow(
            'Generator not installed'
        );
    });
});
