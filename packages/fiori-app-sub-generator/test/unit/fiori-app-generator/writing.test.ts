import { generateReadMe, getHostEnvironment, hostEnvironment, type ReadMe } from '@sap-ux/fiori-generator-shared';
import { DatasourceType, OdataVersion } from '@sap-ux/odata-service-inquirer';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { writeAPIHubKeyFiles, writeReadMe } from '../../../src/fiori-app-generator/writing';
import type { ApiHubConfig, Project, Service } from '../../../src/types';
import { ApiHubType, FloorplanFE, FloorplanFF } from '../../../src/types';
import { initI18nFioriAppSubGenerator, t } from '../../../src/utils';

jest.mock('@sap-ux/fiori-generator-shared', () => {
    return {
        ...jest.requireActual('@sap-ux/fiori-generator-shared'),
        sendTelemetry: jest.fn(),
        getHostEnvironment: jest.fn(),
        generateReadMe: jest.fn()
    };
});

describe('`writing` tests', () => {
    describe('`writeReadMe` tests', () => {
        // Test data
        const baseProject: Project = {
            name: 'someProjectName',
            title: 'someProjectTitle',
            description: 'Fiori project description',
            namespace: 'projectNamespace',
            ui5Theme: 'a_ui5_theme',
            ui5Version: '1.2.3',
            localUI5Version: '1.2.3',
            enableCodeAssist: false,
            enableEslint: false,
            enableTypeScript: false,
            targetFolder: '/some/path/to/target'
        };

        beforeEach(async () => {
            await initI18nFioriAppSubGenerator();
            jest.clearAllMocks();
        });

        it('`generateReadMe` should be called with custom overrides of read me values', async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            const expectedReadMe: ReadMe = {
                generationDate: 'Jan 01 1975',
                generatorPlatform: 'CLI',
                serviceType: 'File',
                metadataFilename: 'metadata1234.xml',
                serviceUrl: 'N/A',
                appName: 'someProjectName',
                appTitle: 'someProjectTitle',
                appDescription: 'Fiori project description',
                appNamespace: 'projectNamespace',
                ui5Theme: 'a_ui5_theme',
                ui5Version: '1.2.3',
                showMockDataInfo: false,
                generatorVersion: '2.0.1',
                template: 'List Report Page V4',
                generatorName: '@sap/generator-fiori-elements',
                launchText: t('TEXT_LAUNCH_DEFAULT'),
                enableCodeAssist: false,
                enableEslint: false,
                enableTypeScript: false,
                additionalEntries: []
            };

            const project: Project = { ...baseProject };
            const service: Service = {
                version: OdataVersion.v4,
                source: DatasourceType.metadataFile,
                localEdmxFilePath: '/some/path/to/local/edmx/metadata1234.xml'
            };
            const readMe: Partial<ReadMe> = {
                generatorName: '@sap/generator-fiori-elements',
                generatorVersion: '2.0.1',
                generationDate: 'Jan 01 1975',
                generatorPlatform: 'CLI'
            };
            await writeReadMe(
                project,
                service,
                FloorplanFE.FE_LROP,
                '@sap/generator-fiori-elements',
                '2.0.1',
                '/target/path',
                {} as Editor,
                undefined,
                readMe
            );
            expect(generateReadMe).toHaveBeenCalledWith('/target/path', expectedReadMe, {});
        });

        it('`writeReadMe` should call `generateReadMe` with the correct params', async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.vscode);

            const expectedReadMe: ReadMe = {
                generationDate: expect.any(String),
                generatorPlatform: 'Visual Studio Code',
                serviceType: 'SAP System (ABAP On Premise)',
                metadataFilename: '',
                serviceUrl: 'N/A',
                appName: 'someProjectName',
                appTitle: 'someProjectTitle',
                appDescription: 'Fiori project description',
                appNamespace: 'projectNamespace',
                ui5Theme: 'a_ui5_theme',
                ui5Version: '1.2.3',
                showMockDataInfo: false,
                generatorVersion: '123',
                template: 'Basic V4',
                generatorName: '@sap/some-generator',
                launchText: t('TEXT_LAUNCH_DEFAULT'),
                enableCodeAssist: false,
                enableEslint: false,
                enableTypeScript: false,
                additionalEntries: []
            };
            const project: Project = { ...baseProject };
            const service: Service = {
                version: OdataVersion.v4,
                source: DatasourceType.sapSystem
            };

            await writeReadMe(
                project,
                service,
                FloorplanFF.FF_SIMPLE,
                '@sap/some-generator',
                '123',
                '/target/path',
                {} as Editor
            );
            expect(generateReadMe).toHaveBeenCalledWith('/target/path', expectedReadMe, {});
        });

        it('should generate readme with CAP launch text', async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            const expectedReadMe: ReadMe = {
                generationDate: expect.any(String),
                generatorPlatform: 'CLI',
                serviceType: 'Local Cap',
                serviceUrl: 'http://localhost:4004/odata/service',
                appName: 'someProjectName',
                appTitle: 'someProjectTitle',
                appDescription: 'Fiori project description',
                appNamespace: 'projectNamespace',
                ui5Theme: 'a_ui5_theme',
                ui5Version: '1.2.3',
                showMockDataInfo: false,
                generatorVersion: '1.0.0',
                template: 'Basic',
                generatorName: '@sap/some-generator',
                launchText:
                    'In order to launch the generated app, simply start your CAP project and navigate to the following location in your browser:' +
                    '\n\nhttp://localhost:4004/someProjectName/webapp/index.html',
                enableCodeAssist: false,
                enableEslint: false,
                enableTypeScript: false,
                additionalEntries: [{ label: 'label1', value: 'value1' }],
                metadataFilename: ''
            };
            const project: Project = { ...baseProject };
            const service: Service = {
                source: DatasourceType.capProject,
                capService: {
                    projectPath: '/projectPath',
                    serviceName: 'serviceName',
                    capType: 'Node.js',
                    appPath: '/appPath'
                },
                host: 'http://localhost:4004',
                servicePath: '/odata/service'
            };

            await writeReadMe(
                project,
                service,
                FloorplanFF.FF_SIMPLE,
                '@sap/some-generator',
                '1.0.0',
                '/target/path',
                {} as Editor,
                undefined,
                {
                    additionalEntries: [{ label: 'label1', value: 'value1' }]
                }
            );
            expect(generateReadMe).toHaveBeenCalledWith('/target/path', expectedReadMe, {});
        });

        it('should generate readme with entity related entries', async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            const expectedReadMe: ReadMe = {
                generationDate: expect.any(String),
                generatorPlatform: 'CLI',
                serviceType: 'Local Cap',
                serviceUrl: 'http://localhost:4004/odata/service',
                appName: 'someProjectName',
                appTitle: 'someProjectTitle',
                appDescription: 'Fiori project description',
                appNamespace: 'projectNamespace',
                ui5Theme: 'a_ui5_theme',
                ui5Version: '1.2.3',
                showMockDataInfo: false,
                generatorVersion: '1.0.0',
                template: 'Basic',
                generatorName: '@sap/some-generator',
                launchText:
                    'In order to launch the generated app, simply start your CAP project and navigate to the following location in your browser:' +
                    '\n\nhttp://localhost:4004/someProjectName/webapp/index.html',
                enableCodeAssist: false,
                enableEslint: false,
                enableTypeScript: false,
                additionalEntries: [
                    { label: 'addLabel1', value: 'addValue1' },
                    { label: 'Main Entity', value: 'mainEntitySetName1' },
                    { label: 'Navigation Entity', value: 'navigationProperty1' },
                    { label: 'Filter Entity Type', value: 'filterEntitySetName1' }
                ],
                metadataFilename: ''
            };
            const project: Project = { ...baseProject };
            const service: Service = {
                source: DatasourceType.capProject,
                capService: {
                    projectPath: '/projectPath',
                    serviceName: 'serviceName',
                    capType: 'Node.js',
                    appPath: '/appPath'
                },
                host: 'http://localhost:4004',
                servicePath: '/odata/service'
            };

            await writeReadMe(
                project,
                service,
                FloorplanFF.FF_SIMPLE,
                '@sap/some-generator',
                '1.0.0',
                '/target/path',
                {} as Editor,
                {
                    mainEntity: {
                        entitySetName: 'mainEntitySetName1',
                        entitySetType: 'mainEntityType1'
                    },
                    navigationEntity: {
                        navigationPropertyName: 'navigationProperty1',
                        entitySetName: 'navigationEntitySetName1'
                    },
                    filterEntityType: {
                        entitySetName: 'filterEntitySetName1',
                        entitySetType: 'FilterEntitySetType1'
                    }
                },
                {
                    additionalEntries: [{ label: 'addLabel1', value: 'addValue1' }]
                }
            );
            expect(generateReadMe).toHaveBeenCalledWith('/target/path', expectedReadMe, {});
            jest.clearAllMocks();
            await initI18nFioriAppSubGenerator();

            // Nav entity should be 'None'
            await writeReadMe(
                project,
                service,
                FloorplanFF.FF_SIMPLE,
                '@sap/some-generator',
                '1.0.0',
                '/target/path',
                {} as Editor,
                {
                    mainEntity: {
                        entitySetName: 'mainEntitySetName1',
                        entitySetType: 'mainEntityType1'
                    },
                    navigationEntity: {
                        navigationPropertyName: '',
                        entitySetName: 'navigationEntitySetName1'
                    },
                    filterEntityType: {
                        entitySetName: 'filterEntitySetName1',
                        entitySetType: 'FilterEntitySetType1'
                    }
                },
                {
                    additionalEntries: [{ label: 'addLabel1', value: 'addValue1' }]
                }
            );

            expectedReadMe.additionalEntries = [
                { label: 'addLabel1', value: 'addValue1' },
                { label: 'Main Entity', value: 'mainEntitySetName1' },
                { label: 'Navigation Entity', value: 'None' },
                { label: 'Filter Entity Type', value: 'filterEntitySetName1' }
            ];
            expect(generateReadMe).toHaveBeenCalledWith('/target/path', expectedReadMe, {});
        });
    });

    describe('`writeAPIHubKeyFiles` should write api hub config files as expected', () => {
        let destPath: string;
        let apiHubConfig: ApiHubConfig;
        let mockFs: any;

        beforeEach(() => {
            mockFs = {
                write: jest.fn()
            };
            destPath = '/path/to/dest';
            apiHubConfig = {
                apiHubKey: 'dummy-api-key',
                apiHubType: ApiHubType.apiHub
            };
        });

        it('should create the .env file at the correct path', () => {
            const expectedEnvFilePath = join(destPath, '.env');
            const expectedEnvContent = `API_HUB_API_KEY=${apiHubConfig.apiHubKey}\nAPI_HUB_TYPE=${apiHubConfig.apiHubType}`;

            writeAPIHubKeyFiles(mockFs as Editor, destPath, apiHubConfig);
            // Verify that fs.write is called with the correct path and content
            expect(mockFs.write).toHaveBeenCalledWith(expectedEnvFilePath, expectedEnvContent);
        });

        it('should correctly write API_HUB_API_KEY and API_HUB_TYPE to the .env file', () => {
            const expectedEnvContent = `API_HUB_API_KEY=${apiHubConfig.apiHubKey}\nAPI_HUB_TYPE=${apiHubConfig.apiHubType}`;

            writeAPIHubKeyFiles(mockFs, destPath, apiHubConfig);
            // Check that the correct content was written to the file
            expect(mockFs.write).toHaveBeenCalledWith(expect.any(String), expectedEnvContent);
        });

        it('should handle different apiHubConfig values', () => {
            const customApiHubConfig: ApiHubConfig = {
                apiHubKey: 'custom-key',
                apiHubType: ApiHubType.apiHubEnterprise
            };
            const expectedEnvContent = `API_HUB_API_KEY=${customApiHubConfig.apiHubKey}\nAPI_HUB_TYPE=${customApiHubConfig.apiHubType}`;

            writeAPIHubKeyFiles(mockFs, destPath, customApiHubConfig);
            // Verify that the correct content for customApiHubConfig was written
            expect(mockFs.write).toHaveBeenCalledWith(expect.any(String), expectedEnvContent);
        });
    });
});
