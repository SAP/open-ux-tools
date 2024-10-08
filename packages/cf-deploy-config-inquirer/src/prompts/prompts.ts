import { type ConfirmQuestion, type InputQuestion } from '@sap-ux/inquirer-common';
import { t } from '../i18n';
import type {
    CfDeployConfigPromptOptions,
    CfDeployConfigQuestions,
    CfDeployConfigAnswers,
    destinationNamePromptOptions,
    CfSystemChoice
} from '../types';
import { promptNames } from '../types';
import * as validators from './validators';
import { isAppStudio } from '@sap-ux/btp-utils';

/**
 * Creates a prompt for specifying the destination name during the cf deployment process.
 *
 * Depending on the environment (whether it's BAS or vs code),
 * this function returns either a list-based input if BAS or input-based question if being called from vscode for selecting the destination.
 *
 * @param showDestinationHintMessage - Whether to show the destination hint message.
 * @param cfDestination - The configured destination for the Cloud Foundry deployment.
 * @param cfChoiceList - A list of available system choices.
 * @param additionalChoiceList - Additional choices available for the destination.
 * @param defaultValue - The default value for the destination option in the prompt.
 * @param displayCapError - Whether to display the CAP deployment error.
 * @returns {CfDeployConfigQuestions} An input or list question object for the destination name configuration, depending on the environment.
 */
function getDestinationNamePrompt(
    showDestinationHintMessage: boolean = false,
    cfDestination: string,
    cfChoiceList: CfSystemChoice[] = [],
    additionalChoiceList: CfSystemChoice[] = [],
    defaultValue: string,
    displayCapError: boolean = false
): CfDeployConfigQuestions {
    const isBAS = isAppStudio();
    const promptType = isBAS ? 'list' : 'input';
    return {
        guiOptions: {
            mandatory: !isBAS ?? !!cfDestination,
            breadcrumb: t('prompts.destinationNameMessage')
        },
        type: promptType,
        default: () => defaultValue,
        name: 'cfDestination',
        message: showDestinationHintMessage
            ? t('prompts.cfDestinationHintMessage')
            : t('prompts.destinationNameMessage'),
        validate: (destination: string): string | boolean => {
            if (displayCapError) {
                return t('errors.capDeploymentNoMtaError');
            }
            return validators.validateDestinationQuestion(destination, !cfDestination && isBAS);
        },
        choices: [...additionalChoiceList, ...cfChoiceList]//cfChoiceList.concat(additionalChoiceList)
    } as InputQuestion<CfDeployConfigAnswers>;
}

/**
 * Creates a prompt for managing application router during cf deployment.
 *
 *
 * This function returns a confirmation question that asks whether to add a managed application router
 * to the cf deployment. The prompt only appears if no mta file is found.
 *
 * @param mtaYamlExists - Indicates whether the MTA YAML file exists.
 * @param isCapProject - Indicates whether the project is a CAP project.
 * @returns {ConfirmQuestion<CfDeployConfigAnswers>} Returns a confirmation question object for configuring the application router.
 */
function getAddManagedRouterPrompt(mtaYamlExists: boolean, isCapProject: boolean = false): CfDeployConfigQuestions {
    return {
        when: (): boolean => !mtaYamlExists && !isCapProject,
        type: 'confirm',
        name: 'addManagedApprouter',
        guiOptions: {
            breadcrumb: t('prompts.addApplicationRouterBreadcrumbMessage')
        },
        message: (): string => t('prompts.generateManagedApplicationToRouterMessage'),
        default: (): boolean => true
    } as ConfirmQuestion<CfDeployConfigAnswers>;
}

/**
 *
 * @param addOverwriteQuestion Indicates whether the overwrite question should be shown.
 * @returns A confirmation question object which overwrites destination.
 */
function getOverwritePrompt(addOverwriteQuestion: boolean): CfDeployConfigQuestions {
    return {
        type: 'confirm',
        name: 'cfOverwrite',
        guiOptions: {
            hint: t('prompts.overwriteHintMessage')
        },
        default: () => {
            return true;
        },
        message: (): string => t('prompts.overwriteMessage'),
        when: (): boolean => addOverwriteQuestion
    } as ConfirmQuestion<CfDeployConfigAnswers>;
}

/**
 * Retrieves a list of deployment questions based on the application root and prompt options.
 *
 * @param {string} appRoot - The root directory of the application.
 * @param {CfDeployConfigPromptOptions} promptOptions - The configuration options for prompting during cf target deployment.
 * @returns {CfDeployConfigQuestions[]} Returns an array of questions related to cf deployment configuration.
 */
export function getQuestions(appRoot: string, promptOptions: CfDeployConfigPromptOptions): CfDeployConfigQuestions[] {
    const mtaYamlExists = promptOptions.mtaYamlExists;
    const isCapProject = promptOptions?.isCapProject ?? false;
    const destinationOptions = promptOptions[promptNames.destinationName] as destinationNamePromptOptions;
    const addOverwriteQuestion = promptOptions[promptNames.overwrite]?.addOverwriteQuestion ?? false;

    // Prepare the prompt questions
    const prompts: Record<promptNames, CfDeployConfigQuestions> = {
        [promptNames.destinationName]: getDestinationNamePrompt(
            destinationOptions?.showDestinationHintMessage,
            destinationOptions?.cfDestination,
            destinationOptions?.cfChoiceList,
            destinationOptions?.additionalChoiceList,
            destinationOptions?.defaultValue,
            !!(isCapProject && appRoot && !mtaYamlExists)
        ),
        [promptNames.addManagedApprouter]: getAddManagedRouterPrompt(mtaYamlExists, isCapProject),
        [promptNames.overwrite]: getOverwritePrompt(addOverwriteQuestion)
    };

    // Collect questions into an array
    const questions: CfDeployConfigQuestions[] = Object.values(prompts);
    return questions;
}
