import { jest } from '@jest/globals';
import type { ExecuteFunctionalityInput } from '../../../../../src/types';

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

// Mock utils
const mockCheckIfGeneratorInstalled = jest.fn<any>();
const mockRunCmd = jest.fn<any>();
const mockValidateWithSchema = jest.fn<any>();
const actualUtils = await import('../../../../../src/utils');
jest.unstable_mockModule('../../../../../src/utils', () => ({
    ...actualUtils,
    checkIfGeneratorInstalled: mockCheckIfGeneratorInstalled,
    runCmd: mockRunCmd,
    validateWithSchema: mockValidateWithSchema,
    getDefaultExtensionFolder: jest.fn()
}));

const { default: executeFunctionality } = await import(
    '../../../../../src/tools/functionalities/generate-fiori-ui-application/execute-functionality'
);

describe('generate-fiori-ui-application execute-functionality', () => {
    const mockAppPath = '/test/project';
    const mockMetadata = '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx>...</edmx:Edmx>';

    beforeEach(() => {
        jest.clearAllMocks();
        mockCheckIfGeneratorInstalled.mockResolvedValue(undefined);
        mockRunCmd.mockResolvedValue({ stdout: 'Success', stderr: '' });
        mockValidateWithSchema.mockImplementation((schema: any, data: any) => data.appGenConfig || data);
        mockReadFile.mockResolvedValue(mockMetadata);
        mockMkdir.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);
        mockUnlink.mockResolvedValue(undefined);
        mockExistsSync.mockReturnValue(true);
    });

    test('should successfully generate application with valid parameters', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'generate-fiori-ui-application',
            parameters: {
                appGenConfig: {
                    floorplan: 'FE_LROP',
                    project: {
                        name: 'testapp',
                        targetFolder: mockAppPath
                    },
                    service: {
                        servicePath: '/sap/opu/odata4/service',
                        url: 'https://test.example.com'
                    }
                }
            }
        };

        const result = await executeFunctionality(params);

        expect(result.status).toBe('Success');
        expect(result.functionalityId).toBe('generate-fiori-ui-application');
        expect(result.message).toContain('Generation completed successfully');
        expect(result.appPath).toContain('testapp');
        expect(mockCheckIfGeneratorInstalled).toHaveBeenCalled();
        expect(mockRunCmd).toHaveBeenCalled();
    });

    test('should read metadata from file', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'generate-fiori-ui-application',
            parameters: {
                appGenConfig: {
                    floorplan: 'FE_LROP',
                    project: {
                        name: 'testapp',
                        targetFolder: mockAppPath
                    },
                    service: {
                        servicePath: '/sap/opu/odata4/service',
                        url: 'https://test.example.com'
                    }
                }
            }
        };

        await executeFunctionality(params);

        expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining('metadata.xml'), {
            encoding: 'utf8'
        });
    });

    test('should use custom metadata file path if provided', async () => {
        const customMetadataPath = '/custom/path/metadata.xml';
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'generate-fiori-ui-application',
            parameters: {
                appGenConfig: {
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
                }
            }
        };

        await executeFunctionality(params);

        expect(mockReadFile).toHaveBeenCalledWith(customMetadataPath, { encoding: 'utf8' });
    });

    test('should write generator config file', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'generate-fiori-ui-application',
            parameters: {
                appGenConfig: {
                    floorplan: 'FE_LROP',
                    project: {
                        name: 'testapp',
                        targetFolder: mockAppPath
                    },
                    service: {
                        servicePath: '/sap/opu/odata4/service',
                        url: 'https://test.example.com'
                    }
                }
            }
        };

        await executeFunctionality(params);

        expect(mockWriteFile).toHaveBeenCalledWith(
            expect.stringContaining('-generator-config.json'),
            expect.any(String),
            { encoding: 'utf8' }
        );
    });

    test('should run generator command with correct parameters', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'generate-fiori-ui-application',
            parameters: {
                appGenConfig: {
                    floorplan: 'FE_LROP',
                    project: {
                        name: 'testapp',
                        targetFolder: mockAppPath
                    },
                    service: {
                        servicePath: '/sap/opu/odata4/service',
                        url: 'https://test.example.com'
                    }
                }
            }
        };

        await executeFunctionality(params);

        expect(mockRunCmd).toHaveBeenCalledWith(
            expect.stringContaining('npx -y yo@4 @sap/fiori:headless'),
            expect.objectContaining({ cwd: mockAppPath })
        );
    });

    test('should clean up temporary files after generation', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'generate-fiori-ui-application',
            parameters: {
                appGenConfig: {
                    floorplan: 'FE_LROP',
                    project: {
                        name: 'testapp',
                        targetFolder: mockAppPath
                    },
                    service: {
                        servicePath: '/sap/opu/odata4/service',
                        url: 'https://test.example.com'
                    }
                }
            }
        };

        await executeFunctionality(params);

        expect(mockUnlink).toHaveBeenCalledTimes(2);
        expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining('-generator-config.json'));
        expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining('metadata.xml'));
    });

    test('should throw error when projectPath is invalid', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: '',
            functionalityId: 'generate-fiori-ui-application',
            parameters: {
                appGenConfig: {
                    floorplan: 'FE_LROP',
                    project: {
                        name: 'testapp'
                    },
                    service: {
                        servicePath: '/sap/opu/odata4/service',
                        url: 'https://test.example.com'
                    }
                }
            }
        };

        await expect(executeFunctionality(params)).rejects.toThrow(
            'Please provide a valid path to the non-CAP project folder.'
        );
    });

    test('should return error status when generation fails', async () => {
        mockReadFile.mockRejectedValue(new Error('File not found'));

        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'generate-fiori-ui-application',
            parameters: {
                appGenConfig: {
                    floorplan: 'FE_LROP',
                    project: {
                        name: 'testapp',
                        targetFolder: mockAppPath
                    },
                    service: {
                        servicePath: '/sap/opu/odata4/service',
                        url: 'https://test.example.com'
                    }
                }
            }
        };

        const result = await executeFunctionality(params);

        expect(result.status).toBe('Error');
        expect(result.message).toContain('Error generating application');
    });

    test('should set sapux to false for FF_SIMPLE floorplan', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'generate-fiori-ui-application',
            parameters: {
                appGenConfig: {
                    floorplan: 'FF_SIMPLE',
                    project: {
                        name: 'testapp',
                        targetFolder: mockAppPath
                    },
                    service: {
                        servicePath: '/sap/opu/odata4/service',
                        url: 'https://test.example.com'
                    }
                }
            }
        };

        await executeFunctionality(params);

        const writeCallArgs = mockWriteFile.mock.calls[0] as string[];
        const configContent = JSON.parse(writeCallArgs[1] as string);
        expect(configContent.project.sapux).toBe(false);
    });

    test('should set sapux to true for non-FF_SIMPLE floorplan', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'generate-fiori-ui-application',
            parameters: {
                appGenConfig: {
                    floorplan: 'FE_LROP',
                    project: {
                        name: 'testapp',
                        targetFolder: mockAppPath
                    },
                    service: {
                        servicePath: '/sap/opu/odata4/service',
                        url: 'https://test.example.com'
                    }
                }
            }
        };

        await executeFunctionality(params);

        const writeCallArgs = mockWriteFile.mock.calls[0] as string[];
        const configContent = JSON.parse(writeCallArgs[1] as string);
        expect(configContent.project.sapux).toBe(true);
    });

    test('should clean up files even when generation fails', async () => {
        mockRunCmd.mockRejectedValue(new Error('Command failed'));

        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'generate-fiori-ui-application',
            parameters: {
                appGenConfig: {
                    floorplan: 'FE_LROP',
                    project: {
                        name: 'testapp',
                        targetFolder: mockAppPath
                    },
                    service: {
                        servicePath: '/sap/opu/odata4/service',
                        url: 'https://test.example.com'
                    }
                }
            }
        };

        await executeFunctionality(params);

        expect(mockUnlink).toHaveBeenCalledTimes(2);
    });

    test('should only clean up files that exist', async () => {
        mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);

        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'generate-fiori-ui-application',
            parameters: {
                appGenConfig: {
                    floorplan: 'FE_LROP',
                    project: {
                        name: 'testapp',
                        targetFolder: mockAppPath
                    },
                    service: {
                        servicePath: '/sap/opu/odata4/service',
                        url: 'https://test.example.com'
                    }
                }
            }
        };

        await executeFunctionality(params);

        expect(mockUnlink).toHaveBeenCalledTimes(1);
    });

    test('should return timestamp in ISO format', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'generate-fiori-ui-application',
            parameters: {
                appGenConfig: {
                    floorplan: 'FE_LROP',
                    project: {
                        name: 'testapp',
                        targetFolder: mockAppPath
                    },
                    service: {
                        servicePath: '/sap/opu/odata4/service',
                        url: 'https://test.example.com'
                    }
                }
            }
        };

        const result = await executeFunctionality(params);

        expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should use default app name when not provided', async () => {
        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'generate-fiori-ui-application',
            parameters: {
                appGenConfig: {
                    floorplan: 'FE_LROP',
                    project: {
                        targetFolder: mockAppPath
                    },
                    service: {
                        servicePath: '/sap/opu/odata4/service',
                        url: 'https://test.example.com'
                    }
                }
            }
        };

        const result = await executeFunctionality(params);

        expect(result.appPath).toContain('default');
    });
});
