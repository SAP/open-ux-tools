import { getQuestions } from '../src/prompts/prompts';
import { isAppStudio } from '@sap-ux/btp-utils';
import * as validators from '../src/prompts/validators';
import { t } from '../src/i18n';
import type { CfDeployConfigPromptOptions } from '../src/types';
import { promptNames } from '../src/types';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));
const mockIsAppStudio = isAppStudio as jest.Mock;
const appRoot = '/app';

describe('Prompt Generation Tests', () => {
    let promptOptions: CfDeployConfigPromptOptions;

    beforeEach(() => {
        jest.clearAllMocks();
        promptOptions = {
            isCapProject: true,
            mtaYamlExists: false,
            [promptNames.destinationName]: {
                cfDestination: 'testDestination',
                defaultValue: 'defaultDestination',
                showDestinationHintMessage: false,
                cfChoiceList: [
                    { name: 'option1', value: 'option1' },
                    { name: 'option2', value: 'option2' }
                ],
                additionalChoiceList: [
                    { name: 'capOption1', value: 'capOption1' },
                    { name: 'capOption2', value: 'capOption2' }
                ]
            }
        };
    });

    describe('getDestinationNamePrompt', () => {
        it('returns list-based prompt when isAppStudio is true', async () => {
            mockIsAppStudio.mockReturnValueOnce(true);

            const questions = getQuestions(appRoot, promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === 'cfDestination');
            expect(destinationNamePrompt?.type).toBe('list');
            expect(destinationNamePrompt?.default()).toBe('defaultDestination');
            // check if the choices are correctly concatenated
            expect(destinationNamePrompt?.choices).toEqual([
                { name: 'option1', value: 'option1' },
                { name: 'option2', value: 'option2' },
                { name: 'capOption1', value: 'capOption1' },
                { name: 'capOption2', value: 'capOption2' }
            ]);
        });

        it('returns blank list prompt when no choice lists is provided', async () => {
            mockIsAppStudio.mockReturnValueOnce(true);
            promptOptions = {
                ...promptOptions,
                [promptNames.destinationName]: {
                    cfDestination: 'testDestination',
                    defaultValue: 'defaultDestination',
                    cfChoiceList: []
                }
            }

            const questions = getQuestions(appRoot, promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === 'cfDestination');
            expect(destinationNamePrompt?.type).toBe('list');
            expect(destinationNamePrompt?.default()).toBe('defaultDestination');
            // check if the choices are correctly concatenated
            expect(destinationNamePrompt?.choices).toEqual([]);
        });

        it('returns input-based prompt when isAppStudio is false', async () => {
            mockIsAppStudio.mockReturnValueOnce(false);

            const questions = getQuestions(appRoot, promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === 'cfDestination');
            expect(destinationNamePrompt?.type).toBe('input');
            expect(destinationNamePrompt?.message).toBe(t('prompts.destinationNameMessage'));
        });

        it('validates destination correctly when isCapProject is true and mtaYaml does not exist', async () => {
            promptOptions.mtaYamlExists = false;
            promptOptions[promptNames.destinationName] = {
                ...promptOptions[promptNames.destinationName],
                cfDestination: 'testDestination',
                defaultValue: 'defaultDestination',
                showDestinationHintMessage: true,
                cfChoiceList: []
            };
            const questions = getQuestions(appRoot, promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === 'cfDestination');
            expect(
                destinationNamePrompt &&
                    typeof destinationNamePrompt.validate === 'function' &&
                    destinationNamePrompt.validate('someDestination')
            ).toBe(t('errors.capDeploymentNoMtaError'));
            expect(destinationNamePrompt?.message).toBe(t('prompts.cfDestinationHintMessage'));
        });

        it('validates destination correctly when isCapProject is true and mtaYaml sexist', async () => {
            promptOptions.mtaYamlExists = true;
            const questions = getQuestions(appRoot, promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === 'cfDestination');
            expect(
                destinationNamePrompt &&
                    typeof destinationNamePrompt.validate === 'function' &&
                    destinationNamePrompt.validate('someDestination')
            ).toBe(true);
        });

        it('returns list-based prompt when isAppStudio is true and not a cap project', async () => {
            jest.spyOn(validators, 'validateDestinationQuestion').mockReturnValue(true);

            mockIsAppStudio.mockReturnValueOnce(true);
            promptOptions.isCapProject = false;
            promptOptions.mtaYamlExists = true;
            const questions = getQuestions(appRoot, promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === 'cfDestination');
            expect(destinationNamePrompt?.type).toBe('list');
        });
    });

    describe('getAddManagedRouterPrompt', () => {
        beforeEach(() => {
            promptOptions = {
                ...promptOptions,
                mtaYamlExists: true,
                isCapProject: true
            };
        });

        it('Hides add managed router prompt with the correct configuration when mta yaml file exists in cap project', async () => {
            const questions = getQuestions(appRoot, promptOptions);
            const managedAppRouterPrompt = questions.find((question) => question.name === 'addManagedApprouter');
            expect(managedAppRouterPrompt?.type).toBe('confirm');
            expect(managedAppRouterPrompt?.guiOptions?.breadcrumb).toBe(
                t('prompts.addApplicationRouterBreadcrumbMessage')
            );
            expect(
                managedAppRouterPrompt &&
                    typeof managedAppRouterPrompt.message === 'function' &&
                    managedAppRouterPrompt.message({})
            ).toBe(t('prompts.generateManagedApplicationToRouterMessage'));
            expect(
                managedAppRouterPrompt &&
                    typeof managedAppRouterPrompt.when === 'function' &&
                    managedAppRouterPrompt.when({})
            ).toBe(false);
            expect(
                managedAppRouterPrompt &&
                    typeof managedAppRouterPrompt.default === 'function' &&
                    managedAppRouterPrompt.default()
            ).toBe(true);
        });

        it('returns confirm type prompt with the correct configuration when no mta yaml file is provided and is not a cap project', async () => {
            promptOptions.mtaYamlExists = false;
            promptOptions.isCapProject = false;

            const questions = getQuestions(appRoot, promptOptions);
            const managedAppRouterPrompt = questions.find((question) => question.name === 'addManagedApprouter');
            expect(managedAppRouterPrompt?.type).toBe('confirm');
            expect(managedAppRouterPrompt?.guiOptions?.breadcrumb).toBe(
                t('prompts.addApplicationRouterBreadcrumbMessage')
            );
            expect(
                managedAppRouterPrompt &&
                    typeof managedAppRouterPrompt.when === 'function' &&
                    managedAppRouterPrompt.when({})
            ).toBe(true);
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

        it('returns confirm type prompt with correct name and message', async () => {
            const questions = getQuestions(appRoot, promptOptions);
            const overwritePrompt = questions.find((question) => question.name === 'cfOverwrite');
            expect(overwritePrompt?.type).toBe('confirm');
            expect(overwritePrompt && typeof overwritePrompt.default === 'function' && overwritePrompt.default()).toBe(
                true
            );
            expect(
                overwritePrompt && typeof overwritePrompt.message === 'function' && overwritePrompt.message({})
            ).toBe(t('prompts.overwriteMessage'));
            expect(overwritePrompt && typeof overwritePrompt.when === 'function' && overwritePrompt.when({})).toBe(
                true
            );
        });

        it('uses when condition to determine if prompt should show based on addOverwriteQuestion', async () => {
            if (promptOptions[promptNames.overwrite]) {
                promptOptions[promptNames.overwrite].addOverwriteQuestion = false;
            }
            const questions = getQuestions(appRoot, promptOptions);
            const overwritePrompt = questions.find((question) => question.name === 'cfOverwrite');
            expect(overwritePrompt?.type).toBe('confirm');
            expect(overwritePrompt && typeof overwritePrompt.when === 'function' && overwritePrompt.when({})).toBe(
                false
            );
        });
    });
});
