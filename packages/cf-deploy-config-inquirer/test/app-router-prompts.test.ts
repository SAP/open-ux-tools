import { t } from '../src/i18n';
import type {
    CfAppRouterDeployConfigQuestions,
    DestinationNamePromptOptions,
    CfAppRouterDeployConfigPromptOptions
} from '../src/types';
import { RouterModuleType, appRouterPromptNames } from '../src/types';
import { type ListQuestion } from '@sap-ux/inquirer-common';
import type { Logger } from '@sap-ux/logger';
import { getAppRouterQuestions } from '../src/prompts/app-router-prompts';

const mockLog = {
    info: jest.fn(),
    warn: jest.fn()
} as unknown as Logger;

describe('App Router Prompt Generation Tests', () => {
    const destinationPrompts: DestinationNamePromptOptions = {
        defaultValue: 'defaultDestination',
        hint: false
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getMtaPathPrompt', () => {
        it('should return a valid mta path prompt', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath'
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const mtaPathPrompt = questions.find((question) => question.name === appRouterPromptNames.mtaPath);
            expect(mtaPathPrompt?.default()).toBe('defaultMtaPath');
            expect(mtaPathPrompt?.message).toBe(t('prompts.mtaPathMessage'));
            expect(mtaPathPrompt?.guiOptions?.breadcrumb).toBe(t('prompts.mtaPathBreadcrumbMessage'));
            expect((mtaPathPrompt?.validate as Function)()).toBe(t('errors.folderDoesNotExistError'));
        });
    });

    describe('getMtaIdPrompt', () => {
        it('should return a valid mta id prompt when enabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.mtaId]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const mtaIdPrompt = questions.find((question) => question.name === appRouterPromptNames.mtaId);
            expect(mtaIdPrompt?.message).toBe(t('prompts.mtaIdMessage'));
            expect(mtaIdPrompt?.guiOptions?.mandatory).toBe(true);
            expect(mtaIdPrompt?.guiOptions?.breadcrumb).toBe(true);

            expect((mtaIdPrompt?.validate as Function)()).toBe(t('errors.noMtaIdError'));
        });

        it('should not return mta id prompt when disabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.mtaId]: false
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const mtaIdPrompt = questions.find((question) => question.name === appRouterPromptNames.mtaId);
            expect(mtaIdPrompt?.guiOptions?.breadcrumb).not.toBe(true);
        });
    });

    describe('getMtaDescriptionPrompt', () => {
        it('should return a valid mta description prompt when enabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.mtaDescription]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const mtaDescriptionPrompt = questions.find(
                (question) => question.name === appRouterPromptNames.mtaDescription
            );
            expect(mtaDescriptionPrompt?.message).toBe(t('prompts.mtaDescriptionMessage'));
            expect(mtaDescriptionPrompt?.type).toBe(t('input'));
            expect(mtaDescriptionPrompt?.guiOptions?.mandatory).not.toBeDefined();
            expect(mtaDescriptionPrompt?.guiOptions?.breadcrumb).toBe(true);
        });

        it('should not return mta description prompt when disabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.mtaDescription]: false
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const mtaDescriptionPrompt = questions.find(
                (question) => question.name === appRouterPromptNames.mtaDescription
            );
            expect(mtaDescriptionPrompt?.guiOptions?.breadcrumb).not.toBe(true);
        });
    });

    describe('getMtaVersionPrompt', () => {
        it('should return a valid mta version prompt when enabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.mtaVersion]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const mtaVersionPrompt = questions.find((question) => question.name === appRouterPromptNames.mtaVersion);
            expect(mtaVersionPrompt?.default).toBe(t('0.0.1'));
        });

        it('should not return mta description prompt when disabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.mtaDescription]: false
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const mtaVersionPrompt = questions.find((question) => question.name === appRouterPromptNames.mtaVersion);
            expect(mtaVersionPrompt?.guiOptions).not.toBeDefined();
        });
    });

    describe('getRouterTypePrompt', () => {
        it('should return a valid router type prompt when enabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.routerType]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const routerTypePrompt = questions.find((question) => question.name === appRouterPromptNames.routerType);
            expect(routerTypePrompt?.message).toBe(t('prompts.routerTypeMessage'));
            expect(routerTypePrompt?.type).toBe('list');
            expect(routerTypePrompt?.guiOptions?.mandatory).toBe(true);
            expect(routerTypePrompt?.guiOptions?.breadcrumb).toBe(true);
            expect((routerTypePrompt as ListQuestion)?.choices).toEqual([
                { name: t('routerType.standaloneAppRouter'), value: RouterModuleType.Standard },
                { name: t('routerType.managedAppRouter'), value: RouterModuleType.Managed }
            ]);
        });

        it('should not return router type prompt when disabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.routerType]: false
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const routerTypePrompt = questions.find((question) => question.name === appRouterPromptNames.routerType);
            expect(routerTypePrompt?.guiOptions).not.toBeDefined();
        });
    });

    describe('getConnectivityServicePrompt', () => {
        it('should return connectivity service prompt when connectivityService is enabled & stand alone router type is selected', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addConnectivityService]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const connectivityServicePrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addConnectivityService
            );
            expect(connectivityServicePrompt?.message).toBe(t('prompts.addConnectivityMessage'));
            expect(connectivityServicePrompt?.type).toBe('confirm');
            expect(connectivityServicePrompt?.guiOptions?.breadcrumb).toBe(
                t('prompts.addConnectivityServiceBreadcrumbMessage')
            );
            expect((connectivityServicePrompt?.default as Function)()).toBe(false);
            expect(
                (connectivityServicePrompt?.when as Function)({
                    [appRouterPromptNames.routerType]: RouterModuleType.Standard
                })
            ).toEqual(true);
        });

        it('should not return connectivity service prompt when connectivityService is disabled & stand alone router type is selected', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addConnectivityService]: false
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const connectivityServicePrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addConnectivityService
            );
            expect(connectivityServicePrompt).toBeUndefined();
        });

        it('should not return connectivity service prompt when connectivityService is enabled & and managed router type is selected', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addConnectivityService]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const connectivityServicePrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addConnectivityService
            );
            expect(
                (connectivityServicePrompt?.when as Function)({
                    [appRouterPromptNames.routerType]: RouterModuleType.Managed
                })
            ).toEqual(false);
        });
    });

    describe('getDestinationService', () => {
        it('should return a valid destination service prompt when enabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addDestinationService]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const destinationServicePrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addDestinationService
            );
            expect(destinationServicePrompt?.message).toBe(t('prompts.serviceAdvancedOptionMessage'));
            expect(destinationServicePrompt?.type).toBe('confirm');
            expect((destinationServicePrompt?.default as Function)()).toBe(false);
            expect(
                (destinationServicePrompt?.when as Function)({
                    [appRouterPromptNames.routerType]: RouterModuleType.Standard
                })
            ).toEqual(true);
        });

        it('should not return a valid destination service prompt when enabled but router type selected in managed', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addDestinationService]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const destinationServicePrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addDestinationService
            );
            expect(
                (destinationServicePrompt?.when as Function)({
                    [appRouterPromptNames.routerType]: RouterModuleType.Managed
                })
            ).toEqual(false);
        });

        it('should not return destination service prompt when disabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addDestinationService]: false
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const destinationServicePrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addDestinationService
            );
            expect(destinationServicePrompt).not.toBeDefined();
        });
    });

    describe('getServiceProvider', () => {
        it('should return a valid service provider prompt when enabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addServiceProvider]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const destinationServicePrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addServiceProvider
            );
            expect(destinationServicePrompt?.guiOptions?.breadcrumb).toBe(t('prompts.abapEnvBindingBreadcrumbMessage'));
            expect(destinationServicePrompt?.message).toBe(t('prompts.selectServiceMessage'));
            expect(destinationServicePrompt?.type).toBe('list');
            expect((destinationServicePrompt?.default as Function)()).toBe(t('errors.abapEnvsUnavailable'));
            expect(
                (destinationServicePrompt?.when as Function)({
                    [appRouterPromptNames.routerType]: RouterModuleType.Standard,
                    [appRouterPromptNames.addDestinationService]: true
                })
            ).toEqual(true);
        });

        it('should not return service provider prompt when disabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addServiceProvider]: false
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const destinationServicePrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addServiceProvider
            );
            expect(destinationServicePrompt).toBe(undefined);
        });

        it('should not return service provider prompt when enabled but router type selected in managed', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addServiceProvider]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const addServiceProviderPrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addServiceProvider
            );
            expect(
                (addServiceProviderPrompt?.when as Function)({
                    [appRouterPromptNames.routerType]: RouterModuleType.Managed,
                    [appRouterPromptNames.addDestinationService]: true
                })
            ).toEqual(false);
        });
    });
});
