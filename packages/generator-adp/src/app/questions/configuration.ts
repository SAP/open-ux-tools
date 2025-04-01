import {
    UI5VersionManager,
    FlexLayer,
    TargetManifest,
    getConfiguredProvider,
    getEndpointNames,
    getFlexUISupportedSystem,
    getSystemUI5Version,
    isFeatureSupportedVersion,
    loadApps
} from '@sap-ux/adp-tooling';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import { isAxiosError, type AbapServiceProvider } from '@sap-ux/axios-extension';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import type { InputQuestion, ListQuestion, PasswordQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { ConfigAnswers, FlexUISupportedSystem, TargetApplication, TargetSystems } from '@sap-ux/adp-tooling';

import type {
    ApplicationPromptOptions,
    CliValidationPromptOptions,
    ConfigPromptOptions,
    ConfigQuestion,
    PasswordPromptOptions,
    SystemPromptOptions,
    UsernamePromptOptions
} from '../types';
import { t } from '../../utils/i18n';
import { configPromptNames } from '../types';
import { AppIdentifier } from '../app-identifier';
import { getApplicationChoices } from './helper/choices';
import { showApplicationQuestion, showCredentialQuestion } from './helper/conditions';
import { appAdditionalMessages, systemAdditionalMessages } from './helper/additional-messages';

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
     * Cached UI flexibility information from the system.
     */
    private flexUISystem: FlexUISupportedSystem | undefined;
    /**
     * Flag indicating if the project is a cloud project.
     */
    private isCloudProject: boolean | undefined;
    /**
     * Flag indicating whether the selected application is supported.
     */
    private isApplicationSupported: boolean;
    /**
     * Instance of AppIdentifier to validate application support.
     */
    private appIdentifier: AppIdentifier;
    /**
     * UI5 version manager for handling version-related validations.
     */
    private readonly ui5Manager: UI5VersionManager;

    /**
     * Creates an instance of ConfigPrompter.
     *
     * @param {TargetSystems} targetSystems - The target system class to retrieve system endpoints.
     * @param {FlexLayer} layer - The FlexLayer used to determine the base (customer or otherwise).
     * @param {ToolsLogger} logger - Instance of the logger.
     */
    constructor(private readonly targetSystems: TargetSystems, layer: FlexLayer, private readonly logger: ToolsLogger) {
        this.appIdentifier = new AppIdentifier(layer);
        this.isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;
        this.ui5Manager = UI5VersionManager.getInstance(FlexLayer.CUSTOMER_BASE);
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
            [configPromptNames.systemValidationCli]: this.getSystemValidationPromptForCli({ hide: !isCLI }),
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
            validate: async (value: string, answers: ConfigAnswers) => await this.validateSystem(value, answers),
            additionalMessages: () => systemAdditionalMessages(this.flexUISystem, !!this.isCloudProject)
        };
    }

    /**
     * Only used in the CLI context when prompt is of type `list` because the validation does not run on CLI for the system list prompt.
     *
     * @param {CliValidationPromptOptions} options - System validation CLI options (i.e "hide").
     * @returns Dummy prompt that runs in the CLI only.
     */
    private getSystemValidationPromptForCli(options: CliValidationPromptOptions) {
        return {
            name: configPromptNames.systemValidationCli,
            when: async (answers: ConfigAnswers): Promise<boolean> => {
                if (options.hide || !answers.system) {
                    return false;
                }

                const result = await this.validateSystem(answers.system, answers);
                if (typeof result === 'string') {
                    throw new Error(result);
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
                showApplicationQuestion(
                    answers,
                    !!this.targetApps?.length,
                    this.isAuthRequired,
                    this.isLoginSuccessful
                ),
            additionalMessages: (app) =>
                appAdditionalMessages(app as TargetApplication, this.appIdentifier, this.isApplicationSupported)
        };
    }

    /**
     * Only used in the CLI context when prompt is of type `list` because the validation does not run on CLI for the application list prompt.
     *
     * @param {CliValidationPromptOptions} options - System validation CLI options (i.e "hide").
     * @returns Dummy prompt that runs in the CLI only.
     */
    private getApplicationValidationPromptForCli(options: CliValidationPromptOptions) {
        return {
            name: configPromptNames.appValidationCli,
            when: async (answers: ConfigAnswers): Promise<boolean> => {
                if (options.hide || !answers.application) {
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
     * Checks if the application is provided and then evaluates support based on its manifest.
     *
     * @param {TargetApplication} app - The selected application.
     * @returns A promise that resolves to true if valid, or an error message string if validation fails.
     */
    private async validateApplicationSelection(app: TargetApplication): Promise<string | boolean> {
        if (!app) {
            return t('error.selectCannotBeEmptyError', { value: 'Application' });
        }

        const validationResult = await this.handleAppValidation(app);

        if (!isAppStudio()) {
            return validationResult;
        }

        if (
            validationResult === t('validators.appDoesNotSupportManifest') ||
            validationResult === t('validators.appDoesNotSupportAdaptation')
        ) {
            this.isApplicationSupported = false;
            return true;
        }

        return validationResult;
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
            await this.getSystemData();
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
                const validationResult = await this.handleSystemDataValidation(system);

                if (typeof validationResult === 'string') {
                    return validationResult;
                }

                this.targetApps = await loadApps(this.abapProvider, this.isCustomerBase);

                return true;
            }
        } catch (e) {
            return e.message;
        }

        return true;
    }

    /**
     * Validates the selected application to ensure it is supported.
     *
     * @param {Application} value - The application to validate.
     * @returns {Promise<boolean | string>} True if the application is valid, otherwise an error message.
     */
    private async handleAppValidation(value: TargetApplication): Promise<boolean | string> {
        if (value) {
            try {
                const targetManifest = new TargetManifest(this.abapProvider, this.logger);
                const isSupported = await targetManifest.isAppSupported(value.id);

                if (isSupported) {
                    const manifest = await targetManifest.getManifest(value.id);
                    this.evaluateApplicationSupport(manifest, value);
                }
                this.isApplicationSupported = true;
            } catch (e) {
                this.logger.debug(`Application failed validation. Reason: ${e.message}`);
                return e.message;
            }
        } else {
            return t('validators.selectCannotBeEmptyError', { value: 'Application' });
        }
        return true;
    }

    /**
     * Evaluate if the application version supports certain features.
     *
     * @param {Manifest} manifest - The application manifest.
     * @param {Application} application - The application data.
     */
    private evaluateApplicationSupport(manifest: Manifest | undefined, application: TargetApplication): void {
        const systemVersion = this.ui5Manager.systemVersion;
        const isFullSupport = this.ui5Manager.isVersionDetected && !isFeatureSupportedVersion('1.96.0', systemVersion);
        const isPartialSupport =
            this.ui5Manager.isVersionDetected && isFullSupport && isFeatureSupportedVersion('1.90.0', systemVersion);

        this.appIdentifier.validateSelectedApplication(application, manifest, isFullSupport, isPartialSupport);
    }

    /**
     * Fetches system data including cloud project and UI flexibility information.
     *
     * @returns A promise that resolves when system data is fetched.
     */
    private async getSystemData(): Promise<void> {
        try {
            this.isCloudProject = await this.abapProvider.isAbapCloud();
            this.flexUISystem = await getFlexUISupportedSystem(this.abapProvider, this.isCustomerBase);
        } catch (e) {
            this.handleSystemError(e);
        }
    }

    /**
     * Handles the fetching and validation of system data.
     *
     * @param {string} value - The system.
     * @returns {Promise<boolean | string>} True if successful, or an error message if an error occurs.
     */
    private async handleSystemDataValidation(value: string): Promise<boolean | string> {
        try {
            await this.getSystemData();
            await this.validateSystemVersion(value);

            if (!this.isCustomerBase && this.isCloudProject) {
                return t('error.cloudSystemsForInternalUsers');
            }

            return true;
        } catch (e) {
            this.logger.debug(`Validating system failed. Reason: ${e.message}`);
            return e.message;
        }
    }

    /**
     * Validates the UI5 system version based on the provided value or fetches all relevant versions if no value is provided.
     * Updates the internal state with the fetched versions and the detection status.
     *
     * @param {string} value - The system version to validate.
     */
    private async validateSystemVersion(value: string): Promise<void> {
        try {
            if (value) {
                const version = await getSystemUI5Version(this.abapProvider);
                await this.ui5Manager.getSystemRelevantVersions(version);
            } else {
                await this.ui5Manager.getRelevantVersions();
            }
        } catch (e) {
            this.logger.debug(`Could not fetch system version: ${e.message}`);
            await this.ui5Manager.getRelevantVersions();
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

            if (error.response?.status === 405 || error.response?.status === 404) {
                // Handle the case where the API is not available and continue to standard onPremise flow
                this.isCloudProject = false;
                return;
            }
        }
    }
}
