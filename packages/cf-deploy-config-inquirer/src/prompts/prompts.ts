import { type ConfirmQuestion, type InputQuestion } from '@sap-ux/inquirer-common';
import { t } from '../i18n';
import type { CfDeployConfigPromptOptions, CfDeployConfigQuestions, CfDeployConfigAnswers } from '../types';
import { promptNames } from '../types';
import * as validators from './validators';
import { isAppStudio } from '@sap-ux/btp-utils';
import { showManagedAppRouterQuestion, showOverwriteQuestion } from './conditions';

/**
 * Creates a prompt for specifying the destination name during the cf deployment process.
 *
 * Depending on the environment (whether it's BAS or vs code),
 * this function returns either a list-based input if BAS or input-based question if being called from vscode for selecting the destination.
 *
 * @param {string} appRoot - The root directory of the application.
 * @param {CfDeployConfigPromptOptions} promptOptions - Configuration options used to tailor the prompt questions.
 * @param {boolean} [promptOptions.isAbapDirectServiceBinding] - Indicates if ABAP direct service binding is being used.
 * @param {string} [promptOptions.cfDestination] - The configured destination for the Cloud Foundry deployment.
 * @param {boolean} [promptOptions.isCapProject] - Whether the project is a CAP project. Defaults to `false` if not specified.
 * @returns {CfDeployConfigQuestions} An input or list question object for the destination name configuration, depending on the environment.
 */
function getDestinationNamePrompt(
    appRoot: string,
    promptOptions: CfDeployConfigPromptOptions
): CfDeployConfigQuestions {
    const {
        showDestinationHintMessage = false,
        cfDestination,
        isCapProject = false,
        cfChoiceList = [],
        mtaYamlExists,
        defaultDestinationOption
    } = promptOptions;
    const isBAS = isAppStudio();
    const promptType = isBAS ? 'list' : 'input';
    return {
        guiOptions: {
            mandatory: !isBAS ?? !!cfDestination,
            breadcrumb: t('prompts.destinationNameMessage')
        },
        type: promptType,
        default: () => defaultDestinationOption,
        name: 'cfDestination',
        message: showDestinationHintMessage
            ? t('prompts.cfDestinationHintMessage')
            : t('prompts.destinationNameMessage'),
        validate: (destination: string): string | boolean => {
            if (isCapProject && appRoot && !mtaYamlExists) {
                return t('errors.capDeploymentNoMtaError');
            }
            return validators.validateDestinationQuestion(destination, !cfDestination && isBAS);
        },
        choices: () => cfChoiceList
    } as InputQuestion<CfDeployConfigAnswers>;
}

/**
 * Creates a prompt for managing application router during cf deployment.
 *
 * This function returns a confirmation question that asks whether to add a managed application router
 * to the cf deployment. The prompt only appears if no mta file is found.
 *
 * @param {CfDeployConfigPromptOptions} promptOptions - Configuration options used to tailor the prompt questions.
 * @param {string} promptOptions.targetPath - The path where the deployment target resides.
 * @param {boolean} [promptOptions.isCapProject] - Whether the project is a CAP project. Defaults to `false` if not specified.
 * @returns {<ConfirmQuestion<CfDeployConfigAnswers>>} Returns a confirmation question object for configuring the application router.
 */
function getAddManagedRouterPrompt(promptOptions: CfDeployConfigPromptOptions): CfDeployConfigQuestions {
    const { mtaYamlExists, isCapProject = false } = promptOptions;
    return {
        when: (): boolean => showManagedAppRouterQuestion(mtaYamlExists, isCapProject),
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
        when: (): boolean => showOverwriteQuestion(addOverwriteQuestion)
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
    // Prepare the prompt questions
    const prompts: Record<promptNames, CfDeployConfigQuestions> = {
        [promptNames.destinationName]: getDestinationNamePrompt(appRoot, promptOptions),
        [promptNames.addManagedApprouter]: getAddManagedRouterPrompt(promptOptions),
        [promptNames.overwrite]: getOverwritePrompt(promptOptions.addOverwriteQuestion ?? false)
    };

    // Collect questions into an array
    const questions: CfDeployConfigQuestions[] = Object.values(prompts);
    return questions;
}
