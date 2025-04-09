import yeomanTest from 'yeoman-test';
import { AppWizard, MessageType } from '@sap-devx/yeoman-ui-types';
import { join } from 'path';
import BspAppDownloadGenerator from '../src/app';
import * as prompts from '../src/prompts/prompts';
import { PromptNames } from '../src/app/types';
import fs from 'fs';
import { TestFixture } from './fixtures';
import { getAppConfig } from '../src/app/config';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import { TemplateType, type FioriElementsApp, type LROPSettings } from '@sap-ux/fiori-elements-writer';
import { adtSourceTemplateId, extractedFilePath } from '../src/utils/constants';
import { removeSync } from 'fs-extra';
import { isValidPromptState } from '../src/utils/validators';
import { hostEnvironment, sendTelemetry } from '@sap-ux/fiori-generator-shared';
import * as memFs from 'mem-fs';
import * as editor from 'mem-fs-editor';
import { FileName, DirName } from '@sap-ux/project-access';
import BspAppDownloadLogger from '../src/utils/logger';
import { t } from '../src/utils/i18n';
import { type AbapServiceProvider } from '@sap-ux/axios-extension';
import { fetchAppListForSelectedSystem } from '../src/prompts/prompt-helpers';

jest.setTimeout(60000);
jest.mock('../src/prompts/prompt-helpers', () => ({
	...jest.requireActual('../src/prompts/prompt-helpers'),
    fetchAppListForSelectedSystem: jest.fn()
}));

jest.mock('../src/utils/logger', () => ({
	...jest.requireActual('../src/utils/logger'),
    logger: {
        error: jest.fn(), 
		info: jest.fn(),
		warn: jest.fn()
    },
	configureLogging: jest.fn()
}));

jest.mock('../src/utils/file-helpers', () => ({
    ...jest.requireActual('../src/utils/file-helpers'),
	readManifest: jest.fn()
}));
jest.mock('../src/utils/download-utils');
jest.mock('../src/app/config', () => ({
    ...jest.requireActual('../src/app/config'),
	getAppConfig: jest.fn()
}));
jest.mock('../src/utils/validators');
jest.mock('@sap-ux/fiori-generator-shared', () => {
    return {
        ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
        TelemetryHelper: {
            initTelemetrySettings: jest.fn(),
            createTelemetryData: jest.fn().mockReturnValue({
                OperatingSystem: 'CLI',
                Platform: 'darwin'
            })
        },
        sendTelemetry: jest.fn(),
        isExtensionInstalled: jest.fn(),
        getHostEnvironment: () => {
            return hostEnvironment.cli;
        }
    };
});
const mockSendTelemetry = sendTelemetry as jest.Mock;

function createAppConfig(appId: string, metadata: string): FioriElementsApp<LROPSettings> {
    return {
        app: {
            id: appId,
            title: 'App 1',
            description: 'App 1 description',
            sourceTemplate: { id: adtSourceTemplateId },
            projectType: 'EDMXBackend',
            flpAppId: `app-1-tile`
        },
        package: {
            name: appId,
            description: 'App 1 description',
            devDependencies: {},
            scripts: {},
            version: '0.0.1'
        },
        template: {
            type: TemplateType.ListReportObjectPage,
            settings: {
                entityConfig: { mainEntityName: 'Booking' }
            }
        },
        service: {
            path: '/sap/opu/odata4/sap/zsb_travel_draft/srvd/dmo/ui_travel_d_d/0001/',
            version: OdataVersion.v4,
            metadata: metadata,
            url: 'url-1'
        },
        appOptions: {
            addAnnotations: true,
            addTests: true
        },
        ui5: {
            version: '1.100.0'
        }
    };
}

function mockPrompts(testOutputDir: string): void {
    jest.spyOn(prompts, 'getPrompts').mockResolvedValue([
        {
            type: 'list',
            name: PromptNames.systemSelection,
            message: 'Select a system',
            choices: [
                { name: 'system1', value: 'system1' },
                { name: 'system2', value: 'system2' },
                { name: 'system3', value: 'system3' }
            ]
        },
        {
            type: 'list',
            name: PromptNames.selectedApp,
            message: 'Select an app',
            choices: [
                { name: 'App 1', value: { appId: 'app-1', title: 'App 1', description: 'App 1 description', repoName: 'app-1-repo', url: 'url-1' } },
                { name: 'App 2', value: { appId: 'app-2', title: 'App 2', description: 'App 2 description', repoName: 'app-2-repo', url: 'url-2' } }
            ]
        },
        {
            type: 'input',
            name: PromptNames.targetFolder,
            message: 'Enter the target folder',
            default: testOutputDir
        }
    ] as any);
}

function copyFilesToExtractedProjectPath(
    testFixtureDir: string,
    extractedProjectPath: string
): void {
    if (!fs.existsSync(extractedProjectPath)) {
        fs.mkdirSync(extractedProjectPath, { recursive: true });
    }

    // List all files in the test fixture directory
    const files = fs.readdirSync(testFixtureDir);
    // Copy each file to the extracted project path
    files.forEach((file) => {
        const sourceFilePath = join(testFixtureDir, file);
        const destinationFilePath = join(extractedProjectPath, file);
        // Copy the file
        fs.copyFileSync(sourceFilePath, destinationFilePath);
    });
}


function verifyGeneratedFiles(testOutputDir: string, appId: string, extractedProjectPath: string): void {
    const projectPath = join(`${testOutputDir}/${appId}`);
    expect(fs.existsSync(projectPath)).toBe(true);

    const expectedFiles = [
        FileName.Ui5Yaml,
        FileName.Ui5LocalYaml,
        FileName.Ui5MockYaml,
        FileName.UI5DeployYaml,
        FileName.Package,
        'README.md',
        DirName.Webapp,
        join(DirName.Webapp, FileName.Manifest),
        join(DirName.Webapp, 'index.html'),
        join(DirName.Webapp, 'Component.js'),
        join(DirName.Webapp, 'test'),
        join(DirName.Webapp, DirName.LocalService, 'mainService', 'metadata.xml'),
        join(DirName.Webapp, 'i18n', 'i18n.properties'),
        join(DirName.Webapp, DirName.Annotations, 'annotation.xml')
    ];

    expectedFiles.forEach((file) => {
        const filePath = join(projectPath, file);
        expect(fs.existsSync(filePath)).toBe(true);
    });

    expect(fs.readFileSync(join(projectPath, DirName.Webapp, FileName.Manifest), 'utf-8')).toBe(
        fs.readFileSync(join(extractedProjectPath, FileName.Manifest), 'utf-8')
    );
    expect(fs.readFileSync(join(projectPath, DirName.Webapp, 'i18n', 'i18n.properties'), 'utf-8')).toBe(
        fs.readFileSync(join(extractedProjectPath, 'i18n.properties'), 'utf-8')
    );
    expect(fs.readFileSync(join(projectPath, DirName.Webapp, 'index.html'), 'utf-8')).toBe(
        fs.readFileSync(join(extractedProjectPath, 'index.html'), 'utf-8')
    );
}

describe('BSP App Download', () => {
	const testFixture = new TestFixture();
	const bspAppDownloadGenPath = join(__dirname, '../src/app/index.ts');
	const testOutputDir = join(__dirname, 'test-output');
	const metadata = testFixture.getContents('metadata.xml');
	let appConfig: FioriElementsApp<LROPSettings>;
	let mockVSCode: any;
	const mockAppWizard: Partial<AppWizard> = {
		setHeaderTitle: jest.fn(),
		showWarning: jest.fn(),
		showError: jest.fn(),
		showInformation: jest.fn()
	};
	const store = memFs.create();
	const fsEditor = editor.create(store);
	const appId = 'app-1', repoName = 'app-1-repo';
	const extractedProjectPath = join(testOutputDir, appId, extractedFilePath);
	const testFixtureDir = join(__dirname, 'fixtures', 'downloaded-app');
	copyFilesToExtractedProjectPath(testFixtureDir, extractedProjectPath);
	
    afterEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
		jest.resetModules();
		removeSync(testOutputDir);
	})

	beforeEach(() => {
		copyFilesToExtractedProjectPath(testFixtureDir, extractedProjectPath);
		appConfig = createAppConfig(appId, metadata);
        mockPrompts(testOutputDir);
		mockVSCode = {
            workspace: {
                workspaceFolders: [],
                updateWorkspaceFolders: jest.fn()
            }
        };
	});

    it('Should successfully run BSP app download', async () => {
		(isValidPromptState as jest.Mock).mockReturnValue(true);
		(getAppConfig as jest.Mock).mockResolvedValue(appConfig);
		await expect( 
			yeomanTest
				.run(BspAppDownloadGenerator, { 
					resolved: bspAppDownloadGenPath
				})
				.cd('.')
				.withOptions({ 
					appRootPath: testOutputDir, 
					appWizard: mockAppWizard,
					vscode: mockVSCode, 
					skipInstall: true
				})
				.withPrompts({
					systemSelection: 'system3',
					selectedApp: {
						appId: appConfig.app.id,
						title: appConfig.app.title,
						description: appConfig.app.description,
						repoName: 'app-1-repo',
						url: 'url-1'
					},
					targetFolder: testOutputDir
				})
			)
		.resolves.not.toThrow();
		verifyGeneratedFiles(testOutputDir, appId, extractedProjectPath);
		expect(mockAppWizard.showWarning).toHaveBeenCalledWith(t('info.bspAppDownloadCompleteMsg'), MessageType.notification);
		expect(BspAppDownloadLogger.logger.info).toHaveBeenCalledWith(t('info.installationErrors.skippedInstallation'));
		
		
    });

	it('Should not throw error in end phase if telemetry fails', async () => {
		const errorMsg = 'Telemetry error';
     	mockSendTelemetry.mockRejectedValue(new Error(errorMsg));
		(isValidPromptState as jest.Mock).mockReturnValue(true);
		(getAppConfig as jest.Mock).mockResolvedValue(appConfig);
        
        await expect( 
			yeomanTest
				.run(BspAppDownloadGenerator, { 
					resolved: bspAppDownloadGenPath
				})
				.cd('.')
				.withOptions({ 
					appRootPath: testOutputDir, 
					appWizard: mockAppWizard,
					vscode: mockVSCode
				})
				.withPrompts({
					systemSelection: 'system3',
					selectedApp: {
						appId: appConfig.app.id,
						title: appConfig.app.title,
						description: appConfig.app.description,
						repoName: 'app-1-repo',
						url: 'url-1'
					},
					targetFolder: testOutputDir
				})
		)
		.resolves.not.toThrow();
		expect(BspAppDownloadLogger.logger.error).toHaveBeenCalledWith(t('error.telemetry', { error: errorMsg }));
		verifyGeneratedFiles(testOutputDir, appId, extractedProjectPath);
    });

	it('Should execute post app gen hook event when postGenCommand is provided', async () => {
		(isValidPromptState as jest.Mock).mockReturnValue(true);
		(getAppConfig as jest.Mock).mockResolvedValue(appConfig);
        
        await expect( 
			yeomanTest
				.run(BspAppDownloadGenerator, { 
					resolved: bspAppDownloadGenPath
				})
				.cd('.')
				.withOptions({ 
					appRootPath: testOutputDir, 
					appWizard: mockAppWizard,
					vscode: mockVSCode, 
					data: {
						postGenCommand: 'test-post-gen-command'
					}
				})
				.withPrompts({
					systemSelection: 'system3',
					selectedApp: {
						appId: appConfig.app.id,
						title: appConfig.app.title,
						description: appConfig.app.description,
						repoName: 'app-1-repo',
						url: 'url-1'
					},
					targetFolder: testOutputDir
				})
		)
		.resolves.not.toThrow();
		verifyGeneratedFiles(testOutputDir, appId, extractedProjectPath);
    });

	it('Should successfully download a quick deployed app from BSP', async () => {
		(isValidPromptState as jest.Mock).mockReturnValue(true);
		(getAppConfig as jest.Mock).mockResolvedValue(appConfig);
		(fetchAppListForSelectedSystem as jest.Mock).mockResolvedValue([
			{
				'sap.app/id': appConfig.app.id,
				'sap.app/title': appConfig.app.title,
				repoName: repoName,
				url: 'url-1'
			}
		]);
		const mockServiceProvider = {
            defaults: { baseURL: 'https://test-url.com' },
            service: jest.fn().mockReturnValue({
                metadata: jest.fn().mockResolvedValue({
                    dataServices: {
                        schema: []
                    }
                })
            })
        } as unknown as AbapServiceProvider;
        
        await expect( 
			yeomanTest
				.run(BspAppDownloadGenerator, { 
					resolved: bspAppDownloadGenPath
				})
				.cd('.')
				.withOptions({ 
					appRootPath: testOutputDir, 
					appWizard: mockAppWizard,
					vscode: mockVSCode, 
					skipInstall: false,
					data: {
						postGenCommand: 'test-post-gen-command', 
						quickDeployedAppConfig: {
							appId: appConfig.app.id,
							appUrl: 'https://app-url.com/app',
							serviceProvider: mockServiceProvider
						}
					}
				})
				.withPrompts({
					systemSelection: 'system3',
					selectedApp: {
						appId: appConfig.app.id,
						title: appConfig.app.title,
						description: appConfig.app.description,
						repoName: repoName,
						url: 'url-1'
					},
					targetFolder: testOutputDir
				})
		)
		.resolves.not.toThrow();
		expect(fetchAppListForSelectedSystem).toHaveBeenCalledWith(mockServiceProvider, appConfig.app.id);
		verifyGeneratedFiles(testOutputDir, appId, extractedProjectPath);
    });

	it('Should throw error when fetchAppListForSelectedSystem fetches no app', async () => {
		(isValidPromptState as jest.Mock).mockReturnValue(true);
		(getAppConfig as jest.Mock).mockResolvedValue(appConfig);
		(fetchAppListForSelectedSystem as jest.Mock).mockResolvedValue([]);
		const mockServiceProvider = {
            defaults: { baseURL: 'https://test-url.com' },
            service: jest.fn().mockReturnValue({
                metadata: jest.fn().mockResolvedValue({
                    dataServices: {
                        schema: []
                    }
                })
            })
        } as unknown as AbapServiceProvider;
        
        await expect( 
			yeomanTest
				.run(BspAppDownloadGenerator, { 
					resolved: bspAppDownloadGenPath
				})
				.cd('.')
				.withOptions({ 
					appRootPath: testOutputDir, 
					appWizard: mockAppWizard,
					vscode: mockVSCode, 
					data: {
						postGenCommand: 'test-post-gen-command', 
						quickDeployedAppConfig: {
							appId: appConfig.app.id,
							appUrl: 'https://app-url.com/app',
							serviceProvider: mockServiceProvider
						}
					}
				})
				.withPrompts({
					systemSelection: 'system3',
					selectedApp: {
						appId: appConfig.app.id,
						title: appConfig.app.title,
						description: appConfig.app.description,
						repoName: repoName,
						url: 'url-1'
					},
					targetFolder: testOutputDir
				})
		)
		.rejects.toThrowError();
		expect(fetchAppListForSelectedSystem).toHaveBeenCalledWith(mockServiceProvider, appConfig.app.id);
		expect(BspAppDownloadLogger.logger.error).toHaveBeenCalledWith(t('error.quickDeployedAppDownloadErrors.noAppsFound', { appId: appConfig.app.id }));
		expect(fs.existsSync(join(`${testOutputDir}/${appId}/${DirName.Webapp}`))).toBe(false);
    });	
});