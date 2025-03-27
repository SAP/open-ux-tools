import type { ToolsLogger } from '@sap-ux/logger';
import { isAxiosError, type AbapServiceProvider } from '@sap-ux/axios-extension';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import type { ConfigAnswers, TargetApplication, TargetSystems } from '@sap-ux/adp-tooling';
import type { InputQuestion, ListQuestion, PasswordQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { FlexLayer, getConfiguredProvider, getEndpointNames, loadApps } from '@sap-ux/adp-tooling';

import type {
    ApplicationPromptOptions,
    ConfigPromptOptions,
    ConfigQuestion,
    PasswordPromptOptions,
    SystemCliValidationPromptOptions,
    SystemPromptOptions,
    UsernamePromptOptions
} from '../types';
import { t } from '../../utils/i18n';
import { configPromptNames } from '../types';
import { getApplicationChoices } from './helper/choices';
import { showApplicationQuestion, showCredentialQuestion } from './helper/conditions';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';

/**
 * A stateful prompter class that creates configuration questions.
 * This class accepts the needed dependencies and keeps track of state (e.g. the ApplicationManager instance).
 * It exposes a single public method {@link getPrompts} to retrieve the configuration questions.
 */
export class ConfigPrompter {
    /**
     * Indicates if the current layer is based on a customer base.
     */
    private readonly isCustomerBase: boolean;
    /**
     * Instance of AbapServiceProvider.
     */
    private abapProvider: AbapServiceProvider;
    /**
     * Loaded target applications for a system.
     */
    private targetApps: TargetApplication[];
    /**
     * Flag indicating that system login is successful.
     */
    private isLoginSuccessful: boolean;
    /**
     * Flag indicating that system requires authentication in BAS or it does not exist in VS Code.
     */
    private isAuthRequired: boolean;

    /**
     * Creates an instance of ConfigPrompter.
     *
     * @param {TargetSystems} targetSystems - The target system class to retrieve system endpoints.
     * @param {FlexLayer} layer - The FlexLayer used to determine the base (customer or otherwise).
     * @param {ToolsLogger} logger - Instance of the logger.
     */
    constructor(private readonly targetSystems: TargetSystems, layer: FlexLayer, private readonly logger: ToolsLogger) {
        this.isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;
    }

    /**
     * Retrieves an array of configuration questions based on provided options.
     * This is the only public method for retrieving prompts.
     *
     * @param {ConfigPromptOptions} promptOptions - Optional configuration to control prompt behavior and defaults.
     * @returns An array of configuration questions.
     */
    public getPrompts(promptOptions?: ConfigPromptOptions): ConfigQuestion[] {
        const isCLI = getHostEnvironment() === hostEnvironment.cli;

        const keyedPrompts: Record<configPromptNames, ConfigQuestion> = {
            [configPromptNames.system]: this.getSystemListPrompt(promptOptions?.[configPromptNames.system]),
            [configPromptNames.systemSelectionCli]: this.getSystemValidationPromptForCli({ hide: !isCLI }),
            [configPromptNames.username]: this.getUsernamePrompt(promptOptions?.[configPromptNames.username]),
            [configPromptNames.password]: this.getPasswordPrompt(promptOptions?.[configPromptNames.password]),
            [configPromptNames.application]: this.getApplicationListPrompt(
                promptOptions?.[configPromptNames.application]
            ),
            [configPromptNames.appValidationCli]: this.getApplicationValidationPromptForCli({ hide: !isCLI })
        };

        const questions: ConfigQuestion[] = Object.entries(keyedPrompts)
            .filter(([promptName, _]) => {
                const options = promptOptions?.[promptName as configPromptNames];
                return !(options && 'hide' in options && options.hide);
            })
            .map(([_, question]) => question);

        return questions;
    }

    /**
     * Creates the system list prompt configuration.
     *
     * @param {SystemPromptOptions} _ - Optional configuration for the system prompt.
     * @returns The system list prompt as a {@link ConfigQuestion}.
     */
    private getSystemListPrompt(_?: SystemPromptOptions): ListQuestion<ConfigAnswers> {
        return {
            type: 'list',
            name: configPromptNames.system,
            message: t('prompts.systemLabel'),
            choices: async () => {
                const systems = await this.targetSystems.getSystems();
                return getEndpointNames(systems);
            },
            guiOptions: {
                mandatory: true,
                breadcrumb: true,
                hint: t('prompts.systemTooltip')
            },
            default: '',
            validate: async (value: string, answers: ConfigAnswers) => await this.validateSystem(value, answers)
        };
    }

    /**
     * Only used in the CLI context when prompt is of type `list` because the validation does not run on CLI for the system list prompt.
     *
     * @returns Dummy prompt that runs in the CLI only.
     */
    private getSystemValidationPromptForCli(options: SystemCliValidationPromptOptions) {
        return {
            name: 'systemValidationCli',
            when: async (answers: ConfigAnswers): Promise<boolean> => {
                if (options.hide || !answers.system) {
                    return false;
                }

                const result = await this.validateSystem(answers.system, answers);
                if (typeof result === 'string') {
                    if (!result.includes('401')) {
                        throw new Error(result);
                    }
                }

                return false;
            }
        } as YUIQuestion;
    }

    /**
     * Creates the username prompt configuration.
     *
     * @param {UsernamePromptOptions} _ - Optional configuration for the username prompt.
     * @returns The username prompt as a {@link ConfigQuestion}.
     */
    private getUsernamePrompt(_?: UsernamePromptOptions): InputQuestion<ConfigAnswers> {
        return {
            type: 'input',
            name: configPromptNames.username,
            message: t('prompts.usernameLabel'),
            guiOptions: {
                mandatory: true,
                breadcrumb: true,
                hint: t('prompts.usernameTooltip')
            },
            filter: (val: string): string => val.trim(),
            validate: (val: string) => validateEmptyString(val),
            when: (answers: ConfigAnswers) => showCredentialQuestion(answers, this.isAuthRequired)
        };
    }

    /**
     * Creates the password prompt configuration.
     *
     * @param {PasswordPromptOptions} _ - Optional configuration for the password prompt.
     * @returns The password prompt as a {@link ConfigQuestion}.
     */
    private getPasswordPrompt(_?: PasswordPromptOptions): PasswordQuestion<ConfigAnswers> {
        return {
            type: 'password',
            name: configPromptNames.password,
            message: t('prompts.passwordLabel'),
            mask: '*',
            guiOptions: {
                type: 'login',
                mandatory: true,
                hint: t('prompts.passwordTooltip')
            },
            validate: async (value: string, answers: ConfigAnswers) => await this.validatePassword(value, answers),
            when: (answers: ConfigAnswers) => showCredentialQuestion(answers, this.isAuthRequired)
        };
    }

    /**
     * Creates the application list prompt configuration.
     *
     * @param {ApplicationPromptOptions} options - Optional configuration for the application prompt.
     * @returns The application list prompt as a {@link ConfigQuestion}.
     */
    private getApplicationListPrompt(options?: ApplicationPromptOptions): ListQuestion<ConfigAnswers> {
        return {
            type: 'list',
            name: configPromptNames.application,
            message: t('prompts.applicationListLabel'),
            guiOptions: {
                mandatory: true,
                breadcrumb: true,
                hint: t('prompts.applicationListTooltip'),
                applyDefaultWhenDirty: true
            },
            choices: () => getApplicationChoices(this.targetApps),
            default: options?.default,
            validate: (value: TargetApplication) => this.validateApplicationSelection(value),
            when: (answers: ConfigAnswers) =>
                showApplicationQuestion(answers, !!this.targetApps?.length, this.isAuthRequired, this.isLoginSuccessful)
        };
    }

    /**
     * Only used in the CLI context when prompt is of type `list` because the validation does not run on CLI for the application list prompt.
     *
     * @returns Dummy prompt that runs in the CLI only.
     */
    private getApplicationValidationPromptForCli(options: SystemCliValidationPromptOptions) {
        return {
            name: 'appValidationCli',
            when: async (answers: ConfigAnswers): Promise<boolean> => {
                if (options.hide || !answers.system) {
                    return false;
                }

                const result = this.validateApplicationSelection(answers.application);
                if (typeof result === 'string') {
                    throw new Error(result);
                }

                return false;
            }
        } as YUIQuestion;
    }

    /**
     * Validates the selected application.
     *
     * @param {string} app - The selected application.
     * @returns An error message if validation fails, or true if the selection is valid.
     */
    private validateApplicationSelection(app: TargetApplication): string | boolean {
        if (!app) {
            return t('error.selectCannotBeEmptyError', { value: 'Application' });
        }
        return true;
    }

    /**
     * Validates the password by setting up the provider and, if necessary,
     * loading the available applications.
     *
     * @param {string} password - The inputted password.
     * @param {ConfigAnswers} answers - The configuration answers provided by the user.
     * @returns An error message if validation fails, or true if the system selection is valid.
     */
    private async validatePassword(password: string, answers: ConfigAnswers): Promise<string | boolean> {
        const validationResult = validateEmptyString(password);
        if (typeof validationResult === 'string') {
            return validationResult;
        }

        const options = {
            system: answers.system,
            client: undefined,
            username: answers.username,
            password
        };

        try {
            this.abapProvider = await getConfiguredProvider(options, this.logger);
            await this.getSystemInfo();
            this.targetApps = await loadApps(this.abapProvider, this.isCustomerBase);
            this.isLoginSuccessful = true;
            return true;
        } catch (e) {
            this.isLoginSuccessful = false;
            return e.message;
        }
    }

    /**
     * Validates the system selection by setting up the provider and, if necessary,
     * loading the available applications.
     *
     * @param {string} system - The selected system.
     * @param {ConfigAnswers} answers - The configuration answers provided by the user.
     * @returns An error message if validation fails, or true if the system selection is valid.
     */
    private async validateSystem(system: string, answers: ConfigAnswers): Promise<string | boolean> {
        const validationResult = validateEmptyString(system);
        if (typeof validationResult === 'string') {
            return validationResult;
        }

        const options = {
            system,
            client: undefined,
            username: answers.username,
            password: answers.password
        };

        try {
            this.targetApps = [];
            this.abapProvider = await getConfiguredProvider(options, this.logger);
            this.isAuthRequired = await this.targetSystems.getSystemRequiresAuth(system);
            if (!this.isAuthRequired) {
                await this.getSystemInfo();
                this.targetApps = await loadApps(this.abapProvider, this.isCustomerBase);
            }
        } catch (e) {
            return e.message;
        }

        return true;
    }

    /**
     * Fetches system information from the provider's layered repository.
     *
     * @returns {SystemInfo} System into containing system supported adaptation project types and translations.
     */
    private async getSystemInfo(): Promise<void> {
        try {
            const lrep = this.abapProvider.getLayeredRepository();
            await lrep.getSystemInfo();
        } catch (e) {
            this.handleSystemError(e);
        }
    }

    /**
     * Handles errors that occur while fetching system information, setting default values and rethrowing if necessary.
     *
     * @param {Error} error - The error encountered during the system info fetch.
     */
    private handleSystemError(error: Error): void {
        this.logger.debug(`Failed to fetch system information. Reason: ${error.message}`);
        if (isAxiosError(error)) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error(`Authentication error: ${error.message}`);
            }
        }
    }
}
