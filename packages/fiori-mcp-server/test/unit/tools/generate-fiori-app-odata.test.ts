import { generateFioriAppOData } from '../../../src/tools/generate-fiori-app-odata';
import * as executeOData from '../../../src/tools/functionalities/generate-fiori-ui-application/execute-functionality';
import * as schemas from '../../../src/tools/schemas';
import { GENERATE_FIORI_UI_APPLICATION_ID } from '../../../src/constant';

jest.mock('../../../src/tools/functionalities/generate-fiori-ui-application/execute-functionality');
jest.mock('../../../src/tools/schemas', () => ({
    ...jest.requireActual('../../../src/tools/schemas'),
    generatorConfigOData: { parse: jest.fn() }
}));

describe('generateFioriAppOData', () => {
    const mockResult = {
        functionalityId: GENERATE_FIORI_UI_APPLICATION_ID,
        status: 'Success',
        message: 'Generation completed successfully.',
        parameters: {},
        appPath: '/project/myapp',
        changes: [],
        timestamp: '2024-01-01T00:00:00.000Z'
    };

    const validArgs = {
        floorplan: 'FE_LROP',
        project: { name: 'myapp', description: 'Test app', targetFolder: '/project', ui5Version: '1.120.0' },
        service: { host: 'https://example.com', servicePath: '/sap/opu/odata/sap/MY_SERVICE/' }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (executeOData.default as jest.Mock).mockResolvedValue(mockResult);
        (schemas.generatorConfigOData.parse as jest.Mock).mockReturnValue(validArgs);
    });

    test('should parse args with Zod schema before calling execute', async () => {
        const result = await generateFioriAppOData(validArgs);

        expect(schemas.generatorConfigOData.parse).toHaveBeenCalledWith(validArgs);
        expect(executeOData.default).toHaveBeenCalledWith({
            functionalityId: GENERATE_FIORI_UI_APPLICATION_ID,
            parameters: validArgs,
            appPath: '/project'
        });
        expect(result).toEqual(mockResult);
    });

    test('should use empty string for appPath when project.targetFolder is missing', async () => {
        const argsNoFolder = { floorplan: 'FF_SIMPLE', project: { name: 'myapp', description: 'Test' } };
        (schemas.generatorConfigOData.parse as jest.Mock).mockReturnValue(argsNoFolder);

        await generateFioriAppOData(argsNoFolder);

        expect(executeOData.default).toHaveBeenCalledWith(expect.objectContaining({ appPath: '' }));
    });

    test('should propagate Zod validation errors before calling execute', async () => {
        (schemas.generatorConfigOData.parse as jest.Mock).mockImplementation(() => {
            throw new Error('Invalid input');
        });

        await expect(generateFioriAppOData({ floorplan: 'INVALID' })).rejects.toThrow('Invalid input');
        expect(executeOData.default).not.toHaveBeenCalled();
    });

    test('should propagate errors from execute function', async () => {
        (executeOData.default as jest.Mock).mockRejectedValue(new Error('Generator not installed'));

        await expect(generateFioriAppOData(validArgs)).rejects.toThrow('Generator not installed');
    });
});
