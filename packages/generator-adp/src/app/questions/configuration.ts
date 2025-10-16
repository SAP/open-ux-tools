import type {
    ConfigAnswers,
    FlexUISupportedSystem,
    SourceApplication,
    SystemLookup,
    UI5Version
} from '@sap-ux/adp-tooling';
import {
    checkSystemVersionPattern,
    fetchPublicVersions,
    FlexLayer,
    getAch,
    getBaseAppInbounds,
    getConfiguredProvider,
    getEndpointNames,
    getFioriId,
    getFlexUISupportedSystem,
    getRelevantVersions,
    getSystemUI5Version,
    isAppSupported,
    isFeatureSupportedVersion,
    isSyncLoadedView,
    isV4Application,
    loadApps,
    SourceManifest
} from '@sap-ux/adp-tooling';
import { isAxiosError, type AbapServiceProvider } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import type {
    ConfirmQuestion,
    InputQuestion,
    ListQuestion,
    PasswordQuestion,
    YUIQuestion
} from '@sap-ux/inquirer-common';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import { validateAch, validateEmptyString } from '@sap-ux/project-input-validator';

import { t } from '../../utils/i18n';
import type {
    AchPromptOptions,
    ApplicationPromptOptions,
    ConfigPromptOptions,
    ConfigQuestion,
    FioriIdPromptOptions,
    PasswordPromptOptions,
    ShouldCreateExtProjectPromptOptions,
    SystemPromptOptions,
    UsernamePromptOptions
} from '../types';
import { configPromptNames } from '../types';
import { getAppAdditionalMessages, getSystemAdditionalMessages } from './helper/additional-messages';
import { getApplicationChoices } from './helper/choices';
import {
    showApplicationQuestion,
    showCredentialQuestion,
    showExtensionProjectQuestion,
    showInternalQuestions
} from './helper/conditions';
import { getExtProjectMessage } from './helper/message';
import { validateExtensibilityExtension } from './helper/validators';
import type { IMessageSeverity } from '@sap-devx/yeoman-ui-types';

/**
 * A stateful prompter class that creates configuration questions.
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
     * Error message to be shown in the confirm extension project prompt.
     */
    private appValidationErrorMessage: string | undefined;
    /**
     * System additional message.
     */
    private systemAdditionalMessage: IMessageSeverity | undefined;
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
     * UI5 versions in string format.
     */
    private ui5Versions: string[];
    /**
     * Publicly available UI5 versions.
     */
    private publicVersions: UI5Version;
    /**
     * System UI5 version.
     */
    private systemVersion: string | undefined;
    /**
     * Base application inbounds, if the base application is an FLP app.
     */
    private baseApplicationInbounds?: ManifestNamespace.Inbound;

    /**
     * Returns the needed ui5 properties from calling the CDN.
     *
     * @returns Object with properties related to ui5.
     */
    public get ui5(): { ui5Versions: string[]; systemVersion: string | undefined; publicVersions: UI5Version } {
        return {
            ui5Versions: this.ui5Versions,
            systemVersion: this.systemVersion,
            publicVersions: this.publicVersions
        };
    }

    /**
     * Returns flag indicating if the project is a cloud project.
     *
     * @returns Whether system is cloud-ready.
     */
    public get isCloud(): boolean {
        return !!this.isCloudProject;
    }

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
    public get manifest(): Manifest | undefined {
        return this.appManifest;
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
     * Indicates whether the application is supported by Adaptation Project.
     *
     * @returns {boolean} True if the application is supported.
     */
    public get isAppSupported(): boolean {
        return this.isApplicationSupported;
    }

    /**
     * Base application inbounds, if the base application is an FLP app.
     *
     * @returns {ManifestNamespace.Inbound|undefined} Returns the base application inbounds.
     */
    public get baseAppInbounds(): ManifestNamespace.Inbound | undefined {
        return this.baseApplicationInbounds;
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
            [configPromptNames.appValidationCli]: this.getApplicationValidationPromptForCli(),
            [configPromptNames.fioriId]: this.getFioriIdPrompt(),
            [configPromptNames.ach]: this.getAchPrompt(),
            [configPromptNames.shouldCreateExtProject]: this.getShouldCreateExtProjectPrompt(
                promptOptions?.[configPromptNames.shouldCreateExtProject]
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
            additionalMessages: () => {
                this.systemAdditionalMessage = getSystemAdditionalMessages(this.flexUISystem, this.isCloud);
                return this.systemAdditionalMessage;
            }
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
            when: (answers: ConfigAnswers) => showCredentialQuestion(answers, this.isAuthRequired),
            additionalMessages: () => {
                if (!this.systemAdditionalMessage) {
                    this.systemAdditionalMessage = getSystemAdditionalMessages(this.flexUISystem, this.isCloud);
                    return this.systemAdditionalMessage;
                }
                return undefined;
            }
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
                getAppAdditionalMessages(
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
     * Creates an input prompt for entering the Fiori ID.
     *
     * @param {FioriIdPromptOptions} _ - Optional configuration for Fiori ID prompt.
     * @returns {InputQuestion<ConfigAnswers>} An input prompt for the Fiori ID.
     */
    private getFioriIdPrompt(_?: FioriIdPromptOptions): InputQuestion<ConfigAnswers> {
        return {
            type: 'input',
            name: 'fioriId',
            message: t('prompts.fioriIdLabel'),
            guiOptions: {
                hint: t('prompts.fioriIdHint'),
                breadcrumb: true
            },
            when: (answers) => showInternalQuestions(answers, this.isCustomerBase, this.isApplicationSupported),
            default: () => getFioriId(this.appManifest),
            store: false
        } as InputQuestion<ConfigAnswers>;
    }

    /**
     * Generates an input prompt for entering the Application Component Hierarchy code for a project.
     *
     * @param {AchPromptOptions} _ - Optional configuration for ACH prompt.
     * @returns {InputQuestion<ConfigAnswers>} An input prompt for Application Component Hierarchy code.
     */
    private getAchPrompt(_?: AchPromptOptions): InputQuestion<ConfigAnswers> {
        return {
            type: 'input',
            name: 'ach',
            message: t('prompts.achLabel'),
            guiOptions: {
                hint: t('prompts.achHint'),
                breadcrumb: true,
                mandatory: true
            },
            when: (answers) => showInternalQuestions(answers, this.isCustomerBase, this.isApplicationSupported),
            default: () => getAch(this.appManifest),
            validate: (value: string) => validateAch(value, this.isCustomerBase),
            store: false
        } as InputQuestion<ConfigAnswers>;
    }

    /**
     * Generates a confirmation prompt to decide whether to create an extension project based on the application's
     * sync capabilities and support status.
     *
     * @param {ShouldCreateExtProjectPromptOptions} options - Optional configuration for the confirm extension project prompt.
     * @returns The confirm extension project prompt as a {@link ConfigQuestion}.
     */
    private getShouldCreateExtProjectPrompt(
        options?: ShouldCreateExtProjectPromptOptions
    ): ConfirmQuestion<ConfigAnswers> {
        return {
            type: 'confirm',
            name: configPromptNames.shouldCreateExtProject,
            message: () =>
                getExtProjectMessage(
                    this.isApplicationSupported,
                    this.containsSyncViews,
                    this.appValidationErrorMessage
                ),
            default: false,
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            when: (answers: ConfigAnswers) =>
                showExtensionProjectQuestion(
                    answers,
                    this.flexUISystem,
                    this.isCloudProject,
                    this.isApplicationSupported,
                    this.containsSyncViews
                ),
            validate: (value: boolean) =>
                validateExtensibilityExtension({
                    value,
                    isApplicationSupported: this.isApplicationSupported,
                    hasSyncViews: this.containsSyncViews,
                    isExtensibilityExtInstalled: !!options?.isExtensibilityExtInstalled
                })
        };
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

        const validationResult = await this.validateAppData(app);

        const isKnownUnsupported =
            validationResult === t('error.appDoesNotSupportManifest') ||
            validationResult === t('error.appDoesNotSupportFlexibility');

        if (isAppStudio() && isKnownUnsupported && !this.isCloud) {
            this.logger.error(validationResult);
            this.appValidationErrorMessage = validationResult;
            this.isApplicationSupported = false;
            // Continue to the next prompt for extension project.
            return true;
        }

        if (typeof validationResult === 'string') {
            return validationResult;
        }

        if (this.isCloud) {
            try {
                this.baseApplicationInbounds = await getBaseAppInbounds(app.id, this.provider);
            } catch (error) {
                return t('error.fetchBaseInboundsFailed', { error: error.message });
            }
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
            const validationResult = await this.handleSystemDataValidation();

            if (typeof validationResult === 'string') {
                return validationResult;
            }

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
            this.flexUISystem = undefined;
            this.isCloudProject = undefined;
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
     * @param {SourceApplication} app - The application to validate.
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
            this.logger.debug(`Application failed validation. Reason: ${e.message}`);
            return e.message;
        }

        return true;
    }

    /**
     * Evaluate if the application version supports certain features.
     *
     * @param {SourceApplication} application - The application data.
     */
    private evaluateAppSupport(application: SourceApplication): void {
        const isFullSupport = !!this.systemVersion && !isFeatureSupportedVersion('1.96.0', this.systemVersion);
        const isPartialSupport =
            !!this.systemVersion && isFullSupport && isFeatureSupportedVersion('1.90.0', this.systemVersion);

        this.setSupportFlags(application, isFullSupport, isPartialSupport);
    }

    /**
     * Fetches system data including cloud project and UI flexibility information.
     *
     * @returns A promise that resolves when system data is fetched.
     */
    private async loadSystemData(): Promise<void> {
        try {
            this.isCloudProject = await this.abapProvider.isAbapCloud();
            this.flexUISystem = await getFlexUISupportedSystem(this.abapProvider, this.isCustomerBase);
        } catch (e) {
            this.handleSystemError(e);
        }
    }

    /**
     * Fetches and processes SAPUI5 version data from the system and public sources.
     *
     * @returns {Promise<void>} A promise that resolves once all version data is loaded and assigned.
     */
    private async loadUI5Versions(): Promise<void> {
        const version = await getSystemUI5Version(this.abapProvider);
        this.systemVersion = checkSystemVersionPattern(version);
        this.publicVersions = await fetchPublicVersions(this.logger);
        this.ui5Versions = await getRelevantVersions(this.systemVersion, this.isCustomerBase, this.publicVersions);
    }

    /**
     * Handles the fetching and validation of system data.
     *
     * @returns {Promise<boolean | string>} True if successful, or an error message if an error occurs.
     */
    private async handleSystemDataValidation(): Promise<boolean | string> {
        try {
            await this.loadSystemData();
            await this.loadUI5Versions();

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

        const ui5 = this.appManifest?.['sap.ui5'];
        if (ui5?.flexEnabled === false) {
            throw new Error(t('error.appDoesNotSupportFlexibility'));
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
