import { getQuestions } from '../src/prompts/prompts';
import { isAppStudio } from '@sap-ux/btp-utils';
import { t } from '../src/i18n';
import type {
    CfDeployConfigPromptOptions,
    CfSystemChoice,
    CfDeployConfigQuestions,
    DestinationNamePromptOptions
} from '../src/types';
import { promptNames } from '../src/types';
import { fetchBTPDestinations } from '../src/prompts/prompt-helpers';
import { type ListQuestion } from '@sap-ux/inquirer-common';

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

describe('Prompt Generation Tests', () => {
    let promptOptions: CfDeployConfigPromptOptions;
    const destinationPrompts: DestinationNamePromptOptions = {
        destination: 'testDestination',
        defaultValue: 'defaultDestination',
        directBindingDestinationHint: false
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
            expect(destinationNamePrompt?.default()).toBe('testDestination');
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
                    destination: undefined,
                    additionalChoiceList
                }
            };

            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === promptNames.destinationName);
            expect(destinationNamePrompt?.type).toBe('list');
            expect(destinationNamePrompt?.default()).toBe('defaultDestination');
            // ensure additional choice is added to the BTP destination list
            expect((destinationNamePrompt as ListQuestion)?.choices as Function).toStrictEqual([
                ...additionalChoiceList,
                { name: 'btpTestDest - btpTestDest', value: 'btpTestDest', scp: false, url: 'btpTestDest' }
            ]);
        });

        it('enables autocomplete when enabled and additionalChoiceList is provided', async () => {
            mockIsAppStudio.mockReturnValueOnce(false);
            promptOptions = {
                [promptNames.destinationName]: {
                    ...destinationPrompts,
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
            expect(destinationNamePrompt?.message).toBe(t('prompts.destinationNameMessage'));
            expect((destinationNamePrompt as ListQuestion)?.choices as Function).toStrictEqual([]);
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
            expect(destinationNamePrompt?.message).toBe(t('prompts.destinationNameMessage'));
            expect((destinationNamePrompt as ListQuestion)?.choices as Function).toStrictEqual(additionalChoiceList);
        });

        it('validates destination correctly and shows hint when directBindingDestinationHint is enabled', async () => {
            promptOptions = {
                [promptNames.destinationName]: {
                    ...destinationPrompts,
                    directBindingDestinationHint: true
                }
            };
            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === promptNames.destinationName);
            expect((destinationNamePrompt?.validate as Function)()).toBe(true);
            expect(destinationNamePrompt?.message).toBe(t('prompts.directBindingDestinationHint'));
        });

        it('Shows default hint when directBindingDestinationHint is not provided', async () => {
            promptOptions = {
                [promptNames.destinationName]: {
                    ...destinationPrompts,
                    directBindingDestinationHint: undefined
                }
            };
            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === promptNames.destinationName);
            expect(destinationNamePrompt?.message).toBe(t('prompts.destinationNameMessage'));
        });

        test('Destination name when autocomplete is specified', async () => {
            // Option `useAutocomplete` specified
            promptOptions = {
                [promptNames.destinationName]: {
                    ...destinationPrompts,
                    destination: undefined,
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
            expect((destinationNamePrompt as ListQuestion)?.choices as Function).toEqual(additionalChoiceList);
            expect((destinationNamePrompt?.source as Function)()).toEqual(additionalChoiceList);
            // Default should be used
            expect((destinationNamePrompt?.default as Function)()).toEqual(additionalChoiceList[0].name);
        });
    });

    describe('getAddManagedRouterPrompt', () => {
        beforeEach(() => {
            promptOptions = {
                ...promptOptions,
                [promptNames.addManagedAppRouter]: {
                    addManagedAppRouter: true
                }
            };
        });

        it('Displays managed router prompt when enabled', async () => {
            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
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
        });

        it('Displays managed router prompt when disabled', async () => {
            promptOptions[promptNames.addManagedAppRouter] = { addManagedAppRouter: false };

            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
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
                [promptNames.overwrite]: {
                    addOverwriteQuestion: true
                }
            };
        });

        it('Displays get overwrite prompt when enabled', async () => {
            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
            const overwritePrompt = questions.find((question) => question.name === promptNames.overwrite);
            expect(overwritePrompt?.type).toBe('confirm');
            expect((overwritePrompt?.default as Function)()).toBe(true);
            expect((overwritePrompt?.message as Function)()).toBe(t('prompts.overwriteMessage'));
        });

        it('Displays get overwrite prompt when disabled', async () => {
            if (promptOptions[promptNames.overwrite]) {
                promptOptions[promptNames.overwrite].addOverwriteQuestion = false;
            }
            const questions: CfDeployConfigQuestions[] = await getQuestions(promptOptions);
            const overwritePrompt = questions.find((question) => question.name === promptNames.overwrite);
            expect(overwritePrompt?.type).toBeUndefined();
        });
    });
});
