import { generateFioriAppCap } from '../../../src/tools/generate-fiori-app-cap';
import * as capCommand from '../../../src/tools/functionalities/generate-fiori-ui-application-cap/command';
import * as schemas from '../../../src/tools/schemas';
import { GENERATE_FIORI_UI_APPLICATION_CAP_ID } from '../../../src/constant';

jest.mock('../../../src/tools/functionalities/generate-fiori-ui-application-cap/command');
jest.mock('../../../src/tools/schemas', () => ({
    ...jest.requireActual('../../../src/tools/schemas'),
    generatorConfigCAP: { parse: jest.fn() }
}));

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
        (capCommand.command as jest.Mock).mockResolvedValue(mockResult);
        (schemas.generatorConfigCAP.parse as jest.Mock).mockReturnValue(validArgs);
    });

    test('should parse args with Zod schema before calling command', async () => {
        const result = await generateFioriAppCap(validArgs);

        expect(schemas.generatorConfigCAP.parse).toHaveBeenCalledWith(validArgs);
        expect(capCommand.command).toHaveBeenCalledWith({
            functionalityId: GENERATE_FIORI_UI_APPLICATION_CAP_ID,
            parameters: validArgs,
            appPath: '/cap-project'
        });
        expect(result).toEqual(mockResult);
    });

    test('should use empty string for appPath when project.targetFolder is missing', async () => {
        const argsNoFolder = { floorplan: 'FF_SIMPLE', project: { name: 'myapp', description: 'Test' } };
        (schemas.generatorConfigCAP.parse as jest.Mock).mockReturnValue(argsNoFolder);

        await generateFioriAppCap(argsNoFolder);

        expect(capCommand.command).toHaveBeenCalledWith(expect.objectContaining({ appPath: '' }));
    });

    test('should propagate Zod validation errors before calling command', async () => {
        (schemas.generatorConfigCAP.parse as jest.Mock).mockImplementation(() => {
            throw new Error('Invalid input');
        });

        await expect(generateFioriAppCap({ floorplan: 'INVALID' })).rejects.toThrow('Invalid input');
        expect(capCommand.command).not.toHaveBeenCalled();
    });

    test('should propagate errors from command function', async () => {
        (capCommand.command as jest.Mock).mockRejectedValue(new Error('CAP project not found'));

        await expect(generateFioriAppCap(validArgs)).rejects.toThrow('CAP project not found');
    });
});
