import { t } from '../src/i18n';
import type { CfAppRouterDeployConfigQuestions, CfAppRouterDeployConfigPromptOptions } from '../src/types';
import { RouterModuleType, appRouterPromptNames } from '../src/types';
import { type ListQuestion } from '@sap-ux/inquirer-common';
import { getAppRouterQuestions } from '../src/prompts/app-router-prompts';

describe('App Router Prompt Generation Tests', () => {
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
            expect((routerTypePrompt?.default as Function)()).toBe(RouterModuleType.Standard);
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

    describe('addABAPServiceBinding', () => {
        it('should return a valid prompt to add advanced configuration when enabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addABAPServiceBinding]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const destinationServicePrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addABAPServiceBinding
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

        it('should not return a prompt for advanced configurations when enabled and router type selected in managed', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addABAPServiceBinding]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const destinationServicePrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addABAPServiceBinding
            );
            expect(
                (destinationServicePrompt?.when as Function)({
                    [appRouterPromptNames.routerType]: RouterModuleType.Managed
                })
            ).toEqual(false);
        });

        it('should not return advanced configuration prompt when disabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addABAPServiceBinding]: false
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const destinationServicePrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addABAPServiceBinding
            );
            expect(destinationServicePrompt).not.toBeDefined();
        });
    });

    describe('getServiceProvider', () => {
        it('should return a valid service provider prompt when enabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addABAPServiceBinding]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const addServiceProviderPrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addServiceProvider
            );
            expect(addServiceProviderPrompt?.guiOptions?.breadcrumb).toBe(t('prompts.abapEnvBindingBreadcrumbMessage'));
            expect(addServiceProviderPrompt?.message).toBe(t('prompts.selectServiceMessage'));
            expect(addServiceProviderPrompt?.type).toBe('list');
            expect((addServiceProviderPrompt?.default as Function)()).toBe(t('errors.abapEnvsUnavailable'));
            expect(
                (addServiceProviderPrompt?.when as Function)({
                    [appRouterPromptNames.routerType]: RouterModuleType.Standard,
                    [appRouterPromptNames.addABAPServiceBinding]: true
                })
            ).toEqual(true);
            expect((addServiceProviderPrompt?.validate as Function)('choice')).toBe(true);
            expect((addServiceProviderPrompt as ListQuestion)?.choices).toBeDefined();
        });

        it('should not return service provider prompt when disabled', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addABAPServiceBinding]: false
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const addServiceProviderPrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addServiceProvider
            );
            expect(addServiceProviderPrompt).toBe(undefined);
        });

        it('should not return service provider prompt when enabled but router type selected in managed', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addABAPServiceBinding]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const addServiceProviderPrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addServiceProvider
            );
            expect(
                (addServiceProviderPrompt?.when as Function)({
                    [appRouterPromptNames.routerType]: RouterModuleType.Managed,
                    [appRouterPromptNames.addABAPServiceBinding]: true
                })
            ).toEqual(false);
        });

        it('should return false when no choice provided to service provider prompt', async () => {
            const promptOptions: CfAppRouterDeployConfigPromptOptions = {
                [appRouterPromptNames.mtaPath]: 'defaultMtaPath',
                [appRouterPromptNames.addABAPServiceBinding]: true
            };
            const questions: CfAppRouterDeployConfigQuestions[] = await getAppRouterQuestions(promptOptions);
            const addServiceProviderPrompt = questions.find(
                (question) => question.name === appRouterPromptNames.addServiceProvider
            );
            expect(
                (addServiceProviderPrompt?.when as Function)({
                    [appRouterPromptNames.routerType]: RouterModuleType.Standard,
                    [appRouterPromptNames.addABAPServiceBinding]: true
                })
            ).toEqual(true);
            expect((addServiceProviderPrompt?.validate as Function)(null)).toBe(false);
        });
    });
});
