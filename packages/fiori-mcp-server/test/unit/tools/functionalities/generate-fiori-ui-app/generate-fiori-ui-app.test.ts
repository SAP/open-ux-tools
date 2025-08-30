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
const paramTest = {
    projectPath: join(testOutputDir, 'app1'),
    appGenConfig: {
        version: '1.0.0',
        floorplan: 'FE_LROP',
        project: {
            name: 'app1',
            targetFolder: join(testOutputDir, 'app1'),
            namespace: 'zzz',
            title: 'App 1',
            description: 'Description for App 1',
            ui5Theme: 'sap_belize',
            ui5Version: '1.100.0',
            localUI5Version: '1.100.0',
            sapux: true,
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
        },
        telemetryData: {
            generationSourceName: 'test',
            generationSourceVersion: '1.0.0'
        }
    }
};

describe('executeFunctionality', () => {
    test('executeFunctionality - success', async () => {
        mockExec.mockImplementation((cmd, opts, callback) => {
            callback(null, 'mock stdout', 'mock stderr');
        });
        const result = await generateFioriUIAppHandlers.executeFunctionality({
            appPath: join(testOutputDir, 'app1'),
            functionalityId: GENERATE_FIORI_UI_APP.id,
            parameters: paramTest
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
                        floorplan: 'FE_LROP',
                        project: {
                            description: 'Description for App 1',
                            enableCodeAssist: true,
                            enableEslint: true,
                            enableTypeScript: true,
                            localUI5Version: '1.100.0',
                            name: 'app1',
                            'namespace': 'zzz',
                            'sapux': true,
                            'skipAnnotations': false,
                            targetFolder: join(testOutputDir, 'app1'),
                            'title': 'App 1',
                            'ui5Theme': 'sap_belize',
                            'ui5Version': '1.100.0'
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
                functionalityId: GENERATE_FIORI_UI_APP.id,
                parameters: {}
            })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "Missing required fields in generatorConfig. [
                {
                    \\"expected\\": \\"object\\",
                    \\"code\\": \\"invalid_type\\",
                    \\"path\\": [
                        \\"appGenConfig\\"
                    ],
                    \\"message\\": \\"Invalid input: expected object, received undefined\\"
                }
            ]"
        `);
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
        ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "Missing required fields in generatorConfig. [
                {
                    \\"expected\\": \\"object\\",
                    \\"code\\": \\"invalid_type\\",
                    \\"path\\": [
                        \\"appGenConfig\\"
                    ],
                    \\"message\\": \\"Invalid input: expected object, received string\\"
                }
            ]"
        `);
    });
});
