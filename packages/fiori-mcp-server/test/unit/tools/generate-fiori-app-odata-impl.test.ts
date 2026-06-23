import { jest } from '@jest/globals';

// Mock dependencies BEFORE importing the module under test
const mockReadFile = jest.fn<any>();
const mockMkdir = jest.fn<any>();
const mockWriteFile = jest.fn<any>();
const mockUnlink = jest.fn<any>();
const mockExistsSync = jest.fn<any>();
const actualFs = await import('node:fs');
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    default: {
        ...actualFs,
        existsSync: mockExistsSync,
        promises: {
            readFile: mockReadFile,
            mkdir: mockMkdir,
            writeFile: mockWriteFile,
            unlink: mockUnlink
        }
    },
    existsSync: mockExistsSync,
    promises: {
        readFile: mockReadFile,
        mkdir: mockMkdir,
        writeFile: mockWriteFile,
        unlink: mockUnlink
    }
}));
jest.unstable_mockModule('fs', () => ({
    ...actualFs,
    default: {
        ...actualFs,
        existsSync: mockExistsSync,
        promises: {
            readFile: mockReadFile,
            mkdir: mockMkdir,
            writeFile: mockWriteFile,
            unlink: mockUnlink
        }
    },
    existsSync: mockExistsSync,
    promises: {
        readFile: mockReadFile,
        mkdir: mockMkdir,
        writeFile: mockWriteFile,
        unlink: mockUnlink
    }
}));

// Import the mocked fs for test assertions
const { promises: fsPromises } = await import('node:fs');

// Mock utils
const mockCheckIfGeneratorInstalled = jest.fn<any>();
const mockRunCmd = jest.fn<any>();
const mockValidateWithSchema = jest.fn<any>();
const actualUtils = await import('../../../src/utils/index.js');
jest.unstable_mockModule('../../../src/utils', () => ({
    ...actualUtils,
    checkIfGeneratorInstalled: mockCheckIfGeneratorInstalled,
    runCmd: mockRunCmd,
    validateWithSchema: mockValidateWithSchema,
    getDefaultExtensionFolder: jest.fn()
}));

// Mock schemas so generatorConfigOData.parse() is a passthrough
jest.unstable_mockModule('../../../src/tools/schemas/index', () => ({
    generatorConfigOData: { parse: (v: unknown) => v },
    generatorConfigCAP: { parse: (v: unknown) => v },
    generatorConfigODataJson: {},
    generatorConfigCAPJson: {},
    PREDEFINED_GENERATOR_VALUES: { version: '0.2', telemetryData: {}, project: { sapux: true } }
}));

const { generateFioriAppOData } = await import('../../../src/tools/generate-fiori-app-odata.js');

describe('generate-fiori-ui-application execute-functionality', () => {
    const mockAppPath = '/test/project';
    const mockMetadata = '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx>...</edmx:Edmx>';

    beforeEach(() => {
        jest.clearAllMocks();
        mockCheckIfGeneratorInstalled.mockResolvedValue(undefined);
        mockRunCmd.mockResolvedValue({ stdout: 'Success', stderr: '' });
        mockValidateWithSchema.mockImplementation((schema, data) => data.appGenConfig || data);
        mockReadFile.mockResolvedValue(mockMetadata);
        mockMkdir.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);
        mockUnlink.mockResolvedValue(undefined);
        mockExistsSync.mockReturnValue(true);
    });

    test('should successfully generate application with valid parameters', async () => {
        const args = {
            floorplan: 'FE_LROP',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com'
            }
        };

        const result = await generateFioriAppOData(args);

        expect(result.status).toBe('Success');
        expect(result.message).toContain('Generation completed successfully');
        expect(result.appPath).toContain('testapp');
        expect(mockCheckIfGeneratorInstalled).toHaveBeenCalled();
        expect(mockRunCmd).toHaveBeenCalled();
    });

    test('should read metadata from file', async () => {
        const args = {
            floorplan: 'FE_LROP',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com'
            }
        };

        await generateFioriAppOData(args);

        expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining('metadata.xml'), {
            encoding: 'utf8'
        });
    });

    test('should use custom metadata file path if provided', async () => {
        const customMetadataPath = '/custom/path/metadata.xml';
        const args = {
            floorplan: 'FE_LROP',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com',
                metadataFilePath: customMetadataPath
            }
        };

        await generateFioriAppOData(args);

        expect(mockReadFile).toHaveBeenCalledWith(customMetadataPath, { encoding: 'utf8' });
    });

    test('should write generator config file', async () => {
        const args = {
            floorplan: 'FE_LROP',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com'
            }
        };

        await generateFioriAppOData(args);

        expect(mockWriteFile).toHaveBeenCalledWith(
            expect.stringContaining('-generator-config.json'),
            expect.any(String),
            { encoding: 'utf8' }
        );
    });

    test('should run generator command with correct parameters', async () => {
        const args = {
            floorplan: 'FE_LROP',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com'
            }
        };

        await generateFioriAppOData(args);

        expect(mockRunCmd).toHaveBeenCalledWith(
            expect.stringContaining('npx -y yo@4 @sap/fiori:headless'),
            expect.objectContaining({ cwd: mockAppPath })
        );
    });

    test('should clean up temporary files after generation', async () => {
        const args = {
            floorplan: 'FE_LROP',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com'
            }
        };

        await generateFioriAppOData(args);

        expect(mockUnlink).toHaveBeenCalledTimes(2);
        expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining('-generator-config.json'));
        expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining('metadata.xml'));
    });

    test('should throw error when projectPath is invalid', async () => {
        const args = {
            floorplan: 'FE_LROP',
            project: {
                name: 'testapp'
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com'
            }
        };
        mockValidateWithSchema.mockImplementation((schema, data) => data.appGenConfig || data);

        await expect(generateFioriAppOData(args)).rejects.toThrow(
            'Please provide a valid path to the non-CAP project folder.'
        );
    });

    test('should return error status when generation fails', async () => {
        mockReadFile.mockRejectedValue(new Error('File not found'));

        const args = {
            floorplan: 'FE_LROP',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com'
            }
        };

        const result = await generateFioriAppOData(args);

        expect(result.status).toBe('Error');
        expect(result.message).toContain('Error generating application');
    });

    test('should set sapux to false for FF_SIMPLE floorplan', async () => {
        const args = {
            floorplan: 'FF_SIMPLE',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com'
            }
        };

        await generateFioriAppOData(args);

        const writeCallArgs = mockWriteFile.mock.calls[0] as string[];
        const configContent = JSON.parse(writeCallArgs[1] as string);
        expect(configContent.project.sapux).toBe(false);
    });

    test('should succeed for FF_SIMPLE without service (no data source)', async () => {
        const args = {
            floorplan: 'FF_SIMPLE',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            }
        };

        const result = await generateFioriAppOData(args);

        expect(result.status).toBe('Success');
        expect(fsPromises.readFile as jest.Mock).not.toHaveBeenCalled();
        const writeCallArgs = (fsPromises.writeFile as jest.Mock).mock.calls[0] as string[];
        const configContent = JSON.parse(writeCallArgs[1] as string);
        expect(configContent.project.sapux).toBe(false);
        expect(configContent.service).toBeUndefined();
    });

    test('should only clean up metadata file when service is provided', async () => {
        const args = {
            floorplan: 'FF_SIMPLE',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            }
        };

        await generateFioriAppOData(args);

        // Only config file should be cleaned up, not metadata (no service)
        expect(fsPromises.unlink as jest.Mock).toHaveBeenCalledTimes(1);
        expect(fsPromises.unlink as jest.Mock).toHaveBeenCalledWith(expect.stringContaining('-generator-config.json'));
    });

    test('should set sapux to true for non-FF_SIMPLE floorplan', async () => {
        const args = {
            floorplan: 'FE_LROP',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com'
            }
        };

        await generateFioriAppOData(args);

        const writeCallArgs = mockWriteFile.mock.calls[0] as string[];
        const configContent = JSON.parse(writeCallArgs[1] as string);
        expect(configContent.project.sapux).toBe(true);
    });

    test('should clean up files even when generation fails', async () => {
        mockRunCmd.mockRejectedValue(new Error('Command failed'));

        const args = {
            floorplan: 'FE_LROP',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com'
            }
        };

        await generateFioriAppOData(args);

        expect(mockUnlink).toHaveBeenCalledTimes(2);
    });

    test('should only clean up files that exist', async () => {
        mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);

        const args = {
            floorplan: 'FE_LROP',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com'
            }
        };

        await generateFioriAppOData(args);

        expect(mockUnlink).toHaveBeenCalledTimes(1);
    });

    test('should return timestamp in ISO format', async () => {
        const args = {
            floorplan: 'FE_LROP',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com'
            }
        };

        const result = await generateFioriAppOData(args);

        expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should strip wrapping single quotes from entityName', async () => {
        const args = {
            floorplan: 'FE_LROP',
            project: {
                name: 'testapp',
                targetFolder: mockAppPath
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com'
            },
            entityConfig: {
                mainEntity: { entityName: "'SalesOrder'" }
            }
        };

        await generateFioriAppOData(args);

        const writeCallArgs = mockWriteFile.mock.calls[0] as string[];
        const configContent = JSON.parse(writeCallArgs[1] as string);
        expect(configContent.entityConfig.mainEntity.entityName).toBe('SalesOrder');
    });

    test('should use default app name when not provided', async () => {
        const args = {
            floorplan: 'FE_LROP',
            project: {
                targetFolder: mockAppPath
            },
            service: {
                servicePath: '/sap/opu/odata4/service',
                url: 'https://test.example.com'
            }
        };

        const result = await generateFioriAppOData(args);

        expect(result.appPath).toContain('default');
    });
});
