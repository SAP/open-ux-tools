import { jest } from '@jest/globals';

const mockCapCommand = jest.fn<any>();
const mockParse = jest.fn<any>();

jest.unstable_mockModule('../../../src/tools/functionalities/generate-fiori-ui-application-cap/command', () => ({
    command: mockCapCommand
}));
jest.unstable_mockModule('../../../src/tools/schemas/index', () => ({
    generatorConfigOData: { parse: jest.fn() },
    generatorConfigCAP: { parse: mockParse },
    generatorConfigODataJson: {},
    generatorConfigCAPJson: {},
    PREDEFINED_GENERATOR_VALUES: {}
}));

const { generateFioriAppCap } = await import('../../../src/tools/generate-fiori-app-cap.js');
const { GENERATE_FIORI_UI_APPLICATION_CAP_ID } = await import('../../../src/constant.js');

describe('generateFioriAppCap', () => {
    const mockResult = {
        functionalityId: GENERATE_FIORI_UI_APPLICATION_CAP_ID,
        status: 'Success',
        message: 'Generation completed successfully.',
        parameters: {},
        appPath: '/cap-project/app/myapp',
        changes: [],
        timestamp: '2024-01-01T00:00:00.000Z'
    };

    const validArgs = {
        floorplan: 'FE_LROP',
        project: { name: 'myapp', description: 'Test app', targetFolder: '/cap-project', ui5Version: '1.120.0' },
        service: {
            servicePath: '/odata/v4/MyService/',
            capService: { projectPath: '/cap-project', serviceName: 'MyService', serviceCdsPath: 'srv/service.cds' }
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockCapCommand.mockResolvedValue(mockResult);
        mockParse.mockReturnValue(validArgs);
    });

    test('should parse args with Zod schema before calling command', async () => {
        const result = await generateFioriAppCap(validArgs);

        expect(mockParse).toHaveBeenCalledWith(validArgs);
        expect(mockCapCommand).toHaveBeenCalledWith({
            functionalityId: GENERATE_FIORI_UI_APPLICATION_CAP_ID,
            parameters: validArgs,
            appPath: '/cap-project'
        });
        expect(result).toEqual(mockResult);
    });

    test('should use empty string for appPath when project.targetFolder is missing', async () => {
        const argsNoFolder = { floorplan: 'FF_SIMPLE', project: { name: 'myapp', description: 'Test' } };
        mockParse.mockReturnValue(argsNoFolder);

        await generateFioriAppCap(argsNoFolder);

        expect(mockCapCommand).toHaveBeenCalledWith(expect.objectContaining({ appPath: '' }));
    });

    test('should propagate Zod validation errors before calling command', async () => {
        mockParse.mockImplementation(() => {
            throw new Error('Invalid input');
        });

        await expect(generateFioriAppCap({ floorplan: 'INVALID' })).rejects.toThrow('Invalid input');
        expect(mockCapCommand).not.toHaveBeenCalled();
    });

    test('should propagate errors from command function', async () => {
        mockCapCommand.mockRejectedValue(new Error('CAP project not found'));

        await expect(generateFioriAppCap(validArgs)).rejects.toThrow('CAP project not found');
    });
});
