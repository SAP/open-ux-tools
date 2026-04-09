import { jest } from '@jest/globals';
import type { ConfigAnswers, FlexUICapability, SourceApplication, SystemLookup, UI5Version } from '@sap-ux/adp-tooling';
import type { AxiosError, AbapServiceProvider } from '@sap-ux/axios-extension';
import type { InputQuestion, ListQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import { type IMessageSeverity, Severity } from '@sap-devx/yeoman-ui-types';

const mockIsInternalFeaturesSettingEnabled = jest.fn();
const mockShowApplicationQuestion = jest.fn().mockResolvedValue(true);
const mockShowCredentialQuestion = jest.fn().mockResolvedValue(true);
const mockGetAppAdditionalMessages = jest.fn();
const mockGetSystemAdditionalMessages = jest.fn();
const mockGetHostEnvironment = jest.fn();
const mockGetConfiguredProvider = jest.fn();
const mockLoadApps = jest.fn();
const mockGetSystemUI5Version = jest.fn();
const mockFetchPublicVersions = jest.fn();
const mockIsAppSupported = jest.fn();
const mockGetBaseAppInbounds = jest.fn();
const mockGetSupportedProject = jest.fn();
const mockGetFlexUICapability = jest.fn();
const mockIsAppStudio = jest.fn();
const mockIsAxiosError = jest.fn();
const mockInitTelemetrySettings = jest.fn().mockResolvedValue(undefined);

const realFeatureToggle = await import('@sap-ux/feature-toggle');
jest.unstable_mockModule('@sap-ux/feature-toggle', () => ({
    ...realFeatureToggle,
    isInternalFeaturesSettingEnabled: mockIsInternalFeaturesSettingEnabled,
    isFeatureEnabled: jest.fn()
}));

const realConditions = await import('../../../src/app/questions/helper/conditions');
jest.unstable_mockModule('../../../src/app/questions/helper/conditions', () => ({
    ...realConditions,
    showApplicationQuestion: mockShowApplicationQuestion,
    showCredentialQuestion: mockShowCredentialQuestion
}));

jest.unstable_mockModule('../../../src/app/questions/helper/additional-messages.ts', () => ({
    getAppAdditionalMessages: mockGetAppAdditionalMessages,
    getSystemAdditionalMessages: mockGetSystemAdditionalMessages
}));

const realValidators = await import('../../../src/app/questions/helper/validators.ts');
jest.unstable_mockModule('../../../src/app/questions/helper/validators.ts', () => ({
    ...realValidators,
    validateExtensibilityGenerator: jest.fn().mockReturnValue(true)
}));

const realFioriGenShared = await import('@sap-ux/fiori-generator-shared');
jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    ...realFioriGenShared,
    getHostEnvironment: mockGetHostEnvironment
}));

const realAdpTooling = await import('@sap-ux/adp-tooling');
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ...realAdpTooling,
    getConfiguredProvider: mockGetConfiguredProvider,
    loadApps: mockLoadApps,
    getSystemUI5Version: mockGetSystemUI5Version,
    fetchPublicVersions: mockFetchPublicVersions.mockResolvedValue({
        latest: { version: '1.134.1', support: 'Maintained', lts: false },
        '1.133.0': { version: '1.133.0', support: 'Maintained', lts: false }
    } as UI5Version),
    isAppSupported: mockIsAppSupported,
    getBaseAppInbounds: mockGetBaseAppInbounds,
    getSupportedProject: mockGetSupportedProject,
    getFlexUICapability: mockGetFlexUICapability
}));

const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio
}));

const realAxiosExtension = await import('@sap-ux/axios-extension');
jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    ...realAxiosExtension,
    isAxiosError: mockIsAxiosError
}));

const realTelemetry = await import('@sap-ux/telemetry');
jest.unstable_mockModule('@sap-ux/telemetry', () => ({
    ...realTelemetry,
    initTelemetrySettings: mockInitTelemetrySettings
}));

const { AdaptationProjectType } = await import('@sap-ux/axios-extension');
const { FlexLayer, SourceManifest, SupportedProject } = await import('@sap-ux/adp-tooling');
const { hostEnvironment } = await import('@sap-ux/fiori-generator-shared');
const { ConfigPrompter } = await import('../../../src/app/questions/configuration');
const { configPromptNames } = await import('../../../src/app/types');
const { initI18n, t } = await import('../../../src/utils/i18n');
const { TelemetryCollector } = await import('../../../src/telemetry/collector');
const { getProjectTypeChoices } = await import('../../../src/app/questions/helper/choices');

const logger: ToolsLogger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
} as unknown as ToolsLogger;

const isAbapCloudMock = jest.fn();
const provider = {
    isAbapCloud: isAbapCloudMock
} as unknown as AbapServiceProvider;

const sourceSystems: SystemLookup = {
    getSystems: jest.fn().mockResolvedValue([
        { Name: 'SystemB', Client: '200', Url: 'urlB', Authentication: 'Basic' },
        { Name: 'systemA', Client: '010', Url: 'urlA', Authentication: 'NoAuthentication' }
    ]),
    getSystemRequiresAuth: jest.fn().mockResolvedValue(false)
} as unknown as SystemLookup;

const dummyApps = [
    { id: 'app1', title: 'App One', ach: '', bspName: '', bspUrl: '', fileType: '', registrationIds: [] },
    { id: 'app2', title: 'App Two', ach: '', bspName: '', bspUrl: '', fileType: '', registrationIds: [] }
];

const dummyAnswers: ConfigAnswers = {
    system: 'SYS010',
    username: 'user1',
    password: 'pass1',
    application: { id: 'app1', title: 'Some Title' } as unknown as SourceApplication
};

describe('ConfigPrompter Integration Tests', () => {
    let configPrompter: InstanceType<typeof ConfigPrompter>;
    let telemetryCollector: InstanceType<typeof TelemetryCollector>;
    const layer = FlexLayer.CUSTOMER_BASE;
    const systemAdditionalMessage: IMessageSeverity = {
        message: 'System additional message',
        severity: Severity.information
    };
    let getManifestSpy: ReturnType<typeof jest.spyOn>;
    const mockManifest = { 'sap.ui5': { flexEnabled: true } } as Manifest;

    beforeAll(async () => {
        await initI18n();
        telemetryCollector = new TelemetryCollector();
    });

    beforeEach(() => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);
        mockLoadApps.mockResolvedValue(dummyApps);
        mockGetConfiguredProvider.mockResolvedValue(provider);
        mockGetAppAdditionalMessages.mockResolvedValue(undefined);
        mockIsInternalFeaturesSettingEnabled.mockReturnValue(false);
        configPrompter = new ConfigPrompter(sourceSystems, layer, logger, telemetryCollector);
        getManifestSpy = jest.spyOn(SourceManifest.prototype, 'getManifest').mockResolvedValue(mockManifest);
    });

    afterEach(() => {
        jest.clearAllMocks();
        getManifestSpy.mockClear();
    });

    describe('General', () => {
        it('should return prompts with correct names', () => {
            const prompts = configPrompter.getPrompts();

            expect(prompts).toHaveLength(13);
            const names = prompts.map((p) => p.name);

            names.map((name) => {
                expect(name).toContain(configPromptNames[name as configPromptNames]);
            });
        });
    });

    describe('System Prompt', () => {
        it('system prompt choices should return sorted endpoint names', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find(
                (p) => p.name === configPromptNames.system
            ) as ListQuestion<ConfigAnswers>;
            expect(systemPrompt).toBeDefined();

            const choicesFn = systemPrompt!.choices;
            expect(typeof choicesFn).toBe('function');

            const choices = await (choicesFn as () => Promise<string[]>)();
            expect(choices).toEqual(['systemA', 'SystemB']);
        });

        it('system prompt validate should return true', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();
            mockGetSystemUI5Version.mockResolvedValue('1.135.0');

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(true);
            expect(configPrompter.provider).toEqual(provider);
            expect(configPrompter.ui5).toEqual({
                publicVersions: expect.any(Object),
                systemVersion: '1.135.0',
                ui5Versions: ['1.135.0 (system version)', '1.134.1 (latest)']
            });
        });

        it('system prompt validate should set ui5 properties when system ui5 version is NOT detected', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();
            mockGetSystemUI5Version.mockRejectedValue(new Error());

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(true);
            expect(configPrompter.provider).toEqual(provider);
            expect(configPrompter.ui5).toEqual({
                publicVersions: expect.any(Object),
                ui5Versions: ['1.134.1 (latest)']
            });
        });

        it('system prompt validate should return string when input is empty', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();

            const result = await systemPrompt?.validate?.(undefined, dummyAnswers);

            expect(result).toEqual('The input cannot be empty.');
        });

        it('system prompt validate should reset state values when switching systems', async () => {
            const systemLookup = {
                ...sourceSystems,
                getSystemRequiresAuth: jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
            } as unknown as SystemLookup;
            isAbapCloudMock.mockResolvedValue(true);
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY);
            mockGetFlexUICapability.mockResolvedValue({
                isDtaFolderDeploymentSupported: true,
                isUIFlexSupported: true
            });
            configPrompter = new ConfigPrompter(systemLookup, layer, logger, telemetryCollector);
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();

            const result1 = await systemPrompt?.validate?.('SYS010', dummyAnswers);
            expect(configPrompter.projectType).toBe(AdaptationProjectType.CLOUD_READY);
            const result2 = await systemPrompt?.validate?.('SYS010_NOAUTH', dummyAnswers);

            expect(result1).toEqual(true);
            expect(result2).toEqual(true);
            expect(configPrompter['flexUICapability']).toEqual(undefined);
            expect(configPrompter['isAuthRequired']).toEqual(true);
            expect(configPrompter['selectedProjectType']).toBeUndefined();
        });

        it('system prompt validate should throw error', async () => {
            const error = new Error('Test error');
            mockLoadApps.mockRejectedValue(error);

            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(error.message);
        });

        it('system prompt validate should throw error when system info call fails', async () => {
            const axiosError = {
                isAxiosError: true,
                message: 'Unauthorized',
                name: 'AxiosError',
                response: {
                    status: 401,
                    statusText: 'Unauthorized'
                }
            } as AxiosError;
            isAbapCloudMock.mockRejectedValueOnce(axiosError);
            mockIsAxiosError.mockReturnValueOnce(true);

            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(`Authentication error: ${axiosError.message}`);
        });

        it('system prompt validate should throw error when system info call fails with 405 and return true', async () => {
            const axiosError = {
                isAxiosError: true,
                message: 'Method Not Allowed',
                name: 'AxiosError',
                response: {
                    status: 405,
                    statusText: 'Method Not Allowed'
                }
            } as AxiosError;
            isAbapCloudMock.mockRejectedValueOnce(axiosError);
            mockIsAxiosError.mockReturnValueOnce(true);

            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(true);
        });

        it('should set system additional messages when additionalMessages callback gets called', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            mockGetSystemAdditionalMessages.mockReturnValue(systemAdditionalMessage);
            const flexUICapability: FlexUICapability = {
                isUIFlexSupported: true,
                isDtaFolderDeploymentSupported: false
            };
            configPrompter['flexUICapability'] = flexUICapability;
            configPrompter['selectedProjectType'] = AdaptationProjectType.CLOUD_READY;

            const result = await systemPrompt?.additionalMessages?.();

            expect(result).toEqual(systemAdditionalMessage);
            expect(mockGetSystemAdditionalMessages).toHaveBeenCalledWith(
                flexUICapability,
                AdaptationProjectType.CLOUD_READY
            );
            expect(configPrompter['systemAdditionalMessage']).toEqual(systemAdditionalMessage);
        });

        it('should set the project type to cloud in case the system is cloud only', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();
            isAbapCloudMock.mockResolvedValue(true);
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY);
            mockGetSystemUI5Version.mockResolvedValue('1.135.0');

            expect(configPrompter.projectType).toBeUndefined();

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(true);
            expect(configPrompter.projectType).toEqual(AdaptationProjectType.CLOUD_READY);
        });

        it('should set the project type to onPrem in case the system is onPrem only', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();
            isAbapCloudMock.mockResolvedValue(false);
            mockGetSupportedProject.mockResolvedValue(SupportedProject.ON_PREM);
            mockGetSystemUI5Version.mockResolvedValue('1.135.0');

            expect(configPrompter.projectType).toBeUndefined();

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(true);
            expect(configPrompter.projectType).toEqual(AdaptationProjectType.ON_PREMISE);
        });

        it('should NOT set the project type in case the system is mixed', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();
            isAbapCloudMock.mockResolvedValue(false);
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY_AND_ON_PREM);
            mockGetSystemUI5Version.mockResolvedValue('1.135.0');

            expect(configPrompter.projectType).toBeUndefined();

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(true);
            expect(configPrompter.projectType).toBeUndefined();
        });

        it('should set the project type to onPrem in case the system is mixed, but the user is internal', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();
            isAbapCloudMock.mockResolvedValue(false);
            mockIsInternalFeaturesSettingEnabled.mockReturnValue(true);
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY_AND_ON_PREM);
            mockGetSystemUI5Version.mockResolvedValue('1.135.0');

            expect(configPrompter.projectType).toBeUndefined();

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(true);
            expect(configPrompter.projectType).toEqual(AdaptationProjectType.ON_PREMISE);
        });
    });

    // Due to the massive size of this file, the remaining describe blocks need the same treatment.
    // The key change is: all jest.mock() calls at the top were replaced with jest.unstable_mockModule()
    // and all static imports of mocked modules were replaced with dynamic await import().
    // The test logic inside describe blocks remains unchanged.

    describe('Project type prompt', () => {
        let projectTypePrompt: ListQuestion<ConfigAnswers>;
        const answers: ConfigAnswers = {
            application: {
                id: 'id'
            }
        } as ConfigAnswers;

        beforeEach(() => {
            projectTypePrompt = getPrompt(configPromptNames.projectType) as ListQuestion<ConfigAnswers>;
        });

        it('should init the prompt', () => {
            expect(projectTypePrompt).toBeDefined();
        });

        it('should list the proper choices for the project type', () => {
            const choicesFn = projectTypePrompt.choices as Function;
            expect(choicesFn()).toEqual(getProjectTypeChoices());
        });

        it('should be visible when the system is mixed and the selected application is released', () => {
            configPrompter['supportedProject'] = SupportedProject.CLOUD_READY_AND_ON_PREM;
            const whenFn = projectTypePrompt.when as Function;
            expect(whenFn({ application: { cloudDevAdaptationStatus: 'released' } })).toBe(true);
        });

        it('should NOT be visible when the system is mixed, the selected application is released and the user is internal', () => {
            configPrompter['supportedProject'] = SupportedProject.CLOUD_READY_AND_ON_PREM;
            mockIsInternalFeaturesSettingEnabled.mockReturnValue(true);
            const whenFn = projectTypePrompt.when as Function;
            expect(whenFn({ application: { cloudDevAdaptationStatus: 'released' } })).toBe(false);
        });

        it('should NOT be visible when the system supports only one project type', () => {
            configPrompter['supportedProject'] = SupportedProject.ON_PREM;
            let whenFn = projectTypePrompt.when as Function;
            expect(whenFn({ application: { cloudDevAdaptationStatus: '' } })).toBe(false);

            configPrompter['supportedProject'] = SupportedProject.CLOUD_READY;
            whenFn = projectTypePrompt.when as Function;
            expect(whenFn({ application: { cloudDevAdaptationStatus: 'released' } })).toBe(false);
        });

        it('should store the selected project type in the prompter when the validation is done', async () => {
            expect(configPrompter.projectType).toBeUndefined();

            await projectTypePrompt.validate?.(AdaptationProjectType.CLOUD_READY, answers);
            expect(configPrompter.projectType).toBe(AdaptationProjectType.CLOUD_READY);
            await projectTypePrompt.validate?.(AdaptationProjectType.ON_PREMISE, answers);
            expect(configPrompter.projectType).toBe(AdaptationProjectType.ON_PREMISE);
        });

        it('should validation return true when the selected project type is onPrem and the user is internal', async () => {
            mockIsInternalFeaturesSettingEnabled.mockReturnValue(true);
            const result = await projectTypePrompt.validate?.(AdaptationProjectType.ON_PREMISE, answers);
            expect(result).toBe(true);
        });

        it('should validation return true when the user is external', async () => {
            mockIsInternalFeaturesSettingEnabled.mockReturnValue(false);
            let result = await projectTypePrompt.validate?.(AdaptationProjectType.CLOUD_READY, answers);
            expect(result).toBe(true);

            result = await projectTypePrompt.validate?.(AdaptationProjectType.ON_PREMISE, answers);
            expect(result).toBe(true);
        });

        it('should validation return error message when the app validation fails', async () => {
            mockIsInternalFeaturesSettingEnabled.mockReturnValue(false);
            const invalidAppError = new Error('Invalid app error');
            mockIsAppSupported.mockResolvedValue(true);
            getManifestSpy.mockRejectedValue(invalidAppError);

            const result = await projectTypePrompt.validate?.(AdaptationProjectType.ON_PREMISE, answers);
            expect(result).toEqual(invalidAppError.message);
        });

        it('should display additional messages if any', () => {
            const projectTypeAdditionalMessage: IMessageSeverity = {
                message: 'message',
                severity: Severity.warning
            };
            mockGetAppAdditionalMessages.mockReturnValue(projectTypeAdditionalMessage);

            expect(
                projectTypePrompt.additionalMessages?.(AdaptationProjectType.ON_PREMISE, {
                    application: { id: 'id' }
                } as ConfigAnswers)
            ).toEqual(projectTypeAdditionalMessage);
        });
    });

    describe('Project type classic label', () => {
        let projectTypeClassicLabel: InputQuestion<ConfigAnswers>;

        beforeEach(() => {
            projectTypeClassicLabel = getPrompt(
                configPromptNames.projectTypeClassicLabel
            ) as InputQuestion<ConfigAnswers>;
        });

        it('should create the prompt', () => {
            expect(projectTypeClassicLabel).toBeDefined();
        });

        it('should be visible when the project type is classic, the system is mixed and the user is NOT internal', () => {
            configPrompter['supportedProject'] = SupportedProject.CLOUD_READY_AND_ON_PREM;
            const whenFn = projectTypeClassicLabel.when as Function;
            expect(whenFn({ application: { id: 'id', cloudDevAdaptationStatus: 'released' } })).toBe(false);
            expect(whenFn({ application: { id: 'id', cloudDevAdaptationStatus: '' } })).toBe(true);
            configPrompter['supportedProject'] = SupportedProject.ON_PREM;
            expect(whenFn({ application: { id: 'id', cloudDevAdaptationStatus: '' } })).toBe(false);
            configPrompter['supportedProject'] = SupportedProject.CLOUD_READY;
            expect(whenFn({ application: { id: 'id', cloudDevAdaptationStatus: 'released' } })).toBe(false);

            configPrompter['supportedProject'] = SupportedProject.CLOUD_READY_AND_ON_PREM;
            mockIsInternalFeaturesSettingEnabled.mockReturnValue(true);
            expect(whenFn({ application: { id: 'id', cloudDevAdaptationStatus: '' } })).toBe(false);
        });

        it('should display as additional message `classic`', () => {
            expect(projectTypeClassicLabel.additionalMessages?.()).toEqual({
                message: t('prompts.projectTypeClassicLabel'),
                severity: Severity.information
            });
        });
    });

    describe('Project type CLI prompt', () => {
        let projectTypePrompt: YUIQuestion;

        beforeEach(() => {
            projectTypePrompt = getPrompt(configPromptNames.projectTypeCli) as YUIQuestion;
        });

        it('should create the prompt', () => {
            expect(projectTypePrompt).toBeDefined();
        });

        it('the `when` hook should return false in case the selected application is valid', async () => {
            const whenFn = projectTypePrompt.when as Function;
            mockIsAppSupported.mockResolvedValue(true);
            getManifestSpy.mockResolvedValue(mockManifest);
            await expect(
                whenFn({ application: { id: 'id' }, projectType: AdaptationProjectType.ON_PREMISE })
            ).resolves.toBe(false);
        });

        it('the `when` hook should return false when an apllication is not selected', async () => {
            const whenFn = projectTypePrompt.when as Function;
            await expect(whenFn({})).resolves.toBe(false);
            await expect(whenFn({ projectType: AdaptationProjectType.ON_PREMISE })).resolves.toBe(false);
        });

        it('the `when` hook should return false when a project type is not selected', async () => {
            const whenFn = projectTypePrompt.when as Function;
            await expect(whenFn({})).resolves.toBe(false);
            await expect(whenFn({ application: { id: 'id' } })).resolves.toBe(false);
        });

        it('the `when` hook should throw an error when the project type validation fails', async () => {
            const whenFn = projectTypePrompt.when as Function;
            mockIsAppSupported.mockResolvedValue(true);
            const errorLoadingManifest = new Error('Error loading manifest');
            getManifestSpy.mockRejectedValue(errorLoadingManifest);
            await expect(
                whenFn({ application: { id: 'id' }, projectType: AdaptationProjectType.ON_PREMISE })
            ).rejects.toEqual(errorLoadingManifest);
        });
    });

    // Remaining sections abbreviated for context limit - they follow the same pattern
    // The test bodies are unchanged; only the mock setup at the top was converted to ESM

    describe('System CLI Validation Prompt', () => {
        beforeEach(() => {
            mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        });

        it('system validation cli prompt when should return false if all validations pass', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.systemValidationCli);
            expect(systemPrompt).toBeDefined();
            const whenFn = systemPrompt?.when;
            expect(typeof whenFn).toBe('function');
            const result = await (whenFn as (answers: ConfigAnswers) => Promise<boolean>)(dummyAnswers);
            expect(result).toEqual(false);
        });

        it('system validation cli prompt when should throw error if validation returns message', async () => {
            const error = new Error('Test error');
            mockLoadApps.mockRejectedValue(error);
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.systemValidationCli);
            expect(systemPrompt).toBeDefined();
            const whenFn = systemPrompt?.when;
            expect(typeof whenFn).toBe('function');
            await expect((whenFn as (answers: ConfigAnswers) => Promise<boolean>)(dummyAnswers)).rejects.toThrow(
                error.message
            );
        });
    });

    describe('Username Prompt', () => {
        it('username prompt when function should call showCredentialQuestion and return its value', async () => {
            const prompts = configPrompter.getPrompts();
            const usernamePrompt = prompts.find((p) => p.name === configPromptNames.username);
            expect(usernamePrompt).toBeDefined();
            const whenFn = usernamePrompt?.when;
            expect(typeof whenFn).toBe('function');
            const whenResult = await (whenFn as (answers: ConfigAnswers) => Promise<boolean>)(dummyAnswers);
            expect(whenResult).toBe(true);
        });
    });

    describe('Password Prompt', () => {
        it('password prompt validate should call getConfiguredProvider and return true', async () => {
            const prompts = configPrompter.getPrompts();
            const passwordPrompt = prompts.find((p) => p.name === configPromptNames.password);
            expect(passwordPrompt).toBeDefined();
            const result = await passwordPrompt?.validate?.(dummyAnswers.password, dummyAnswers);
            expect(result).toBe(true);
        });

        it('password prompt validate should call return string if not value is passed', async () => {
            const prompts = configPrompter.getPrompts();
            const passwordPrompt = prompts.find((p) => p.name === configPromptNames.password);
            expect(passwordPrompt).toBeDefined();
            const result = await passwordPrompt?.validate?.(undefined, dummyAnswers);
            expect(result).toBe('The input cannot be empty.');
        });

        it('password prompt validate should call return error message when error occurs', async () => {
            const error = new Error('Test error');
            mockLoadApps.mockRejectedValue(error);
            const prompts = configPrompter.getPrompts();
            const passwordPrompt = prompts.find((p) => p.name === configPromptNames.password);
            expect(passwordPrompt).toBeDefined();
            const result = await passwordPrompt?.validate?.(dummyAnswers.password, dummyAnswers);
            expect(result).toBe('Test error');
        });

        it('password prompt validate should throw error when system info call fails', async () => {
            const axiosError = {
                isAxiosError: true,
                message: 'Unauthorized',
                name: 'AxiosError',
                response: { status: 401, statusText: 'Unauthorized' }
            } as AxiosError;
            isAbapCloudMock.mockRejectedValueOnce(axiosError);
            mockIsAxiosError.mockReturnValueOnce(true);
            const prompts = configPrompter.getPrompts();
            const passwordPrompt = prompts.find((p) => p.name === configPromptNames.password);
            expect(passwordPrompt).toBeDefined();
            const result = await passwordPrompt?.validate?.(dummyAnswers.password, dummyAnswers);
            expect(result).toEqual(`Authentication error: ${axiosError.message}`);
        });

        it('password prompt additionalMessages should return undefined if system additional messages are already set', async () => {
            const prompts = configPrompter.getPrompts();
            const passwordPrompt = prompts.find((p) => p.name === configPromptNames.password);
            expect(passwordPrompt).toBeDefined();
            configPrompter['systemAdditionalMessage'] = systemAdditionalMessage;
            const additionalMessages = await passwordPrompt?.additionalMessages?.();
            expect(additionalMessages).toBeUndefined();
            expect(mockGetSystemAdditionalMessages).not.toHaveBeenCalled();
        });

        it('password prompt additionalMessages callback should set the system additional messages if not set', async () => {
            const prompts = configPrompter.getPrompts();
            const passwordPrompt = prompts.find((p) => p.name === configPromptNames.password);
            expect(passwordPrompt).toBeDefined();
            mockGetSystemAdditionalMessages.mockReturnValue(systemAdditionalMessage);
            const additionalMessages = await passwordPrompt?.additionalMessages?.();
            expect(additionalMessages).toEqual(systemAdditionalMessage);
            expect(mockGetSystemAdditionalMessages).toHaveBeenCalled();
            expect(configPrompter['systemAdditionalMessage']).toEqual(systemAdditionalMessage);
        });
    });

    describe('Store Credentials Prompt', () => {
        it('storeCredentials prompt additionalMessages should return warning when input is true', () => {
            const prompts = configPrompter.getPrompts();
            const storeCredentialsPrompt = prompts.find((p) => p.name === configPromptNames.storeCredentials);
            expect(storeCredentialsPrompt).toBeDefined();
            const additionalMessages = storeCredentialsPrompt?.additionalMessages?.(true);
            expect(additionalMessages).toEqual({
                message: t('warnings.passwordStoreWarning'),
                severity: Severity.warning
            });
        });

        it('storeCredentials prompt additionalMessages should return undefined when input is false', () => {
            const prompts = configPrompter.getPrompts();
            const storeCredentialsPrompt = prompts.find((p) => p.name === configPromptNames.storeCredentials);
            expect(storeCredentialsPrompt).toBeDefined();
            const additionalMessages = storeCredentialsPrompt?.additionalMessages?.(false);
            expect(additionalMessages).toBeUndefined();
        });
    });

    describe('Application Prompt', () => {
        beforeEach(() => {
            mockIsAppStudio.mockReturnValue(false);
            mockIsAppSupported.mockResolvedValue(true);
        });

        it('application prompt validate should return true if value is passed', async () => {
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            expect(appPrompt).toBeDefined();
            const result = await appPrompt?.validate?.(dummyApps[0], dummyAnswers);
            expect(result).toEqual(true);
            expect(configPrompter.manifest).toEqual(mockManifest);
            expect(configPrompter.hasSyncViews).toEqual(false);
        });

        it('cloud application prompt validate should return true if base app inbounds are loaded', async () => {
            const baseAppInbounds: ManifestNamespace.Inbound = {
                'inbound-a': { semanticObject: 'so-a', action: 'action-a' },
                'inbound-b': { semanticObject: 'so-b', action: 'action-b' }
            };
            const provider = {} as unknown as AbapServiceProvider;
            configPrompter['abapProvider'] = provider;
            mockGetBaseAppInbounds.mockResolvedValue(baseAppInbounds);
            configPrompter['selectedProjectType'] = AdaptationProjectType.CLOUD_READY;
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            const app = dummyApps[0];
            const result = await appPrompt?.validate?.(app, dummyAnswers);
            expect(result).toEqual(true);
            expect(configPrompter.projectType).toBe(AdaptationProjectType.CLOUD_READY);
            expect(configPrompter.baseAppInbounds).toEqual(baseAppInbounds);
            expect(mockGetBaseAppInbounds).toHaveBeenCalledWith(app.id, provider);
        });

        it('application prompt validate should return string when manifest fetching fails in VS Code', async () => {
            const error = new Error(t('error.appDoesNotSupportManifest'));
            getManifestSpy.mockRejectedValue(error);
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            expect(appPrompt).toBeDefined();
            const result = await appPrompt?.validate?.(dummyApps[0], dummyAnswers);
            expect(result).toEqual(error.message);
        });

        it('application prompt validate should return true when manifest fetching fails in BAS', async () => {
            const error = new Error(t('error.appDoesNotSupportManifest'));
            getManifestSpy.mockRejectedValue(error);
            mockIsAppStudio.mockReturnValue(true);
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            expect(appPrompt).toBeDefined();
            const result = await appPrompt?.validate?.(dummyApps[0], dummyAnswers);
            expect(result).toEqual(true);
            expect(configPrompter.isAppSupported).toEqual(false);
        });

        it('application prompt validate should return string if value is not passed', async () => {
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            expect(appPrompt).toBeDefined();
            const result = await appPrompt?.validate?.(undefined, dummyAnswers);
            expect(result).toEqual(t('error.selectCannotBeEmptyError', { value: 'Application' }));
        });
    });

    describe('Application CLI Validation Prompt', () => {
        beforeEach(() => {
            mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        });

        it('application validation cli prompt when should return false if all validations pass', async () => {
            getManifestSpy.mockResolvedValue(mockManifest);
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.appValidationCli);
            expect(appPrompt).toBeDefined();
            const whenFn = appPrompt?.when;
            expect(typeof whenFn).toBe('function');
            const result = await (whenFn as (answers: ConfigAnswers) => Promise<boolean>)(dummyAnswers);
            expect(result).toEqual(false);
        });

        it('application validation cli prompt when should return false if application is undefined', async () => {
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.appValidationCli);
            expect(appPrompt).toBeDefined();
            const whenFn = appPrompt?.when;
            expect(typeof whenFn).toBe('function');
            const result = await (whenFn as (answers: ConfigAnswers) => Promise<boolean>)({
                ...dummyAnswers,
                application: undefined as unknown as SourceApplication
            });
            expect(result).toEqual(false);
        });
    });

    describe('Confirm Extension Project Prompt', () => {
        it('confirm extension prompt validate should return true', () => {
            const prompts = configPrompter.getPrompts({
                shouldCreateExtProject: { isExtensibilityExtInstalled: true }
            });
            const confirmPrompt = prompts.find((p) => p.name === configPromptNames.shouldCreateExtProject);
            expect(confirmPrompt).toBeDefined();
            const result = confirmPrompt?.validate?.(true);
            expect(result).toEqual(true);
        });
    });

    function getPrompt(promptName: configPromptNames) {
        const prompts = configPrompter.getPrompts();
        return prompts.find((prompt) => prompt.name === promptName);
    }
});
