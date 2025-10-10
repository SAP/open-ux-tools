import {
    getModuleNames,
    getApprouterType,
    hasApprouter,
    isLoggedInCf,
    getMtaServices,
    getCfApps,
    AppRouterType,
    downloadAppContent,
    validateSmartTemplateApplication,
    validateODataEndpoints,
    getBusinessServiceKeys,
    cfServicesPromptNames
} from '@sap-ux/adp-tooling';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import type { CfConfig, CFApp, ServiceKeys, CfServicesAnswers } from '@sap-ux/adp-tooling';

import { initI18n, t } from '../../../src/utils/i18n';
import { CFServicesPrompter } from '../../../src/app/questions/cf-services';
import { validateBusinessSolutionName } from '../../../src/app/questions/helper/validators';
import { showBusinessSolutionNameQuestion } from '../../../src/app/questions/helper/conditions';
import { getAppRouterChoices, getCFAppChoices } from '../../../src/app/questions/helper/choices';

jest.mock('../../../src/app/questions/helper/validators', () => ({
    ...jest.requireActual('../../../src/app/questions/helper/validators'),
    validateBusinessSolutionName: jest.fn()
}));

jest.mock('../../../src/app/questions/helper/choices', () => ({
    ...jest.requireActual('../../../src/app/questions/helper/choices'),
    getAppRouterChoices: jest.fn(),
    getCFAppChoices: jest.fn()
}));

jest.mock('../../../src/app/questions/helper/conditions', () => ({
    ...jest.requireActual('../../../src/app/questions/helper/conditions'),
    showBusinessSolutionNameQuestion: jest.fn()
}));

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    getModuleNames: jest.fn(),
    getApprouterType: jest.fn(),
    hasApprouter: jest.fn(),
    isLoggedInCf: jest.fn(),
    getMtaServices: jest.fn(),
    getCfApps: jest.fn(),
    downloadAppContent: jest.fn(),
    validateSmartTemplateApplication: jest.fn(),
    validateODataEndpoints: jest.fn(),
    getBusinessServiceKeys: jest.fn()
}));

const mockValidateBusinessSolutionName = validateBusinessSolutionName as jest.MockedFunction<
    typeof validateBusinessSolutionName
>;
const mockGetAppRouterChoices = getAppRouterChoices as jest.MockedFunction<typeof getAppRouterChoices>;
const mockGetCFAppChoices = getCFAppChoices as jest.MockedFunction<typeof getCFAppChoices>;
const mockShowBusinessSolutionNameQuestion = showBusinessSolutionNameQuestion as jest.MockedFunction<
    typeof showBusinessSolutionNameQuestion
>;
const mockGetModuleNames = getModuleNames as jest.MockedFunction<typeof getModuleNames>;
const mockGetApprouterType = getApprouterType as jest.MockedFunction<typeof getApprouterType>;
const mockHasApprouter = hasApprouter as jest.MockedFunction<typeof hasApprouter>;
const mockIsLoggedInCf = isLoggedInCf as jest.MockedFunction<typeof isLoggedInCf>;
const mockGetMtaServices = getMtaServices as jest.MockedFunction<typeof getMtaServices>;
const mockGetCfApps = getCfApps as jest.MockedFunction<typeof getCfApps>;
const mockDownloadAppContent = downloadAppContent as jest.MockedFunction<typeof downloadAppContent>;
const mockValidateSmartTemplateApplication = validateSmartTemplateApplication as jest.MockedFunction<
    typeof validateSmartTemplateApplication
>;
const mockValidateODataEndpoints = validateODataEndpoints as jest.MockedFunction<typeof validateODataEndpoints>;
const mockGetBusinessServiceKeys = getBusinessServiceKeys as jest.MockedFunction<typeof getBusinessServiceKeys>;

const mockCfConfig: CfConfig = {
    org: { GUID: 'org-guid', Name: 'test-org' },
    space: { GUID: 'space-guid', Name: 'test-space' },
    token: 'test-token',
    url: '/test.cf.com'
};

const mockManifest: Manifest = {
    _version: '1.32.0',
    'sap.app': {
        id: 'test.app',
        title: 'Test App',
        type: 'application',
        applicationVersion: {
            version: '1.0.0'
        }
    },
    'sap.ui': {
        technology: 'UI5'
    }
} as Manifest;

const mockServiceKeys: ServiceKeys = {
    credentials: [
        {
            url: '/test.service.com',
            clientid: 'test-client',
            clientsecret: 'test-secret',
            uaa: {
                url: '/test.uaa.com',
                clientid: 'test-client',
                clientsecret: 'test-secret'
            },
            uri: '/test.service.com',
            endpoints: {
                'test-endpoint': '/test.endpoint.com'
            }
        }
    ],
    serviceInstance: {
        guid: 'test-instance-guid',
        name: 'test-instance'
    }
};

const mockCFApp: CFApp = {
    appId: 'test-app-id',
    appName: 'Test App',
    appVersion: '1.0.0',
    appHostId: 'test-host-id',
    serviceName: 'test-service',
    title: 'Test App Title'
};

describe('CFServicesPrompter', () => {
    const mockLogger: ToolsLogger = {
        log: jest.fn(),
        error: jest.fn()
    } as unknown as ToolsLogger;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getPrompts', () => {
        test('should return all prompts when no options provided', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockGetMtaServices.mockResolvedValue(['service1', 'service2']);

            const prompts = await prompter.getPrompts('/test/path', mockCfConfig);

            expect(prompts).toHaveLength(4);
            expect(prompts.map((p) => p.name)).toEqual([
                cfServicesPromptNames.approuter,
                cfServicesPromptNames.businessService,
                cfServicesPromptNames.businessSolutionName,
                cfServicesPromptNames.baseApp
            ]);
            expect(mockGetMtaServices).toHaveBeenCalledWith('/test/path', mockLogger);
        });

        test('should filter hidden prompts', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            const promptOptions = {
                [cfServicesPromptNames.approuter]: { hide: true },
                [cfServicesPromptNames.businessService]: { hide: false }
            };

            const prompts = await prompter.getPrompts('/test/path', mockCfConfig, promptOptions);

            expect(prompts).toHaveLength(3);
            expect(prompts.map((p) => p.name)).not.toContain(cfServicesPromptNames.approuter);
        });

        test('should not load business services when not logged in', async () => {
            const prompter = new CFServicesPrompter(false, false, mockLogger);

            await prompter.getPrompts('/test/path', mockCfConfig);

            expect(mockGetMtaServices).not.toHaveBeenCalled();
        });
    });

    describe('getBusinessSolutionNamePrompt', () => {
        const prompter = new CFServicesPrompter(false, true, mockLogger);

        test('should create business solution name prompt', () => {
            mockShowBusinessSolutionNameQuestion.mockReturnValue(true);
            mockValidateBusinessSolutionName.mockReturnValue(true);

            const prompt = prompter['getBusinessSolutionNamePrompt']();

            expect(prompt.type).toBe('input');
            expect(prompt.name).toBe(cfServicesPromptNames.businessSolutionName);
            expect(prompt.message).toBe(t('prompts.businessSolutionNameLabel'));
            expect((prompt as any).store).toBe(false);
            expect(prompt.guiOptions).toEqual({
                mandatory: true,
                hint: t('prompts.businessSolutionNameTooltip'),
                breadcrumb: t('prompts.businessSolutionBreadcrumb')
            });
        });

        test('should call showBusinessSolutionNameQuestion for when condition', () => {
            const answers = { businessService: 'test-service' };

            const prompt = prompter['getBusinessSolutionNamePrompt']();
            const whenFn = prompt.when as (answers: CfServicesAnswers) => boolean;
            whenFn(answers);

            expect(mockShowBusinessSolutionNameQuestion).toHaveBeenCalledWith(answers, true, false, 'test-service');
        });

        test('should call validateBusinessSolutionName for validation', () => {
            mockValidateBusinessSolutionName.mockReturnValue(true);

            const prompt = prompter['getBusinessSolutionNamePrompt']();
            const result = prompt.validate!('test-solution');

            expect(mockValidateBusinessSolutionName).toHaveBeenCalledWith('test-solution');
            expect(result).toBe(true);
        });
    });

    describe('getAppRouterPrompt', () => {
        beforeEach(() => {
            mockGetModuleNames.mockReturnValue(['module1', 'module2']);
        });

        test('should create approuter prompt', () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockHasApprouter.mockReturnValue(false);
            mockGetAppRouterChoices.mockReturnValue([
                { name: AppRouterType.STANDALONE, value: AppRouterType.STANDALONE },
                { name: AppRouterType.MANAGED, value: AppRouterType.MANAGED }
            ]);

            const prompt = prompter['getAppRouterPrompt'](
                '/test/path',
                mockCfConfig
            ) as ListQuestion<CfServicesAnswers>;

            expect(prompt.type).toBe('list');
            expect(prompt.name).toBe(cfServicesPromptNames.approuter);
            expect(prompt.message).toBe(t('prompts.approuterLabel'));
            expect(prompt.choices).toEqual([
                { name: AppRouterType.STANDALONE, value: AppRouterType.STANDALONE },
                { name: AppRouterType.MANAGED, value: AppRouterType.MANAGED }
            ]);
        });

        test('should set approuter type when router exists', () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockHasApprouter.mockReturnValue(true);
            mockGetApprouterType.mockReturnValue(AppRouterType.STANDALONE);

            const prompt = prompter['getAppRouterPrompt']('/test/path', mockCfConfig);
            const whenFn = prompt.when as () => boolean;
            whenFn();

            expect(mockGetApprouterType).toHaveBeenCalledWith('/test/path');
        });

        test('should show prompt when not logged in and no router', () => {
            const prompter = new CFServicesPrompter(false, false, mockLogger);
            mockHasApprouter.mockReturnValue(false);

            const prompt = prompter['getAppRouterPrompt']('/test/path', mockCfConfig);
            const whenFn = prompt.when as () => boolean;
            const shouldShow = whenFn();

            expect(shouldShow).toBe(false);
        });

        test('should show prompt when logged in and no router', () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockHasApprouter.mockReturnValue(false);

            const prompt = prompter['getAppRouterPrompt']('/test/path', mockCfConfig);
            const whenFn = prompt.when as () => boolean;
            const shouldShow = whenFn();

            expect(shouldShow).toBe(true);
            expect(prompter['showSolutionNamePrompt']).toBe(true);
        });

        test('should validate CF login status', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockIsLoggedInCf.mockResolvedValue(false);

            const prompt = prompter['getAppRouterPrompt']('/test/path', mockCfConfig);
            const result = await prompt.validate!('STANDALONE');

            expect(mockIsLoggedInCf).toHaveBeenCalledWith(mockCfConfig, mockLogger);
            expect(result).toBe(t('error.cfNotLoggedIn'));
        });

        test('should validate empty string', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockIsLoggedInCf.mockResolvedValue(true);

            const prompt = prompter['getAppRouterPrompt']('/test/path', mockCfConfig);
            const result = await prompt.validate!('');

            expect(result).toBe('The input cannot be empty.');
        });

        test('should return true for a valid approuter type', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockIsLoggedInCf.mockResolvedValue(true);

            const prompt = prompter['getAppRouterPrompt']('/test/path', mockCfConfig);
            const result = await prompt.validate!(AppRouterType.STANDALONE);

            expect(result).toBe(true);
        });
    });

    describe('getBaseAppPrompt', () => {
        const prompter = new CFServicesPrompter(false, true, mockLogger);

        test('should create base app prompt', () => {
            mockGetCFAppChoices.mockReturnValue([
                { name: 'App 1', value: mockCFApp },
                { name: 'App 2', value: mockCFApp }
            ]);

            const prompt = prompter['getBaseAppPrompt'](mockCfConfig);

            expect(prompt.type).toBe('list');
            expect(prompt.name).toBe(cfServicesPromptNames.baseApp);
            expect(prompt.message).toBe(t('prompts.baseAppLabel'));
        });

        test('should return choices for base apps', () => {
            const choices = [
                { name: 'App 1', value: mockCFApp },
                { name: 'App 2', value: mockCFApp }
            ];
            mockGetCFAppChoices.mockReturnValue(choices);

            const prompt = prompter['getBaseAppPrompt'](mockCfConfig) as ListQuestion<CfServicesAnswers>;
            const choicesFn = prompt.choices as (answers: CfServicesAnswers) => { name: string; value: CFApp }[];
            const result = choicesFn({ businessService: 'test-service' });

            expect(result).toBe(choices);
        });

        test('should validate app selection', async () => {
            mockDownloadAppContent.mockResolvedValue({
                entries: [],
                serviceInstanceGuid: 'test-guid',
                manifest: mockManifest
            });
            mockValidateSmartTemplateApplication.mockResolvedValue(undefined);
            mockValidateODataEndpoints.mockResolvedValue(undefined);

            prompter['businessServiceKeys'] = mockServiceKeys;

            const prompt = prompter['getBaseAppPrompt'](mockCfConfig);
            const result = await prompt.validate!(mockCFApp);

            expect(mockDownloadAppContent).toHaveBeenCalledWith(mockCfConfig.space.GUID, mockCFApp, mockLogger);
            expect(mockValidateSmartTemplateApplication).toHaveBeenCalledWith(mockManifest);
            expect(mockValidateODataEndpoints).toHaveBeenCalledWith([], mockServiceKeys.credentials, mockLogger);
            expect(result).toBe(true);
            expect(prompter['manifest']).toBe(mockManifest);
            expect(prompter['serviceInstanceGuid']).toBe('test-guid');
        });

        test('should return error when app is not selected', async () => {
            const prompt = prompter['getBaseAppPrompt'](mockCfConfig);
            const result = await prompt.validate!(null);

            expect(result).toBe(t('error.baseAppHasToBeSelected'));
        });

        test('should handle validation errors', async () => {
            const error = new Error('Validation failed');
            mockDownloadAppContent.mockRejectedValue(error);

            const prompt = prompter['getBaseAppPrompt'](mockCfConfig);
            const result = await prompt.validate!(mockCFApp);

            expect(result).toBe('Validation failed');
        });

        test('should show prompt when conditions are met', () => {
            prompter['apps'] = [mockCFApp];

            const prompt = prompter['getBaseAppPrompt'](mockCfConfig);
            const whenFn = prompt.when as (answers: CfServicesAnswers) => boolean;
            const shouldShow = whenFn({ businessService: 'test-service' });

            expect(shouldShow).toBe(true);
        });
    });

    describe('getBusinessServicesPrompt', () => {
        const prompter = new CFServicesPrompter(false, true, mockLogger);

        test('should create business services prompt', () => {
            prompter['businessServices'] = ['service1', 'service2'];

            const prompt = prompter['getBusinessServicesPrompt'](mockCfConfig) as ListQuestion<CfServicesAnswers>;

            expect(prompt.type).toBe('list');
            expect(prompt.name).toBe(cfServicesPromptNames.businessService);
            expect(prompt.message).toBe(t('prompts.businessServiceLabel'));
            expect(prompt.choices).toEqual(['service1', 'service2']);
        });

        test('should set default value when only one service', () => {
            prompter['businessServices'] = ['single-service'];

            const prompt = prompter['getBusinessServicesPrompt'](mockCfConfig) as ListQuestion<CfServicesAnswers>;
            const defaultValue = prompt.default({});

            expect(defaultValue).toBe('single-service');
        });

        test('should validate business service selection', async () => {
            mockGetBusinessServiceKeys.mockResolvedValue(mockServiceKeys);
            mockGetCfApps.mockResolvedValue([mockCFApp]);

            const prompt = prompter['getBusinessServicesPrompt'](mockCfConfig) as ListQuestion<CfServicesAnswers>;
            const result = await prompt.validate!('test-service');

            expect(mockGetBusinessServiceKeys).toHaveBeenCalledWith('test-service', mockCfConfig, mockLogger);
            expect(mockGetCfApps).toHaveBeenCalledWith(mockServiceKeys.credentials, mockCfConfig, mockLogger);
            expect(result).toBe(true);
        });

        test('should handle empty string for business service', async () => {
            mockGetBusinessServiceKeys.mockResolvedValue(null);

            const prompt = prompter['getBusinessServicesPrompt'](mockCfConfig);
            const result = await prompt.validate!('');

            expect(result).toBe(t('error.businessServiceHasToBeSelected'));
        });

        test('should handle business service not found', async () => {
            mockGetBusinessServiceKeys.mockResolvedValue(null);

            const prompt = prompter['getBusinessServicesPrompt'](mockCfConfig);
            const result = await prompt.validate!('test-service');

            expect(result).toBe(t('error.businessServiceDoesNotExist'));
        });

        test('should handle errors during validation', async () => {
            const error = new Error('Service error');
            mockGetBusinessServiceKeys.mockRejectedValue(error);

            const prompt = prompter['getBusinessServicesPrompt'](mockCfConfig);
            const result = await prompt.validate!('test-service');

            expect(result).toBe('Service error');
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to get available applications: Service error');
        });

        test('should show prompt when logged in and approuter selected', () => {
            prompter['approuter'] = AppRouterType.STANDALONE;

            const prompt = prompter['getBusinessServicesPrompt'](mockCfConfig) as ListQuestion<CfServicesAnswers>;
            const whenFn = prompt.when as (answers: CfServicesAnswers) => boolean;
            const shouldShow = whenFn({ approuter: AppRouterType.STANDALONE });

            expect(shouldShow).toBe(AppRouterType.STANDALONE);
        });
    });
});
