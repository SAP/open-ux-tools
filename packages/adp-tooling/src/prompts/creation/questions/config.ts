import type {
    ListQuestion,
    InputQuestion,
    YUIQuestion,
    PasswordQuestion,
    ConfirmQuestion
} from '@sap-ux/inquirer-common';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import type { SystemInfo } from '@sap-ux/axios-extension';
import { isExtensionInstalledVsCode } from '@sap-ux/environment-check';
import { AdaptationProjectType, isAxiosError } from '@sap-ux/axios-extension';
import { isEmptyString, validateAch, validateClient, validateEmptyString } from '@sap-ux/project-input-validator';

import {
    appAdditionalMessages,
    getApplicationChoices,
    getDefaultAch,
    getDefaultFioriId,
    getDefaultProjectType,
    getVersionDefaultValue,
    projectTypeAdditionalMessages,
    systemAdditionalMessages,
    versionAdditionalMessages,
    getExtProjectMessage
} from './helper';
import { t } from '../../../i18n';
import { FlexLayer } from '../../../types';
import { AppIdentifier } from '../identifier';
import { ApplicationManager } from '../../../client';
import {
    showExtensionProjectQuestion,
    showInternalQuestions,
    showUI5VersionQuestion,
    showApplicationQuestion,
    showApplicationErrorQuestion,
    showProjectTypeQuestion,
    showCredentialQuestion
} from './helper/conditions';
import { AbapClient } from './backend/abap-client';
import type { ManifestManager, AbapProvider } from '../../../client';
import type { EndpointsManager, UI5VersionManager } from '../../../common';
import { getEndpointNames, isFeatureSupportedVersion } from '../../../common';
import { resolveNodeModuleGenerator } from '../../../base';
import type { Application, ConfigurationInfoAnswers, FlexUISupportedSystem, Prompts } from '../../../types';

/**
 * ConfigInfoPrompter handles the setup and interaction logic for configuration prompts related to project setup.
 * This class manages and validates the necessary configuration settings required during the initiation
 * or adaptation of projects. It integrates services to fetch, validate, and prompt for configuration options based on the system environment and project specifications.
 */
export default class ConfigInfoPrompter {
    public systemInfo: SystemInfo;
    public isCustomerBase: boolean;
    public isCloudProject: boolean;
    public ui5VersionDetected = true;
    public isLoginSuccessfull: boolean;
    public isApplicationSupported: boolean;
    public hasSystemAuthentication: boolean;
    public flexUISystem: FlexUISupportedSystem | undefined;

    private systemNames: string[];
    private versionsOnSystem: string[];
    private readonly isExtensionInstalled: boolean;
    private extensibilitySubGenerator: string | undefined = undefined;

    public appIdentifier: AppIdentifier;
    private appsManager: ApplicationManager;
    private logger: ToolsLogger;
    private prompts?: Prompts;
    private abapClient: AbapClient;

    /**
     * Constructs an instance of ConfigInfoPrompter.
     *
     * @param {AbapProvider} provider - The ABAP provider service.
     * @param {ManifestManager} manifestManager - Service to manage application manifests.
     * @param {EndpointsManager} endpointsManager - The endpoints service for retrieving system details.
     * @param {UI5VersionManager} ui5Manager - Service for handling UI5 version information.
     * @param {FlexLayer} layer - The application layer context.
     * @param {ToolsLogger} logger - A logger instance.
     * @param {Prompts} [prompts] - Prompts utility, used for user interaction flows.
     */
    constructor(
        private provider: AbapProvider,
        private manifestManager: ManifestManager,
        private endpointsManager: EndpointsManager,
        public ui5Manager: UI5VersionManager,
        layer: FlexLayer,
        logger: ToolsLogger,
        prompts?: Prompts
    ) {
        this.logger = logger;
        this.prompts = prompts;
        this.isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;
        this.abapClient = new AbapClient(this.provider, this.isCustomerBase);
        this.appsManager = new ApplicationManager(this.provider, this.isCustomerBase, this.logger);
        this.appIdentifier = new AppIdentifier(layer);
    }

    /**
     * Modifies the adaptation project types to remove 'CLOUD_READY' if not allowed for the internal user.
     */
    private modifyAdaptationProjectTypes(): void {
        const { adaptationProjectTypes } = this.systemInfo;
        if (adaptationProjectTypes.includes(AdaptationProjectType.CLOUD_READY) && !this.isCustomerBase) {
            this.systemInfo.adaptationProjectTypes = adaptationProjectTypes.filter(
                (type) => type !== AdaptationProjectType.CLOUD_READY
            );
        }
    }

    /**
     * Adjusts the prompts array by adding or removing configuration pages based on the project type.
     * For cloud projects, it adds specific configuration steps if only the initial pages are present.
     * For non-cloud projects, it removes specific pages when more than the standard pages are present.
     */
    public setAdditionalPagesForCloudProjects(): void {
        if (!this.prompts) {
            return;
        }

        const totalPagesCount = this.prompts.size();

        if (this.isCloudProject && totalPagesCount === 2) {
            const flpConfigPageLabel = {
                name: t('prompts.flpConfigurationStep'),
                description: t('prompts.flpConfigurationDescription')
            };
            const deployConfigPageLabel = {
                name: t('prompts.deploymentConfigStep'),
                description: t('prompts.deploymentConfigDescription')
            };

            this.prompts.splice(2, 0, [flpConfigPageLabel, deployConfigPageLabel]);
        } else if (!this.isCloudProject && totalPagesCount === 4) {
            this.prompts.splice(totalPagesCount - 2, 2);
        }
    }

    /**
     * Validates the adaptation project types based on the system information and user base.
     * It checks the types of projects allowed and modifies them if necessary. Creating cloud projects is forbidden for internal users.
     *
     * @returns {boolean | string} True if the project types are valid, otherwise returns an error message.
     */
    private validateAdpTypes(): boolean | string {
        const { adaptationProjectTypes } = this.systemInfo;

        if (adaptationProjectTypes.length === 0) {
            return this.isCustomerBase ? t('validators.unsupportedSystemExt') : t('validators.unsupportedSystemInt');
        }
        const isCloudReady =
            adaptationProjectTypes.length === 1 && adaptationProjectTypes[0] === AdaptationProjectType.CLOUD_READY;

        if (isCloudReady && !this.isCustomerBase) {
            this.systemInfo.adaptationProjectTypes = [];
            return t('validators.unsupportedCloudSystemInt');
        }

        this.modifyAdaptationProjectTypes();

        return true;
    }

    /**
     * Validates whether the extensibility sub-generator is available and sets it up if necessary.
     * If the generator is not found, an error message is returned advising on the necessary action.
     *
     * @returns {boolean | string} Returns true if the generator is available, or an error message if not.
     */
    private validateExtensibilityGenerator(): boolean | string {
        if (this.extensibilitySubGenerator) {
            return true;
        }

        this.extensibilitySubGenerator = resolveNodeModuleGenerator();

        if (!this.extensibilitySubGenerator) {
            return t('validators.extensibilityGenNotFound');
        }

        return true;
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
                const version = await this.abapClient.getSystemUI5Version();
                this.versionsOnSystem = await this.ui5Manager.getSystemRelevantVersions(version);
            } else {
                this.versionsOnSystem = await this.ui5Manager.getRelevantVersions();
            }
        } catch (e) {
            this.logger.debug(`Could not fetch system version: ${e.message}`);
            this.versionsOnSystem = await this.ui5Manager.getRelevantVersions();
        } finally {
            this.ui5VersionDetected = this.ui5Manager.detectedVersion;
        }
    }

    /**
     * Validates the selected application to ensure it is supported.
     *
     * @param {Application} value - The application to validate.
     * @returns {Promise<boolean | string>} True if the application is valid, otherwise an error message.
     */
    private async applicationPromptValidationHandler(value: Application): Promise<boolean | string> {
        if (value) {
            try {
                const isSupported = await this.manifestManager.isAppSupported(value.id);

                if (isSupported) {
                    await this.manifestManager.loadManifest(value.id);

                    const manifest = this.manifestManager.getManifest(value.id);
                    await this.evaluateApplicationSupport(manifest, value);
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
    private async evaluateApplicationSupport(manifest: Manifest | undefined, application: Application): Promise<void> {
        const systemVersion = this.ui5Manager.systemVersion;
        const checkForSupport = this.ui5VersionDetected && !isFeatureSupportedVersion('1.96.0', systemVersion);
        const isPartialSupport =
            this.ui5VersionDetected && checkForSupport && isFeatureSupportedVersion('1.90.0', systemVersion);

        await this.appIdentifier.validateSelectedApplication(application, manifest, checkForSupport, isPartialSupport);
    }

    /**
     * Validates the selected system for further operations, fetching necessary data and checking for errors.
     *
     * @param {string} value - The system provided by the user.
     * @param {ConfigurationInfoAnswers} answers - ConfigurationInfo answers
     * @returns {Promise<boolean | string>} True if validation succeeds without issues, or an error message otherwise.
     */
    private async validateSystem(value: string, answers: ConfigurationInfoAnswers): Promise<boolean | string> {
        if (!value) {
            return isAppStudio()
                ? t('validators.selectCannotBeEmptyError', { value: 'System' })
                : t('validators.inputCannotBeEmpty');
        }

        await this.abapClient.connectToSystem(value, answers.client, answers.username, answers.password);
        this.manifestManager.resetCache();
        this.appsManager?.resetApps();
        this.ui5VersionDetected = true;

        this.hasSystemAuthentication = this.endpointsManager.getSystemRequiresAuth(value);

        if (!this.hasSystemAuthentication) {
            return this.handleSystemDataValidation(value);
        }

        return true;
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
            return this.validateAdpTypes();
        } catch (e) {
            this.logger.debug(`Validating system failed. Reason: ${e.message}`);
            return e.message;
        }
    }

    /**
     * Fetches system data for the specified system.
     */
    private async getSystemData(): Promise<void> {
        try {
            this.flexUISystem = await this.abapClient.getFlexUISupportedSystem();

            await this.fetchSystemInfo();
        } catch (e) {
            await this.handleSystemInfoError(e);
        }
    }

    /**
     * Fetches system information from the provider's layered repository.
     */
    private async fetchSystemInfo(): Promise<void> {
        this.systemInfo = await this.abapClient.getSystemInfo();
    }

    /**
     * Handles errors that occur while fetching system information, setting default values and rethrowing if necessary.
     *
     * @param {Error} error - The error encountered during the system info fetch.
     */
    private async handleSystemInfoError(error: Error): Promise<void> {
        this.systemInfo = {
            adaptationProjectTypes: [AdaptationProjectType.ON_PREMISE],
            activeLanguages: []
        };

        this.logger.debug(`Failed to fetch system information. Reason: ${error.message}`);
        if (isAxiosError(error)) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error(`Authentication error: ${error.message}`);
            }
        }
    }

    /**
     * Retrieves applications from the specified system.
     * Throws an error if no applications are available after loading.
     */
    private async getApplications(): Promise<void> {
        if (!this.flexUISystem) {
            this.flexUISystem = await this.abapClient.getFlexUISupportedSystem();
        }

        await this.appsManager.loadApps(this.isCloudProject);

        const applications = this.appsManager.getApps();

        if (applications.length === 0) {
            throw new Error(t('validators.appListIsEmptyError'));
        }
    }

    /**
     * Determines if authentication is necessary based on the provided configuration answers.
     * It checks if the system requires authentication and if the necessary credentials are provided.
     *
     * @param {ConfigurationInfoAnswers} answers - User provided configuration details.
     * @returns {boolean | string} True if authentication should proceed, false if there are issues with credentials.
     */
    public shouldAuthenticate(answers: ConfigurationInfoAnswers): boolean {
        return !!answers.system && this.hasSystemAuthentication && (answers.username === '' || answers.password === '');
    }

    /**
     * Determines and returns the appropriate system prompt configuration based on the current environment.
     * If in SAP App Studio, it provides a system list prompt; otherwise, it provides a native system prompt.
     *
     * @returns {YUIQuestion<ConfigurationInfoAnswers>} The configured system prompt question for the user interface.
     */
    private getSystemPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return isAppStudio() ? this.getSystemListPrompt() : this.getSystemNativePrompt();
    }

    /**
     * Generates a list prompt for selecting a system from a predefined list.
     *
     * @returns {YUIQuestion<ConfigurationInfoAnswers>} A list prompt configuration for selecting a system.
     */
    private getSystemListPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'list',
            name: 'system',
            message: t('prompts.systemLabel'),
            choices: () => this.systemNames,
            guiOptions: {
                hint: t('prompts.systemTooltip'),
                breadcrumb: 'System',
                mandatory: true
            },
            when: isAppStudio() ? this.systemInfo?.adaptationProjectTypes?.length : true,
            validate: async (value: string, answers: ConfigurationInfoAnswers) =>
                await this.validateSystem(value, answers),
            additionalMessages: () => systemAdditionalMessages(this.flexUISystem, this.systemInfo)
        } as ListQuestion<ConfigurationInfoAnswers>;
    }

    /**
     * Returns a system prompt configuration based on the installation status of an extension.
     * If the extension is installed, it uses a list prompt; otherwise, it uses an input prompt for manual system URL entry.
     *
     * @returns {YUIQuestion<ConfigurationInfoAnswers>} Either a list or input prompt configuration for system selection.
     */
    private getSystemNativePrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return this.endpointsManager.hasEndpoints() ? this.getSystemListPrompt() : this.getSystemInputPrompt();
    }

    /**
     * Generates an input prompt for manually entering a system URL.
     *
     * @returns {YUIQuestion<ConfigurationInfoAnswers>} An input prompt configuration for entering a system URL.
     */
    private getSystemInputPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'system',
            message: t('prompts.systemUrlLabel'),
            validate: async (value: string, answers: ConfigurationInfoAnswers) =>
                await this.validateSystem(value, answers),
            guiOptions: {
                mandatory: true,
                breadcrumb: t('prompts.systemUrlLabel')
            },
            store: false
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    /**
     * Generates a prompt for entering the system client when certain conditions are met.
     * The prompt is displayed only if a system is selected and the environment is not SAP App Studio
     * or the necessary extension is not installed.
     *
     * @returns {YUIQuestion<ConfigurationInfoAnswers>} A prompt for entering the system client.
     */
    private getSystemClientPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'client',
            message: t('prompts.systemClientLabel'),
            validate: validateClient,
            when: (answers: ConfigurationInfoAnswers) => {
                if (answers.system) {
                    return isAppStudio() ? false : !this.endpointsManager.hasEndpoints();
                }
                return false;
            },
            guiOptions: {
                mandatory: true,
                breadcrumb: t('prompts.systemClientLabel')
            },
            store: false
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    /**
     * Generates a prompt for the user to enter their username. This prompt appears only if a system has been selected
     * and system authentication is required.
     *
     * @returns {YUIQuestion<ConfigurationInfoAnswers>} An input prompt for the username.
     */
    private getUsernamePrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'username',
            message: t('prompts.usernameLabel'),
            validate: (value: string) => validateEmptyString(value),
            when: (answers) => showCredentialQuestion(answers, this),
            guiOptions: {
                mandatory: true,
                breadcrumb: 'Username'
            },
            store: false
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    /**
     * Provides a prompt for the user to enter their password. This is required for system authentication and
     * is displayed conditionally based on whether the system and authentication requirements are met.
     * It also performs several system checks and updates the login success status based on the provided credentials.
     *
     * @returns {YUIQuestion<ConfigurationInfoAnswers>} A password input prompt.
     */
    private getPasswordPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'password',
            guiType: 'login',
            name: 'password',
            message: t('prompts.passwordLabel'),
            mask: '*',
            validate: async (value: string, answers: ConfigurationInfoAnswers) => {
                if (isEmptyString(value)) {
                    return t('validators.inputCannotBeEmpty');
                }

                try {
                    await this.abapClient.connectToSystem(answers.system, answers.client, answers.username, value);
                    await this.getSystemData();
                    await this.validateSystemVersion(answers.system);
                    await this.getApplications();
                    this.isLoginSuccessfull = true;
                    if (isAppStudio()) {
                        return this.validateAdpTypes();
                    }
                } catch (e) {
                    this.logger.debug(`Failed to validate the password: ${e.message}`);
                    this.flexUISystem = undefined;
                    return e?.response;
                }

                return true;
            },
            when: (answers) => showCredentialQuestion(answers, this),
            guiOptions: {
                mandatory: true
            },
            store: false
        } as PasswordQuestion<ConfigurationInfoAnswers>;
    }

    /**
     * Generates a list prompt for selecting the project type based on system selection and authentication status.
     *
     * @returns {YUIQuestion<ConfigurationInfoAnswers>} A list prompt for project type selection.
     */
    private getProjectTypeListPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'list',
            name: 'projectType',
            message: t('prompts.projectTypeLabel'),
            when: (answers: ConfigurationInfoAnswers) => showProjectTypeQuestion(answers, this),
            choices: () => this.systemInfo.adaptationProjectTypes,
            default: () => getDefaultProjectType(this),
            validate: async (value: AdaptationProjectType) => {
                this.isCloudProject = value === AdaptationProjectType.CLOUD_READY;
                this.setAdditionalPagesForCloudProjects();

                try {
                    await this.getApplications();
                } catch (e) {
                    this.logger.debug(`Failed to fetch applications for project type '${value}'. Reason: ${e.message}`);
                    return e.message;
                }

                if (isEmptyString(value)) {
                    return t('validators.inputCannotBeEmpty');
                }

                return true;
            },
            guiOptions: {
                hint: t('prompts.projectTypeTooltip'),
                breadcrumb: 'Project Type',
                applyDefaultWhenDirty: true,
                mandatory: true
            },
            additionalMessages: (_, answers) => projectTypeAdditionalMessages(answers as ConfigurationInfoAnswers, this)
        } as ListQuestion<ConfigurationInfoAnswers>;
    }

    /**
     * Generates a list prompt for selecting an application from a dynamically fetched list.
     *
     * @returns {YUIQuestion<ConfigurationInfoAnswers>} A configured list prompt for selecting an application.
     */
    private getApplicationListPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'list',
            name: 'application',
            message: t('prompts.applicationListLabel'),
            when: (answers) => showApplicationQuestion(answers, this),
            choices: () => {
                const apps = this.appsManager.getApps();
                return getApplicationChoices(apps);
            },
            default: '',
            guiOptions: {
                applyDefaultWhenDirty: true,
                hint: t('prompts.applicationListTooltip'),
                breadcrumb: 'Application',
                mandatory: true
            },
            validate: async (value: Application) => {
                const validationResult = await this.applicationPromptValidationHandler(value);

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
            },
            additionalMessages: (app: Application) => appAdditionalMessages(app, this)
        } as ListQuestion<ConfigurationInfoAnswers>;
    }

    /**
     * Provides a list prompt for selecting the SAP UI5 version for the project.
     *
     * @returns {YUIQuestion<ConfigurationInfoAnswers>} A list prompt for selecting an SAP UI5 version.
     */
    private getUi5VersionPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'list',
            name: 'ui5Version',
            message: t('prompts.ui5VersionLabel'),
            when: (answers) => showUI5VersionQuestion(answers, this),
            choices: () => this.versionsOnSystem,
            guiOptions: {
                applyDefaultWhenDirty: true,
                hint: t('prompts.ui5VersionTooltip'),
                breadcrumb: 'SAP UI5 Version',
                mandatory: true
            },
            validate: this.ui5Manager.validateUI5Version.bind(this),
            default: async () => await getVersionDefaultValue(this.versionsOnSystem, this.ui5Manager),
            additionalMessages: (_, answers: unknown) =>
                versionAdditionalMessages(answers as ConfigurationInfoAnswers, this)
        } as ListQuestion<ConfigurationInfoAnswers>;
    }

    /**
     * Creates an input prompt for entering the Fiori ID.
     *
     * @returns {YUIQuestion<ConfigurationInfoAnswers>} An input prompt for the Fiori ID.
     */
    private getFioriIdPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'fioriId',
            message: t('prompts.fioriIdLabel'),
            guiOptions: {
                hint: t('prompts.fioriIdHint'),
                breadcrumb: t('prompts.fioriIdLabel')
            },
            when: (answers) => showInternalQuestions(answers, this),
            default: (answers: ConfigurationInfoAnswers) => getDefaultFioriId(answers, this.manifestManager),
            store: false
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    /**
     * Generates an input prompt for entering the Application Component Hierarchy code for a project.
     *
     * @returns {YUIQuestion<ConfigurationInfoAnswers>} An input prompt for Application Component Hierarchy code.
     */
    private getACHprompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'ach',
            message: t('prompts.achLabel'),
            guiOptions: {
                hint: t('prompts.achHint'),
                breadcrumb: t('prompts.achLabel'),
                mandatory: true
            },
            when: (answers) => showInternalQuestions(answers, this),
            default: (answers: ConfigurationInfoAnswers) => getDefaultAch(answers, this.manifestManager),
            validate: (value: string) => validateAch(value, this.isCustomerBase),
            store: false
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    /**
     * Generates an input label type prompt that serves as an informational message indicating that the adaptation project is not supported.
     *
     * @returns {YUIQuestion<ConfigurationInfoAnswers>} An input label type prompt configured as a label with a link to more information.
     */
    private getAppInfoErrorPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'applicationInfoError',
            message: t('prompts.adpNotSupported'),
            when: (answers) => showApplicationErrorQuestion(answers, this),
            store: false,
            guiOptions: {
                type: 'label',
                link: {
                    text: '(more)',
                    url: t('info.applicationErrorMoreInfo')
                }
            }
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    /**
     * Generates a confirmation prompt to decide whether to create an extension project based on the application's
     * sync capabilities and support status.
     *
     * @param {string} projectName - The name of the project for which the extension project may be created.
     * @returns {YUIQuestion<ConfigurationInfoAnswers>} A confirmation prompt.
     */
    private getConfirmExtProjPrompt(projectName: string): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'confirm',
            name: 'confirmPrompt',
            message: () => getExtProjectMessage(projectName, this),
            default: false,
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            when: (answers) => showExtensionProjectQuestion(answers, this),
            validate: (value: boolean) => {
                if (this.isApplicationSupported && this.appIdentifier.appSync) {
                    return !value ? true : this.validateExtensibilityGenerator();
                }

                return !value ? 'Please select whether you want to continue' : this.validateExtensibilityGenerator();
            }
        } as ConfirmQuestion<ConfigurationInfoAnswers>;
    }

    /**
     * Compiles a series of configuration prompts for the project setup process. These prompts collect necessary information across various stages of project initialization,
     * including system selection, authentication, and project-specific details.
     *
     * @param {string} projectName - The name of the project for which configuration is being set up.
     * @returns {Promise<YUIQuestion<ConfigurationInfoAnswers>[]>} A promise that resolves to an array of configuration prompts.
     */
    public async getConfigurationPrompts(projectName: string): Promise<YUIQuestion<ConfigurationInfoAnswers>[]> {
        this.systemNames = getEndpointNames(this.endpointsManager.getEndpoints());

        return [
            this.getSystemPrompt(),
            this.getSystemClientPrompt(),
            this.getUsernamePrompt(),
            this.getPasswordPrompt(),
            this.getProjectTypeListPrompt(),
            this.getApplicationListPrompt(),
            this.getUi5VersionPrompt(),
            this.getFioriIdPrompt(),
            this.getACHprompt(),
            this.getAppInfoErrorPrompt(),
            this.getConfirmExtProjPrompt(projectName)
        ];
    }
}
