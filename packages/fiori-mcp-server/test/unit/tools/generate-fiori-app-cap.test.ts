import { generateFioriAppCap } from '../../../src/tools/generate-fiori-app-cap';
import * as capCommand from '../../../src/tools/functionalities/generate-fiori-ui-application-cap/command';
import { GENERATE_FIORI_UI_APPLICATION_CAP_ID } from '../../../src/constant';

jest.mock('../../../src/tools/functionalities/generate-fiori-ui-application-cap/command');

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

    beforeEach(() => {
        jest.clearAllMocks();
        (capCommand.command as jest.Mock).mockResolvedValue(mockResult);
    });

    test('should call CAP command with args wrapped in parameters', async () => {
        const args = {
            floorplan: 'FE_LROP',
            project: { name: 'myapp', description: 'Test app', targetFolder: '/cap-project', ui5Version: '1.120.0' },
            service: {
                servicePath: '/odata/v4/MyService/',
                capService: { projectPath: '/cap-project', serviceName: 'MyService', serviceCdsPath: 'srv/service.cds' }
            }
        };

        const result = await generateFioriAppCap(args);

        expect(capCommand.command).toHaveBeenCalledWith({
            functionalityId: GENERATE_FIORI_UI_APPLICATION_CAP_ID,
            parameters: args,
            appPath: '/cap-project'
        });
        expect(result).toEqual(mockResult);
    });

    test('should use empty string for appPath when project.targetFolder is missing', async () => {
        const args = { floorplan: 'FF_SIMPLE', project: { name: 'myapp', description: 'Test' } };

        await generateFioriAppCap(args);

        expect(capCommand.command).toHaveBeenCalledWith(expect.objectContaining({ appPath: '' }));
    });

    test('should propagate errors from command function', async () => {
        (capCommand.command as jest.Mock).mockRejectedValue(new Error('CAP project not found'));

        await expect(generateFioriAppCap({ floorplan: 'FE_LROP', project: { targetFolder: '/p' } })).rejects.toThrow(
            'CAP project not found'
        );
    });
});
