import type {
    ConfigAnswers,
    FlexUISupportedSystem,
    SourceApplication,
    SystemLookup,
    UI5Version
} from '@sap-ux/adp-tooling';
import {
    FlexLayer,
    SourceManifest,
    getBaseAppInbounds,
    getConfiguredProvider,
    isAppSupported,
    loadApps
} from '@sap-ux/adp-tooling';
import type { AxiosError } from '@sap-ux/axios-extension';
import { isAxiosError, type AbapServiceProvider } from '@sap-ux/axios-extension';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import { isAppStudio } from '@sap-ux/btp-utils';
import type { ManifestNamespace } from '@sap-ux/project-access';
import { ConfigPrompter } from '../../../src/app/questions/configuration';
import { configPromptNames } from '../../../src/app/types';
import { initI18n, t } from '../../../src/utils/i18n';
import { getSystemAdditionalMessages } from '../../../src/app/questions/helper/additional-messages';
import { type IMessageSeverity, Severity } from '@sap-devx/yeoman-ui-types';

jest.mock('../../../src/app/questions/helper/conditions', () => ({
    showApplicationQuestion: jest.fn().mockResolvedValue(true),
    showCredentialQuestion: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../src/app/questions/helper/additional-messages.ts', () => ({
    getAppAdditionalMessages: jest.fn().mockResolvedValue(undefined),
    getSystemAdditionalMessages: jest.fn()
}));

jest.mock('../../../src/app/questions/helper/validators.ts', () => ({
    ...jest.requireActual('../../../src/app/questions/helper/validators.ts'),
    validateExtensibilityGenerator: jest.fn().mockReturnValue(true)
}));

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
    getHostEnvironment: jest.fn()
}));

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    getConfiguredProvider: jest.fn(),
    loadApps: jest.fn(),
    getSystemUI5Version: jest.fn().mockResolvedValue('1.135.0'),
    fetchPublicVersions: jest.fn().mockResolvedValue({
        latest: { version: '1.134.1', support: 'Maintained', lts: false },
        '1.133.0': { version: '1.133.0', support: 'Maintained', lts: false }
    } as UI5Version),
    isAppSupported: jest.fn(),
    getBaseAppInbounds: jest.fn()
}));

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

jest.mock('@sap-ux/axios-extension', () => ({
    ...jest.requireActual('@sap-ux/axios-extension'),
    isAxiosError: jest.fn()
}));

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

const loadAppsMock = loadApps as jest.Mock;
const mockIsAppStudio = isAppStudio as jest.Mock;
const isAppSupportedMock = isAppSupported as jest.Mock;
const isAxiosErrorMock = isAxiosError as unknown as jest.Mock;
const getHostEnvironmentMock = getHostEnvironment as jest.Mock;
const getConfiguredProviderMock = getConfiguredProvider as jest.Mock;
const getBaseAppInboundsMock = getBaseAppInbounds as jest.Mock;
const getSystemAdditionalMessagesMock = getSystemAdditionalMessages as jest.Mock;

describe('ConfigPrompter Integration Tests', () => {
    let configPrompter: ConfigPrompter;
    const layer = FlexLayer.CUSTOMER_BASE;
    const systemAdditionalMessage: IMessageSeverity = {
        message: 'System additional message',
        severity: Severity.information
    };

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        getHostEnvironmentMock.mockReturnValue(hostEnvironment.vscode);
        loadAppsMock.mockResolvedValue(dummyApps);
        getConfiguredProviderMock.mockResolvedValue(provider);
        configPrompter = new ConfigPrompter(sourceSystems, layer, logger);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('General', () => {
        it('should return four prompts with correct names', () => {
            const prompts = configPrompter.getPrompts();

            expect(prompts).toHaveLength(9);
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

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(true);
            expect(configPrompter.provider).toEqual(provider);
            expect(configPrompter.ui5).toEqual({
                publicVersions: expect.any(Object),
                systemVersion: '1.135.0',
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
            configPrompter = new ConfigPrompter(systemLookup, layer, logger);
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();

            const result1 = await systemPrompt?.validate?.('SYS010', dummyAnswers);
            expect(configPrompter['isCloudProject']).toBe(true);
            const result2 = await systemPrompt?.validate?.('SYS010_NOAUTH', dummyAnswers);

            expect(result1).toEqual(true);
            expect(result2).toEqual(true);
            expect(configPrompter['flexUISystem']).toEqual(undefined);
            expect(configPrompter['isAuthRequired']).toEqual(true);
            expect(configPrompter['isCloudProject']).toBeUndefined();
        });

        it('system prompt validate should throw error', async () => {
            const error = new Error('Test error');
            loadAppsMock.mockRejectedValue(error);

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
            isAxiosErrorMock.mockReturnValueOnce(true);

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
            isAxiosErrorMock.mockReturnValueOnce(true);

            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(true);
        });

        it('should set system additional messages when additionalMessages callback gets called', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            getSystemAdditionalMessagesMock.mockReturnValue(systemAdditionalMessage);
            const flexUISystem: FlexUISupportedSystem = {
                isUIFlex: true,
                isOnPremise: false
            };
            configPrompter['flexUISystem'] = flexUISystem;
            configPrompter['isCloudProject'] = true;

            const result = await systemPrompt?.additionalMessages?.();

            expect(result).toEqual(systemAdditionalMessage);
            expect(getSystemAdditionalMessagesMock).toHaveBeenCalledWith(flexUISystem, true);
            expect(configPrompter['systemAdditionalMessage']).toEqual(systemAdditionalMessage);
        });
    });

    describe('System CLI Validation Prompt', () => {
        beforeEach(() => {
            getHostEnvironmentMock.mockReturnValue(hostEnvironment.cli);
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
            loadAppsMock.mockRejectedValue(error);

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
            loadAppsMock.mockRejectedValue(error);

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
                response: {
                    status: 401,
                    statusText: 'Unauthorized'
                }
            } as AxiosError;
            isAbapCloudMock.mockRejectedValueOnce(axiosError);
            isAxiosErrorMock.mockReturnValueOnce(true);

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
            expect(getSystemAdditionalMessagesMock).not.toHaveBeenCalled();
        });

        it('password prompt additionalMessages callback should set the system additional messages if not set', async () => {
            const prompts = configPrompter.getPrompts();
            const passwordPrompt = prompts.find((p) => p.name === configPromptNames.password);
            expect(passwordPrompt).toBeDefined();
            getSystemAdditionalMessagesMock.mockReturnValue(systemAdditionalMessage);

            const additionalMessages = await passwordPrompt?.additionalMessages?.();

            expect(additionalMessages).toEqual(systemAdditionalMessage);
            expect(getSystemAdditionalMessagesMock).toHaveBeenCalled();
            expect(configPrompter['systemAdditionalMessage']).toEqual(systemAdditionalMessage);
        });
    });

    describe('Application Prompt', () => {
        let getManifestSpy: jest.SpyInstance;
        const mockManifest = { 'sap.ui5': { flexEnabled: true } } as Manifest;

        beforeEach(() => {
            mockIsAppStudio.mockReturnValue(false);
            isAppSupportedMock.mockResolvedValue(true);
            getManifestSpy = jest.spyOn(SourceManifest.prototype, 'getManifest').mockResolvedValue(mockManifest);
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
                'inbound-a': {
                    semanticObject: 'so-a',
                    action: 'action-a'
                },
                'inbound-b': {
                    semanticObject: 'so-b',
                    action: 'action-b'
                }
            };
            configPrompter['isCloudProject'] = true;
            const provider = {} as unknown as AbapServiceProvider;
            configPrompter['abapProvider'] = provider;
            getBaseAppInboundsMock.mockResolvedValue(baseAppInbounds);

            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            const app = dummyApps[0];
            const result = await appPrompt?.validate?.(app, dummyAnswers);

            expect(result).toEqual(true);
            expect(configPrompter.isCloud).toBe(true);
            expect(configPrompter.baseAppInbounds).toEqual(baseAppInbounds);

            expect(getBaseAppInboundsMock).toHaveBeenCalledWith(app.id, provider);
        });

        it('cloud application prompt validate should return error message if base app inbounds api call fails', async () => {
            const baseAppInboundsError = new Error('Failed to load app inbounds.');
            configPrompter['isCloudProject'] = true;
            const provider = {} as unknown as AbapServiceProvider;
            configPrompter['abapProvider'] = provider;
            getBaseAppInboundsMock.mockRejectedValue(baseAppInboundsError);

            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            const app = dummyApps[0];
            const result = await appPrompt?.validate?.(app, dummyAnswers);

            expect(result).toEqual(t('error.fetchBaseInboundsFailed', { error: baseAppInboundsError.message }));
            expect(configPrompter.isCloud).toBe(true);
            expect(configPrompter.baseAppInbounds).toBeUndefined();

            expect(getBaseAppInboundsMock).toHaveBeenCalledWith(app.id, provider);
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

        it('application prompt validate should return string when manifest fetching fails in BAS', async () => {
            const error = new Error('Test error');
            getManifestSpy.mockRejectedValue(error);
            mockIsAppStudio.mockReturnValue(true);

            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            expect(appPrompt).toBeDefined();

            const result = await appPrompt?.validate?.(dummyApps[0], dummyAnswers);

            expect(result).toEqual(error.message);
        });

        it('application prompt validate should return string when manifest is not found', async () => {
            getManifestSpy.mockResolvedValue(undefined);
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            expect(appPrompt).toBeDefined();

            const result = await appPrompt?.validate?.(dummyApps[0], dummyAnswers);

            expect(result).toEqual(t('error.manifestCouldNotBeValidated'));
        });

        it('application prompt validate should return string when  application does NOT support adaptation and the project is cloud', async () => {
            const error = new Error(t('error.appDoesNotSupportManifest'));
            getManifestSpy.mockRejectedValue(error);
            mockIsAppStudio.mockReturnValue(true);
            configPrompter['isCloudProject'] = true;
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            expect(appPrompt).toBeDefined();

            const result = await appPrompt?.validate?.(dummyApps[0], dummyAnswers);

            const errorMessage = error.message;
            expect(errorMessage).toBeTruthy();
            expect(result).toEqual(errorMessage);
        });

        it('application prompt validate should return string when manifest flexEnabled is false', async () => {
            getManifestSpy.mockResolvedValue({ 'sap.ui5': { flexEnabled: false } });
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            expect(appPrompt).toBeDefined();

            const result = await appPrompt?.validate?.(dummyApps[0], dummyAnswers);

            expect(result).toEqual(t('error.appDoesNotSupportFlexibility'));
        });

        it('application prompt validate should return string if value is not passed', async () => {
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            expect(appPrompt).toBeDefined();

            const result = await appPrompt?.validate?.(undefined, dummyAnswers);
            expect(result).toEqual(t('error.selectCannotBeEmptyError', { value: 'Application' }));
        });

        it('application prompt additionalMessages should return undefined if value is passed', async () => {
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            expect(appPrompt).toBeDefined();

            const result = await appPrompt?.additionalMessages?.(dummyApps[0]);

            expect(result).toEqual(undefined);
        });
    });

    describe('Application CLI Validation Prompt', () => {
        beforeEach(() => {
            getHostEnvironmentMock.mockReturnValue(hostEnvironment.cli);
        });

        it('application validation cli prompt when should return false if all validations pass', async () => {
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

        it('application validation cli prompt when should return false if manifest fetching fails', async () => {
            isAppSupportedMock.mockResolvedValue(true);
            const error = new Error('Test error');
            jest.spyOn(SourceManifest.prototype, 'getManifest').mockRejectedValue(error);

            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.appValidationCli);
            expect(appPrompt).toBeDefined();

            const whenFn = appPrompt?.when;
            expect(typeof whenFn).toBe('function');

            await expect((whenFn as (answers: ConfigAnswers) => Promise<boolean>)(dummyAnswers)).rejects.toThrow(
                error.message
            );
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
});
