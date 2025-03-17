import type { YUIQuestion, GuiOptions, PromptSeverityMessage } from '@sap-ux/inquirer-common';
import type { ListQuestionOptions } from 'inquirer';

import { validateEmptyString } from '@sap-ux/project-input-validator';
import { t } from '../../utils/i18n';
import { AbapProvider, Application, ApplicationManager, EndpointsManager, getEndpointNames } from '@sap-ux/adp-tooling';
import { getApplicationChoices } from './helper/choices';
import { showApplicationQuestion, showCredentialQuestion } from './helper/conditions';

/**
 * Enumeration of prompt names used in the configuration.
 */
export enum configPromptNames {
    system = 'system',
    username = 'username',
    password = 'password',
    application = 'application'
}

/**
 * Interface representing the answers collected from the configuration prompts.
 */
export interface ConfigAnswers {
    system: string;
    username: string;
    password: string;
    application: Application;
}

/**
 * The question type specific to configuration prompts.
 */
export interface ConfigQuestion extends YUIQuestion<ConfigAnswers>, Partial<Pick<ListQuestionOptions, 'choices'>> {
    name: configPromptNames;
    guiOptions?: GuiOptions;
    additionalMessages?: PromptSeverityMessage;
    mask?: string;
}

/**
 * Options for the 'system' prompt.
 */
export interface SystemPromptOptions {
    default?: string;
    hide?: boolean;
}

/**
 * Options for the 'username' prompt.
 */
export interface UsernamePromptOptions {
    default?: string;
    hide?: boolean;
}

/**
 * Options for the 'password' prompt.
 */
export interface PasswordPromptOptions {
    hide?: boolean;
}

/**
 * Options for the 'application' prompt.
 */
export interface ApplicationPromptOptions {
    default?: string;
    hide?: boolean;
}

/**
 * Common options for the configuration inquirer.
 */
export interface ConfigPromptCommonOptions {
    silent?: boolean;
}

/**
 * The options for the configuration inquirer & the prompts.
 */
export type ConfigPromptOptions = Partial<{
    [configPromptNames.system]: SystemPromptOptions;
    [configPromptNames.username]: UsernamePromptOptions;
    [configPromptNames.password]: PasswordPromptOptions;
    [configPromptNames.application]: ApplicationPromptOptions;
}> &
    ConfigPromptCommonOptions;

/**
 * Creates the 'system' list prompt.
 *
 * @param choices - Array of available system names.
 * @param options - Optional configuration for the system prompt.
 * @returns {ConfigQuestion} The prompt configuration for system selection.
 */
export function getSystemListPrompt(appManager: ApplicationManager, options?: SystemPromptOptions): ConfigQuestion {
    return {
        type: 'list',
        name: configPromptNames.system,
        message: t('prompts.systemLabel'),
        choices: () => getEndpointNames(EndpointsManager.getEndpoints()),
        guiOptions: {
            mandatory: true,
            breadcrumb: 'System',
            hint: t('prompts.systemTooltip')
        },
        validate: async (value: string, answers: ConfigAnswers): Promise<boolean | string> => {
            const validationResult = validateEmptyString(value);
            if (typeof validationResult === 'string') {
                return validationResult;
            }

            try {
                await AbapProvider.setProvider(value, undefined, answers.username, answers.password);

                const provider = AbapProvider.getProvider();

                const systemRequiresAuth = EndpointsManager.getSystemRequiresAuth(value);

                if (!systemRequiresAuth) {
                    const isCloudSystem = await provider.isAbapCloud();
                    await appManager.loadApps(isCloudSystem);
                }

                return true;
            } catch (e) {
                return e.message;
            }

            // Connect to system -> Initialize a provider with the selected system

            // Check if system has authentication
            // const hasAuth = this.endpointsManager.getSystemRequiresAuth(value);

            // If doesn't have system authentication, validate system data fetching
            // if (!this.hasSystemAuthentication) {
            //     /**
            //      * 1. Fetches system supports Flex UI features.
            //      * 2. Fetches system information from the provider's layered repository.
            //      */
            //     await this.getSystemData();
            //     /**
            //      * Validates the UI5 system version based on the provided value or fetches all relevant versions if no value is provided.
            //      */
            //     await this.validateSystemVersion(value);
            //     /**
            //      * Validates the adaptation project types based on the system information and user base.
            //      */
            //     return this.validateAdpTypes();
            // }
        }
    };
}

/**
 * Creates the 'username' prompt.
 *
 * @param options - Optional configuration for the username prompt.
 * @returns {ConfigQuestion} The prompt configuration for entering the username.
 */
export function getUsernamePrompt(options?: UsernamePromptOptions): ConfigQuestion {
    return {
        type: 'input',
        name: configPromptNames.username,
        message: t('prompts.usernameLabel'),
        guiOptions: {
            mandatory: true,
            breadcrumb: 'Username'
        },
        default: options?.default,
        filter: (val: string): string => val.trim(),
        validate: (val: string) => validateEmptyString(val),
        when: (answers: ConfigAnswers) => showCredentialQuestion(answers)
    };
}

/**
 * Creates the 'password' prompt.
 *
 * @param options - Optional configuration for the password prompt.
 * @returns {ConfigQuestion} The prompt configuration for entering the password.
 */
export function getPasswordPrompt(appManager: ApplicationManager, options?: PasswordPromptOptions): ConfigQuestion {
    return {
        type: 'password',
        name: configPromptNames.password,
        message: t('prompts.passwordLabel'),
        mask: '*',
        guiOptions: {
            mandatory: true
        },
        validate: async (value: string, answers: ConfigAnswers) => {
            const validationResult = validateEmptyString(value);
            if (typeof validationResult === 'string') {
                return validationResult;
            }

            try {
                // TODO:
                await AbapProvider.setProvider(answers.system, undefined, answers.username, value);

                const provider = AbapProvider.getProvider();

                const systemRequiresAuth = EndpointsManager.getSystemRequiresAuth(value);

                if (!systemRequiresAuth) {
                    const isCloudSystem = await provider.isAbapCloud();
                    await appManager.loadApps(isCloudSystem);
                }

                // /**
                //  * 1. Fetches system supports Flex UI features.
                // await provider.get(AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH, acceptHeaders);
                //  * 2. Fetches system information from the provider's layered repository.
                //  */
                // await this.getSystemData();
                // /**
                //  * Validates the UI5 system version based on the provided value or fetches all relevant versions if no value is provided.
                //  */
                // await this.validateSystemVersion(value);
                // /**
                //  * Retrieve applications
                //  */
                // await this.getApplications();
                // /**
                //  * Validates the adaptation project types based on the system information and user base.
                //  */
                // if (isAppStudio()) {
                //     return this.validateAdpTypes();
                // }
            } catch (e) {
                return e.message;
            }
            return true;
        },
        when: (answers: ConfigAnswers) => showCredentialQuestion(answers)
    };
}

/**
 * Creates the 'application' list prompt.
 *
 * @param options - Optional configuration for the application prompt.
 * @returns {ConfigQuestion} The prompt configuration for selecting an application.
 */
export function getApplicationListPrompt(
    appsManager: ApplicationManager,
    options?: ApplicationPromptOptions
): ConfigQuestion {
    return {
        type: 'list',
        name: configPromptNames.application,
        message: t('prompts.applicationListLabel'),
        guiOptions: {
            mandatory: true,
            breadcrumb: 'Application',
            hint: t('prompts.applicationListTooltip'),
            applyDefaultWhenDirty: true
        },
        choices: () => {
            const apps = appsManager.getApps() ?? [];
            return getApplicationChoices(apps);
        },
        default: options?.default,
        validate: async (value: string) => {
            if (!value) {
                return t('validators.inputCannotBeEmpty');
            }

            // TODO:
            /**
             * Determine if the application supports manifest-first approach and manifest url exists.
             */
            // const isSupported = await this.manifestManager.isAppSupported(value.id);

            /**
             * If supported, get the application manifest.
             */
            // const manifest = await this.manifestManager.getManifest(value.id);

            /**
             * Get the system version and validate adp over adp and partial support
             */
            // this.evaluateApplicationSupport(manifest, value);
            /**
             * Check if app does not support manifest or adaptation
             */
            // Validates the selected application for adaptation projects, checking for specific support flags
            // * and validating the application manifest.
            return true;
        },
        when: (answers: ConfigAnswers) => showApplicationQuestion(answers)
    };
}

/**
 * Combines and maps the configuration prompts based on provided options and choices.
 *
 * @param promptOptions - Optional configuration to control prompt behavior and defaults.
 * @returns {ConfigQuestion[]} An array of configuration prompt objects.
 */
export function getConfigurationQuestions(promptOptions?: ConfigPromptOptions): ConfigQuestion[] {
    const appManager = new ApplicationManager(true);
    const keyedPrompts: Record<configPromptNames, ConfigQuestion> = {
        [configPromptNames.system]: getSystemListPrompt(appManager, promptOptions?.[configPromptNames.system]),
        [configPromptNames.username]: getUsernamePrompt(promptOptions?.[configPromptNames.username]),
        [configPromptNames.password]: getPasswordPrompt(appManager, promptOptions?.[configPromptNames.password]),
        [configPromptNames.application]: getApplicationListPrompt(
            appManager,
            promptOptions?.[configPromptNames.application]
        )
    };

    const questions: ConfigQuestion[] = Object.entries(keyedPrompts)
        .filter(([promptName, _]) => {
            const options = promptOptions?.[promptName as configPromptNames];
            return !(options && 'hide' in options && options.hide);
        })
        .map(([_, question]) => question);

    return questions;
}
