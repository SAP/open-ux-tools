import { type ConfirmQuestion, type InputQuestion, searchChoices } from '@sap-ux/inquirer-common';
import { t } from '../i18n';
import type {
    CfDeployConfigPromptOptions,
    CfDeployConfigQuestions,
    CfDeployConfigAnswers,
    DestinationNamePromptOptions,
    CfSystemChoice
} from '../types';
import { promptNames } from '../types';
import * as validators from './validators';
import { isAppStudio } from '@sap-ux/btp-utils';
import { getCfSystemChoices, fetchBTPDestinations } from './prompt-helpers';

/**
 * Retrieves the prompt configuration for selecting a Cloud Foundry destination name.
 *
 * This function generates a prompt that allows users to specify a destination name. The prompt can be rendered as a list or
 * an input field depending on the provided options. If the environment supports
 * autocomplete, it can provide suggestions based on existing destinations.
 *
 * @param {DestinationNamePromptOptions} destinationOptions - The options for configuring
 *        the destination name prompt.
 * @param {string} destinationOptions.destination - The Cloud Foundry destination name
 *        to be used.
 * @param {string} destinationOptions.defaultValue - The default destination value for CF.
 * @param {boolean} [destinationOptions.addDestinationHintMessage] - A flag to indicate
 *        whether to show a hint for the destination name.
 * @param {CfSystemChoice[]} [destinationOptions.additionalChoiceList] - Additional choices
 *        available for the destination. If additional choices are provided and the environment is VsCode, the prompt
 *        type will render as a list instead of an input field.
 * @param {boolean} [destinationOptions.useAutocomplete] - A flag to indicate whether
 *        to use an autocomplete feature for the destination name input.
 * @returns {Promise<CfDeployConfigQuestions>} A promise that resolves to the configuration
 *          of the prompt, which includes the question and any related options for rendering
 *          the prompt in a user interface.
 */
async function getDestinationNamePrompt(
    destinationOptions: DestinationNamePromptOptions
): Promise<CfDeployConfigQuestions> {
    const {
        directBindingDestinationHint = false,
        destination,
        additionalChoiceList = [],
        defaultValue,
        useAutocomplete = false
    } = destinationOptions;

    const isBAS = isAppStudio();
    const basePromptType = isBAS || additionalChoiceList.length ? 'list' : 'input';
    const promptType = useAutocomplete ? 'autocomplete' : basePromptType;
    const destinations = await fetchBTPDestinations();
    const destinationList: CfSystemChoice[] = [...additionalChoiceList, ...(await getCfSystemChoices(destinations))];
    return {
        guiOptions: {
            mandatory: !isBAS || !!destination,
            breadcrumb: t('prompts.destinationNameMessage')
        },
        type: promptType,
        default: () => defaultValue,
        name: promptNames.destinationName,
        message: directBindingDestinationHint
            ? t('prompts.directBindingDestinationHint')
            : t('prompts.destinationNameMessage'),
        validate: (destination: string): string | boolean => {
            return validators.validateDestinationQuestion(destination, !destination && isBAS);
        },
        source: (input: string) => searchChoices(input, destinationList),
        choices: destinationList
    } as InputQuestion<CfDeployConfigAnswers>;
}

/**
 * Creates a prompt for managing application router during cf deployment.
 *
 *
 * This function returns a confirmation question that asks whether to add a managed application router
 * to the cf deployment. The prompt only appears if no mta file is found.
 *
 * @returns {ConfirmQuestion<CfDeployConfigAnswers>} Returns a confirmation question object for configuring the application router.
 */
function getAddManagedRouterPrompt(): CfDeployConfigQuestions {
    return {
        type: 'confirm',
        name: promptNames.addManagedAppRouter,
        guiOptions: {
            breadcrumb: t('prompts.addApplicationRouterBreadcrumbMessage')
        },
        message: (): string => t('prompts.generateManagedApplicationToRouterMessage'),
        default: (): boolean => true
    } as ConfirmQuestion<CfDeployConfigAnswers>;
}

/**
 *
 * @returns A confirmation question object which overwrites destination.
 */
function getOverwritePrompt(): CfDeployConfigQuestions {
    return {
        type: 'confirm',
        name: promptNames.overwrite,
        guiOptions: {
            hint: t('prompts.overwriteHintMessage')
        },
        default: () => {
            return true;
        },
        message: (): string => t('prompts.overwriteMessage')
    } as ConfirmQuestion<CfDeployConfigAnswers>;
}

/**
 * Retrieves a list of deployment questions based on the application root and prompt options.
 *
 * @param {CfDeployConfigPromptOptions} promptOptions - The configuration options for prompting during cf target deployment.
 * @returns {CfDeployConfigQuestions[]} Returns an array of questions related to cf deployment configuration.
 */
export async function getQuestions(promptOptions: CfDeployConfigPromptOptions): Promise<CfDeployConfigQuestions[]> {
    const destinationOptions = promptOptions[promptNames.destinationName] as DestinationNamePromptOptions;
    const addOverwriteQuestion = promptOptions[promptNames.overwrite]?.addOverwriteQuestion ?? false;
    const addManagedAppRouter = promptOptions[promptNames.addManagedAppRouter]?.addManagedAppRouter ?? false;

    const questions: CfDeployConfigQuestions[] = [];
    // Collect questions into an array
    questions.push(await getDestinationNamePrompt(destinationOptions));

    if (addManagedAppRouter) {
        questions.push(getAddManagedRouterPrompt());
    }

    if (addOverwriteQuestion) {
        questions.push(getOverwritePrompt());
    }
    return questions;
}
