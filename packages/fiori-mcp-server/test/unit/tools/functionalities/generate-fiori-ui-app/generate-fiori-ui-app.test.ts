import { join } from 'path';
const mockFindInstalledPackages = jest.fn().mockResolvedValue([
    {
        path: 'node_modules/@sap/generator-fiori',
        /** Path to the package.json */
        packageJsonPath: 'node_modules/@sap/generator-fiori/package.json',
        /** The parsed package info */
        packageInfo: {
            name: '@sap/generator-fiori',
            version: '1.18.5'
        }
    }
]);
jest.mock('@sap-ux/nodejs-utils', () => ({
    findInstalledPackages: mockFindInstalledPackages
}));

import {
    GENERATE_FIORI_UI_APP,
    generateFioriUIAppHandlers
} from '../../../../../src/tools/functionalities/generate-fiori-ui-app';
import { existsSync } from 'fs';

// Mock child_process.exec
const mockExec = jest.fn();
const testOutputDir = join(__dirname, '../../../../test-output/');

jest.mock('child_process', () => ({
    exec: (...args: any) => mockExec(...args)
}));

describe('getFunctionalityDetails', () => {
    test('getFunctionalityDetails', async () => {
        const details = await generateFioriUIAppHandlers.getFunctionalityDetails({
            appPath: join(testOutputDir, 'app1'),
            functionalityId: GENERATE_FIORI_UI_APP.id
        });
        expect(details).toEqual(GENERATE_FIORI_UI_APP);
    });
});

describe('executeFunctionality', () => {
    test('executeFunctionality - success', async () => {
        mockExec.mockImplementation((cmd, opts, callback) => {
            callback(null, 'mock stdout', 'mock stderr');
        });
        const result = await generateFioriUIAppHandlers.executeFunctionality({
            appPath: join(testOutputDir, 'app1'),
            functionalityId: GENERATE_FIORI_UI_APP.id,
            parameters: {
                projectPath: join(testOutputDir, 'app1'),
                appGenConfig: {
                    version: '1.0.0',
                    floorplan: 'list',
                    project: {
                        name: 'app1',
                        targetFolder: join(testOutputDir, 'app1')
                    },
                    service: {
                        servicePath: 'app1',
                        capService: {
                            serviceName: 'app1'
                        }
                    },
                    telemetryData: {
                        generationSourceName: 'test',
                        generationSourceVersion: '1.0.0'
                    }
                }
            }
        });
        expect(result).toEqual(
            expect.objectContaining({
                appPath: join(testOutputDir, 'app1/app/app1'),
                changes: [],
                functionalityId: 'generate-fiori-ui-app',
                message: `Generation completed successfully: ${join(testOutputDir, 'app1/app/app1')}`,
                parameters: {
                    appGenConfig: {
                        version: '1.0.0',
                        floorplan: 'list',
                        project: {
                            name: 'app1',
                            targetFolder: join(testOutputDir, 'app1')
                        },
                        service: {
                            servicePath: 'app1',
                            capService: {
                                serviceName: 'app1'
                            }
                        },
                        telemetryData: {
                            generationSourceName: 'test',
                            generationSourceVersion: '1.0.0'
                        }
                    },
                    projectPath: join(testOutputDir, 'app1')
                },
                status: 'Success'
            })
        );
        expect(existsSync(join(testOutputDir, 'app1', 'default-generator-config.json'))).toBeFalsy();
    });

    test('executeFunctionality - unsuccess', async () => {
        mockExec.mockImplementation((cmd, opts, callback) => {
            throw new Error('Dummy');
        });
        const result = await generateFioriUIAppHandlers.executeFunctionality({
            appPath: join(testOutputDir, 'app1'),
            functionalityId: GENERATE_FIORI_UI_APP.id,
            parameters: {
                projectPath: join(testOutputDir, 'app1'),
                appGenConfig: {
                    version: '1.0.0',
                    floorplan: 'list',
                    project: {
                        name: 'app1',
                        targetFolder: join(testOutputDir, 'app1')
                    },
                    service: {
                        servicePath: 'app1',
                        capService: {
                            serviceName: 'app1'
                        }
                    },
                    telemetryData: {
                        generationSourceName: 'test',
                        generationSourceVersion: '1.0.0'
                    }
                }
            }
        });
        expect(result).toEqual(
            expect.objectContaining({
                appPath: join(testOutputDir, 'app1/app/app1'),
                changes: [],
                functionalityId: 'generate-fiori-ui-app',
                message: `Error generating application: Dummy`,
                parameters: {
                    appGenConfig: {
                        version: '1.0.0',
                        floorplan: 'list',
                        project: {
                            name: 'app1',
                            targetFolder: join(testOutputDir, 'app1')
                        },
                        service: {
                            servicePath: 'app1',
                            capService: {
                                serviceName: 'app1'
                            }
                        },
                        telemetryData: {
                            generationSourceName: 'test',
                            generationSourceVersion: '1.0.0'
                        }
                    },
                    projectPath: join(testOutputDir, 'app1')
                },
                status: 'Error'
            })
        );
        expect(existsSync(join(testOutputDir, 'app1', 'default-generator-config.json'))).toBeFalsy();
    });

    test('executeFunctionality - empty parameters', async () => {
        mockExec.mockImplementation((cmd, opts, callback) => {
            throw new Error('Dummy');
        });
        await expect(
            generateFioriUIAppHandlers.executeFunctionality({
                appPath: '',
                functionalityId: GENERATE_FIORI_UI_APP.id,
                parameters: {}
            })
        ).rejects.toThrow('Please provide a valid path to the CAP project folder.');
    });

    test('executeFunctionality - wrong appGenConfig', async () => {
        mockExec.mockImplementation((cmd, opts, callback) => {
            throw new Error('Dummy');
        });
        await expect(
            generateFioriUIAppHandlers.executeFunctionality({
                appPath: 'app1',
                functionalityId: GENERATE_FIORI_UI_APP.id,
                parameters: {
                    projectPath: 'app1',
                    appGenConfig: 'dummy'
                }
            })
        ).rejects.toThrow(
            `Missing required fields in generatorConfig. Please provide all required fields. generatorConfig is \"dummy\"`
        );
    });
});
