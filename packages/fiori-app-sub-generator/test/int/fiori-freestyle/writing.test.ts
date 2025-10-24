import type { CapServiceCdsInfo } from '@sap-ux/cap-config-writer';
import '@sap-ux/jest-file-matchers';
import { DatasourceType, OdataVersion } from '@sap-ux/odata-service-inquirer';
import { copyFileSync, promises as fsPromise, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { rimraf } from 'rimraf';
import { FloorplanFF, type State } from '../../../src/types';
import { cleanTestDir, getTestDir, ignoreMatcherOpts, runWritingPhaseGen } from '../test-utils';
import { initI18nFioriAppSubGenerator } from '../../../src';

const EXPECTED_OUT_PATH = './expected-output';
const originalCwd: string = process.cwd(); // Generation changes the cwd, this breaks sonar report so we restore later

jest.mock('@sap-ux/fiori-generator-shared', () => {
    const fioriGenShared = jest.requireActual('@sap-ux/fiori-generator-shared');
    return {
        ...fioriGenShared,
        sendTelemetry: jest.fn()
    };
});

function setExpectedOutPath(projectName: string): string {
    return join(__dirname, EXPECTED_OUT_PATH, projectName);
}

describe('Freestyle generation', () => {
    let testProjectName: string;
    let mockModulePath: string;
    const testDir = getTestDir('fiori-freestyle');

    beforeAll(async () => {
        cleanTestDir(testDir);
        await initI18nFioriAppSubGenerator();
    });

    afterAll(() => {
        try {
            cleanTestDir(testDir);
            process.chdir(originalCwd);
        } catch {
            // lint required
        }
    });

    afterEach(() => {
        // remove specific generated app folder
        rimraf.rimrafSync(join(testDir, testProjectName));
    });

    it('Test Freestyle Simple Floorplan v2', async () => {
        testProjectName = 'simple';
        mockModulePath = setExpectedOutPath(testProjectName);
        const state: State = {
            project: {
                name: testProjectName,
                description: 'An SAP Fiori application.',
                title: 'App Title',
                ui5Theme: 'sap_fiori_3',
                ui5Version: '1.82.2',
                localUI5Version: '1.82.2',
                skipAnnotations: false,
                namespace: 'simplenamespace',
                targetFolder: testDir,
                enableVirtualEndpoints: true
            },
            service: {
                version: OdataVersion.v2,
                source: DatasourceType.odataServiceUrl
            },
            floorplan: FloorplanFF.FF_SIMPLE,
            viewName: 'TestViewName123'
        };
        await runWritingPhaseGen(state);
        expect(join(testDir, testProjectName)).toMatchFolder(mockModulePath, ignoreMatcherOpts);
    });

    it('Test Freestyle Simple Floorplan v2 - ui5 client mock tasks created', async () => {
        testProjectName = 'simple_v2_mock_tasks';
        mockModulePath = setExpectedOutPath(testProjectName);
        const state: State = {
            project: {
                name: testProjectName,
                description: 'An SAP Fiori application.',
                title: 'App Title',
                ui5Theme: 'sap_fiori_3',
                ui5Version: '1.82.2',
                localUI5Version: '1.82.2',
                skipAnnotations: false,
                namespace: '',
                targetFolder: testDir
            },
            service: {
                version: OdataVersion.v2,
                edmx: '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="1.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"></edmx:Edmx>',
                source: DatasourceType.metadataFile
            },
            floorplan: FloorplanFF.FF_SIMPLE,
            viewName: 'View1'
        };
        await runWritingPhaseGen(state);
        expect(join(testDir, testProjectName)).toMatchFolder(mockModulePath, ignoreMatcherOpts);
    });

    it('Test Freestyle Simple Floorplan v4', async () => {
        testProjectName = 'simple_v4';
        mockModulePath = setExpectedOutPath(testProjectName);
        const state: State = {
            project: {
                name: testProjectName,
                description: 'An SAP Fiori application.',
                title: 'App Title',
                ui5Theme: 'sap_horizon',
                ui5Version: '1.82.2',
                localUI5Version: '1.82.2',
                skipAnnotations: false,
                namespace: '',
                targetFolder: testDir,
                enableVirtualEndpoints: true
            },
            service: {
                host: 'http://localhost',
                version: OdataVersion.v4,
                edmx: '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="1.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"></edmx:Edmx>',
                source: DatasourceType.metadataFile
            },
            floorplan: FloorplanFF.FF_SIMPLE,
            viewName: 'View1'
        };
        await runWritingPhaseGen(state);
        expect(join(testDir, testProjectName)).toMatchFolder(mockModulePath, ignoreMatcherOpts);
    });

    it('Test Freestyle Simple Floorplan v4 with metadata file uploaded', async () => {
        testProjectName = 'simple_v4_metadata_file';
        mockModulePath = setExpectedOutPath(testProjectName);
        const state: State = {
            project: {
                name: testProjectName,
                description: 'An SAP Fiori application.',
                title: 'App Title',
                ui5Theme: 'sap_fiori_3',
                ui5Version: '1.82.2',
                localUI5Version: '1.82.2',
                skipAnnotations: false,
                namespace: '',
                targetFolder: testDir
            },
            service: {
                source: DatasourceType.metadataFile,
                version: OdataVersion.v4,
                edmx: '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"></edmx:Edmx>'
            },
            floorplan: FloorplanFF.FF_SIMPLE,
            viewName: 'View1'
        };
        await runWritingPhaseGen(state);
        expect(join(testDir, testProjectName)).toMatchFolder(mockModulePath, ignoreMatcherOpts);
    });

    it('Test Freestyle Simple Floorplan - CAP', async () => {
        testProjectName = 'simple_cap';
        mockModulePath = setExpectedOutPath(testProjectName);
        // Copy fake package.json to mimic real CAP project
        mkdirSync(join(testDir, testProjectName), { recursive: true });
        copyFileSync(
            join(__dirname, './fixtures/cap-package.json.test'),
            join(testDir, testProjectName, 'package.json')
        );
        const accessSpy = jest.spyOn(fsPromise, 'access').mockResolvedValue();

        const state: State = {
            project: {
                name: testProjectName,
                description: 'An SAP Fiori application on CAP.',
                title: 'App Title',
                ui5Theme: 'sap_fiori_3',
                ui5Version: '1.82.2',
                localUI5Version: '1.82.2',
                skipAnnotations: true,
                namespace: '',
                targetFolder: join(testDir, testProjectName, 'app'),
                sapux: false
            },
            service: {
                servicePath: '',
                version: OdataVersion.v4,
                source: DatasourceType.capProject,
                capService: {
                    projectPath: join(testDir, testProjectName),
                    serviceName: 'AdminService',
                    serviceCdsPath: 'srv/admin-service',
                    capType: 'Node.js',
                    cdsUi5PluginInfo: {
                        isCdsUi5PluginEnabled: false,
                        hasMinCdsVersion: true,
                        isWorkspaceEnabled: false,
                        hasCdsUi5Plugin: false
                    }
                } as CapServiceCdsInfo
            },
            floorplan: FloorplanFF.FF_SIMPLE,
            viewName: 'View1'
        };
        await runWritingPhaseGen(state);
        expect(join(testDir, testProjectName)).toMatchFolder(mockModulePath, ignoreMatcherOpts);
        accessSpy.mockRestore();
    });

    it('Test Freestyle Simple Floorplan - CAP with specific UI5 Version', async () => {
        testProjectName = 'simple_cap_ui5_version';
        mockModulePath = setExpectedOutPath(testProjectName);
        // Copy fake package.json to mimic real CAP project
        mkdirSync(join(testDir, testProjectName), { recursive: true });
        copyFileSync(
            join(__dirname, './fixtures/cap-package.json.test'),
            join(testDir, testProjectName, 'package.json')
        );
        const accessSpy = jest.spyOn(fsPromise, 'access').mockResolvedValue();
        const state: State = {
            project: {
                name: testProjectName,
                description: 'An SAP Fiori application on CAP.',
                title: 'App Title',
                ui5Theme: 'sap_fiori_3',
                ui5Version: '1.82.0',
                localUI5Version: '1.82.2',
                skipAnnotations: true,
                namespace: '',
                targetFolder: join(testDir, testProjectName, 'app'),
                sapux: false
            },
            service: {
                servicePath: '',
                version: OdataVersion.v4,
                source: DatasourceType.capProject,
                capService: {
                    projectPath: join(testDir, testProjectName),
                    serviceName: 'AdminService',
                    serviceCdsPath: 'srv/admin-service'
                }
            },
            floorplan: FloorplanFF.FF_SIMPLE,
            viewName: 'View1'
        };
        await runWritingPhaseGen(state);
        expect(join(testDir, testProjectName)).toMatchFolder(mockModulePath, ignoreMatcherOpts);
        accessSpy.mockRestore();
    });

    it('Test Freestyle Simple Floorplan - Code Assist', async () => {
        testProjectName = 'simple_code_assist';
        mockModulePath = setExpectedOutPath(testProjectName);
        const state: State = {
            project: {
                name: testProjectName,
                description: 'An SAP Fiori application.',
                title: 'App Title',
                enableCodeAssist: true,
                ui5Theme: 'sap_fiori_3',
                ui5Version: '1.82.2',
                localUI5Version: '1.82.2',
                skipAnnotations: false,
                namespace: '',
                targetFolder: testDir,
                enableVirtualEndpoints: true
            },
            service: {
                servicePath: '',
                version: OdataVersion.v2,
                source: DatasourceType.metadataFile
            },
            floorplan: FloorplanFF.FF_SIMPLE,
            viewName: 'View1'
        };
        await runWritingPhaseGen(state);
        expect(join(testDir, testProjectName)).toMatchFolder(mockModulePath, ignoreMatcherOpts);
    });

    it('Test Freestyle Simple Floorplan - Eslint', async () => {
        testProjectName = 'simple_eslint';
        mockModulePath = setExpectedOutPath(testProjectName);
        const state: State = {
            project: {
                name: testProjectName,
                description: 'An SAP Fiori application.',
                title: 'App Title',
                enableCodeAssist: false,
                enableEslint: true,
                ui5Theme: 'sap_fiori_3',
                ui5Version: '1.82.2',
                localUI5Version: '1.82.2',
                skipAnnotations: false,
                namespace: '',
                targetFolder: testDir,
                enableVirtualEndpoints: true
            },
            service: {
                servicePath: '',
                version: OdataVersion.v2,
                source: DatasourceType.metadataFile
            },
            floorplan: FloorplanFF.FF_SIMPLE,
            viewName: 'View1'
        };
        await runWritingPhaseGen(state);
        expect(join(testDir, testProjectName)).toMatchFolder(mockModulePath, ignoreMatcherOpts);
    });

    it('Test Freestyle Simple Floorplan - TypeScript', async () => {
        testProjectName = 'simple_typescript';
        mockModulePath = setExpectedOutPath(testProjectName);
        const state: State = {
            project: {
                name: testProjectName,
                description: 'An SAP Fiori application.',
                title: 'App Title',
                enableCodeAssist: false,
                enableEslint: false,
                enableTypeScript: true,
                ui5Theme: 'sap_fiori_3',
                ui5Version: '1.102.1',
                localUI5Version: '1.102.1',
                skipAnnotations: false,
                namespace: 'test.namespace',
                targetFolder: testDir,
                enableVirtualEndpoints: true
            },
            service: {
                servicePath: '',
                version: OdataVersion.v2,
                source: DatasourceType.metadataFile
            },
            floorplan: FloorplanFF.FF_SIMPLE,
            viewName: 'View1'
        };
        await runWritingPhaseGen(state);
        expect(join(testDir, testProjectName)).toMatchFolder(mockModulePath, ignoreMatcherOpts);
    });

    it('Test Freestyle Simple Floorplan - CAP when generateIndexHtml is set to false', async () => {
        testProjectName = 'simple_cap';
        mockModulePath = setExpectedOutPath(testProjectName);
        // Copy fake package.json to mimic real CAP project
        mkdirSync(join(testDir, testProjectName), { recursive: true });
        copyFileSync(
            join(__dirname, './fixtures/cap-package.json.test'),
            join(testDir, testProjectName, 'package.json')
        );
        const accessSpy = jest.spyOn(fsPromise, 'access').mockResolvedValue();

        const state: State = {
            project: {
                name: testProjectName,
                description: 'An SAP Fiori application on CAP.',
                title: 'App Title',
                ui5Theme: 'sap_fiori_3',
                ui5Version: '1.82.2',
                localUI5Version: '1.82.2',
                skipAnnotations: true,
                namespace: '',
                targetFolder: join(testDir, testProjectName, 'app'),
                sapux: false
            },
            service: {
                servicePath: '',
                version: OdataVersion.v4,
                source: DatasourceType.capProject,
                capService: {
                    projectPath: join(testDir, testProjectName),
                    serviceName: 'AdminService',
                    serviceCdsPath: 'srv/admin-service',
                    capType: 'Node.js',
                    cdsUi5PluginInfo: {
                        isCdsUi5PluginEnabled: false,
                        hasMinCdsVersion: true,
                        isWorkspaceEnabled: false,
                        hasCdsUi5Plugin: false
                    }
                } as CapServiceCdsInfo
            },
            floorplan: FloorplanFF.FF_SIMPLE,
            viewName: 'View1'
        };
        await runWritingPhaseGen(state, { generateIndexHtml: false });
        expect(join(testDir, testProjectName)).toMatchFolder(mockModulePath, ignoreMatcherOpts);
        accessSpy.mockRestore();
    });

    it('Test Freestyle Simple Floorplan - No Datasource', async () => {
        testProjectName = 'simple_no_datasource';
        mockModulePath = setExpectedOutPath(testProjectName);
        const state: State = {
            project: {
                name: testProjectName,
                description: 'An SAP Fiori application.',
                title: 'App Title',
                ui5Theme: 'sap_fiori_3',
                ui5Version: '1.82.2',
                localUI5Version: '1.82.2',
                namespace: 'sap.com',
                targetFolder: testDir,
                enableVirtualEndpoints: true
            },
            service: {
                source: DatasourceType.none
            },
            floorplan: FloorplanFF.FF_SIMPLE,
            viewName: 'View1'
        };
        await runWritingPhaseGen(state);
        expect(join(testDir, testProjectName)).toMatchFolder(mockModulePath, ignoreMatcherOpts);
    });
});
