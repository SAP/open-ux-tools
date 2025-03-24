import type { ToolsLogger } from '@sap-ux/logger';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import { FlexLayer, TargetApplications, getEndpointNames } from '@sap-ux/adp-tooling';
import type { AbapProvider, ConfigAnswers, TargetSystems } from '@sap-ux/adp-tooling';

import type {
    ApplicationPromptOptions,
    ConfigPromptOptions,
    ConfigQuestion,
    PasswordPromptOptions,
    SystemPromptOptions,
    UsernamePromptOptions
} from '../types';
import { t } from '../../utils/i18n';
import { configPromptNames } from '../types';
import { getApplicationChoices } from './helper/choices';
import { showApplicationQuestion, showCredentialQuestion } from './helper/conditions';

/**
 * A stateful prompter class that creates configuration questions.
 * This class accepts the needed dependencies and keeps track of state (e.g. the ApplicationManager instance).
 * It exposes a single public method {@link getPrompts} to retrieve the configuration questions.
 */
export class ConfigPrompter {
    /**
     * Instance of target applications class for loading applications.
     */
    private readonly targetApps: TargetApplications;
    /**
     * Indicates if the current layer is based on a customer base.
     */
    private readonly isCustomerBase: boolean;

    /**
     * Creates an instance of ConfigPrompter.
     *
     * @param {AbapProvider} abapProvider - The ABAP provider instance.
     * @param {TargetSystems} targetSystems - The target system class to retrieve system endpoints.
     * @param {FlexLayer} layer - The FlexLayer used to determine the base (customer or otherwise).
     * @param {ToolsLogger} logger - The logger instance for logging.
     */
    constructor(
        private readonly abapProvider: AbapProvider,
        private readonly targetSystems: TargetSystems,
        layer: FlexLayer,
        private readonly logger: ToolsLogger
    ) {
        this.targetApps = new TargetApplications(this.abapProvider, this.isCustomerBase, this.logger);
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
        const keyedPrompts: Record<configPromptNames, ConfigQuestion> = {
            [configPromptNames.system]: this.getSystemListPrompt(promptOptions?.[configPromptNames.system]),
            [configPromptNames.username]: this.getUsernamePrompt(promptOptions?.[configPromptNames.username]),
            [configPromptNames.password]: this.getPasswordPrompt(promptOptions?.[configPromptNames.password]),
            [configPromptNames.application]: this.getApplicationListPrompt(
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

    /**
     * Creates the system list prompt configuration.
     *
     * @param {SystemPromptOptions} _ - Optional configuration for the system prompt.
     * @returns The system list prompt as a {@link ConfigQuestion}.
     */
    private getSystemListPrompt(_?: SystemPromptOptions): ConfigQuestion {
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
            validate: async (value: string, answers: ConfigAnswers) => await this.validateSystem(value, answers)
        };
    }

    /**
     * Creates the username prompt configuration.
     *
     * @param {UsernamePromptOptions} _ - Optional configuration for the username prompt.
     * @returns The username prompt as a {@link ConfigQuestion}.
     */
    private getUsernamePrompt(_?: UsernamePromptOptions): ConfigQuestion {
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
            when: async (answers: ConfigAnswers) => {
                const systemRequiresAuth = await this.targetSystems.getSystemRequiresAuth(answers.system);
                return showCredentialQuestion(answers, systemRequiresAuth);
            }
        };
    }

    /**
     * Creates the password prompt configuration.
     *
     * @param {PasswordPromptOptions} _ - Optional configuration for the password prompt.
     * @returns The password prompt as a {@link ConfigQuestion}.
     */
    private getPasswordPrompt(_?: PasswordPromptOptions): ConfigQuestion {
        return {
            type: 'password',
            name: configPromptNames.password,
            message: t('prompts.passwordLabel'),
            mask: '*',
            guiOptions: {
                mandatory: true,
                hint: t('prompts.passwordTooltip')
            },
            validate: async (value: string, answers: ConfigAnswers) => await this.validatePassword(value, answers),
            when: async (answers: ConfigAnswers) => {
                const systemRequiresAuth = await this.targetSystems.getSystemRequiresAuth(answers.system);
                return showCredentialQuestion(answers, systemRequiresAuth);
            }
        };
    }

    /**
     * Creates the application list prompt configuration.
     *
     * @param {ApplicationPromptOptions} options - Optional configuration for the application prompt.
     * @returns The application list prompt as a {@link ConfigQuestion}.
     */
    private getApplicationListPrompt(options?: ApplicationPromptOptions): ConfigQuestion {
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
            choices: async () => {
                const apps = await this.targetApps.getApps();
                return getApplicationChoices(apps);
            },
            default: options?.default,
            validate: (value: TargetApplications) => this.validateApplicationSelection(value),
            when: async (answers: ConfigAnswers) => {
                const systemRequiresAuth = await this.targetSystems.getSystemRequiresAuth(answers.system);
                return showApplicationQuestion(answers, systemRequiresAuth);
            }
        };
    }

    /**
     * Validates the selected application.
     *
     * @param {string} app - The selected application.
     * @returns An error message if validation fails, or true if the selection is valid.
     */
    private validateApplicationSelection(app: TargetApplications): string | boolean {
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

        try {
            await this.abapProvider.setProvider(answers.system, undefined, answers.username, password);

            await this.targetApps.getApps();

            return true;
        } catch (e) {
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

        try {
            this.targetApps.resetApps();
            await this.abapProvider.setProvider(system, undefined, answers.username, answers.password);

            const systemRequiresAuth = await this.targetSystems.getSystemRequiresAuth(system);
            if (!systemRequiresAuth) {
                await this.targetApps.getApps();
            }
            return true;
        } catch (e) {
            return e.message;
        }
    }
}
