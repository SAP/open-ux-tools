import { exec } from 'child_process';
import fs from 'node:fs';
import { join } from 'node:path';
import { rimraf } from 'rimraf';
import Generator from 'yeoman-generator';
import yeomanTest from 'yeoman-test';

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
import {
    AppRouterType,
    FlexLayer,
    SourceManifest,
    SystemLookup,
    createServices,
    fetchPublicVersions,
    getApprouterType,
    getConfiguredProvider,
    getModuleNames,
    getMtaServices,
    getProviderConfig,
    hasApprouter,
    isCfInstalled,
    isLoggedInCf,
    loadApps,
    loadCfConfig,
    validateUI5VersionExists
} from '@sap-ux/adp-tooling';
import { type AbapServiceProvider, AdaptationProjectType } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { isCli, isExtensionInstalled, sendTelemetry } from '@sap-ux/fiori-generator-shared';
import type { ToolsLogger } from '@sap-ux/logger';
import * as Logger from '@sap-ux/logger';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import { getCredentialsFromStore } from '@sap-ux/system-access';

import type { AdpGeneratorOptions } from '../src/app';
import adpGenerator from '../src/app';
import { ConfigPrompter } from '../src/app/questions/configuration';
import { getDefaultProjectName } from '../src/app/questions/helper/default-values';
import { TargetEnv, type JsonInput, type TargetEnvAnswers } from '../src/app/types';
import { EventName } from '../src/telemetryEvents';
import { initI18n, t } from '../src/utils/i18n';
import * as subgenHelpers from '../src/utils/subgenHelpers';
import {
    existsInWorkspace,
    handleWorkspaceFolderChoice,
    showWorkspaceFolderWarning,
    workspaceChoices
} from '../src/utils/workspace';
import { CFServicesPrompter } from '../src/app/questions/cf-services';

jest.mock('@sap-ux/feature-toggle', () => ({
    ...jest.requireActual('@sap-ux/feature-toggle'),
    isInternalFeaturesSettingEnabled: jest.fn()
}));

jest.mock('../src/app/questions/helper/default-values.ts', () => ({
    ...jest.requireActual('../src/app/questions/helper/default-values.ts'),
    getDefaultProjectName: jest.fn()
}));

jest.mock('../src/app/questions/helper/validators.ts', () => ({
    ...jest.requireActual('../src/app/questions/helper/validators.ts'),
    validateExtensibilityGenerator: jest.fn().mockReturnValue(true)
}));

jest.mock('../src/app/extension-project/index.ts', () => ({
    ...jest.requireActual('../src/app/extension-project/index.ts'),
    resolveNodeModuleGenerator: jest.fn().mockReturnValue('my-generator-path')
}));

jest.mock('../src/app/questions/helper/conditions', () => ({
    ...jest.requireActual('../src/app/questions/helper/conditions'),
    showApplicationQuestion: jest.fn().mockReturnValue(true),
    showExtensionProjectQuestion: jest.fn().mockReturnValue(true),
    shouldShowBaseAppPrompt: jest.fn().mockReturnValue(true)
}));

jest.mock('@sap-ux/system-access', () => ({
    ...jest.requireActual('@sap-ux/system-access'),
    getCredentialsFromStore: jest.fn()
}));

jest.mock('child_process', () => ({
    ...jest.requireActual('child_process'),
    exec: jest.fn()
}));

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    getConfiguredProvider: jest.fn(),
    loadApps: jest.fn(),
    getProviderConfig: jest.fn(),
    validateUI5VersionExists: jest.fn(),
    fetchPublicVersions: jest.fn(),
    isCFEnvironment: jest.fn().mockReturnValue(false),
    isCfInstalled: jest.fn(),
    loadCfConfig: jest.fn(),
    isLoggedInCf: jest.fn(),
    getMtaServices: jest.fn(),
    getModuleNames: jest.fn(),
    getApprouterType: jest.fn(),
    hasApprouter: jest.fn(),
    createServices: jest.fn()
}));

jest.mock('../src/utils/deps.ts', () => ({
    ...jest.requireActual('../src/utils/deps.ts'),
    getPackageInfo: jest.fn().mockReturnValue({ name: '@sap-ux/generator-adp', version: 'mocked-version' })
}));

jest.mock('../src/utils/appWizardCache.ts');

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    sendTelemetry: jest.fn().mockReturnValue(new Promise(() => {})),
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn().mockReturnValue({
            OperatingSystem: 'testOS',
            Platform: 'testPlatform'
        })
    },
    isExtensionInstalled: jest.fn(),
    getHostEnvironment: jest.fn(),
    isCli: jest.fn(),
    getDefaultTargetFolder: jest.fn().mockReturnValue(undefined)
}));

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('mocked-uuid')
}));

jest.mock('../src/utils/workspace', () => ({
    ...jest.requireActual('../src/utils/workspace'),
    existsInWorkspace: jest.fn(),
    showWorkspaceFolderWarning: jest.fn(),
    handleWorkspaceFolderChoice: jest.fn()
}));

const originalCwd = process.cwd();
const testOutputDir = join(__dirname, 'test-output');
const generatorPath = join(__dirname, '../src/app/index.ts');

const endpoints = [{ Name: 'SystemA', Client: '010', Url: 'urlA' }];
const apps: SourceApplication[] = [
    {
        ach: '',
        bspName: 'SOME_NAME',
        bspUrl: '/some/url',
        fileType: 'descriptor',
        id: 'sap.ui.demoapps.f1',
        registrationIds: ['F0303'],
        title: 'App One'
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
jest.spyOn(Logger, 'ToolsLogger').mockImplementation(() => loggerMock);

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

const isCliMock = isCli as jest.Mock;
const loadAppsMock = loadApps as jest.Mock;
const execMock = exec as unknown as jest.Mock;
const mockIsAppStudio = isAppStudio as jest.Mock;
const getProviderConfigMock = getProviderConfig as jest.Mock;
const fetchPublicVersionsMock = fetchPublicVersions as jest.Mock;
const sendTelemetryMock = sendTelemetry as jest.Mock;
const existsInWorkspaceMock = existsInWorkspace as jest.Mock;
const isExtensionInstalledMock = isExtensionInstalled as jest.Mock;
const showWorkspaceFolderWarningMock = showWorkspaceFolderWarning as jest.Mock;
const handleWorkspaceFolderChoiceMock = handleWorkspaceFolderChoice as jest.Mock;
const getDefaultProjectNameMock = getDefaultProjectName as jest.Mock;
const getConfiguredProviderMock = getConfiguredProvider as jest.Mock;
const getCredentialsFromStoreMock = getCredentialsFromStore as jest.Mock;
const validateUI5VersionExistsMock = validateUI5VersionExists as jest.Mock;
const isCfInstalledMock = isCfInstalled as jest.MockedFunction<typeof isCfInstalled>;
const loadCfConfigMock = loadCfConfig as jest.MockedFunction<typeof loadCfConfig>;
const isLoggedInCfMock = isLoggedInCf as jest.MockedFunction<typeof isLoggedInCf>;
const mockGetModuleNames = getModuleNames as jest.MockedFunction<typeof getModuleNames>;
const mockGetApprouterType = getApprouterType as jest.MockedFunction<typeof getApprouterType>;
const mockHasApprouter = hasApprouter as jest.MockedFunction<typeof hasApprouter>;
const mockGetMtaServices = getMtaServices as jest.MockedFunction<typeof getMtaServices>;
const createServicesMock = createServices as jest.MockedFunction<typeof createServices>;
const mockIsInternalFeaturesSettingEnabled = isInternalFeaturesSettingEnabled as jest.MockedFunction<
    typeof isInternalFeaturesSettingEnabled
>;

describe('Adaptation Project Generator Integration Test', () => {
    jest.setTimeout(60000);

    beforeAll(async () => {
        await initI18n();
    });

    describe('ABAP Environment', () => {
        beforeEach(() => {
            fs.mkdirSync(testOutputDir, { recursive: true });
            mockIsInternalFeaturesSettingEnabled.mockReturnValue(false);
            isExtensionInstalledMock.mockReturnValueOnce(true);
            loadAppsMock.mockResolvedValue(apps);
            jest.spyOn(ConfigPrompter.prototype, 'provider', 'get').mockReturnValue(dummyProvider);
            jest.spyOn(ConfigPrompter.prototype, 'ui5', 'get').mockReturnValue({
                publicVersions,
                ui5Versions: ['1.134.1 (latest)', '1.134.0'],
                systemVersion: '1.136.0'
            });
            jest.spyOn(ConfigPrompter.prototype, 'manifest', 'get').mockReturnValue(mockManifest);
            jest.spyOn(SourceManifest.prototype, 'getManifest').mockResolvedValue(mockManifest);
            validateUI5VersionExistsMock.mockReturnValue(true);
            jest.spyOn(SystemLookup.prototype, 'getSystems').mockResolvedValue(endpoints);
            jest.spyOn(SystemLookup.prototype, 'getSystemRequiresAuth').mockResolvedValue(false);
            getConfiguredProviderMock.mockResolvedValue(dummyProvider);
            execMock.mockImplementation((_: string, callback: Function) => {
                callback(null, { stdout: 'ok', stderr: '' });
            });
            isCliMock.mockReturnValue(false);
            getProviderConfigMock.mockResolvedValue({ url: 'urlA', client: '010' });
            isAbapCloudMock.mockResolvedValue(false);
            getAtoInfoMock.mockResolvedValue({ operationsType: 'P' });

            getDefaultProjectNameMock.mockReturnValue('app.variant1');
            getCredentialsFromStoreMock.mockResolvedValue(undefined);

            isCfInstalledMock.mockResolvedValue(false);
            loadCfConfigMock.mockReturnValue({} as CfConfig);
            isLoggedInCfMock.mockResolvedValue(false);

            fetchPublicVersionsMock.mockResolvedValue(publicVersions);
            existsInWorkspaceMock.mockReturnValue(true);
            showWorkspaceFolderWarningMock.mockResolvedValue(workspaceChoices.OPEN_FOLDER);
            handleWorkspaceFolderChoiceMock.mockResolvedValue(undefined);
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
            const addExtProjectGenSpy = jest.spyOn(subgenHelpers, 'addExtProjectGen').mockResolvedValue();

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
            expect(sendTelemetryMock).toHaveBeenCalledTimes(0);
            expect(executeCommandSpy).toHaveBeenCalledTimes(0);
            expect(showWorkspaceFolderWarningMock).toHaveBeenCalledTimes(0);
        });

        it('should call composeWith for FLP and Deploy sub-generators and generate a cloud project successfully', async () => {
            mockIsAppStudio.mockReturnValue(false);
            existsInWorkspaceMock.mockReturnValue(false);
            jest.spyOn(ConfigPrompter.prototype, 'isCloud', 'get').mockReturnValue(true);
            jest.spyOn(ConfigPrompter.prototype, 'baseAppInbounds', 'get').mockReturnValue(inbounds);
            jest.spyOn(Generator.prototype, 'composeWith').mockReturnValue([]);

            const addDeployGenSpy = jest.spyOn(subgenHelpers, 'addDeployGen').mockReturnValue();
            const addFlpGenSpy = jest.spyOn(subgenHelpers, 'addFlpGen').mockReturnValue();

            const runContext = yeomanTest
                .create(adpGenerator, { resolved: generatorPath }, { cwd: testOutputDir })
                .withOptions({ shouldInstallDeps: false, vscode: vscodeMock } as AdpGeneratorOptions)
                .withPrompts({ ...answers, addDeployConfig: true, addFlpConfig: true });

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
                    }
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
                    vscode: vscodeMock
                },
                expect.any(Function),
                expect.any(Object),
                expect.any(Object)
            );

            expect(executeCommandSpy).toHaveBeenCalledTimes(0);
            expect(showWorkspaceFolderWarningMock).toHaveBeenCalledTimes(1);
            expect(handleWorkspaceFolderChoiceMock).toHaveBeenCalledTimes(1);

            const generatedDirs = fs.readdirSync(testOutputDir);
            expect(generatedDirs).toContain(answers.projectName);
        });

        it('should generate an onPremise adaptation project successfully', async () => {
            mockIsAppStudio.mockReturnValue(false);

            const runContext = yeomanTest
                .create(adpGenerator, { resolved: generatorPath }, { cwd: testOutputDir })
                .withOptions({ shouldInstallDeps: true, vscode: vscodeMock } as AdpGeneratorOptions)
                .withPrompts(answers);

            await expect(runContext.run()).resolves.not.toThrow();

            expect(executeCommandSpy).toHaveBeenCalledTimes(1);

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

            expect(sendTelemetryMock).toHaveBeenCalledWith(
                EventName.ADAPTATION_PROJECT_CREATED,
                expect.objectContaining({
                    OperatingSystem: 'testOS',
                    Platform: 'testPlatform'
                }),
                projectFolder
            );
        });

        it('should create adaptation project from json correctly', async () => {
            // NOTE: This test uses .withArguments() which bypasses the normal yeoman prompting lifecycle and goes directly to the writing phase.
            // This can cause race conditions with other tests that use the same output directory, as the generator doesn't go through the standard prompting -> writing flow.
            // This test must be the last test in the file. Other tests below it must use a different output directory.
            const jsonInput: JsonInput = {
                system: 'urlA',
                username: 'user1',
                password: 'pass1',
                client: '010',
                application: 'sap.ui.demoapps.f1',
                projectName: 'my.app',
                namespace: 'customer.my.app',
                applicationTitle: 'My app title',
                targetFolder: testOutputDir
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
        });
    });

    describe('CF Environment', () => {
        const cfTestOutputDir = join(__dirname, 'test-output-cf');

        beforeEach(() => {
            fs.mkdirSync(cfTestOutputDir, { recursive: true });

            const mtaYamlSource = join(__dirname, 'fixtures', 'mta-project', 'mta.yaml');
            const mtaYamlTarget = join(cfTestOutputDir, 'mta.yaml');
            fs.copyFileSync(mtaYamlSource, mtaYamlTarget);

            mockIsAppStudio.mockReturnValue(true);
            jest.spyOn(Date, 'now').mockReturnValue(1234567890);
            mockIsInternalFeaturesSettingEnabled.mockReturnValue(true);
            isExtensionInstalledMock.mockReturnValue(true);
            isCfInstalledMock.mockResolvedValue(true);
            isLoggedInCfMock.mockResolvedValue(true);
            loadAppsMock.mockResolvedValue(apps);
            jest.spyOn(CFServicesPrompter.prototype, 'manifest', 'get').mockReturnValue(mockManifest);
            jest.spyOn(CFServicesPrompter.prototype, 'serviceInstanceGuid', 'get').mockReturnValue('test-guid');

            isCliMock.mockReturnValue(false);
            getDefaultProjectNameMock.mockReturnValue('app.variant1');
            getCredentialsFromStoreMock.mockResolvedValue(undefined);
            createServicesMock.mockResolvedValue(undefined);

            loadCfConfigMock.mockReturnValue(cfConfig);
            mockGetModuleNames.mockReturnValue(['module1', 'module2']);
            mockGetMtaServices.mockResolvedValue(['service1', 'service2']);
            mockGetApprouterType.mockReturnValue(AppRouterType.STANDALONE);
            mockHasApprouter.mockReturnValue(false);

            fetchPublicVersionsMock.mockResolvedValue(publicVersions);
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

            expect(executeCommandSpy).not.toHaveBeenCalled();
            expect(sendTelemetryMock).not.toHaveBeenCalled();

            const generatedDirs = fs.readdirSync(cfTestOutputDir);
            expect(generatedDirs).toContain(answers.projectName);
            const projectFolder = join(cfTestOutputDir, answers.projectName);

            const manifestPath = join(projectFolder, 'webapp', 'manifest.appdescr_variant');
            const i18nPath = join(projectFolder, 'webapp', 'i18n', 'i18n.properties');
            const ui5Yaml = join(projectFolder, 'ui5.yaml');
            const mtaYaml = join(cfTestOutputDir, 'mta.yaml');
            const packageJson = join(projectFolder, 'package.json');

            expect(fs.existsSync(manifestPath)).toBe(true);
            expect(fs.existsSync(i18nPath)).toBe(true);
            expect(fs.existsSync(ui5Yaml)).toBe(true);
            expect(fs.existsSync(mtaYaml)).toBe(true);
            expect(fs.existsSync(packageJson)).toBe(true);

            const manifestContent = fs.readFileSync(manifestPath, 'utf8');
            const i18nContent = fs.readFileSync(i18nPath, 'utf8');
            const ui5Content = fs.readFileSync(ui5Yaml, 'utf8');
            const mtaContent = fs.readFileSync(mtaYaml, 'utf8');
            const packageJsonContent = fs.readFileSync(packageJson, 'utf8');
            expect(manifestContent).toMatchSnapshot();
            expect(i18nContent).toMatchSnapshot();
            expect(ui5Content).toMatchSnapshot();
            expect(mtaContent).toMatchSnapshot();
            expect(packageJsonContent).toMatchSnapshot();
        });
    });
});
