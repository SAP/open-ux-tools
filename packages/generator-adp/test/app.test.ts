import { jest } from '@jest/globals';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rimraf } from 'rimraf';
import Generator from 'yeoman-generator';
import yeomanTest from 'yeoman-test';

const __dirname = dirname(fileURLToPath(import.meta.url));

import type {
    AttributesAnswers,
    CFApp,
    CfConfig,
    CfServicesAnswers,
    ConfigAnswers,
    Language,
    SourceApplication,
    VersionDetail
} from '@sap-ux/adp-tooling';
import type { AbapServiceProvider, LayeredRepositoryService } from '@sap-ux/axios-extension';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';

// ─── Mock functions (declared before jest.unstable_mockModule) ───

const mockIsInternalFeaturesSettingEnabled = jest.fn<typeof realFeatureToggle.isInternalFeaturesSettingEnabled>();
const mockGetDefaultProjectName = jest.fn<typeof realDefaultValues.getDefaultProjectName>();
const mockWriteResult = jest.fn<(id: string, result: string) => void>();
const mockValidateExtensibilityGenerator = jest.fn().mockReturnValue(true);
const mockResolveNodeModuleGenerator = jest.fn().mockReturnValue('my-generator-path');
const mockShowApplicationQuestion = jest.fn().mockReturnValue(true);
const mockShowExtensionProjectQuestion = jest.fn().mockReturnValue(true);
const mockShouldShowBaseAppPrompt = jest.fn().mockReturnValue(true);
const mockShowStoreCredentialsQuestion = jest.fn().mockReturnValue(false);
const mockGetCredentialsFromStore = jest.fn<typeof realSystemAccess.getCredentialsFromStore>();
const mockGetService = jest.fn<typeof realStore.getService>();
const mockExec = jest.fn<typeof realChildProcess.exec>();
const mockGetOrCreateServiceInstanceKeysApi = jest.fn() as jest.Mock;
const mockCreateServiceInstanceApi = jest.fn() as jest.Mock;
const mockCreateServicesApi = jest.fn() as jest.Mock;
const mockGenerateCf = jest.fn<typeof realAdpTooling.generateCf>();
const mockGetConfiguredProvider = jest.fn<typeof realAdpTooling.getConfiguredProvider>();
const mockLoadApps = jest.fn<typeof realAdpTooling.loadApps>();
const mockGetProviderConfig = jest.fn<typeof realAdpTooling.getProviderConfig>();
const mockValidateUI5VersionExists = jest.fn<typeof realAdpTooling.validateUI5VersionExists>();
const mockFetchPublicVersions = jest.fn<typeof realAdpTooling.fetchPublicVersions>();
const mockIsCFEnvironment = jest.fn().mockReturnValue(false);
const mockIsCfInstalled = jest.fn<typeof realAdpTooling.isCfInstalled>();
const mockLoadCfConfig = jest.fn<typeof realAdpTooling.loadCfConfig>();
const mockIsLoggedInCf = jest.fn<typeof realAdpTooling.isLoggedInCf>();
const mockGetMtaServices = jest.fn<typeof realAdpTooling.getMtaServices>();
const mockGetModuleNames = jest.fn<typeof realAdpTooling.getModuleNames>();
const mockGetApprouterType = jest.fn<typeof realAdpTooling.getApprouterType>();
const mockHasApprouter = jest.fn<typeof realAdpTooling.hasApprouter>();
const mockCreateServices = jest.fn<typeof realAdpTooling.createServices>();
const mockCreateServiceInstance = jest.fn<typeof realAdpTooling.createServiceInstance>();
const mockGetOrCreateServiceInstanceKeys = jest.fn<typeof realAdpTooling.getOrCreateServiceInstanceKeys>();
const mockStoreCredentials = jest.fn<typeof realAdpTooling.storeCredentials>();
const mockGetSupportedProject = jest.fn<typeof realAdpTooling.getSupportedProject>();
const mockGetCfBaseAppInbounds = jest.fn<typeof realAdpTooling.getCfBaseAppInbounds>();
const mockGetPackageInfo = jest.fn().mockReturnValue({ name: '@sap-ux/generator-adp', version: 'mocked-version' });
const mockInstallDependencies = jest.fn().mockResolvedValue(undefined);
const mockSendTelemetry = jest.fn().mockResolvedValue(undefined);
const mockCreateTelemetryData = jest.fn().mockReturnValue({
    OperatingSystem: 'testOS',
    Platform: 'testPlatform'
});
const mockIsExtensionInstalled = jest.fn<typeof realFioriGeneratorShared.isExtensionInstalled>();
const mockGetHostEnvironment = jest.fn().mockReturnValue('cli');
const mockIsCli = jest.fn<typeof realFioriGeneratorShared.isCli>();
const mockGetDefaultTargetFolder = jest.fn().mockReturnValue(undefined);
const mockInitTelemetrySettings = jest.fn().mockResolvedValue(undefined);
const mockIsAppStudio = jest.fn<typeof realBtpUtils.isAppStudio>();
const mockV4 = jest.fn().mockReturnValue('mocked-uuid');
const mockExistsInWorkspace = jest.fn<typeof realWorkspace.existsInWorkspace>();
const mockShowWorkspaceFolderWarning = jest.fn<typeof realWorkspace.showWorkspaceFolderWarning>();
const mockHandleWorkspaceFolderChoice = jest.fn<typeof realWorkspace.handleWorkspaceFolderChoice>();
const mockAddExtProjectGen = jest.fn<typeof realSubgenHelpers.addExtProjectGen>();
const mockAddDeployGen = jest.fn<typeof realSubgenHelpers.addDeployGen>();
const mockAddFlpGen = jest.fn<typeof realSubgenHelpers.addFlpGen>();
const mockGetTemplatesOverwritePath = jest.fn<typeof realTemplates.getTemplatesOverwritePath>();

// ─── jest.unstable_mockModule calls ───

const realFeatureToggle = await import('@sap-ux/feature-toggle');
jest.unstable_mockModule('@sap-ux/feature-toggle', () => ({
    ...realFeatureToggle,
    isInternalFeaturesSettingEnabled: mockIsInternalFeaturesSettingEnabled
}));

const realDefaultValues = await import('../src/app/questions/helper/default-values.js');
jest.unstable_mockModule('../src/app/questions/helper/default-values', () => ({
    ...realDefaultValues,
    getDefaultProjectName: mockGetDefaultProjectName
}));

const realValidators = await import('../src/app/questions/helper/validators.js');
jest.unstable_mockModule('../src/app/questions/helper/validators', () => ({
    ...realValidators,
    validateExtensibilityGenerator: mockValidateExtensibilityGenerator
}));

const realExtensionProject = await import('../src/app/extension-project/index.js');
jest.unstable_mockModule('../src/app/extension-project/index', () => ({
    ...realExtensionProject,
    resolveNodeModuleGenerator: mockResolveNodeModuleGenerator
}));

const realConditions = await import('../src/app/questions/helper/conditions.js');
jest.unstable_mockModule('../src/app/questions/helper/conditions', () => ({
    ...realConditions,
    showApplicationQuestion: mockShowApplicationQuestion,
    showExtensionProjectQuestion: mockShowExtensionProjectQuestion,
    shouldShowBaseAppPrompt: mockShouldShowBaseAppPrompt,
    showStoreCredentialsQuestion: mockShowStoreCredentialsQuestion
}));

const realSystemAccess = await import('@sap-ux/system-access');
jest.unstable_mockModule('@sap-ux/system-access', () => ({
    ...realSystemAccess,
    getCredentialsFromStore: mockGetCredentialsFromStore
}));

const realStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getService: mockGetService,
    BackendSystem: class {
        constructor(public data: any) {}
    },
    BackendSystemKey: class {
        constructor(public data: any) {}
    },
    SystemType: {
        AbapOnPrem: 'OnPrem',
        AbapCloudReady: 'Cloud'
    }
}));

const realChildProcess = await import('node:child_process');
jest.unstable_mockModule('node:child_process', () => ({
    ...realChildProcess,
    exec: mockExec
}));

const realAdpTooling = await import('@sap-ux/adp-tooling');
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ...realAdpTooling,
    getConfiguredProvider: mockGetConfiguredProvider,
    loadApps: mockLoadApps,
    getProviderConfig: mockGetProviderConfig,
    validateUI5VersionExists: mockValidateUI5VersionExists,
    fetchPublicVersions: mockFetchPublicVersions,
    isCFEnvironment: mockIsCFEnvironment,
    isCfInstalled: mockIsCfInstalled,
    loadCfConfig: mockLoadCfConfig,
    isLoggedInCf: mockIsLoggedInCf,
    getMtaServices: mockGetMtaServices,
    getModuleNames: mockGetModuleNames,
    getApprouterType: mockGetApprouterType,
    hasApprouter: mockHasApprouter,
    createServices: mockCreateServices,
    createServiceInstance: mockCreateServiceInstance,
    getOrCreateServiceInstanceKeys: mockGetOrCreateServiceInstanceKeys,
    storeCredentials: mockStoreCredentials,
    getSupportedProject: mockGetSupportedProject,
    getCfBaseAppInbounds: mockGetCfBaseAppInbounds,
    // generateCf calls adjustMtaYaml which internally requires '../services/api.js' via CJS.
    // jest.unstable_mockModule cannot intercept relative CJS requires inside compiled dist packages,
    // so the real generateCf would invoke live CF APIs. The mock avoids that.
    generateCf: mockGenerateCf
}));

const realDeps = await import('../src/utils/deps.js');
jest.unstable_mockModule('../src/utils/deps', () => ({
    ...realDeps,
    getPackageInfo: mockGetPackageInfo,
    installDependencies: mockInstallDependencies
}));

const realAppWizardCache = await import('../src/utils/appWizardCache.js');
jest.unstable_mockModule('../src/utils/appWizardCache', () => ({
    ...realAppWizardCache
}));

const realTemplates = await import('../src/utils/templates.js');
jest.unstable_mockModule('../src/utils/templates', () => ({
    ...realTemplates,
    getTemplatesOverwritePath: mockGetTemplatesOverwritePath
}));

const realWriteResult = await import('../src/utils/write-result.js');
jest.unstable_mockModule('../src/utils/write-result', () => ({
    ...realWriteResult,
    writeResult: mockWriteResult
}));

const realFioriGeneratorShared = await import('@sap-ux/fiori-generator-shared');
jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    ...realFioriGeneratorShared,
    sendTelemetry: mockSendTelemetry,
    TelemetryHelper: {
        createTelemetryData: mockCreateTelemetryData
    },
    isExtensionInstalled: mockIsExtensionInstalled,
    getHostEnvironment: mockGetHostEnvironment,
    isCli: mockIsCli,
    getDefaultTargetFolder: mockGetDefaultTargetFolder
}));

const realTelemetry = await import('@sap-ux/telemetry');
jest.unstable_mockModule('@sap-ux/telemetry', () => ({
    ...realTelemetry,
    initTelemetrySettings: mockInitTelemetrySettings
}));

const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio
}));

jest.unstable_mockModule('uuid', () => ({
    v4: mockV4
}));

const realSubgenHelpers = await import('../src/utils/subgenHelpers.js');
jest.unstable_mockModule('../src/utils/subgenHelpers', () => ({
    ...realSubgenHelpers,
    addExtProjectGen: mockAddExtProjectGen,
    addDeployGen: mockAddDeployGen,
    addFlpGen: mockAddFlpGen
}));

const realWorkspace = await import('../src/utils/workspace.js');
jest.unstable_mockModule('../src/utils/workspace', () => ({
    ...realWorkspace,
    existsInWorkspace: mockExistsInWorkspace,
    showWorkspaceFolderWarning: mockShowWorkspaceFolderWarning,
    handleWorkspaceFolderChoice: mockHandleWorkspaceFolderChoice
}));

const mockToolsLoggerCtor = jest.fn<typeof realLogger.ToolsLogger>();
const realLogger = await import('@sap-ux/logger');
jest.unstable_mockModule('@sap-ux/logger', () => ({
    ...realLogger,
    ToolsLogger: mockToolsLoggerCtor
}));

// ─── Dynamic imports (after all mocks are set up) ───

const { AppRouterType, FlexLayer, SourceManifest, SupportedProject, SystemLookup } =
    await import('@sap-ux/adp-tooling');
const { AdaptationProjectType } = await import('@sap-ux/axios-extension');
const { default: adpGenerator } = await import('../src/app/index.js');
const { ConfigPrompter } = await import('../src/app/questions/configuration.js');
const { KeyUserImportPrompter } = await import('../src/app/questions/key-user.js');
const { TargetEnv } = await import('../src/app/types.js');
const { EventName } = await import('../src/telemetry/index.js');
const { initI18n, t } = await import('../src/utils/i18n.js');
const { workspaceChoices } = await import('../src/utils/workspace.js');
const { CFServicesPrompter } = await import('../src/app/questions/cf-services.js');

// ─── Test data ───

const originalCwd = process.cwd();
const testOutputDir = join(__dirname, 'test-output-app');
const generatorPath = join(__dirname, '../src/app/index.ts');

// Set template path to the real adp-tooling templates directory
const adpToolingTemplatesPath = join(__dirname, '../../adp-tooling/templates');
mockGetTemplatesOverwritePath.mockReturnValue(adpToolingTemplatesPath);

const endpoints = [{ Name: 'SystemA', Client: '010', Url: 'urlA' }];
const apps: SourceApplication[] = [
    {
        ach: '',
        bspName: 'SOME_NAME',
        bspUrl: '/some/url',
        fileType: 'descriptor',
        id: 'sap.ui.demoapps.f1',
        registrationIds: ['F0303'],
        title: 'App One',
        cloudDevAdaptationStatus: ''
    }
];

const answers: ConfigAnswers & AttributesAnswers = {
    system: 'urlA',
    username: 'user1',
    password: 'pass1',
    application: apps[0],
    projectName: 'app.variant',
    namespace: 'customer.app.variant',
    title: 'App Title',
    ui5Version: '1.134.1',
    targetFolder: testOutputDir,
    enableTypeScript: false,
    shouldCreateExtProject: false,
    addDeployConfig: false,
    addFlpConfig: false
};

const baseApp: CFApp = {
    appId: 'test-app-id',
    appName: 'test-app-name',
    appVersion: 'test-app-version',
    serviceName: 'test-service-name',
    appHostId: 'test-app-host-id',
    title: 'test-app-title'
};

import type { TargetEnvAnswers, JsonInput } from '../src/app/types.js';

const answersCf: CfServicesAnswers & AttributesAnswers & TargetEnvAnswers = {
    targetEnv: TargetEnv.CF,
    projectName: 'app.variant',
    namespace: 'app.variant',
    title: 'App Title',
    ui5Version: '1.134.1',
    targetFolder: testOutputDir,
    enableTypeScript: false,
    baseApp,
    approuter: AppRouterType.MANAGED,
    businessService: 'test-service',
    businessSolutionName: 'test-solution'
};

const cfConfig: CfConfig = {
    url: '/api.cf.example.com',
    token: 'test-token',
    org: { GUID: 'org-guid', Name: 'test-org' },
    space: { GUID: 'space-guid', Name: 'test-space' }
};

const inbounds = {
    'display-bank': {
        semanticObject: 'test',
        action: 'action',
        title: 'testTitle',
        subTitle: 'testSubTitle',
        icon: 'sap-icon://test',
        signature: {
            parameters: {
                param1: {
                    value: 'test1',
                    isRequired: true
                }
            }
        }
    }
} as unknown as ManifestNamespace.Inbound;

const activeLanguages: Language[] = [{ sap: 'value', i18n: 'DE' }];
const adaptationProjectTypes: AdaptationProjectType[] = [AdaptationProjectType.CLOUD_READY];
const mockManifest = { 'sap.ui5': { flexEnabled: true } } as Manifest;
const publicVersions = {
    latest: { version: '1.134.1' } as VersionDetail,
    '1.134.0': { version: '1.134.0' } as VersionDetail
};

const isAbapCloudMock = jest.fn();
const getAtoInfoMock = jest.fn();
const getSystemInfoMock = jest.fn().mockResolvedValue({ adaptationProjectTypes, activeLanguages });
const dummyProvider = {
    isAbapCloud: isAbapCloudMock,
    getAtoInfo: getAtoInfoMock,
    getLayeredRepository: jest.fn().mockReturnValue({
        getSystemInfo: getSystemInfoMock
    })
} as unknown as AbapServiceProvider;

const toolsLoggerErrorSpy = jest.fn();
const loggerMock: ToolsLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: toolsLoggerErrorSpy
} as Partial<ToolsLogger> as ToolsLogger;
mockToolsLoggerCtor.mockImplementation(() => loggerMock);

const executeCommandSpy = jest.fn();
const showWarningMessageSpy = jest.fn();
const getWorkspaceFolderSpy = jest.fn();
const onDidChangeWorkspaceFoldersSpy = jest.fn();
const updateWorkspaceFoldersSpy = jest.fn();

const vscodeMock = {
    commands: {
        executeCommand: executeCommandSpy.mockResolvedValue(undefined)
    },
    window: {
        showWarningMessage: showWarningMessageSpy
    },
    workspace: {
        getWorkspaceFolder: getWorkspaceFolderSpy,
        workspaceFolders: [],
        onDidChangeWorkspaceFolders: onDidChangeWorkspaceFoldersSpy,
        updateWorkspaceFolders: updateWorkspaceFoldersSpy
    },
    Uri: {
        file: jest.fn((path: string) => ({ path }))
    }
};

import type { AdpGeneratorOptions } from '../src/app/index.js';

const mockSystemService = {
    read: jest.fn(),
    write: jest.fn()
};

describe('Adaptation Project Generator Integration Test', () => {
    jest.setTimeout(60000);

    beforeAll(async () => {
        await initI18n();
    });

    describe('ABAP Environment', () => {
        beforeEach(() => {
            fs.mkdirSync(testOutputDir, { recursive: true });
            mockIsInternalFeaturesSettingEnabled.mockReturnValue(false);
            mockIsExtensionInstalled.mockReturnValueOnce(true);
            mockLoadApps.mockResolvedValue(apps);
            jest.spyOn(ConfigPrompter.prototype, 'provider', 'get').mockReturnValue(dummyProvider);
            jest.spyOn(ConfigPrompter.prototype, 'ui5', 'get').mockReturnValue({
                publicVersions,
                ui5Versions: ['1.134.1 (latest)', '1.134.0'],
                systemVersion: '1.136.0'
            });
            jest.spyOn(ConfigPrompter.prototype, 'manifest', 'get').mockReturnValue(mockManifest);
            jest.spyOn(SourceManifest.prototype, 'getManifest').mockResolvedValue(mockManifest);
            mockValidateUI5VersionExists.mockReturnValue(true);
            jest.spyOn(SystemLookup.prototype, 'getSystems').mockResolvedValue(endpoints);
            jest.spyOn(SystemLookup.prototype, 'getSystemRequiresAuth').mockResolvedValue(false);
            jest.spyOn(SystemLookup.prototype, 'getSystemByName').mockResolvedValue({
                Name: 'SystemA',
                Client: '010',
                Url: 'urlA'
            });
            mockGetConfiguredProvider.mockResolvedValue(dummyProvider);
            mockExec.mockImplementation(((_, callback) => {
                callback(null, { stdout: 'ok', stderr: '' });
            }) as unknown as typeof realChildProcess.exec);
            mockIsCli.mockReturnValue(false);
            mockGetProviderConfig.mockResolvedValue({ url: 'urlA', client: '010' });
            isAbapCloudMock.mockResolvedValue(false);
            getAtoInfoMock.mockResolvedValue({ operationsType: 'P' });

            mockGetDefaultProjectName.mockReturnValue('app.variant1');
            mockGetCredentialsFromStore.mockResolvedValue(undefined);

            mockGetService.mockResolvedValue(mockSystemService);
            mockSystemService.read.mockResolvedValue(null);
            mockSystemService.write.mockResolvedValue(undefined);

            mockIsCfInstalled.mockResolvedValue(false);
            mockLoadCfConfig.mockReturnValue({} as CfConfig);
            mockIsLoggedInCf.mockResolvedValue(false);

            mockFetchPublicVersions.mockResolvedValue(publicVersions);
            mockExistsInWorkspace.mockReturnValue(true);
            mockShowWorkspaceFolderWarning.mockResolvedValue(workspaceChoices.OPEN_FOLDER);
            mockHandleWorkspaceFolderChoice.mockResolvedValue(undefined);
        });

        afterAll(async () => {
            process.chdir(originalCwd);
            rimraf.sync(testOutputDir);
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should throw error when writing phase fails', async () => {
            const error = new Error('Test error');
            mockIsAppStudio.mockReturnValue(false);
            getAtoInfoMock.mockRejectedValueOnce(error);

            const runContext = yeomanTest
                .create(adpGenerator, { resolved: generatorPath }, { cwd: testOutputDir })
                .withOptions({ shouldInstallDeps: false } as AdpGeneratorOptions)
                .withPrompts(answers);

            await expect(runContext.run()).rejects.toThrow(t('error.updatingApp'));
        });

        it('should call composeWith to generate an extension project in case the application is not supported', async () => {
            mockIsAppStudio.mockReturnValue(false);
            jest.spyOn(Generator.prototype, 'composeWith');
            const addExtProjectGenSpy = mockAddExtProjectGen.mockResolvedValue(undefined);

            const runContext = yeomanTest
                .create(adpGenerator, { resolved: generatorPath }, { cwd: testOutputDir })
                .withOptions({ shouldInstallDeps: false, vscode: vscodeMock } as AdpGeneratorOptions)
                .withPrompts({ ...answers, shouldCreateExtProject: true });

            await expect(runContext.run()).resolves.not.toThrow();

            expect(addExtProjectGenSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    attributeAnswers: {
                        namespace: 'customer.app.variant',
                        projectName: 'app.variant',
                        title: 'App Title',
                        ui5Version: '1.134.1'
                    },
                    configAnswers: {
                        application: apps[0],
                        shouldCreateExtProject: true,
                        system: 'urlA'
                    },
                    systemLookup: expect.any(Object)
                }),
                expect.any(Function),
                expect.any(Object),
                expect.any(Object)
            );
            expect(mockSendTelemetry).toHaveBeenCalledWith(
                EventName.ADAPTATION_PROJECT_CREATED,
                expect.objectContaining({
                    OperatingSystem: 'testOS',
                    Platform: 'testPlatform'
                }),
                expect.any(String)
            );
            expect(executeCommandSpy).toHaveBeenCalledTimes(0);
            expect(mockShowWorkspaceFolderWarning).toHaveBeenCalledTimes(0);
        });

        it('should call composeWith for FLP and Deploy sub-generators and generate a cloud project successfully', async () => {
            mockIsAppStudio.mockReturnValue(false);
            mockExistsInWorkspace.mockReturnValue(false);
            jest.spyOn(ConfigPrompter.prototype, 'projectType', 'get').mockReturnValue(
                AdaptationProjectType.CLOUD_READY
            );
            jest.spyOn(ConfigPrompter.prototype, 'baseAppInbounds', 'get').mockReturnValue(inbounds);
            jest.spyOn(Generator.prototype, 'composeWith').mockReturnValue([]);

            const addDeployGenSpy = mockAddDeployGen.mockResolvedValue(undefined);
            const addFlpGenSpy = mockAddFlpGen.mockResolvedValue(undefined);

            const runContext = yeomanTest
                .create(adpGenerator, { resolved: generatorPath }, { cwd: testOutputDir })
                .withOptions({ shouldInstallDeps: false, vscode: vscodeMock } as AdpGeneratorOptions)
                .withPrompts({
                    ...answers,
                    addDeployConfig: true,
                    addFlpConfig: true,
                    projectType: AdaptationProjectType.CLOUD_READY
                });

            await expect(runContext.run()).resolves.not.toThrow();

            expect(addDeployGenSpy).toHaveBeenCalledWith(
                {
                    connectedSystem: 'urlA',
                    projectName: 'app.variant',
                    projectPath: testOutputDir,
                    system: {
                        Name: 'SystemA',
                        Client: '010',
                        Url: 'urlA'
                    },
                    projectType: AdaptationProjectType.CLOUD_READY
                },
                expect.any(Function),
                expect.any(Object),
                expect.any(Object)
            );

            expect(addFlpGenSpy).toHaveBeenCalledWith(
                {
                    inbounds: inbounds,
                    projectRootPath: join(testOutputDir, answers.projectName),
                    layer: FlexLayer.CUSTOMER_BASE,
                    vscode: vscodeMock,
                    prompts: {
                        items: [
                            {
                                description: 'Configure the system and select an application.',
                                name: 'System and Application Selection'
                            },
                            {
                                description: 'Configure the main project attributes.',
                                name: 'Project Attributes'
                            },
                            {
                                description: 'Configure deployment settings.',
                                name: 'Deployment Configuration'
                            },
                            {
                                description:
                                    'Add a new tile or replace existing tiles of the base application.\nProject: app.variant',
                                name: 'SAP Fiori Launchpad Configuration: Tile Handling'
                            },
                            {
                                description: '',
                                name: 'SAP Fiori Launchpad Configuration: Tile Settings'
                            }
                        ]
                    }
                },
                expect.any(Function),
                expect.any(Object),
                expect.any(Object)
            );

            expect(executeCommandSpy).toHaveBeenCalledTimes(0);
            expect(mockShowWorkspaceFolderWarning).toHaveBeenCalledTimes(1);
            expect(mockHandleWorkspaceFolderChoice).toHaveBeenCalledTimes(1);

            const generatedDirs = fs.readdirSync(testOutputDir);
            expect(generatedDirs).toContain(answers.projectName);
        });

        it('should generate an onPremise adaptation project successfully', async () => {
            mockIsAppStudio.mockReturnValue(false);
            mockStoreCredentials.mockResolvedValue(undefined);
            jest.spyOn(ConfigPrompter.prototype, 'projectType', 'get').mockReturnValue(
                AdaptationProjectType.ON_PREMISE
            );

            const runContext = yeomanTest
                .create(adpGenerator, { resolved: generatorPath }, { cwd: testOutputDir })
                .withOptions({ shouldInstallDeps: true, vscode: vscodeMock } as AdpGeneratorOptions)
                .withPrompts({ ...answers, projectType: AdaptationProjectType.ON_PREMISE });

            await expect(runContext.run()).resolves.not.toThrow();

            expect(executeCommandSpy).toHaveBeenCalledTimes(1);
            expect(mockStoreCredentials).not.toHaveBeenCalled();

            const generatedDirs = fs.readdirSync(testOutputDir);
            expect(generatedDirs).toContain(answers.projectName);
            const projectFolder = join(testOutputDir, answers.projectName);

            const manifestPath = join(projectFolder, 'webapp', 'manifest.appdescr_variant');
            const i18nPath = join(projectFolder, 'webapp', 'i18n', 'i18n.properties');
            const ui5Yaml = join(projectFolder, 'ui5.yaml');

            expect(fs.existsSync(manifestPath)).toBe(true);
            expect(fs.existsSync(i18nPath)).toBe(true);
            expect(fs.existsSync(ui5Yaml)).toBe(true);

            const manifestContent = fs.readFileSync(manifestPath, 'utf8');
            const i18nContent = fs.readFileSync(i18nPath, 'utf8');
            const ui5Content = fs.readFileSync(ui5Yaml, 'utf8');
            expect(manifestContent).toMatchSnapshot();
            expect(i18nContent).toMatchSnapshot();
            expect(ui5Content).toMatchSnapshot();

            expect(mockSendTelemetry).toHaveBeenCalledWith(
                EventName.ADAPTATION_PROJECT_CREATED,
                expect.objectContaining({
                    OperatingSystem: 'testOS',
                    Platform: 'testPlatform'
                }),
                projectFolder
            );
        });

        it('should store credentials when storeCredentials flag is true', async () => {
            mockIsAppStudio.mockReturnValue(false);
            mockStoreCredentials.mockResolvedValue(undefined);
            // Mock the condition to return true for store credentials question
            mockShowStoreCredentialsQuestion.mockReturnValue(true);

            const answersWithStoreCredentials = { ...answers, storeCredentials: true };

            const runContext = yeomanTest
                .create(adpGenerator, { resolved: generatorPath }, { cwd: testOutputDir })
                .withOptions({ shouldInstallDeps: false, vscode: vscodeMock } as AdpGeneratorOptions)
                .withPrompts(answersWithStoreCredentials);

            await expect(runContext.run()).resolves.not.toThrow();

            expect(mockStoreCredentials).toHaveBeenCalledTimes(1);

            const [configAnswers, systemLookup, logger] = mockStoreCredentials.mock.calls[0];
            expect(configAnswers.storeCredentials).toBe(true);
            expect(systemLookup).toBeDefined();
            expect(logger).toBeDefined();
        });

        it('should generate adaptation project with key user changes', async () => {
            mockIsAppStudio.mockReturnValue(false);

            const mockAdaptations = [{ id: 'DEFAULT', title: '', type: 'DEFAULT' }];
            const mockKeyUserChange = {
                content: {
                    fileName: 'id_1767885281745_1726_renameLabel',
                    changeType: 'renameLabel',
                    reference: apps[0].id,
                    layer: 'CUSTOMER',
                    namespace: `apps/${apps[0].id}/changes/`,
                    projectId: apps[0].id,
                    fileType: 'annotation_change',
                    content: {
                        annotationPath: '/category_ID@com.vocabularies.Common.v1.Label'
                    },
                    selector: {
                        serviceUrl: '/odata/test/service'
                    }
                },
                texts: {
                    annotationText: {
                        value: 'Category ID',
                        type: 'XFLD'
                    }
                }
            };

            jest.spyOn(KeyUserImportPrompter.prototype, 'changes', 'get').mockReturnValue([mockKeyUserChange]);

            const keyUserAnswers = {
                ...answers,
                importKeyUserChanges: true,
                keyUserSystem: 'urlA',
                keyUserAdaptation: mockAdaptations[0]
            };

            const runContext = yeomanTest
                .create(adpGenerator, { resolved: generatorPath }, { cwd: testOutputDir })
                .withOptions({ shouldInstallDeps: false, vscode: vscodeMock } as AdpGeneratorOptions)
                .withPrompts(keyUserAnswers);

            await expect(runContext.run()).resolves.not.toThrow();

            const generatedDirs = fs.readdirSync(testOutputDir);
            expect(generatedDirs).toContain(answers.projectName);
            const projectFolder = join(testOutputDir, answers.projectName);

            // Verify key user change file was written
            const changesDir = join(projectFolder, 'webapp', 'changes');
            expect(fs.existsSync(changesDir)).toBe(true);

            const changeFiles = fs.readdirSync(changesDir).filter((file) => file.endsWith('.annotation_change'));
            expect(changeFiles.length).toBeGreaterThan(0);

            // Verify the change file content
            const changeFilePath = join(changesDir, changeFiles[0]);
            expect(fs.existsSync(changeFilePath)).toBe(true);

            const changeContent = JSON.parse(fs.readFileSync(changeFilePath, 'utf8'));
            expect(changeContent).toMatchSnapshot();
        });

        it('should not call writeResult when json input has no id', async () => {
            mockGetSupportedProject.mockRejectedValueOnce(new Error('no-id-error'));
            const jsonInput: JsonInput = {
                system: 'urlA',
                username: 'user1',
                password: 'pass1',
                client: '010',
                application: 'sap.ui.demoapps.f1',
                projectName: 'noid.app',
                namespace: 'customer.noid.app',
                targetFolder: testOutputDir,
                projectType: AdaptationProjectType.ON_PREMISE
            };

            const runContext = yeomanTest
                .create(adpGenerator, { resolved: generatorPath }, { cwd: testOutputDir })
                .withArguments([JSON.stringify(jsonInput)]);

            await expect(runContext.run()).rejects.toThrow(t('error.updatingApp'));

            expect(mockWriteResult).not.toHaveBeenCalled();
        });

        it('should write a failure result for the orchestrator when json generation fails', async () => {
            mockGetSupportedProject.mockRejectedValueOnce(new Error('boom'));
            const jsonInput: JsonInput = {
                id: 'orchestrator-id',
                system: 'urlA',
                username: 'user1',
                password: 'pass1',
                client: '010',
                application: 'sap.ui.demoapps.f1',
                projectName: 'fail.app',
                namespace: 'customer.fail.app',
                targetFolder: testOutputDir,
                projectType: AdaptationProjectType.ON_PREMISE
            };

            const runContext = yeomanTest
                .create(adpGenerator, { resolved: generatorPath }, { cwd: testOutputDir })
                .withArguments([JSON.stringify(jsonInput)]);

            await expect(runContext.run()).rejects.toThrow(t('error.updatingApp'));

            expect(mockWriteResult).toHaveBeenCalledWith('orchestrator-id', 'Failure: boom');
        });

        it('should create adaptation project from json correctly', async () => {
            // NOTE: This test uses .withArguments() which bypasses the normal yeoman prompting lifecycle and goes directly to the writing phase.
            // This can cause race conditions with other tests that use the same output directory, as the generator doesn't go through the standard prompting -> writing flow.
            // This test must be the last test in the file. Other tests below it must use a different output directory.
            mockGetSupportedProject.mockResolvedValue(SupportedProject.ON_PREM);
            const jsonInput: JsonInput = {
                id: 'orchestrator-id',
                system: 'urlA',
                username: 'user1',
                password: 'pass1',
                client: '010',
                application: 'sap.ui.demoapps.f1',
                projectName: 'my.app',
                namespace: 'customer.my.app',
                applicationTitle: 'My app title',
                targetFolder: testOutputDir,
                projectType: AdaptationProjectType.ON_PREMISE
            };
            const jsonInputString = JSON.stringify(jsonInput);

            const runContext = yeomanTest
                .create(adpGenerator, { resolved: generatorPath }, { cwd: testOutputDir })
                .withArguments([jsonInputString]);

            await expect(runContext.run()).resolves.not.toThrow();

            const generatedDirs = fs.readdirSync(testOutputDir);
            expect(generatedDirs).toContain(jsonInput.projectName);
            const projectFolder = join(testOutputDir, jsonInput.projectName!);

            const manifestPath = join(projectFolder, 'webapp', 'manifest.appdescr_variant');
            const i18nPath = join(projectFolder, 'webapp', 'i18n', 'i18n.properties');
            const ui5Yaml = join(projectFolder, 'ui5.yaml');

            expect(fs.existsSync(manifestPath)).toBe(true);
            expect(fs.existsSync(i18nPath)).toBe(true);
            expect(fs.existsSync(ui5Yaml)).toBe(true);

            const manifestContent = fs.readFileSync(manifestPath, 'utf8');
            const i18nContent = fs.readFileSync(i18nPath, 'utf8');
            const ui5Content = fs.readFileSync(ui5Yaml, 'utf8');
            expect(manifestContent).toMatchSnapshot();
            expect(i18nContent).toMatchSnapshot();
            expect(ui5Content).toMatchSnapshot();

            expect(mockWriteResult).toHaveBeenCalledWith('orchestrator-id', projectFolder);
        });
    });

    describe('CF Environment', () => {
        const cfTestOutputDir = join(__dirname, 'test-output-app-cf');

        beforeEach(() => {
            fs.mkdirSync(cfTestOutputDir, { recursive: true });

            const mtaYamlSource = join(__dirname, 'fixtures', 'mta-project', 'mta.yaml');
            const mtaYamlTarget = join(cfTestOutputDir, 'mta.yaml');
            fs.copyFileSync(mtaYamlSource, mtaYamlTarget);

            const mockServiceInfo = {
                serviceKeys: [
                    {
                        credentials: {
                            uaa: {
                                clientid: 'test-client-id',
                                clientsecret: 'test-client-secret',
                                url: 'https://test-uaa.example.com'
                            },
                            uri: 'https://example.com',
                            endpoints: {
                                backend: {
                                    url: 'https://backend.example.com',
                                    destination: 'test-backend-destination'
                                }
                            }
                        }
                    }
                ],
                serviceInstance: {
                    name: 'test-service-instance',
                    guid: 'test-service-instance-guid'
                }
            };
            // Configure both package and dist mocks
            mockGetOrCreateServiceInstanceKeysApi.mockResolvedValue(mockServiceInfo);
            mockGetOrCreateServiceInstanceKeys.mockResolvedValue(mockServiceInfo);

            mockCreateServiceInstanceApi.mockResolvedValue(undefined);

            mockIsAppStudio.mockReturnValue(true);
            jest.spyOn(Date, 'now').mockReturnValue(1234567890);
            mockIsInternalFeaturesSettingEnabled.mockReturnValue(false);
            mockIsCfInstalled.mockResolvedValue(true);
            mockIsLoggedInCf.mockResolvedValue(true);
            mockLoadApps.mockResolvedValue(apps);
            jest.spyOn(CFServicesPrompter.prototype, 'manifest', 'get').mockReturnValue(mockManifest);
            jest.spyOn(CFServicesPrompter.prototype, 'serviceInstanceGuid', 'get').mockReturnValue('test-guid');

            mockIsCli.mockReturnValue(false);
            mockGetDefaultProjectName.mockReturnValue('app.variant1');
            mockGetCredentialsFromStore.mockResolvedValue(undefined);
            mockCreateServices.mockResolvedValue(undefined);

            mockLoadCfConfig.mockReturnValue(cfConfig);
            mockGetModuleNames.mockReturnValue(['module1', 'module2']);
            mockGetMtaServices.mockResolvedValue(['service1', 'service2']);
            mockGetApprouterType.mockReturnValue(AppRouterType.MANAGED);
            mockHasApprouter.mockReturnValue(false);

            mockFetchPublicVersions.mockResolvedValue(publicVersions);
        });

        afterEach(() => {
            const mtaYamlPath = join(cfTestOutputDir, 'mta.yaml');
            if (fs.existsSync(mtaYamlPath)) {
                fs.unlinkSync(mtaYamlPath);
            }

            jest.clearAllMocks();
        });

        afterAll(async () => {
            process.chdir(originalCwd);
            rimraf.sync(cfTestOutputDir);
        });

        it('should generate an adaptation project successfully', async () => {
            const runContext = yeomanTest
                .create(adpGenerator, { resolved: generatorPath }, { cwd: cfTestOutputDir })
                .withOptions({
                    shouldInstallDeps: true,
                    vscode: vscodeMock
                } as AdpGeneratorOptions)
                .withPrompts({ ...answersCf, projectLocation: cfTestOutputDir });

            await expect(runContext.run()).resolves.not.toThrow();

            // generateCf is mocked: adjustMtaYaml internally requires '../services/api.js' via relative
            // CJS require, which jest.unstable_mockModule cannot intercept. The real call would hit live
            // CF APIs. Verify via mock that generateCf was invoked with the right arguments instead.
            expect(mockGenerateCf).toHaveBeenCalledWith(
                cfTestOutputDir,
                expect.objectContaining({
                    app: expect.objectContaining({
                        id: baseApp.appId,
                        layer: FlexLayer.CUSTOMER_BASE
                    }),
                    project: expect.objectContaining({
                        name: answersCf.projectName
                    })
                }),
                expect.any(Object),
                expect.any(Object)
            );

            expect(mockSendTelemetry).toHaveBeenCalledWith(
                EventName.ADAPTATION_PROJECT_CREATED,
                expect.objectContaining({
                    OperatingSystem: 'testOS',
                    Platform: 'testPlatform'
                }),
                expect.any(String)
            );
            expect(executeCommandSpy).not.toHaveBeenCalled();
        });

        it('should call composeWith for FLP sub-generator when CF inbounds are available', async () => {
            mockGetCfBaseAppInbounds.mockResolvedValue(inbounds);
            jest.spyOn(Generator.prototype, 'composeWith').mockReturnValue([]);
            const addFlpGenSpy = mockAddFlpGen.mockResolvedValue(undefined);

            const runContext = yeomanTest
                .create(adpGenerator, { resolved: generatorPath }, { cwd: cfTestOutputDir })
                .withOptions({
                    shouldInstallDeps: false,
                    vscode: vscodeMock
                } as AdpGeneratorOptions)
                .withPrompts({ ...answersCf, addFlpConfig: true, projectLocation: cfTestOutputDir });

            await expect(runContext.run()).resolves.not.toThrow();

            expect(mockGetCfBaseAppInbounds).toHaveBeenCalledWith(
                baseApp.appId,
                baseApp.appHostId,
                cfConfig,
                expect.any(Object)
            );
            expect(addFlpGenSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    inbounds,
                    layer: FlexLayer.CUSTOMER_BASE,
                    isCfProject: true,
                    projectRootPath: join(cfTestOutputDir, answersCf.projectName)
                }),
                expect.any(Function),
                expect.any(Object),
                expect.any(Object)
            );
        });

        it('should not call FLP sub-generator when CF inbounds are empty', async () => {
            mockGetCfBaseAppInbounds.mockResolvedValue(undefined);
            const addFlpGenSpy = mockAddFlpGen.mockResolvedValue(undefined);

            const runContext = yeomanTest
                .create(adpGenerator, { resolved: generatorPath }, { cwd: cfTestOutputDir })
                .withOptions({
                    shouldInstallDeps: false,
                    vscode: vscodeMock
                } as AdpGeneratorOptions)
                .withPrompts({ ...answersCf, addFlpConfig: true, projectLocation: cfTestOutputDir });

            await expect(runContext.run()).resolves.not.toThrow();

            expect(mockGetCfBaseAppInbounds).toHaveBeenCalled();
            expect(addFlpGenSpy).not.toHaveBeenCalled();
        });
    });
});
