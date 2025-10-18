import { join } from 'node:path';
import type { ExecuteFunctionalityInput } from '../../../../../src/types';
import type { GeneratorConfigCAP } from '../../../../../src/tools/schemas';
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
import { existsSync, promises as fsPromises } from 'node:fs';

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
        expect(details).toMatchSnapshot();
    });
});
const paramTest: GeneratorConfigCAP = {
    floorplan: 'FE_LROP',
    version: '0.2',
    projectType: 'LIST_REPORT_OBJECT_PAGE',
    project: {
        name: 'app1',
        targetFolder: join(testOutputDir, 'app1'),
        title: 'App 1',
        description: 'Description for App 1',
        ui5Version: '1.136.7',
        sapux: true
    },
    service: {
        capService: {
            projectPath: 'zzzapp1',
            serviceName: 'app1',
            serviceCdsPath: 'srv/cat-service.cds',
            capType: 'Node.js' // optional
        }
    },
    entityConfig: {
        mainEntity: {
            entityName: 'Travel'
        },
        generateFormAnnotations: true,
        generateLROPAnnotations: true
    },
    telemetryData: {
        generationSourceName: '@sap-ux/fiori-mcp-server',
        generationSourceVersion: packageJson.version
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
                    projectType: 'LIST_REPORT_OBJECT_PAGE',
                    project: {
                        description: 'Description for App 1',
                        name: 'app1',
                        targetFolder: join(testOutputDir, 'app1'),
                        'title': 'App 1',
                        'ui5Version': '1.136.7',
                        sapux: true
                    },
                    service: {
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
                    },
                    telemetryData: {
                        generationSourceName: '@sap-ux/fiori-mcp-server',
                        generationSourceVersion: '0.2.4'
                    },
                    version: '0.2'
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
            'projectType': 'LIST_REPORT_OBJECT_PAGE',
            'project': {
                'description': 'Description for App 1',
                'name': 'app1',
                'sapux': true,
                'targetFolder': join(testOutputDir, 'app1'),
                'title': 'App 1',
                'ui5Version': '1.136.7'
            },
            'service': {
                'capService': {
                    'capType': 'Node.js',
                    'projectPath': 'zzzapp1',
                    'serviceCdsPath': 'srv/cat-service.cds',
                    'serviceName': 'app1'
                }
            },
            'telemetryData': {
                'generationSourceName': '@sap-ux/fiori-mcp-server',
                'generationSourceVersion': packageJson.version
            },
            'version': '0.2'
        });
    });

    test('executeFunctionality - success with floorplan="FF_SIMPLE"', async () => {
        let generatedConfigContent: string;
        mockExec.mockImplementation((_cmd, _opts, callback) => {
            callback(null, 'mock stdout', 'mock stderr');
        });
        // Mock fs.writeFile to capture the generated config
        mockFileWrite((content) => {
            generatedConfigContent = content;
        });
        await generateFioriUIAppHandlers.executeFunctionality({
            appPath: join(testOutputDir, 'app1'),
            functionalityId: GENERATE_FIORI_UI_APP.functionalityId,
            parameters: {
                ...paramTest,
                floorplan: 'FF_SIMPLE'
            }
        });
        const config = JSON.parse(generatedConfigContent!);
        expect(config.project.sapux).toEqual(false);
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
                    \\"expected\\": \\"object\\",
                    \\"code\\": \\"invalid_type\\",
                    \\"path\\": [
                        \\"entityConfig\\"
                    ],
                    \\"message\\": \\"Invalid input: expected object, received undefined\\"
                },
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
                    \\"code\\": \\"invalid_value\\",
                    \\"values\\": [
                        \\"LIST_REPORT_OBJECT_PAGE\\",
                        \\"FORM_ENTRY_OBJECT_PAGE\\",
                        \\"FLEXIBLE_PROGRAMMING_MODEL\\"
                    ],
                    \\"path\\": [
                        \\"projectType\\"
                    ],
                    \\"message\\": \\"Invalid option: expected one of \\\\\\"LIST_REPORT_OBJECT_PAGE\\\\\\"|\\\\\\"FORM_ENTRY_OBJECT_PAGE\\\\\\"|\\\\\\"FLEXIBLE_PROGRAMMING_MODEL\\\\\\"\\"
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
                        \\"telemetryData\\"
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
        await expect(generateFioriUIAppHandlers.executeFunctionality(undefined as unknown as ExecuteFunctionalityInput))
            .rejects.toThrowErrorMatchingInlineSnapshot(`
            "Missing required fields in parameters. [
                {
                    \\"expected\\": \\"object\\",
                    \\"code\\": \\"invalid_type\\",
                    \\"path\\": [],
                    \\"message\\": \\"Invalid input: expected object, received undefined\\"
                }
            ]"
        `);
    });
});
