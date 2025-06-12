import fs from 'fs';
import { join } from 'path';
import { rimraf } from 'rimraf';
import yeomanTest from 'yeoman-test';
import { exec } from 'child_process';
import Generator from 'yeoman-generator';

import {
    SourceManifest,
    SystemLookup,
    fetchPublicVersions,
    getConfiguredProvider,
    getProviderConfig,
    loadApps,
    validateUI5VersionExists
} from '@sap-ux/adp-tooling';
import * as Logger from '@sap-ux/logger';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import { getCredentialsFromStore } from '@sap-ux/system-access';
import { type AbapServiceProvider, AdaptationProjectType } from '@sap-ux/axios-extension';
import { getHostEnvironment, hostEnvironment, sendTelemetry } from '@sap-ux/fiori-generator-shared';
import type { AttributesAnswers, ConfigAnswers, Language, SourceApplication, VersionDetail } from '@sap-ux/adp-tooling';

import adpGenerator from '../src/app';
import { initI18n, t } from '../src/utils/i18n';
import type { JsonInput } from '../src/app/types';
import { EventName } from '../src/telemetryEvents';
import type { AdpGeneratorOptions } from '../src/app';
import * as subgenHelpers from '../src/utils/subgenHelpers';
import { ConfigPrompter } from '../src/app/questions/configuration';
import { getDefaultProjectName } from '../src/app/questions/helper/default-values';

jest.mock('@sap-ux/feature-toggle', () => ({
    isInternalFeaturesSettingEnabled: jest.fn().mockReturnValue(false)
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
    showExtensionProjectQuestion: jest.fn().mockReturnValue(true)
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
    fetchPublicVersions: jest.fn()
}));

jest.mock('../src/utils/deps.ts', () => ({
    ...jest.requireActual('../src/utils/deps.ts'),
    getPackageInfo: jest.fn().mockReturnValue({ name: '@sap-ux/generator-adp', version: 'mocked-version' })
}));

jest.mock('../src/utils/appWizardCache.ts');

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
    sendTelemetry: jest.fn().mockReturnValue(new Promise(() => {})),
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn().mockReturnValue({
            OperatingSystem: 'testOS',
            Platform: 'testPlatform'
        })
    },
    isExtensionInstalled: jest.fn().mockReturnValue(true),
    getHostEnvironment: jest.fn(),
    isCli: jest.fn().mockReturnValue(false),
    getDefaultTargetFolder: jest.fn().mockReturnValue(undefined)
}));

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('mocked-uuid')
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
const vscodeMock = {
    commands: {
        executeCommand: executeCommandSpy
    }
};

const loadAppsMock = loadApps as jest.Mock;
const execMock = exec as unknown as jest.Mock;
const mockIsAppStudio = isAppStudio as jest.Mock;
const getProviderConfigMock = getProviderConfig as jest.Mock;
const fetchPublicVersionsMock = fetchPublicVersions as jest.Mock;
const sendTelemetryMock = sendTelemetry as jest.Mock;
const getHostEnvironmentMock = getHostEnvironment as jest.Mock;
const getDefaultProjectNameMock = getDefaultProjectName as jest.Mock;
const getConfiguredProviderMock = getConfiguredProvider as jest.Mock;
const getCredentialsFromStoreMock = getCredentialsFromStore as jest.Mock;
const validateUI5VersionExistsMock = validateUI5VersionExists as jest.Mock;

describe('Adaptation Project Generator Integration Test', () => {
    jest.setTimeout(60000);

    beforeEach(() => {
        fs.mkdirSync(testOutputDir, { recursive: true });

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
        getHostEnvironmentMock.mockReturnValue(hostEnvironment.vscode);
        getProviderConfigMock.mockResolvedValue({ url: 'urlA', client: '010' });
        isAbapCloudMock.mockResolvedValue(false);
        getAtoInfoMock.mockResolvedValue({ operationsType: 'P' });

        getDefaultProjectNameMock.mockReturnValue('app.variant1');
        getCredentialsFromStoreMock.mockResolvedValue(undefined);

        fetchPublicVersionsMock.mockResolvedValue(publicVersions);
    });

    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        process.chdir(originalCwd);
        rimraf.sync(testOutputDir);
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
                    addDeployConfig: false,
                    namespace: 'customer.app.variant',
                    projectName: 'app.variant',
                    targetFolder: testOutputDir,
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
    });

    it('should call composeWith for FLP and Deploy sub-generators and generate a cloud project successfully', async () => {
        mockIsAppStudio.mockReturnValue(false);
        jest.spyOn(ConfigPrompter.prototype, 'isCloud', 'get').mockReturnValue(true);
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
                client: '010',
                connectedSystem: 'urlA',
                projectName: 'app.variant',
                targetFolder: testOutputDir
            },
            expect.any(Function),
            expect.any(Object),
            expect.any(Object)
        );

        expect(addFlpGenSpy).toHaveBeenCalledWith(
            {
                manifest: {
                    'sap.ui5': {
                        flexEnabled: true
                    }
                },
                projectRootPath: join(testOutputDir, answers.projectName),
                system: 'urlA'
            },
            expect.any(Function),
            expect.any(Object),
            expect.any(Object)
        );

        expect(executeCommandSpy).toHaveBeenCalledTimes(1);
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
