import { join } from 'path';
import type { ExecuteFunctionalityInput } from '../../../../../src/types';
import type { GeneratorConfigCAP } from '../../../../../src/tools/functionalities/generate-fiori-ui-app/command';
import packageJson from '../../../../../package.json';

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
import { existsSync, promises as fsPromises } from 'fs';

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
            functionalityId: GENERATE_FIORI_UI_APP.functionalityId
        });
        expect(details).toEqual(GENERATE_FIORI_UI_APP);
    });
});
const paramTest: GeneratorConfigCAP = {
    floorplan: 'FE_LROP',
    project: {
        name: 'app1',
        targetFolder: join(testOutputDir, 'app1'),
        namespace: 'zzz',
        title: 'App 1',
        description: 'Description for App 1',
        ui5Theme: 'sap_horizon',
        ui5Version: '1.136.7',
        localUI5Version: '1.136.7',
        skipAnnotations: false,
        enableCodeAssist: true,
        enableEslint: true,
        enableTypeScript: true
    },
    service: {
        capService: {
            projectPath: 'zzzapp1',
            serviceName: 'app1',
            serviceCdsPath: 'srv/cat-service.cds',
            capType: 'Node.js' // optional
        },
        servicePath: 'app1'
    },
    entityConfig: {
        mainEntity: {
            entityName: 'Travel'
        },
        generateFormAnnotations: true,
        generateLROPAnnotations: true
    }
};

const mockFileWrite = (cb: (content: string) => void) => {
    const originalWriteFile = fsPromises.writeFile;
    fsPromises.writeFile = jest.fn().mockImplementation(async (path: string, content: string) => {
        if (path.endsWith('generator-config.json')) {
            cb(content);
        }
        return originalWriteFile(path, content);
    });
};

describe('executeFunctionality', () => {
    test('executeFunctionality - success', async () => {
        let generatedConfigContent: string;
        mockExec.mockImplementation((_cmd, _opts, callback) => {
            callback(null, 'mock stdout', 'mock stderr');
        });
        // Mock fs.writeFile to capture the generated config
        mockFileWrite((content) => {
            generatedConfigContent = content;
        });
        const result = await generateFioriUIAppHandlers.executeFunctionality({
            appPath: join(testOutputDir, 'app1'),
            functionalityId: GENERATE_FIORI_UI_APP.functionalityId,
            parameters: paramTest
        });
        expect(result).toEqual(
            expect.objectContaining({
                appPath: join(testOutputDir, 'app1/app/app1'),
                changes: [],
                functionalityId: 'generate-fiori-ui-app',
                message: `Generation completed successfully: ${join(
                    testOutputDir,
                    'app1/app/app1'
                )}. You must run \`npm install\` in ${join(
                    testOutputDir,
                    'app1'
                )} before trying to run the application.`,
                parameters: {
                    floorplan: 'FE_LROP',
                    project: {
                        description: 'Description for App 1',
                        enableCodeAssist: true,
                        enableEslint: true,
                        enableTypeScript: true,
                        localUI5Version: '1.136.7',
                        name: 'app1',
                        'namespace': 'zzz',
                        'skipAnnotations': false,
                        targetFolder: join(testOutputDir, 'app1'),
                        'title': 'App 1',
                        'ui5Theme': 'sap_horizon',
                        'ui5Version': '1.136.7'
                    },
                    service: {
                        servicePath: 'app1',
                        capService: {
                            serviceName: 'app1',
                            'capType': 'Node.js',
                            'projectPath': 'zzzapp1',
                            'serviceCdsPath': 'srv/cat-service.cds'
                        }
                    },
                    entityConfig: {
                        mainEntity: {
                            entityName: 'Travel'
                        },
                        generateFormAnnotations: true,
                        generateLROPAnnotations: true
                    }
                },
                status: 'Success'
            })
        );
        expect(existsSync(join(testOutputDir, 'app1', 'default-generator-config.json'))).toBeFalsy();
        const config = JSON.parse(generatedConfigContent!);
        expect(config).toEqual({
            'entityConfig': {
                'generateFormAnnotations': true,
                'generateLROPAnnotations': true,
                'mainEntity': {
                    'entityName': 'Travel'
                }
            },
            'floorplan': 'FE_LROP',
            'project': {
                'description': 'Description for App 1',
                'enableCodeAssist': true,
                'enableEslint': true,
                'enableTypeScript': true,
                'localUI5Version': '1.136.7',
                'name': 'app1',
                'namespace': 'zzz',
                'sapux': true,
                'skipAnnotations': false,
                'targetFolder': join(testOutputDir, 'app1'),
                'title': 'App 1',
                'ui5Theme': 'sap_horizon',
                'ui5Version': '1.136.7'
            },
            'service': {
                'capService': {
                    'capType': 'Node.js',
                    'projectPath': 'zzzapp1',
                    'serviceCdsPath': 'srv/cat-service.cds',
                    'serviceName': 'app1'
                },
                'servicePath': '/app1'
            },
            'telemetryData': {
                'generationSourceName': '@sap-ux/fiori-mcp-server',
                'generationSourceVersion': packageJson.version
            },
            'version': '0.2'
        });
    });

    test('executeFunctionality - unsuccess', async () => {
        mockExec.mockImplementation((cmd, opts, callback) => {
            throw new Error('Dummy');
        });
        const result = await generateFioriUIAppHandlers.executeFunctionality({
            appPath: join(testOutputDir, 'app1'),
            functionalityId: GENERATE_FIORI_UI_APP.functionalityId,
            parameters: paramTest
        });
        expect(result).toEqual(
            expect.objectContaining({
                appPath: join(testOutputDir, 'app1/app/app1'),
                changes: [],
                functionalityId: 'generate-fiori-ui-app',
                message: `Error generating application: Dummy`,
                parameters: paramTest,
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
                functionalityId: GENERATE_FIORI_UI_APP.functionalityId,
                parameters: {}
            })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "Missing required fields in parameters. [
                {
                    \\"code\\": \\"invalid_value\\",
                    \\"values\\": [
                        \\"FE_FPM\\",
                        \\"FE_LROP\\",
                        \\"FE_OVP\\",
                        \\"FE_ALP\\",
                        \\"FE_FEOP\\",
                        \\"FE_WORKLIST\\",
                        \\"FF_SIMPLE\\"
                    ],
                    \\"path\\": [
                        \\"floorplan\\"
                    ],
                    \\"message\\": \\"Invalid option: expected one of \\\\\\"FE_FPM\\\\\\"|\\\\\\"FE_LROP\\\\\\"|\\\\\\"FE_OVP\\\\\\"|\\\\\\"FE_ALP\\\\\\"|\\\\\\"FE_FEOP\\\\\\"|\\\\\\"FE_WORKLIST\\\\\\"|\\\\\\"FF_SIMPLE\\\\\\"\\"
                },
                {
                    \\"expected\\": \\"object\\",
                    \\"code\\": \\"invalid_type\\",
                    \\"path\\": [
                        \\"project\\"
                    ],
                    \\"message\\": \\"Invalid input: expected object, received undefined\\"
                },
                {
                    \\"expected\\": \\"object\\",
                    \\"code\\": \\"invalid_type\\",
                    \\"path\\": [
                        \\"service\\"
                    ],
                    \\"message\\": \\"Invalid input: expected object, received undefined\\"
                },
                {
                    \\"expected\\": \\"object\\",
                    \\"code\\": \\"invalid_type\\",
                    \\"path\\": [
                        \\"entityConfig\\"
                    ],
                    \\"message\\": \\"Invalid input: expected object, received undefined\\"
                }
            ]"
        `);
    });

    test('executeFunctionality - parameters as non object', async () => {
        mockExec.mockImplementation((cmd, opts, callback) => {
            throw new Error('Dummy');
        });
        await expect(
            generateFioriUIAppHandlers.executeFunctionality({
                appPath: 'app1',
                functionalityId: GENERATE_FIORI_UI_APP.functionalityId,
                parameters: 'dummy'
            } as unknown as ExecuteFunctionalityInput)
        ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "Missing required fields in parameters. [
                {
                    \\"expected\\": \\"object\\",
                    \\"code\\": \\"invalid_type\\",
                    \\"path\\": [],
                    \\"message\\": \\"Invalid input: expected object, received string\\"
                }
            ]"
        `);
    });

    test('executeFunctionality called without parameters (unexpected in real use case)', async () => {
        mockExec.mockImplementation((cmd, opts, callback) => {
            throw new Error('Dummy');
        });
        await expect(
            generateFioriUIAppHandlers.executeFunctionality(undefined as unknown as ExecuteFunctionalityInput)
        ).rejects.toThrowErrorMatchingInlineSnapshot('"Unknown error. Recheck input parameters."');
    });

    test('executeFunctionality - servicePath normalization without leading slash', async () => {
        let generatedConfigContent: string;
        mockExec.mockImplementation((_cmd, _opts, callback) => {
            callback(null, 'mock stdout', 'mock stderr');
        });

        // Mock fs.writeFile to capture the generated config
        mockFileWrite((content) => {
            generatedConfigContent = content;
        });

        const paramWithServicePath = {
            ...paramTest,
            service: {
                ...paramTest.service,
                servicePath: 'my-service' // No leading slash
            }
        };

        const result = await generateFioriUIAppHandlers.executeFunctionality({
            appPath: join(testOutputDir, 'app1'),
            functionalityId: GENERATE_FIORI_UI_APP.functionalityId,
            parameters: paramWithServicePath
        });

        expect(result.status).toBe('Success');
        // Verify the generated config has the normalized path
        const config = JSON.parse(generatedConfigContent!);
        expect(config.service.servicePath).toBe('/my-service');
    });

    test('executeFunctionality - servicePath normalization with leading slash', async () => {
        let generatedConfigContent: string;
        mockExec.mockImplementation((_cmd, _opts, callback) => {
            callback(null, 'mock stdout', 'mock stderr');
        });

        // Mock fs.writeFile to capture the generated config
        mockFileWrite((content) => {
            generatedConfigContent = content;
        });

        const paramWithServicePath = {
            ...paramTest,
            service: {
                ...paramTest.service,
                servicePath: '/my-service' // Already has leading slash
            }
        };

        const result = await generateFioriUIAppHandlers.executeFunctionality({
            appPath: join(testOutputDir, 'app1'),
            functionalityId: GENERATE_FIORI_UI_APP.functionalityId,
            parameters: paramWithServicePath
        });

        expect(result.status).toBe('Success');
        // Verify the generated config preserves the path with leading slash
        const config = JSON.parse(generatedConfigContent!);
        expect(config.service.servicePath).toBe('/my-service');
    });

    test('executeFunctionality - servicePath normalization with empty string', async () => {
        let generatedConfigContent: string;
        mockExec.mockImplementation((_cmd, _opts, callback) => {
            callback(null, 'mock stdout', 'mock stderr');
        });

        // Mock fs.writeFile to capture the generated config
        mockFileWrite((content) => {
            generatedConfigContent = content;
        });

        const paramWithEmptyServicePath = {
            ...paramTest,
            service: {
                ...paramTest.service,
                servicePath: '' // Empty string
            }
        };

        const result = await generateFioriUIAppHandlers.executeFunctionality({
            appPath: join(testOutputDir, 'app1'),
            functionalityId: GENERATE_FIORI_UI_APP.functionalityId,
            parameters: paramWithEmptyServicePath
        });

        expect(result.status).toBe('Success');
        // Verify the generated config keeps empty string as-is (no normalization for empty strings)
        const config = JSON.parse(generatedConfigContent!);
        expect(config.service.servicePath).toBe('');
    });
});
