import { jest } from '@jest/globals';

const mockExecuteODataDefault = jest.fn<any>();
const mockParse = jest.fn<any>();

jest.unstable_mockModule(
    '../../../src/tools/generate-fiori-app-odata-impl',
    () => ({
        default: mockExecuteODataDefault
    })
);
jest.unstable_mockModule('../../../src/tools/schemas/index', () => ({
    generatorConfigOData: { parse: mockParse },
    generatorConfigCAP: { parse: jest.fn() },
    generatorConfigODataJson: {},
    generatorConfigCAPJson: {},
    PREDEFINED_GENERATOR_VALUES: {}
}));

const { generateFioriAppOData } = await import('../../../src/tools/generate-fiori-app-odata.js');
const { GENERATE_FIORI_UI_APPLICATION_ID } = await import('../../../src/constant.js');

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
        mockExecuteODataDefault.mockResolvedValue(mockResult);
        mockParse.mockReturnValue(validArgs);
    });

    test('should parse args with Zod schema before calling execute', async () => {
        const result = await generateFioriAppOData(validArgs);

        expect(mockParse).toHaveBeenCalledWith(validArgs);
        expect(mockExecuteODataDefault).toHaveBeenCalledWith({
            functionalityId: GENERATE_FIORI_UI_APPLICATION_ID,
            parameters: validArgs,
            appPath: '/project'
        });
        expect(result).toEqual(mockResult);
    });

    test('should use empty string for appPath when project.targetFolder is missing', async () => {
        const argsNoFolder = { floorplan: 'FF_SIMPLE', project: { name: 'myapp', description: 'Test' } };
        mockParse.mockReturnValue(argsNoFolder);

        await generateFioriAppOData(argsNoFolder);

        expect(mockExecuteODataDefault).toHaveBeenCalledWith(expect.objectContaining({ appPath: '' }));
    });

    test('should propagate Zod validation errors before calling execute', async () => {
        mockParse.mockImplementation(() => {
            throw new Error('Invalid input');
        });

        await expect(generateFioriAppOData({ floorplan: 'INVALID' })).rejects.toThrow('Invalid input');
        expect(mockExecuteODataDefault).not.toHaveBeenCalled();
    });

    test('should propagate errors from execute function', async () => {
        mockExecuteODataDefault.mockRejectedValue(new Error('Generator not installed'));

        await expect(generateFioriAppOData(validArgs)).rejects.toThrow('Generator not installed');
    });
});
