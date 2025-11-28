import type { ExecuteFunctionalityInput } from '../../../../../src/types';

// Mock dependencies BEFORE importing the module under test
jest.mock('node:fs', () => {
    const actual = jest.requireActual('node:fs');
    return {
        ...actual,
        promises: {
            readFile: jest.fn(),
            mkdir: jest.fn(),
            writeFile: jest.fn(),
            unlink: jest.fn()
        },
        existsSync: jest.fn()
    };
});
jest.mock('../../../../../src/utils');

import executeFunctionality from '../../../../../src/tools/functionalities/generate-fiori-ui-application/execute-functionality';
import * as utils from '../../../../../src/utils';
import { promises as fsPromises, existsSync } from 'node:fs';

describe('generate-fiori-ui-application execute-functionality', () => {
    const mockAppPath = '/test/project';
    const mockMetadata = '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx>...</edmx:Edmx>';

    beforeEach(() => {
        jest.clearAllMocks();
        (utils.checkIfGeneratorInstalled as jest.Mock).mockResolvedValue(undefined);
        (utils.runCmd as jest.Mock).mockResolvedValue({ stdout: 'Success', stderr: '' });
        (utils.validateWithSchema as jest.Mock).mockImplementation((schema, data) => data.appGenConfig || data);
        (fsPromises.readFile as jest.Mock).mockResolvedValue(mockMetadata);
        (fsPromises.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);
        (fsPromises.unlink as jest.Mock).mockResolvedValue(undefined);
        (existsSync as jest.Mock).mockReturnValue(true);
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
        expect(utils.checkIfGeneratorInstalled).toHaveBeenCalled();
        expect(utils.runCmd).toHaveBeenCalled();
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

        expect(fsPromises.readFile as jest.Mock).toHaveBeenCalledWith(expect.stringContaining('metadata.xml'), {
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

        expect(fsPromises.readFile as jest.Mock).toHaveBeenCalledWith(customMetadataPath, { encoding: 'utf8' });
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

        expect(fsPromises.writeFile as jest.Mock).toHaveBeenCalledWith(
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

        expect(utils.runCmd).toHaveBeenCalledWith(
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

        expect(fsPromises.unlink as jest.Mock).toHaveBeenCalledTimes(2);
        expect(fsPromises.unlink as jest.Mock).toHaveBeenCalledWith(expect.stringContaining('-generator-config.json'));
        expect(fsPromises.unlink as jest.Mock).toHaveBeenCalledWith(expect.stringContaining('metadata.xml'));
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
        (fsPromises.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

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

        const writeCallArgs = (fsPromises.writeFile as jest.Mock).mock.calls[0] as string[];
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

        const writeCallArgs = (fsPromises.writeFile as jest.Mock).mock.calls[0] as string[];
        const configContent = JSON.parse(writeCallArgs[1] as string);
        expect(configContent.project.sapux).toBe(true);
    });

    test('should clean up files even when generation fails', async () => {
        (utils.runCmd as jest.Mock).mockRejectedValue(new Error('Command failed'));

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

        expect(fsPromises.unlink as jest.Mock).toHaveBeenCalledTimes(2);
    });

    test('should only clean up files that exist', async () => {
        (existsSync as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

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

        expect(fsPromises.unlink as jest.Mock).toHaveBeenCalledTimes(1);
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
