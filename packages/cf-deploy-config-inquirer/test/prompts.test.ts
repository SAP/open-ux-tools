import { getQuestions } from '../src/prompts';
import { isAppStudio } from '@sap-ux/btp-utils';
import { t } from '../src/i18n';
import {
    type CfDeployConfigPromptOptions,
    type CfSystemChoice,
    type CfDeployConfigQuestions,
    type DestinationNamePromptOptions,
    RouterModuleType
} from '../src/types';
import { promptNames } from '../src';
import { fetchBTPDestinations } from '../src/prompts/prompt-helpers';
import { type ListQuestion, type YUIQuestion } from '@sap-ux/inquirer-common';
import type { Logger } from '@sap-ux/logger';
import { Severity } from '@sap-devx/yeoman-ui-types';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));
const mockIsAppStudio = isAppStudio as jest.Mock;

jest.mock('../src/prompts/prompt-helpers', () => ({
    ...jest.requireActual('../src/prompts/prompt-helpers'),
    fetchBTPDestinations: jest.fn()
}));
const mockFetchBTPDestinations = fetchBTPDestinations as jest.Mock;
const mockLog = {
    info: jest.fn(),
    warn: jest.fn()
} as unknown as Logger;

describe('Prompt Generation Tests', () => {
    let promptOptions: CfDeployConfigPromptOptions;
    const destinationPrompts: DestinationNamePromptOptions = {
        defaultValue: 'defaultDestination',
        hint: false
    };
    const additionalChoiceList: CfSystemChoice[] = [
        {
            name: 'testChoice',
            value: 'testValue',
            scp: false,
            url: 'testUrl'
        },
        {
            name: 'testChoice1',
            value: 'testValue1',
            scp: false,
            url: 'testUrl'
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        promptOptions = {
            [promptNames.destinationName]: destinationPrompts
        };
    });

    describe('getDestinationNamePrompt', () => {
        it('returns list-based prompt when environment is BAS', async () => {
            mockIsAppStudio.mockReturnValueOnce(true);

            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === promptNames.destinationName);
            expect(destinationNamePrompt?.type).toBe('list');
            expect(destinationNamePrompt?.default()).toBe('defaultDestination');
        });

        it('returns list-based prompt for cap project when environment is BAS', async () => {
            mockIsAppStudio.mockReturnValueOnce(true);
            mockFetchBTPDestinations.mockResolvedValueOnce({
                btpTestDest: {
                    Name: 'btpTestDest',
                    Host: 'btpTestDest',
                    Type: 'HTTP',
                    Authentication: 'BasicAuthentication',
                    ProxyType: 'OnPremise',
                    Description: 'btpTestDest'
                }
            });
            // cap destination is provided as an additional choice
            promptOptions = {
                [promptNames.destinationName]: {
                    ...destinationPrompts,
                    additionalChoiceList
                }
            };

            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === promptNames.destinationName);
            expect(destinationNamePrompt?.type).toBe('list');
            expect(destinationNamePrompt?.default()).toBe('defaultDestination');
            // ensure additional choice is added to the BTP destination list
            expect(((destinationNamePrompt as ListQuestion)?.choices as Function)()).toStrictEqual([
                ...additionalChoiceList,
                { name: 'btpTestDest - btpTestDest', value: 'btpTestDest', scp: false, url: 'btpTestDest' }
            ]);
        });

        it('enables autocomplete when enabled and additionalChoiceList is provided', async () => {
            mockIsAppStudio.mockReturnValueOnce(false);
            promptOptions = {
                [promptNames.destinationName]: {
                    ...destinationPrompts,
                    addBTPDestinationList: false,
                    useAutocomplete: true,
                    additionalChoiceList
                }
            };

            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === promptNames.destinationName);
            expect(destinationNamePrompt?.type).toBe('autocomplete');
        });

        it('returns input-based prompt when environment is vscode', async () => {
            mockIsAppStudio.mockReturnValueOnce(false);

            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === promptNames.destinationName);
            expect(destinationNamePrompt?.type).toBe('input');
            expect((destinationNamePrompt?.message as Function)()).toBe(t('prompts.destinationNameMessage'));
            expect(((destinationNamePrompt as ListQuestion)?.choices as Function)()).toStrictEqual([]);
        });

        it('returns list-based prompt when environment is vscode and additionalChoiceList is provided', async () => {
            mockIsAppStudio.mockReturnValueOnce(false);
            promptOptions = {
                [promptNames.destinationName]: {
                    ...destinationPrompts,
                    additionalChoiceList
                }
            };
            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === promptNames.destinationName);
            expect(destinationNamePrompt?.type).toBe('list');
            expect((destinationNamePrompt?.message as Function)()).toBe(t('prompts.destinationNameMessage'));
            expect(((destinationNamePrompt as ListQuestion)?.choices as Function)()).toStrictEqual(
                additionalChoiceList
            );
        });

        it('validates destination correctly and shows hint when directBindingDestinationHint is enabled', async () => {
            promptOptions = {
                [promptNames.destinationName]: {
                    ...destinationPrompts,
                    hint: true
                }
            };
            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === promptNames.destinationName);
            expect((destinationNamePrompt?.validate as Function)()).toBe(true);
            expect((destinationNamePrompt?.message as Function)()).toBe(t('prompts.directBindingDestinationHint'));
        });

        it('Shows default hint when directBindingDestinationHint is not provided', async () => {
            promptOptions = {
                [promptNames.destinationName]: {
                    ...destinationPrompts,
                    hint: undefined
                }
            };
            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === promptNames.destinationName);
            expect((destinationNamePrompt?.message as Function)()).toBe(t('prompts.destinationNameMessage'));
        });

        test('Destination name when autocomplete is specified', async () => {
            // Option `useAutocomplete` specified
            promptOptions = {
                [promptNames.destinationName]: {
                    ...destinationPrompts,
                    useAutocomplete: true,
                    additionalChoiceList,
                    defaultValue: 'testChoice'
                }
            };
            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
            const destinationNamePrompt = questions.find(
                (question: CfDeployConfigQuestions) => question.name === promptNames.destinationName
            );
            expect(destinationNamePrompt?.type).toEqual('autocomplete');
            expect(((destinationNamePrompt as ListQuestion)?.choices as Function)()).toEqual(additionalChoiceList);
            expect((destinationNamePrompt?.source as Function)()).toEqual(additionalChoiceList);
            // Default should be used
            expect((destinationNamePrompt?.default as Function)()).toEqual(additionalChoiceList[0].name);
        });
    });

    describe('getaddManagedAppRouterPrompt', () => {
        beforeEach(() => {
            promptOptions = {
                ...promptOptions,
                [promptNames.addManagedAppRouter]: {
                    hide: false
                }
            };
        });

        it('Displays managed router prompt when enabled', async () => {
            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions, mockLog);
            const managedAppRouterPrompt = questions.find(
                (question) => question.name === promptNames.addManagedAppRouter
            );
            expect(managedAppRouterPrompt?.type).toBe('confirm');
            expect(managedAppRouterPrompt?.guiOptions?.breadcrumb).toBe(
                t('prompts.addApplicationRouterBreadcrumbMessage')
            );
            expect((managedAppRouterPrompt?.message as Function)()).toBe(
                t('prompts.generateManagedApplicationToRouterMessage')
            );
            expect((managedAppRouterPrompt?.default as Function)()).toBe(true);
            expect(mockLog.info).toHaveBeenCalledWith(t('info.addManagedAppRouter'));
        });

        it('Displays managed router prompt when disabled', async () => {
            promptOptions[promptNames.addManagedAppRouter] = {
                hide: true
            };

            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions, mockLog);
            const managedAppRouterPrompt = questions.find(
                (question) => question.name === promptNames.addManagedAppRouter
            );
            expect(managedAppRouterPrompt).toBeUndefined();
        });
    });

    describe('getOverwritePrompt', () => {
        beforeEach(() => {
            promptOptions = {
                ...promptOptions,
                [promptNames.overwriteCfConfig]: {
                    hide: false
                }
            };
        });

        it('Displays get overwrite prompt when enabled', async () => {
            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions, mockLog);
            const overwritePrompt = questions.find((question) => question.name === promptNames.overwriteCfConfig);
            expect(overwritePrompt?.type).toBe('confirm');
            expect((overwritePrompt?.default as Function)()).toBe(true);
            expect((overwritePrompt?.message as Function)()).toBe(t('prompts.overwriteMessage'));
            expect(mockLog.info).toHaveBeenCalledWith(t('info.overwriteDestination'));
        });

        it('Displays get overwrite prompt when disabled', async () => {
            if (promptOptions[promptNames.overwriteCfConfig]) {
                promptOptions[promptNames.overwriteCfConfig] = {
                    hide: true
                };
            }
            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions, mockLog);
            const overwritePrompt = questions.find((question) => question.name === promptNames.overwriteCfConfig);
            expect(overwritePrompt?.type).toBeUndefined();
        });
    });

    describe('getQuestions with Router Option', () => {
        it('Displays CF prompt with App Router selection', async () => {
            const questions: CfDeployConfigQuestions[] = await getQuestions(
                {
                    ...promptOptions,
                    routerType: {
                        hide: false
                    }
                },
                mockLog
            );
            const routerTypePrompt = questions.find((question) => question.name === promptNames.routerType);
            expect(routerTypePrompt?.guiOptions?.mandatory).toBe(true);
            expect(routerTypePrompt?.guiOptions?.breadcrumb).toBe(t('prompts.generateDeploymentRouterOptionsMessage'));
            expect((routerTypePrompt?.default as Function)()).toBe(RouterModuleType.None);
            expect((routerTypePrompt?.message as Function)()).toBe(t('prompts.generateDeploymentRouterOptionsMessage'));
            expect((routerTypePrompt as ListQuestion)?.choices).toEqual([
                { name: t('prompts.routerType.none'), value: RouterModuleType.None },
                { name: t('prompts.routerType.managedAppRouter'), value: RouterModuleType.Managed },
                { name: t('prompts.routerType.appFrontAppService'), value: RouterModuleType.AppFront }
            ]);
            expect(
                ((routerTypePrompt as YUIQuestion)?.additionalMessages as Function)(RouterModuleType.AppFront)
            ).toStrictEqual({
                message: t('warning.appFrontendServiceRouterChoice'),
                severity: Severity.warning
            });
        });
        it('Displays CF prompt with App Router selection disabled', async () => {
            const promptOptionsWithRouterDisabled: CfDeployConfigPromptOptions = {
                ...promptOptions,
                routerType: {
                    hide: true
                }
            };
            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptionsWithRouterDisabled, mockLog);
            const routerTypePrompt = questions.find((question) => question.name === promptNames.routerType);
            expect(routerTypePrompt).toBeUndefined();
        });
    });
});
