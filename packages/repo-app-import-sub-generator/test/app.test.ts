import yeomanTest from 'yeoman-test';
import { AppWizard, MessageType } from '@sap-devx/yeoman-ui-types';
import { join } from 'path';
import RepoAppDownloadGenerator from '../src/app';
import * as prompts from '../src/prompts/prompts';
import { PromptNames } from '../src/app/types';
import fs from 'fs';
import { TestFixture } from './fixtures';
import { getAppConfig } from '../src/app/app-config';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import { TemplateType, type FioriElementsApp, type LROPSettings } from '@sap-ux/fiori-elements-writer';
import { adtSourceTemplateId, fioriAppSourcetemplateId, extractedFilePath } from '../src/utils/constants';
import { removeSync } from 'fs-extra';
import { isValidPromptState } from '../src/utils/validators';
import { hostEnvironment, sendTelemetry } from '@sap-ux/fiori-generator-shared';
import { FileName, DirName, type Manifest } from '@sap-ux/project-access';
import RepoAppDownloadLogger from '../src/utils/logger';
import { t } from '../src/utils/i18n';
import env from 'yeoman-environment';

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

jest.mock('../src/utils/download-utils');
jest.mock('../src/app/app-config', () => ({
    ...jest.requireActual('../src/app/app-config'),
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
		if(file === 'i18n') {
			// Create the directory if it doesn't exist
			if (!fs.existsSync(destinationFilePath)) {
				fs.mkdirSync(destinationFilePath, { recursive: true });
			}
			// Copy the i18n.properties file
			fs.copyFileSync(join(sourceFilePath, 'i18n.properties'), join(destinationFilePath, 'i18n.properties'));
		} else { 
			// Copy the file
			fs.copyFileSync(sourceFilePath, destinationFilePath);
		}
    });
}


function verifyGeneratedFiles(testOutputDir: string, appId: string, testFixtureDir: string): void {
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
	// after converting to fiori app, manifest will be updated with fiori app source template id
	const extractedManifest = JSON.parse(
		fs.readFileSync(join(testFixtureDir, FileName.Manifest), 'utf-8')
	) as Manifest;
	if (extractedManifest && extractedManifest['sap.app'] && extractedManifest['sap.app'].sourceTemplate) {
		extractedManifest['sap.app'].sourceTemplate.id = fioriAppSourcetemplateId;
	}
	const projectManifest = JSON.parse(
		fs.readFileSync(join(projectPath, DirName.Webapp, FileName.Manifest), 'utf-8')
	);
	expect(projectManifest).toEqual(extractedManifest);
    expect(fs.readFileSync(join(projectPath, DirName.Webapp, 'i18n', 'i18n.properties'), 'utf-8')).toBe(
        fs.readFileSync(join(testFixtureDir, 'i18n', 'i18n.properties'), 'utf-8')
    );
    expect(fs.readFileSync(join(projectPath, DirName.Webapp, 'index.html'), 'utf-8')).toBe(
        fs.readFileSync(join(testFixtureDir, 'index.html'), 'utf-8')
    );
}

describe('Repo App Download', () => {
	const testFixture = new TestFixture();
	const repoAppDownloadGenPath = join(__dirname, '../src/app/index.ts');
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
	const appId = 'test-app-id', repoName = 'app-1-repo';
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
                updateWorkspaceFolders: jest.fn(),
				getConfiguration: jest.fn().mockReturnValue({
					get: jest.fn().mockReturnValue(undefined)
				})
            },
			Uri: {
				file: jest.fn((path) => ({ fsPath: path }))
			}
		};
	});

    it('Should successfully run app download from repository', async () => {
		(isValidPromptState as jest.Mock).mockReturnValue(true);
		(getAppConfig as jest.Mock).mockResolvedValue(appConfig);
		await expect( 
			yeomanTest
				.run(RepoAppDownloadGenerator, { 
					resolved: repoAppDownloadGenPath
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
		verifyGeneratedFiles(testOutputDir, appId, testFixtureDir);
		expect(mockAppWizard.showInformation).toHaveBeenCalledWith(t('info.repoAppDownloadCompleteMsg'), MessageType.notification);
		expect(RepoAppDownloadLogger.logger.info).toHaveBeenCalledWith(t('info.installationErrors.skippedInstallation'));
    });

	it('Should not throw error in end phase if telemetry fails', async () => {
		const errorMsg = 'Telemetry error';
     	mockSendTelemetry.mockRejectedValue(new Error(errorMsg));
		(isValidPromptState as jest.Mock).mockReturnValue(true);
		(getAppConfig as jest.Mock).mockResolvedValue(appConfig);
        
        await expect( 
			yeomanTest
				.run(RepoAppDownloadGenerator, { 
					resolved: repoAppDownloadGenPath
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
		expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(t('error.telemetry', { error: errorMsg }));
		verifyGeneratedFiles(testOutputDir, appId, testFixtureDir);
    });

	it('Should execute post app gen hook event when postGenCommand is provided', async () => {
		(isValidPromptState as jest.Mock).mockReturnValue(true);
		(getAppConfig as jest.Mock).mockResolvedValue(appConfig);
        
        await expect( 
			yeomanTest
				.run(RepoAppDownloadGenerator, { 
					resolved: repoAppDownloadGenPath
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
		verifyGeneratedFiles(testOutputDir, appId, testFixtureDir);
    });

	it('should successfully download a quick deployed app from repository', async () => {
		const yeomanEnv = env.createEnv();
	
		const generator = new RepoAppDownloadGenerator([], {
			env: yeomanEnv,
			appWizard: mockAppWizard as AppWizard,
			logger: {},
			vscode: mockVSCode,
			data: {
				quickDeployedAppConfig: {
					appId: appConfig.app.id,
					serviceProviderInfo: { name: 'system3' }
				}
			}
		});
		
		// mock _runNpmInstall 
		(generator as any)._runNpmInstall = jest.fn().mockResolvedValue(undefined);
		await generator.install();
	
		expect((generator as any)._runNpmInstall).toHaveBeenCalled();
	});
});
  