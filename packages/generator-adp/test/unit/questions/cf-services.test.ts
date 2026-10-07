import { jest } from '@jest/globals';
import { Severity } from '@sap-devx/yeoman-ui-types';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import type { InputQuestion, ListQuestion } from '@sap-ux/inquirer-common';
import type { CfConfig, CFApp, ServiceInfo, CfServicesAnswers, CfServiceInstanceChoice } from '@sap-ux/adp-tooling';

const mockValidateBusinessSolutionName = jest.fn<typeof realValidators.validateBusinessSolutionName>();
const mockGetAppRouterChoices = jest.fn<typeof realChoices.getAppRouterChoices>();
const mockGetCFAppChoices = jest.fn<typeof realChoices.getCFAppChoices>();
const mockGetServiceInstanceChoices = jest.fn<typeof realChoices.getServiceInstanceChoices>();
const mockShowBusinessSolutionNameQuestion = jest.fn<typeof realConditions.showBusinessSolutionNameQuestion>();
const mockGetModuleNames = jest.fn<typeof realAdpTooling.getModuleNames>();
const mockGetApprouterType = jest.fn<typeof realAdpTooling.getApprouterType>();
const mockHasApprouter = jest.fn<typeof realAdpTooling.hasApprouter>();
const mockIsLoggedInCf = jest.fn<typeof realAdpTooling.isLoggedInCf>();
const mockGetMtaServices = jest.fn<typeof realAdpTooling.getMtaServices>();
const mockGetAdpServiceInstances = jest.fn<typeof realAdpTooling.getAdpServiceInstances>();
const mockGetCfApps = jest.fn<typeof realAdpTooling.getCfApps>();
const mockDownloadAppContent = jest.fn<typeof realAdpTooling.downloadAppContent>();
const mockValidateSmartTemplateApplication = jest.fn<typeof realAdpTooling.validateSmartTemplateApplication>();
const mockValidateODataEndpoints = jest.fn<typeof realAdpTooling.validateODataEndpoints>();
const mockGetBusinessServiceInfo = jest.fn<typeof realAdpTooling.getBusinessServiceInfo>();

const realValidators = await import('../../../src/app/questions/helper/validators.js');
jest.unstable_mockModule('../../../src/app/questions/helper/validators', () => ({
    ...realValidators,
    validateBusinessSolutionName: mockValidateBusinessSolutionName
}));

const realChoices = await import('../../../src/app/questions/helper/choices.js');
jest.unstable_mockModule('../../../src/app/questions/helper/choices', () => ({
    ...realChoices,
    getAppRouterChoices: mockGetAppRouterChoices,
    getCFAppChoices: mockGetCFAppChoices,
    getServiceInstanceChoices: mockGetServiceInstanceChoices
}));

const realConditions = await import('../../../src/app/questions/helper/conditions.js');
jest.unstable_mockModule('../../../src/app/questions/helper/conditions', () => ({
    ...realConditions,
    showBusinessSolutionNameQuestion: mockShowBusinessSolutionNameQuestion
}));

const realAdpTooling = await import('@sap-ux/adp-tooling');
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ...realAdpTooling,
    getModuleNames: mockGetModuleNames,
    getApprouterType: mockGetApprouterType,
    hasApprouter: mockHasApprouter,
    isLoggedInCf: mockIsLoggedInCf,
    getMtaServices: mockGetMtaServices,
    getAdpServiceInstances: mockGetAdpServiceInstances,
    getCfApps: mockGetCfApps,
    downloadAppContent: mockDownloadAppContent,
    validateSmartTemplateApplication: mockValidateSmartTemplateApplication,
    validateODataEndpoints: mockValidateODataEndpoints,
    getBusinessServiceInfo: mockGetBusinessServiceInfo
}));

const { AppRouterType, cfServicesPromptNames } = await import('@sap-ux/adp-tooling');
const { initI18n, t } = await import('../../../src/utils/i18n.js');
const { CFServicesPrompter } = await import('../../../src/app/questions/cf-services.js');

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

const mockServiceKeys: ServiceInfo = {
    serviceKeys: [
        {
            credentials: {
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
        mockGetAdpServiceInstances.mockResolvedValue([]);
    });

    describe('getPrompts', () => {
        test('should return all prompts when no options provided', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockGetMtaServices.mockResolvedValue(['service1', 'service2']);

            const prompts = await prompter.getPrompts('/test/path', mockCfConfig);

            expect(prompts).toHaveLength(5);
            expect(prompts.map((p) => p.name)).toEqual([
                cfServicesPromptNames.businessService,
                cfServicesPromptNames.serviceInstance,
                cfServicesPromptNames.approuter,
                cfServicesPromptNames.businessSolutionName,
                cfServicesPromptNames.baseApp
            ]);
            expect(mockGetMtaServices).toHaveBeenCalledWith('/test/path', mockLogger);
        });

        test('should load live service instances when the MTA declares no business services', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockGetMtaServices.mockResolvedValue([]);
            mockGetAdpServiceInstances.mockResolvedValue([]);

            await prompter.getPrompts('/test/path', mockCfConfig);

            expect(mockGetAdpServiceInstances).toHaveBeenCalledWith(mockCfConfig.space.GUID, mockLogger);
        });

        test('should load live service instances to check reachability even when the MTA declares services', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockGetMtaServices.mockResolvedValue(['service1']);
            mockGetAdpServiceInstances.mockResolvedValue([]);

            await prompter.getPrompts('/test/path', mockCfConfig);

            expect(mockGetAdpServiceInstances).toHaveBeenCalledWith(mockCfConfig.space.GUID, mockLogger);
        });

        test('should label the MTA business service when it is reachable among live instances', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockGetMtaServices.mockResolvedValue(['svc']);
            mockGetAdpServiceInstances.mockResolvedValue([{ name: 'svc', service: 'hana', servicePlan: 'hdi-shared' }]);
            mockGetBusinessServiceInfo.mockResolvedValue(mockServiceKeys);
            mockGetCfApps.mockResolvedValue([mockCFApp]);

            await prompter.getPrompts('/test/path', mockCfConfig);

            expect(prompter['reachableBusinessService']).toBe('svc');
            expect(mockGetBusinessServiceInfo).toHaveBeenCalledWith('svc', mockCfConfig, mockLogger);
            expect(prompter['apps']).toEqual([mockCFApp]);
            expect(prompter['singleServiceResult']).toBe(true);
        });

        test('should not label the MTA business service when it is not reachable among live instances', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockGetMtaServices.mockResolvedValue(['svc']);
            mockGetAdpServiceInstances.mockResolvedValue([
                { name: 'other', service: 'hana', servicePlan: 'hdi-shared' }
            ]);

            await prompter.getPrompts('/test/path', mockCfConfig);

            expect(prompter['reachableBusinessService']).toBeUndefined();
            expect(mockGetBusinessServiceInfo).not.toHaveBeenCalled();
        });

        test('should filter hidden prompts', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockGetMtaServices.mockResolvedValue(['service1', 'service2']);
            const promptOptions = {
                [cfServicesPromptNames.approuter]: { hide: true },
                [cfServicesPromptNames.businessService]: { hide: false }
            };

            const prompts = await prompter.getPrompts('/test/path', mockCfConfig, promptOptions);

            expect(prompts).toHaveLength(4);
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

            expect(mockHasApprouter).toHaveBeenCalledWith(['module1', 'module2']);
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

        test('should not crash and show prompt when the MTA has no mta.yaml yet', () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockGetModuleNames.mockImplementation(() => {
                throw new Error('Could not find file /test/path/mta.yaml');
            });
            mockHasApprouter.mockReturnValue(false);

            const prompt = prompter['getAppRouterPrompt']('/test/path', mockCfConfig);
            const whenFn = prompt.when as () => boolean;
            const shouldShow = whenFn();

            expect(shouldShow).toBe(true);
            expect(prompter['showSolutionNamePrompt']).toBe(true);
            expect(mockHasApprouter).toHaveBeenCalledWith([]);
            expect(mockGetApprouterType).not.toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith(
                'No mta.yaml found for approuter detection at /test/path: Could not find file /test/path/mta.yaml'
            );
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

            prompter['businessServiceInfo'] = mockServiceKeys;

            const prompt = prompter['getBaseAppPrompt'](mockCfConfig);
            const result = await prompt.validate!(mockCFApp);

            expect(mockDownloadAppContent).toHaveBeenCalledWith(mockCfConfig.space.GUID, mockCFApp, mockLogger);
            expect(mockValidateSmartTemplateApplication).toHaveBeenCalledWith(mockManifest);
            expect(mockValidateODataEndpoints).toHaveBeenCalledWith([], mockServiceKeys.serviceKeys, mockLogger);
            expect(result).toBe(true);
            expect(prompter['manifest']).toBe(mockManifest);
            expect(prompter['serviceInstanceGuid']).toBe(mockServiceKeys.serviceInstance.guid);
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

        test('should render a read-only label of the reachable business service', () => {
            prompter['reachableBusinessService'] = 'svc';
            prompter['singleServiceResult'] = true;

            const prompt = prompter['getBusinessServicesPrompt']() as InputQuestion<CfServicesAnswers>;

            expect(prompt.type).toBe('input');
            expect(prompt.name).toBe(cfServicesPromptNames.businessService);
            expect(prompt.message).toBe(t('prompts.businessServiceLabel'));
            expect(prompt.guiOptions?.type).toBe('label');
            expect(prompt.default({})).toBe('svc');
        });

        test('should be shown only when a reachable business service exists', () => {
            prompter['reachableBusinessService'] = 'svc';
            const shown = prompter['getBusinessServicesPrompt']();
            expect((shown.when as () => boolean)()).toBe(true);

            prompter['reachableBusinessService'] = undefined;
            const hidden = prompter['getBusinessServicesPrompt']();
            expect((hidden.when as () => boolean)()).toBe(false);
        });

        test('should return the eager discovery result from validate', () => {
            prompter['reachableBusinessService'] = 'svc';
            prompter['singleServiceResult'] = true;
            expect(prompter['getBusinessServicesPrompt']().validate!('svc')).toBe(true);

            prompter['singleServiceResult'] = t('error.noAppsFoundForBusinessService');
            expect(prompter['getBusinessServicesPrompt']().validate!('svc')).toBe(
                t('error.noAppsFoundForBusinessService')
            );
        });
    });

    describe('discoverBusinessServiceApps', () => {
        const prompter = new CFServicesPrompter(false, true, mockLogger);

        test('should resolve the service and its apps', async () => {
            mockGetBusinessServiceInfo.mockResolvedValue(mockServiceKeys);
            mockGetCfApps.mockResolvedValue([mockCFApp]);

            const result = await prompter['discoverBusinessServiceApps']('test-service', mockCfConfig);

            expect(mockGetBusinessServiceInfo).toHaveBeenCalledWith('test-service', mockCfConfig, mockLogger);
            expect(mockGetCfApps).toHaveBeenCalledWith(mockServiceKeys.serviceKeys, mockCfConfig, mockLogger);
            expect(result).toBe(true);
        });

        test('should return an error for an empty service name', async () => {
            const result = await prompter['discoverBusinessServiceApps']('', mockCfConfig);
            expect(result).toBe(t('error.businessServiceHasToBeSelected'));
        });

        test('should return an error when the service does not resolve', async () => {
            mockGetBusinessServiceInfo.mockResolvedValue(null);
            const result = await prompter['discoverBusinessServiceApps']('test-service', mockCfConfig);
            expect(result).toBe(t('error.businessServiceDoesNotExist'));
        });

        test('should return an error when the service exposes no apps', async () => {
            mockGetBusinessServiceInfo.mockResolvedValue(mockServiceKeys);
            mockGetCfApps.mockResolvedValue([]);
            const result = await prompter['discoverBusinessServiceApps']('test-service', mockCfConfig);
            expect(result).toBe(t('error.noAppsFoundForBusinessService'));
        });

        test('should surface a caught error message', async () => {
            mockGetBusinessServiceInfo.mockRejectedValue(new Error('Service error'));
            const result = await prompter['discoverBusinessServiceApps']('test-service', mockCfConfig);
            expect(result).toBe('Service error');
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to get available applications: Service error');
        });
    });

    describe('getServiceInstancePrompt', () => {
        const mockInstance: CfServiceInstanceChoice = {
            name: 'my-instance',
            service: 'hana',
            servicePlan: 'hdi-shared'
        };

        test('should create service instance prompt with correct structure', () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);

            const prompt = prompter['getServiceInstancePrompt'](mockCfConfig);

            expect(prompt.type).toBe('list');
            expect(prompt.name).toBe(cfServicesPromptNames.serviceInstance);
            expect(prompt.message).toBe(t('prompts.businessServiceLabel'));
            expect(prompt.guiOptions).toEqual({
                mandatory: true,
                hint: t('prompts.businessServiceTooltip'),
                breadcrumb: true
            });
        });

        test('should map choices from the loaded service instances', () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            prompter['serviceInstances'] = [mockInstance];
            const choices = [{ name: 'my-instance (hana/hdi-shared)', value: mockInstance }];
            mockGetServiceInstanceChoices.mockReturnValue(choices);

            const prompt = prompter['getServiceInstancePrompt'](mockCfConfig) as ListQuestion<CfServicesAnswers>;
            const choicesFn = prompt.choices as (answers: CfServicesAnswers) => typeof choices;
            const result = choicesFn({});

            expect(mockGetServiceInstanceChoices).toHaveBeenCalledWith([mockInstance]);
            expect(result).toBe(choices);
        });

        test('should be shown when there is no reachable MTA business service', () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            prompter['reachableBusinessService'] = undefined;

            const prompt = prompter['getServiceInstancePrompt'](mockCfConfig);
            const whenFn = prompt.when as (answers: CfServicesAnswers) => boolean;

            expect(whenFn({})).toBe(true);
        });

        test('should be hidden when the MTA business service is reachable (shown as a label)', () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            prompter['reachableBusinessService'] = 'svc';

            const prompt = prompter['getServiceInstancePrompt'](mockCfConfig);
            const whenFn = prompt.when as (answers: CfServicesAnswers) => boolean;

            expect(whenFn({})).toBe(false);
        });

        test('should surface an error message when no service instances were found', () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            prompter['serviceInstances'] = [];

            const prompt = prompter['getServiceInstancePrompt'](mockCfConfig);
            const additionalMessages = prompt.additionalMessages as () => { message: string; severity: number };

            expect(additionalMessages()).toEqual({
                message: t('error.noServiceInstancesFound'),
                severity: Severity.error
            });
        });

        test('should not surface a message when service instances exist', () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            prompter['serviceInstances'] = [mockInstance];

            const prompt = prompter['getServiceInstancePrompt'](mockCfConfig);
            const additionalMessages = prompt.additionalMessages as () => unknown;

            expect(additionalMessages()).toBeUndefined();
        });

        test('should return error when no instance is selected', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);

            const prompt = prompter['getServiceInstancePrompt'](mockCfConfig);
            const result = await prompt.validate!(null);

            expect(result).toBe(t('error.serviceInstanceHasToBeSelected'));
        });

        test('should seed business service info and apps from the selected instance', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockGetBusinessServiceInfo.mockResolvedValue(mockServiceKeys);
            mockGetCfApps.mockResolvedValue([mockCFApp]);

            const prompt = prompter['getServiceInstancePrompt'](mockCfConfig);
            const result = await prompt.validate!(mockInstance);

            expect(mockGetBusinessServiceInfo).toHaveBeenCalledWith(mockInstance.name, mockCfConfig, mockLogger);
            expect(mockGetCfApps).toHaveBeenCalledWith(mockServiceKeys.serviceKeys, mockCfConfig, mockLogger);
            expect(result).toBe(true);
        });

        test('should return error when the selected instance resolves no business service', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockGetBusinessServiceInfo.mockResolvedValue(null);

            const prompt = prompter['getServiceInstancePrompt'](mockCfConfig);
            const result = await prompt.validate!(mockInstance);

            expect(result).toBe(t('error.businessServiceDoesNotExist'));
        });

        test('should allow selection when the instance exposes no discoverable apps', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockGetBusinessServiceInfo.mockResolvedValue(mockServiceKeys);
            mockGetCfApps.mockResolvedValue([]);

            const prompt = prompter['getServiceInstancePrompt'](mockCfConfig);
            const result = await prompt.validate!(mockInstance);

            expect(result).toBe(true);
            expect(prompter['apps']).toEqual([]);
        });

        test('should allow selection when app discovery fails', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockGetBusinessServiceInfo.mockResolvedValue(mockServiceKeys);
            mockGetCfApps.mockRejectedValue(new Error('Discovery error'));

            const prompt = prompter['getServiceInstancePrompt'](mockCfConfig);
            const result = await prompt.validate!(mockInstance);

            expect(result).toBe(true);
            expect(prompter['apps']).toEqual([]);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to get available applications: Discovery error');
        });

        test('should block selection when the instance cannot be verified', async () => {
            const prompter = new CFServicesPrompter(false, true, mockLogger);
            mockGetBusinessServiceInfo.mockRejectedValue(new Error('Instance error'));

            const prompt = prompter['getServiceInstancePrompt'](mockCfConfig);
            const result = await prompt.validate!(mockInstance);

            expect(result).toBe('Instance error');
            expect(mockLogger.error).toHaveBeenCalledWith(
                `Failed to verify service instance '${mockInstance.name}': Instance error`
            );
        });
    });
});
