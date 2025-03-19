import { ToolsLogger } from '@sap-ux/logger';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import { AbapProvider, ApplicationManager, EndpointsManager, FlexLayer, getEndpointNames } from '@sap-ux/adp-tooling';

import type {
    ApplicationPromptOptions,
    ConfigAnswers,
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
    private appsManager: ApplicationManager;
    private logger: ToolsLogger;

    /**
     * Indicates if the current layer is based on a customer base.
     */
    public isCustomerBase: boolean;

    /**
     * Creates an instance of ConfigPrompter.
     *
     * @param {AbapProvider} provider - The ABAP provider instance.
     * @param {EndpointsManager} endpointsManager - The endpoints manager to retrieve system endpoints.
     * @param {FlexLayer} layer - The FlexLayer used to determine the base (customer or otherwise).
     * @param {ToolsLogger} logger - The logger instance for logging.
     */
    constructor(
        private provider: AbapProvider,
        private endpointsManager: EndpointsManager,
        layer: FlexLayer,
        logger: ToolsLogger
    ) {
        this.logger = logger;
        this.isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;
        this.appsManager = new ApplicationManager(this.provider, this.isCustomerBase, this.logger);
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
            choices: () => getEndpointNames(this.endpointsManager.getEndpoints()),
            guiOptions: {
                mandatory: true,
                breadcrumb: 'System',
                hint: t('prompts.systemTooltip')
            },
            validate: async (value: string, answers: ConfigAnswers) => await this.validateSystem(value, answers)
        };
    }

    /**
     * Creates the username prompt configuration.
     *
     * @param {UsernamePromptOptions} options - Optional configuration for the username prompt.
     * @returns The username prompt as a {@link ConfigQuestion}.
     */
    private getUsernamePrompt(options?: UsernamePromptOptions): ConfigQuestion {
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
            when: (answers: ConfigAnswers) =>
                showCredentialQuestion(answers, this.endpointsManager.getSystemRequiresAuth(answers.system))
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
                mandatory: true
            },
            validate: async (value: string, answers: ConfigAnswers) => await this.validateSystem(value, answers),
            when: (answers: ConfigAnswers) =>
                showCredentialQuestion(answers, this.endpointsManager.getSystemRequiresAuth(answers.system))
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
                breadcrumb: 'Application',
                hint: t('prompts.applicationListTooltip'),
                applyDefaultWhenDirty: true
            },
            choices: () => {
                const apps = this.appsManager.getApps();
                return getApplicationChoices(apps);
            },
            default: options?.default,
            validate: (value: string) => this.validateApplicationSelection(value),
            when: (answers: ConfigAnswers) =>
                showApplicationQuestion(answers, this.endpointsManager.getSystemRequiresAuth(answers.system))
        };
    }

    /**
     * Validates the selected application.
     *
     * @param {string} app - The selected application.
     * @returns An error message if validation fails, or true if the selection is valid.
     */
    private validateApplicationSelection(app: string): string | boolean {
        if (!app) {
            return t('validators.inputCannotBeEmpty');
        }
        return true;
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
        if (!system) {
            return t('validators.inputCannotBeEmpty');
        }

        try {
            await this.provider.setProvider(system, undefined, answers.username, answers.password);

            const systemRequiresAuth = this.endpointsManager.getSystemRequiresAuth(system);
            if (!systemRequiresAuth) {
                const providerInstance = this.provider.getProvider();
                const isCloudSystem = await providerInstance.isAbapCloud();
                await this.appsManager.loadApps(isCloudSystem);
            }
            return true;
        } catch (e) {
            return e.message;
        }
    }
}
