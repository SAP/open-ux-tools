import { jest } from '@jest/globals';

const mockParse = jest.fn<any>();
const mockCheckIfGeneratorInstalled = jest.fn<any>();
const mockRunCmd = jest.fn<any>();
const mockValidateWithSchema = jest.fn<any>();

jest.unstable_mockModule('../../../src/tools/schemas/index', () => ({
    generatorConfigOData: { parse: jest.fn() },
    generatorConfigCAP: { parse: mockParse },
    generatorConfigODataJson: {},
    generatorConfigCAPJson: {},
    PREDEFINED_GENERATOR_VALUES: {}
}));

const actualUtils = await import('../../../src/utils/index.js');
jest.unstable_mockModule('../../../src/utils', () => ({
    ...actualUtils,
    checkIfGeneratorInstalled: mockCheckIfGeneratorInstalled,
    runCmd: mockRunCmd,
    validateWithSchema: mockValidateWithSchema
}));

const actualFs = await import('node:fs');
const mockWriteFile = jest.fn<any>().mockResolvedValue(undefined);
const mockMkdir = jest.fn<any>().mockResolvedValue(undefined);
const mockUnlink = jest.fn<any>().mockResolvedValue(undefined);
const mockExistsSync = jest.fn<any>().mockReturnValue(false);
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    default: {
        ...actualFs,
        existsSync: mockExistsSync,
        promises: { mkdir: mockMkdir, writeFile: mockWriteFile, unlink: mockUnlink }
    },
    existsSync: mockExistsSync,
    promises: { mkdir: mockMkdir, writeFile: mockWriteFile, unlink: mockUnlink }
}));

const { generateFioriAppCap } = await import('../../../src/tools/generate-fiori-app-cap.js');

describe('generateFioriAppCap', () => {
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
        mockParse.mockReturnValue(validArgs);
        mockValidateWithSchema.mockImplementation((_schema: any, data: any) => data);
        mockCheckIfGeneratorInstalled.mockResolvedValue(undefined);
        mockRunCmd.mockResolvedValue({ stdout: 'ok', stderr: '' });
    });

    test('should parse args with Zod schema before calling execute', async () => {
        const result = await generateFioriAppCap(validArgs);

        expect(mockParse).toHaveBeenCalledWith(validArgs);
        expect(result.status).toBe('Success');
    });

    test('should propagate Zod validation errors before calling execute', async () => {
        mockParse.mockImplementation(() => {
            throw new Error('Invalid input');
        });

        await expect(generateFioriAppCap({ floorplan: 'INVALID' })).rejects.toThrow('Invalid input');
    });

    test('should use empty string for appPath when project.targetFolder is missing', async () => {
        const argsNoFolder = { floorplan: 'FF_SIMPLE', project: { name: 'myapp', description: 'Test' } };
        mockParse.mockReturnValue(argsNoFolder);
        mockValidateWithSchema.mockImplementation((_schema: any, data: any) => data);

        await expect(generateFioriAppCap(argsNoFolder)).rejects.toThrow(
            'Please provide a valid path to the CAP project folder.'
        );
    });
});
