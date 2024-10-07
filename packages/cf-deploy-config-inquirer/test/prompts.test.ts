import { getQuestions } from '../src/prompts/prompts';
import { isAppStudio } from '@sap-ux/btp-utils';
import * as validators from '../src/prompts/validators';
import { t } from '../src/i18n';
import { CfDeployConfigPromptOptions } from '../src/types';
import * as conditions from '../src/prompts/conditions';

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
            cfDestination: 'testDestination',
            isCapProject: true,
            mtaYamlExists: false,
            defaultDestinationOption: 'defaultDestination',
            showDestinationHintMessage: false,
            cfChoiceList: [{ name: 'option1', value: 'option2' }]
        };
    });

    describe('getDestinationNamePrompt', () => {
        it('returns list-based prompt when isAppStudio is true', async () => {
            mockIsAppStudio.mockReturnValueOnce(true);

            const questions = getQuestions(appRoot, promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === 'cfDestination');
            expect(destinationNamePrompt?.type).toBe('list');
            expect(destinationNamePrompt?.default()).toBe('defaultDestination');
        });

        it('returns input-based prompt when isAppStudio is false', async () => {
            mockIsAppStudio.mockReturnValueOnce(false);

            const questions = getQuestions(appRoot, promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === 'cfDestination');
            expect(destinationNamePrompt?.type).toBe('input');
            expect(destinationNamePrompt?.message).toBe(t('prompts.destinationNameMessage'));
        });

        it('validates destination correctly when isCapProject is true and mtaYaml does not exist', async () => {
            const questions = getQuestions(appRoot, promptOptions);
            const destinationNamePrompt = questions.find((question) => question.name === 'cfDestination');
            expect(destinationNamePrompt && typeof destinationNamePrompt.validate === 'function' && destinationNamePrompt.validate('someDestination')).toBe(t('errors.capDeploymentNoMtaError'));
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
        let mtaYamlExists = true;

        beforeEach(() => {
            mtaYamlExists = true;
            promptOptions = {
                ...promptOptions,
                mtaYamlExists,
                isCapProject: true
            };
        });

        it('returns confirm type prompt with the correct configuration when mta yaml file exists in project', async () => {
            jest.spyOn(conditions, 'showManagedAppRouterQuestion').mockReturnValue(mtaYamlExists);

            const questions = getQuestions(appRoot, promptOptions);
            const managedAppRouterPrompt = questions.find((question) => question.name === 'addManagedApprouter');
            expect(managedAppRouterPrompt?.type).toBe('confirm');
            expect(managedAppRouterPrompt?.guiOptions?.breadcrumb).toBe(t('prompts.addApplicationRouterBreadcrumbMessage'));
            expect(managedAppRouterPrompt && typeof managedAppRouterPrompt.message === 'function' && managedAppRouterPrompt.message({})).toBe(t('prompts.generateManagedApplicationToRouterMessage'));
            expect(managedAppRouterPrompt && typeof managedAppRouterPrompt.when === 'function' && managedAppRouterPrompt.when({})).toBe(mtaYamlExists);
            expect(managedAppRouterPrompt && typeof managedAppRouterPrompt.default === 'function' && managedAppRouterPrompt.default()).toBe(true);
        });

        it('returns confirm type prompt with the correct configuration when no mta yaml file is provided', async () => {
            mtaYamlExists = false
            jest.spyOn(conditions, 'showManagedAppRouterQuestion').mockReturnValue(mtaYamlExists);

            const questions = getQuestions(appRoot, promptOptions);
            const managedAppRouterPrompt = questions.find((question) => question.name === 'addManagedApprouter');
            expect(managedAppRouterPrompt?.type).toBe('confirm');
            expect(managedAppRouterPrompt?.guiOptions?.breadcrumb).toBe(t('prompts.addApplicationRouterBreadcrumbMessage'));
            expect(managedAppRouterPrompt && typeof managedAppRouterPrompt.when === 'function' && managedAppRouterPrompt.when({})).toBe(mtaYamlExists);
        });
    });

    describe('getOverwritePrompt', () => {

        beforeEach(() => {
            promptOptions.addOverwriteQuestion = true;
        });

        it('returns confirm type prompt with correct name and message', async () => {
            const questions = getQuestions(appRoot, promptOptions);
            const overwritePrompt = questions.find((question) => question.name === 'cfOverwrite');
            expect(overwritePrompt?.type).toBe('confirm');
            expect(overwritePrompt && typeof overwritePrompt.default === 'function' && overwritePrompt.default()).toBe(true);
            expect(overwritePrompt && typeof overwritePrompt.message === 'function' && overwritePrompt.message({})).toBe(t('prompts.overwriteMessage'));
            expect(overwritePrompt && typeof overwritePrompt.when === 'function' && overwritePrompt.when({})).toBe(true);
        });
        
        it('uses when condition to determine if prompt should show based on addOverwriteQuestion', async () => {
            promptOptions.addOverwriteQuestion = false;
            const questions = getQuestions(appRoot, promptOptions);
            const overwritePrompt = questions.find((question) => question.name === 'cfOverwrite');
            expect(overwritePrompt?.type).toBe('confirm');
            expect(overwritePrompt && typeof overwritePrompt.when === 'function' && overwritePrompt.when({})).toBe(false);
        });
    });
});
     