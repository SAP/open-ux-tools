import {
    type ConfirmQuestion,
    type InputQuestion,
    type ListQuestion,
    type SearchQuestion,
    searchableListPrompt
} from '@sap-ux/inquirer-common';
import { t } from '../i18n.js';
import {
    type CfDeployConfigPromptOptions,
    type CfDeployConfigQuestions,
    type CfDeployConfigAnswers,
    type DestinationNamePromptOptions,
    type CfSystemChoice,
    type CfDeployConfigRouterAnswers,
    type CfDeployConfigRouterQuestions,
    RouterModuleType,
    promptNames
} from '../types.js';
import * as validators from './validators.js';
import { isAppStudio, isFullUrlDestination } from '@sap-ux/btp-utils';
import { getCfSystemChoices, fetchBTPDestinations } from './prompt-helpers.js';
import type { Logger } from '@sap-ux/logger';
import { Severity } from '@sap-devx/yeoman-ui-types';

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
 * @param {boolean} [destinationOptions.addBTPDestinationList] - A flag to indicate whether to include BTP destination choices.
 * @returns {Promise<CfDeployConfigQuestions>} A promise that resolves to the configuration
 *          of the prompt, which includes the question and any related options for rendering
 *          the prompt in a user interface.
 */
async function getDestinationNamePrompt(
    destinationOptions: DestinationNamePromptOptions
): Promise<CfDeployConfigQuestions> {
    const {
        hint = false,
        additionalChoiceList = [],
        defaultValue,
        useAutocomplete = false,
        addBTPDestinationList = true
    } = destinationOptions;

    const isBAS = isAppStudio();
    const destinations = addBTPDestinationList ? await fetchBTPDestinations() : {};
    const destinationList: CfSystemChoice[] = [...additionalChoiceList, ...(await getCfSystemChoices(destinations))];
    // If BAS is used or additional choices are provided, the prompt should be a list
    // If VsCode is used and additional choices are not provided, the prompt should be an input field
    // If VsCode is used and additional choices are provided, the prompt should be a list
    const useList = isBAS || additionalChoiceList.length > 0;
    const base: Omit<SearchQuestion<CfDeployConfigAnswers>, 'type' | 'source'> = {
        guiOptions: {
            mandatory: !isBAS,
            breadcrumb: t('prompts.destinationNameMessage')
        },
        default: defaultValue,
        name: promptNames.destinationName,
        message: () => (hint ? t('prompts.directBindingDestinationHint') : t('prompts.destinationNameMessage')),
        validate: (destination: unknown): string | boolean => {
            return validators.validateDestinationQuestion(destination as string, !destination && isBAS);
        },
        additionalMessages: (selectedDestination: unknown) => {
            const choice = destinationList.find((c) => c.value === selectedDestination);
            const dest = destinations?.[selectedDestination as string];
            if (choice?.isFullUrl || (dest && isFullUrlDestination(dest))) {
                return {
                    message: t('warning.fullUrlDestination'),
                    severity: Severity.warning
                };
            }
            return undefined;
        }
    };
    if (useList) {
        // If autocomplete is enabled and there are destination choices, emit the filterable `search` arm
        return searchableListPrompt<CfDeployConfigAnswers>(
            base,
            destinationList,
            useAutocomplete && destinationList.length > 0
        ) as CfDeployConfigQuestions;
    }
    return {
        ...base,
        type: 'input'
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
function getAddManagedAppRouterPrompt(): CfDeployConfigQuestions {
    return {
        type: 'confirm',
        name: promptNames.addManagedAppRouter,
        guiOptions: {
            breadcrumb: t('prompts.addApplicationRouterBreadcrumbMessage')
        },
        message: () => t('prompts.generateManagedApplicationToRouterMessage'),
        default: () => true
    } as ConfirmQuestion<CfDeployConfigAnswers>;
}

/**
 *
 * @returns A confirmation question object which overwrites destination.
 */
function getOverwritePrompt(): CfDeployConfigQuestions {
    // The prompt name (`overwriteCfConfig`) intentionally differs from the answer key (`overwrite`)
    // it maps to, so the arm's `name: keyof CfDeployConfigAnswers` constraint cannot be satisfied directly.
    return {
        type: 'confirm',
        name: promptNames.overwriteCfConfig,
        guiOptions: {
            hint: t('prompts.overwriteHintMessage')
        },
        default: () => {
            return true;
        },
        message: () => t('prompts.overwriteMessage')
    } as unknown as CfDeployConfigQuestions;
}

/**
 *
 * @returns A list question object with the available router options, defaulting to `Managed`.
 */
function getRouterOptionsPrompt(): CfDeployConfigRouterQuestions {
    return {
        type: 'select',
        name: promptNames.routerType,
        guiOptions: {
            mandatory: true,
            breadcrumb: t('prompts.generateDeploymentRouterOptionsMessage')
        },
        default: RouterModuleType.Managed, // Should always be the preferred choice
        message: () => t('prompts.generateDeploymentRouterOptionsMessage'),
        additionalMessages: (selectedRouter: RouterModuleType) => {
            let additionalMessage;
            if (selectedRouter && selectedRouter === RouterModuleType.AppFront) {
                additionalMessage = {
                    message: t('warning.appFrontendServiceRouterChoice'),
                    severity: Severity.warning
                };
            }
            return additionalMessage;
        },

        choices: [
            { name: t('prompts.routerType.managedAppRouter'), value: RouterModuleType.Managed },
            { name: t('prompts.routerType.appFrontAppService'), value: RouterModuleType.AppFront }
        ]
    } as ListQuestion<CfDeployConfigRouterAnswers>;
}

/**
 * Retrieves a list of deployment questions based on the application root and prompt options.
 *
 * @param {CfDeployConfigPromptOptions} promptOptions - The configuration options for prompting during cf target deployment.
 * @param {Logger} [log] - The logger instance to use for logging.
 * @returns {CfDeployConfigQuestions[]} Returns an array of questions related to cf deployment configuration.
 */
export async function getQuestions(
    promptOptions: CfDeployConfigPromptOptions,
    log?: Logger
): Promise<CfDeployConfigQuestions[]> {
    const destinationOptions = promptOptions[promptNames.destinationName] as DestinationNamePromptOptions;
    const addOverwriteQuestion = !promptOptions.overwriteCfConfig?.hide;
    const addManagedAppRouterQuestions = !promptOptions.addManagedAppRouter?.hide;
    const addRouterTypeQuestion = !promptOptions.routerType?.hide;

    const questions: CfDeployConfigQuestions[] = [];
    // Collect questions into an array
    questions.push(await getDestinationNamePrompt(destinationOptions));

    if (addManagedAppRouterQuestions) {
        log?.info(t('info.addManagedAppRouter'));
        questions.push(getAddManagedAppRouterPrompt());
    }

    if (addOverwriteQuestion) {
        log?.info(t('info.overwriteDestination'));
        questions.push(getOverwritePrompt());
    }

    if (addRouterTypeQuestion) {
        log?.info(t('info.routerOptions'));
        questions.push(getRouterOptionsPrompt());
    }

    return questions;
}
