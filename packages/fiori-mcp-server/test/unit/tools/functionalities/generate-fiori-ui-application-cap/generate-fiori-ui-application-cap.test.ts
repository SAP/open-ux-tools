import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ExecuteFunctionalityInput } from '../../../../../src/types';
import type { GeneratorConfigCAPWithAPI } from '../../../../../src/tools/schemas';
import { existsSync, promises as fsPromises } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockFindInstalledPackages = jest.fn<any>().mockResolvedValue([
    {
        path: 'node_modules/@sap/generator-fiori',
        packageJsonPath: 'node_modules/@sap/generator-fiori/package.json',
        packageInfo: {
            name: '@sap/generator-fiori',
            version: '1.18.5'
        }
    }
]);
jest.unstable_mockModule('@sap-ux/nodejs-utils', () => ({
    findInstalledPackages: mockFindInstalledPackages
}));

// Mock child_process.exec
const mockExec = jest.fn<any>();
const actualChildProcess = await import('node:child_process');
jest.unstable_mockModule('child_process', () => ({
    ...actualChildProcess,
    exec: (...args: any) => mockExec(...args)
}));
jest.unstable_mockModule('node:child_process', () => ({
    ...actualChildProcess,
    exec: (...args: any) => mockExec(...args)
}));

const { GENERATE_FIORI_UI_APPLICATION_CAP, generateFioriUIApplicationCapHandlers } = await import(
    '../../../../../src/tools/functionalities/generate-fiori-ui-application-cap'
);

// Read package.json for version
const packageJsonModule = await import('../../../../../package.json', { with: { type: 'json' } });
const packageJson = packageJsonModule.default;

const testOutputDir = join(__dirname, '../../../../test-output/');

describe('getFunctionalityDetails', () => {
    test('getFunctionalityDetails', async () => {
        const details = await generateFioriUIApplicationCapHandlers.getFunctionalityDetails({
            appPath: join(testOutputDir, 'app1'),
            functionalityId: GENERATE_FIORI_UI_APPLICATION_CAP.functionalityId
        });
        expect(details).toMatchSnapshot();
    });
});
const paramTest: GeneratorConfigCAPWithAPI = {
    floorplan: 'FE_LROP',
    version: '0.2',
    project: {
        name: 'app1',
        targetFolder: join(testOutputDir, 'app1'),
        title: 'App 1',
        description: 'Description for App 1',
        ui5Version: '1.136.7',
        sapux: true
    },
    service: {
        servicePath: 'odata/v4/cat-service/',
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
    fsPromises.writeFile = jest.fn<any>().mockImplementation(async (path: string, content: string) => {
        if (path.endsWith('generator-config.json')) {
            cb(content);
        }
        return originalWriteFile(path, content);
    });
};

describe('executeFunctionality', () => {
    test('executeFunctionality - success', async () => {
        let generatedConfigContent: string;
        mockExec.mockImplementation((_cmd: any, _opts: any, callback: any) => {
            callback(null, 'mock stdout', 'mock stderr');
        });
        // Mock fs.writeFile to capture the generated config
        mockFileWrite((content) => {
            generatedConfigContent = content;
        });
        const result = await generateFioriUIApplicationCapHandlers.executeFunctionality({
            appPath: join(testOutputDir, 'app1'),
            functionalityId: GENERATE_FIORI_UI_APPLICATION_CAP.functionalityId,
            parameters: paramTest
        });
        expect(result).toEqual(
            expect.objectContaining({
                appPath: join(testOutputDir, 'app1/app/app1'),
                changes: [],
                functionalityId: 'generate-fiori-ui-application-cap',
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
                        name: 'app1',
                        targetFolder: join(testOutputDir, 'app1'),
                        'title': 'App 1',
                        'ui5Version': '1.136.7',
                        sapux: true
                    },
                    service: {
                        servicePath: 'odata/v4/cat-service/',
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
                        generationSourceVersion: packageJson.version as string
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
            'project': {
                'description': 'Description for App 1',
                'name': 'app1',
                'sapux': true,
                'targetFolder': join(testOutputDir, 'app1'),
                'title': 'App 1',
                'ui5Version': '1.136.7'
            },
            'service': {
                'servicePath': 'odata/v4/cat-service/',
                'capService': {
                    'capType': 'Node.js',
                    'projectPath': 'zzzapp1',
                    'serviceCdsPath': '/srv/cat-service.cds',
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
        mockExec.mockImplementation((_cmd: any, _opts: any, callback: any) => {
            callback(null, 'mock stdout', 'mock stderr');
        });
        // Mock fs.writeFile to capture the generated config
        mockFileWrite((content) => {
            generatedConfigContent = content;
        });
        await generateFioriUIApplicationCapHandlers.executeFunctionality({
            appPath: join(testOutputDir, 'app1'),
            functionalityId: GENERATE_FIORI_UI_APPLICATION_CAP.functionalityId,
            parameters: {
                ...paramTest,
                floorplan: 'FF_SIMPLE'
            }
        });
        const config = JSON.parse(generatedConfigContent!);
        expect(config.project.sapux).toEqual(false);
    });

    test('executeFunctionality - unsuccess', async () => {
        mockExec.mockImplementation((cmd: any, opts: any, callback: any) => {
            throw new Error('Dummy');
        });
        const result = await generateFioriUIApplicationCapHandlers.executeFunctionality({
            appPath: join(testOutputDir, 'app1'),
            functionalityId: GENERATE_FIORI_UI_APPLICATION_CAP.functionalityId,
            parameters: paramTest
        });
        expect(result).toEqual(
            expect.objectContaining({
                appPath: join(testOutputDir, 'app1/app/app1'),
                changes: [],
                functionalityId: 'generate-fiori-ui-application-cap',
                message: `Error generating application: Dummy`,
                parameters: paramTest,
                status: 'Error'
            })
        );
        expect(existsSync(join(testOutputDir, 'app1', 'default-generator-config.json'))).toBeFalsy();
    });

    test('executeFunctionality - empty parameters', async () => {
        mockExec.mockImplementation((cmd: any, opts: any, callback: any) => {
            throw new Error('Dummy');
        });
        await expect(
            generateFioriUIApplicationCapHandlers.executeFunctionality({
                appPath: '',
                functionalityId: GENERATE_FIORI_UI_APPLICATION_CAP.functionalityId,
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
                    \\"expected\\": \\"object\\",
                    \\"code\\": \\"invalid_type\\",
                    \\"path\\": [
                        \\"service\\"
                    ],
                    \\"message\\": \\"Invalid input: expected object, received undefined\\"
                }
            ]"
        `);
    });

    test('executeFunctionality - parameters as non object', async () => {
        mockExec.mockImplementation((cmd: any, opts: any, callback: any) => {
            throw new Error('Dummy');
        });
        await expect(
            generateFioriUIApplicationCapHandlers.executeFunctionality({
                appPath: 'app1',
                functionalityId: GENERATE_FIORI_UI_APPLICATION_CAP.functionalityId,
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
        mockExec.mockImplementation((cmd: any, opts: any, callback: any) => {
            throw new Error('Dummy');
        });
        await expect(
            generateFioriUIApplicationCapHandlers.executeFunctionality(
                undefined as unknown as ExecuteFunctionalityInput
            )
        ).rejects.toThrowErrorMatchingInlineSnapshot(`
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
