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
 * Creates a prompt for specifying the destination name during the cf deployment process.
 *
 * Depending on the environment (whether it's BAS or vs code),
 * this function returns either a list-based input if BAS or input-based question if being called from vscode for selecting the destination.
 * If additional choices are provided, the function will return a list-based input question for vscode.
 *
 * @param directBindingDestinationHint - Whether to show direct binding destination hint message.
 * @param cfDestination - The destination name for the cf deployment.
 * @param additionalChoiceList - Additional choices available for the destination.
 * @param defaultValue - The default value for the destination option in the prompt.
 * @param capRootPath - The root path of the CAP project and is Used to check if the mta.yaml file exists. For non CAP projects, this should be undefined.
 * @param useAutocomplete - Whether to use the autocomplete prompt type.
 * @returns {CfDeployConfigQuestions} An input or list question object for the destination name configuration, depending on the environment.
 */
async function getDestinationNamePrompt(
    directBindingDestinationHint: boolean = false,
    cfDestination: string,
    additionalChoiceList: CfSystemChoice[] = [],
    defaultValue: string,
    capRootPath: string = '',
    useAutocomplete: boolean = false
): Promise<CfDeployConfigQuestions> {
    console.log(" show destinationNamePrompt", cfDestination);
    const isBAS = isAppStudio();
    const displayType = isBAS || additionalChoiceList.length ? 'list' : 'input';
    const promptType =  useAutocomplete ? 'autocomplete' : displayType
    console.log(" --promptType", promptType);
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
            if (capRootPath && !mtaFileExists(capRootPath)) {
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
        await getDestinationNamePrompt(
            destinationOptions?.directBindingDestinationHint,
            destinationOptions?.destination,
            destinationOptions?.additionalChoiceList,
            destinationOptions?.defaultValue,
            destinationOptions?.capRootPath,
            destinationOptions?.useAutocomplete
        )
    );

    if (addManagedAppRouter) {
        questions.push(getAddManagedRouterPrompt());
    }

    if (addOverwriteQuestion) {
        questions.push(getOverwritePrompt());
    }
    return questions;
}


