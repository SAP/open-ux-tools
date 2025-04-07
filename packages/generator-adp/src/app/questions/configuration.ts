import {
    UI5VersionInfo,
    FlexLayer,
    getConfiguredProvider,
    getEndpointNames,
    getFlexUISupportedSystem,
    getSystemUI5Version,
    isFeatureSupportedVersion,
    loadApps,
    SourceManifest,
    isAppSupported,
    isSyncLoadedView,
    isV4Application
} from '@sap-ux/adp-tooling';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import { isAxiosError, type AbapServiceProvider } from '@sap-ux/axios-extension';
import type { InputQuestion, ListQuestion, PasswordQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { ConfigAnswers, FlexUISupportedSystem, SourceApplication, SystemLookup } from '@sap-ux/adp-tooling';

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
     * Application manifest.
     */
    private appManifest: Manifest | undefined;
    /**
     * Loaded target applications for a system.
     */
    private targetApps: SourceApplication[];
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
     * Indicates whether views are loaded synchronously.
     */
    private containsSyncViews = false;
    /**
     * Flag indicating if the application is an internal V4 application.
     */
    private isV4AppInternalMode = false;
    /**
     * Flag indicating that full adaptation-over-adaptation is supported.
     */
    private isSupported = false;
    /**
     * Flag indicating that only partial adaptation-over-adaptation is supported.
     */
    private isPartiallySupported = false;
    /**
     * UI5 version manager for handling version-related validations.
     */
    private readonly ui5Info: UI5VersionInfo;

    /**
     * Returns the configured abap provider instance.
     *
     * @returns Configured instance of AbapServiceProvider.
     */
    public get provider(): AbapServiceProvider {
        return this.abapProvider;
    }

    /**
     * Returns the loaded application manifest.
     *
     * @returns Application manifest.
     */
    public get manifest(): Manifest {
        return this.manifest;
    }

    /**
     * Indicates whether the application loads views synchronously.
     *
     * @returns {boolean} True if views are sync-loaded.
     */
    public get hasSyncViews(): boolean {
        return this.containsSyncViews;
    }

    /**
     * Creates an instance of ConfigPrompter.
     *
     * @param {SystemLookup} systemLookup - The source system class to retrieve system endpoints.
     * @param {FlexLayer} layer - The FlexLayer used to determine the base (customer or otherwise).
     * @param {ToolsLogger} logger - Instance of the logger.
     */
    constructor(private readonly systemLookup: SystemLookup, layer: FlexLayer, private readonly logger: ToolsLogger) {
        this.isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;
        this.ui5Info = UI5VersionInfo.getInstance(layer);
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
            [configPromptNames.systemValidationCli]: this.getSystemValidationPromptForCli(),
            [configPromptNames.username]: this.getUsernamePrompt(promptOptions?.[configPromptNames.username]),
            [configPromptNames.password]: this.getPasswordPrompt(promptOptions?.[configPromptNames.password]),
            [configPromptNames.application]: this.getApplicationListPrompt(
                promptOptions?.[configPromptNames.application]
            ),
            [configPromptNames.appValidationCli]: this.getApplicationValidationPromptForCli()
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
                const systems = await this.systemLookup.getSystems();
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
     * @returns Dummy prompt that runs in the CLI only.
     */
    private getSystemValidationPromptForCli() {
        return {
            name: configPromptNames.systemValidationCli,
            when: async (answers: ConfigAnswers): Promise<boolean> => {
                if (!answers.system) {
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
            validate: async (value: SourceApplication) => await this.validateAppPrompt(value),
            when: (answers: ConfigAnswers) =>
                showApplicationQuestion(
                    answers,
                    !!this.targetApps?.length,
                    this.isAuthRequired,
                    this.isLoginSuccessful
                ),
            additionalMessages: (app) =>
                appAdditionalMessages(
                    app as SourceApplication,
                    {
                        hasSyncViews: this.containsSyncViews,
                        isV4AppInternalMode: this.isV4AppInternalMode,
                        isSupported: this.isSupported && !this.isPartiallySupported,
                        isPartiallySupported: this.isPartiallySupported
                    },
                    this.isApplicationSupported
                )
        };
    }

    /**
     * Only used in the CLI context when prompt is of type `list` because the validation does not run on CLI for the application list prompt.
     *
     * @returns Dummy prompt that runs in the CLI only.
     */
    private getApplicationValidationPromptForCli() {
        return {
            name: configPromptNames.appValidationCli,
            when: async (answers: ConfigAnswers): Promise<boolean> => {
                if (!answers.application) {
                    return false;
                }

                const result = await this.validateAppPrompt(answers.application);
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
     * @param {SourceApplication} app - The selected application.
     * @returns A promise that resolves to true if valid, or an error message string if validation fails.
     */
    private async validateAppPrompt(app: SourceApplication): Promise<string | boolean> {
        if (!app) {
            return t('error.selectCannotBeEmptyError', { value: 'Application' });
        }

        return this.validateAppData(app);
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
            this.isAuthRequired = await this.systemLookup.getSystemRequiresAuth(system);
            if (!this.isAuthRequired) {
                const validationResult = await this.handleSystemDataValidation();

                if (typeof validationResult === 'string') {
                    return validationResult;
                }

                this.targetApps = await loadApps(this.abapProvider, this.isCustomerBase);
            }

            return true;
        } catch (e) {
            return e.message;
        }
    }

    /**
     * Validates the selected application to ensure it is supported.
     *
     * @param {Application} app - The application to validate.
     * @returns {Promise<boolean | string>} True if the application is valid, otherwise an error message.
     */
    private async validateAppData(app: SourceApplication): Promise<boolean | string> {
        try {
            const sourceManifest = new SourceManifest(this.abapProvider, app.id, this.logger);
            const isSupported = await isAppSupported(this.abapProvider, app.id, this.logger);

            if (isSupported) {
                this.appManifest = await sourceManifest.getManifest();
                this.validateManifest();
                this.evaluateAppSupport(app);
            }
            this.isApplicationSupported = true;
        } catch (e) {
            this.isApplicationSupported = false;
            this.logger.debug(`Application failed validation. Reason: ${e.message}`);
            return e.message;
        }

        return true;
    }

    /**
     * Evaluate if the application version supports certain features.
     *
     * @param {Application} application - The application data.
     */
    private evaluateAppSupport(application: SourceApplication): void {
        const systemVersion = this.ui5Info.systemVersion;
        const isFullSupport = this.ui5Info.isVersionDetected && !isFeatureSupportedVersion('1.96.0', systemVersion);
        const isPartialSupport =
            this.ui5Info.isVersionDetected && isFullSupport && isFeatureSupportedVersion('1.90.0', systemVersion);

        this.setSupportFlags(application, isFullSupport, isPartialSupport);
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
     * @returns {Promise<boolean | string>} True if successful, or an error message if an error occurs.
     */
    private async handleSystemDataValidation(): Promise<boolean | string> {
        try {
            await this.getSystemData();
            await this.validateSystemVersion();

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
     * @returns {Promise<void>} Resolves after checking system ui5 version.
     */
    private async validateSystemVersion(): Promise<void> {
        try {
            const version = await getSystemUI5Version(this.abapProvider);
            await this.ui5Info.getRelevantVersions(version);
        } catch (e) {
            this.logger.debug(`Could not fetch system version: ${e.message}`);
            await this.ui5Info.getRelevantVersions();
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

    /**
     * Validates the selected application for adaptation projects, checking for specific support flags
     * and validating the application manifest.
     *
     * @returns {void} Returns when validation is complete.
     */
    private validateManifest(): void {
        if (!this.appManifest) {
            throw new Error(t('error.manifestCouldNotBeValidated'));
        }

        if (this.appManifest['sap.ui5']) {
            if (this.appManifest['sap.ui5']?.flexEnabled === false) {
                throw new Error(t('error.appDoesNotSupportAdaptation'));
            }
        }
    }

    /**
     * Sets the support flags for given application.
     *
     * @param {SourceApplication} application - The application to validate.
     * @param {boolean} isFullSupport - Flag to check for full AdpOverAdp support.
     * @param {boolean} isPartialSupport - Flag to check for partial AdpOverAdp support.
     * @returns {void} Returns when flags are set.
     */
    private setSupportFlags(application: SourceApplication, isFullSupport: boolean, isPartialSupport: boolean): void {
        this.isSupported = !(isFullSupport && application.fileType === 'appdescr_variant');
        this.isPartiallySupported = isPartialSupport && application.fileType === 'appdescr_variant';
        this.isV4AppInternalMode = isV4Application(this.appManifest) && !this.isCustomerBase;
        this.containsSyncViews = isSyncLoadedView(this.appManifest?.['sap.ui5']);
    }
}
