import { type ConfirmQuestion, type InputQuestion } from '@sap-ux/inquirer-common';
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
import { getCfSystemChoices, fetchBTPDestinations, mtaFileExists } from './prompt-helpers';

/**
 * Retrieves the prompt configuration for selecting a Cloud Foundry destination name.
 * 
 * This function generates a prompt that allows users to specify a destination name. The prompt can be rendered as a list or 
 * an input field depending on the provided options. If the environment supports 
 * autocomplete, it can provide suggestions based on existing destinations.
 * 
 * @param {DestinationNamePromptOptions} destinationOptions - The options for configuring 
 *        the destination name prompt. 
 * @param {string} destinationOptions.cfDestination - The Cloud Foundry destination name 
 *        to be used.
 * @param {string} [destinationOptions.projectRootPath=''] - The path to the root directory of 
 *        the application. This is used to check if the MTA file exists.
 * @param {string} destinationOptions.defaultValue - The default destination value for CF.
 * @param {boolean} [destinationOptions.addDestinationHintMessage=false] - A flag to indicate 
 *        whether to show a hint for the destination name.
 * @param {CfSystemChoice[]} [destinationOptions.additionalChoiceList=[]] - Additional choices 
 *        available for the destination. For CAP projects, this will include instance-based 
 *        destinations as well and will be appended to the BTP destination list if the environment 
 *        is BAS. If additional choices are provided and the environment is VsCode, the prompt 
 *        type will render as a list instead of an input field.
 * @param {boolean} [destinationOptions.useAutocomplete=false] - A flag to indicate whether 
 *        to use an autocomplete feature for the destination name input.
 *
 * @returns {Promise<CfDeployConfigQuestions>} A promise that resolves to the configuration 
 *          of the prompt, which includes the question and any related options for rendering 
 *          the prompt in a user interface.
 */
async function getDestinationNamePrompt(destinationOptions: DestinationNamePromptOptions): Promise<CfDeployConfigQuestions> {

    const {
        directBindingDestinationHint = false,
        cfDestination,
        additionalChoiceList=  [],
        defaultValue,
        projectRootPath= '',
        useAutocomplete= false
    } = destinationOptions;

    const isBAS = isAppStudio();
    const basePromptType = isBAS || additionalChoiceList.length ? 'list' : 'input';
    const promptType = useAutocomplete ? 'autocomplete' : basePromptType;
    const destinations = await fetchBTPDestinations();
    const cfChoiceList: CfSystemChoice[] = await getCfSystemChoices(destinations);
    return {
        guiOptions: {
            mandatory: !isBAS ?? !!cfDestination,
            breadcrumb: t('prompts.destinationNameMessage')
        },
        type: promptType,
        default: () => defaultValue,
        name: promptNames.destinationName,
        message: directBindingDestinationHint
            ? t('prompts.directBindingDestinationHint')
            : t('prompts.destinationNameMessage'),
        validate: (destination: string): string | boolean => {
            if (projectRootPath && !mtaFileExists(projectRootPath)) {
                return t('errors.capDeploymentNoMtaError');
            }
            return validators.validateDestinationQuestion(destination, !cfDestination && isBAS);
        },
        choices: [...additionalChoiceList, ...cfChoiceList]
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
    questions.push(
        await getDestinationNamePrompt(destinationOptions)
    );

    if (addManagedAppRouter) {
        questions.push(getAddManagedRouterPrompt());
    }

    if (addOverwriteQuestion) {
        questions.push(getOverwritePrompt());
    }
    return questions;
}
