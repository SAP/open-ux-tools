import type {
    ListQuestion,
    InputQuestion,
    YUIQuestion,
    PasswordQuestion,
    ConfirmQuestion
} from '@sap-ux/inquirer-common';
import {
    AdaptationProjectType,
    AdtCatalogService,
    SystemInfo,
    UI5RtVersionService,
    isAxiosError
} from '@sap-ux/axios-extension';
import { ToolsLogger } from '@sap-ux/logger';
import { isAppStudio } from '@sap-ux/btp-utils';
import { Severity } from '@sap-devx/yeoman-ui-types';
import type { Manifest } from '@sap-ux/project-access';
import { isExtensionInstalledVsCode } from '@sap-ux/environment-check';

import {
    EndpointsService,
    AppIdentifier,
    ProviderService,
    ApplicationService,
    getApplicationChoices,
    UI5VersionService,
    isFeatureSupportedVersion,
    ManifestService,
    getCachedACH,
    getCachedFioriId
} from '../../base/services';
import { t } from '../../i18n';
import { resolveNodeModuleGenerator, isNotEmptyString, validateAch, validateClient } from '../../base';
import { Application, FlexLayer, ConfigurationInfoAnswers, FlexUISupportedSystem, Prompts } from '../../types';

export default class ConfigInfoPrompter {
    private isCustomerBase: boolean;
    private hasSystemAuthentication: boolean;
    private isLoginSuccessfull: boolean;
    private flexUISystem: FlexUISupportedSystem | undefined;
    private systemInfo: SystemInfo;
    private ui5VersionDetected = true;
    private isCloudProject: boolean;
    private isApplicationSupported: boolean;
    private extensibilitySubGenerator: string | undefined = undefined;

    private versionsOnSystem: string[];
    private systemNames: string[];

    private readonly isExtensionInstalled: boolean;

    private appsService: ApplicationService;
    private appIdentifier: AppIdentifier;
    private logger: ToolsLogger;

    private prompts?: Prompts;

    constructor(
        private providerService: ProviderService,
        private manifestService: ManifestService,
        private endpointsService: EndpointsService,
        private ui5Service: UI5VersionService,
        layer: FlexLayer,
        logger: ToolsLogger,
        prompts?: Prompts
    ) {
        this.logger = logger;
        this.prompts = prompts;
        this.isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;
        this.isExtensionInstalled = isExtensionInstalledVsCode('sapse.sap-ux-application-modeler-extension');

        this.appIdentifier = new AppIdentifier(this.isCustomerBase);
        this.appsService = new ApplicationService(this.providerService, this.isCustomerBase, this.logger);
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
            this.prompts.splice(totalPagesCount - 2, 2, undefined);
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
     * Determines whether an extension project can be allowed based on the current project settings and environment.
     *
     * @returns {boolean} Returns true if the extension project is allowed, otherwise false.
     */
    private allowExtensionProject(): boolean | undefined {
        if (this.isCloudProject) {
            return false;
        }

        const isOnPremiseAppStudio = this.flexUISystem?.isOnPremise && isAppStudio();
        const nonFlexOrNonOnPremise =
            this.flexUISystem && (!this.flexUISystem.isOnPremise || !this.flexUISystem.isUIFlex);

        return (
            isOnPremiseAppStudio &&
            (!this.isApplicationSupported ||
                (this.isApplicationSupported && (nonFlexOrNonOnPremise || this.appIdentifier.appSync)))
        );
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
                const provider = this.providerService.getProvider();
                const service = await provider.getAdtService<UI5RtVersionService>(UI5RtVersionService);
                const version = await service?.getUI5Version();

                this.versionsOnSystem = await this.ui5Service.getSystemRelevantVersions(version);
            } else {
                this.versionsOnSystem = await this.ui5Service.getRelevantVersions();
            }
        } catch (e) {
            this.logger.debug(`Could not fetch system version: ${e.message}`);
            this.versionsOnSystem = await this.ui5Service.getRelevantVersions();
        } finally {
            this.ui5VersionDetected = this.ui5Service.detectedVersion;
        }
    }

    /**
     * Gets the default UI5 version from the system versions list by validating the first available version.
     * If the first version is valid according to the UI5 service, it returns that version; otherwise, returns an empty string.
     *
     * @returns {Promise<string>} The valid UI5 version or an empty string if the first version is not valid or if there are no versions.
     */
    private async getVersionDefaultValue(): Promise<string> {
        if (!this.versionsOnSystem || this.versionsOnSystem.length === 0) {
            return '';
        }

        const isValid = (await this.ui5Service.validateUI5Version(this.versionsOnSystem[0])) === true;
        return isValid ? this.versionsOnSystem[0] : '';
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
                const isSupported = await this.manifestService.isAppSupported(value.id);

                if (isSupported) {
                    await this.manifestService.loadManifest(value.id);

                    const manifest = this.manifestService.getManifest(value.id);
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
    private async evaluateApplicationSupport(manifest: Manifest | null, application: Application): Promise<void> {
        const systemVersion = this.ui5Service.systemVersion;
        const checkForSupport = this.ui5VersionDetected && !isFeatureSupportedVersion('1.96.0', systemVersion);
        const isPartialSupport =
            this.ui5VersionDetected && checkForSupport && isFeatureSupportedVersion('1.90.0', systemVersion);

        await this.appIdentifier.validateSelectedApplication(application, checkForSupport, isPartialSupport, manifest);
    }

    /**
     * Validates the selected system for further operations, fetching necessary data and checking for errors.
     *
     * @param {string} value - The system provided by the user.
     * @returns {Promise<boolean | string>} True if validation succeeds without issues, or an error message otherwise.
     */
    private async validateSystem(value: string): Promise<boolean | string> {
        this.manifestService.resetCache();
        this.appsService.resetApps();
        this.ui5VersionDetected = true;

        if (!value) {
            return isAppStudio()
                ? t('validators.selectCannotBeEmptyError', { value: 'System' })
                : t('validators.inputCannotBeEmpty');
        }

        this.hasSystemAuthentication = this.endpointsService.getSystemRequiresAuth(value);

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
            await this.getSystemData(value);
            await this.validateSystemVersion(value);
            return this.validateAdpTypes();
        } catch (e) {
            this.logger.debug(`Validating system failed. Reason: ${e.message}`);
            return e.message;
        }
    }

    /**
     * Sets up the provider and fetches system data for the specified system.
     *
     * @param {string} system - The system identifier.
     * @param {string} [client] - Optional client identifier.
     * @param {string} [username] - Optional username for authentication.
     * @param {string} [password] - Optional password for authentication.
     */
    private async getSystemData(system: string, client?: string, username?: string, password?: string): Promise<void> {
        await this.providerService.setProvider(system, client, username, password);

        try {
            this.flexUISystem = await this.isFlexUISupportedSystem();

            await this.fetchSystemInfo();
        } catch (e) {
            await this.handleSystemInfoError(e);
        }
    }

    /**
     * Fetches system information from the provider's layered repository.
     */
    private async fetchSystemInfo(): Promise<void> {
        const provider = this.providerService.getProvider();
        const lrep = provider.getLayeredRepository();
        this.systemInfo = await lrep.getSystemInfo();
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
     * Checks if the system supports Flex UI features.
     * Returns settings indicating support for onPremise and UI Flex capabilities.
     *
     * @returns {Promise<FlexUISupportedSystem | undefined>} An object with system support details or undefined if it cannot be determined.
     */
    private async isFlexUISupportedSystem(): Promise<FlexUISupportedSystem | undefined> {
        if (!this.isCustomerBase) {
            return {
                isOnPremise: true,
                isUIFlex: true
            };
        }
        const FILTER = {
            'scheme': 'http://www.sap.com/adt/categories/ui_flex',
            'term': 'dta_folder'
        };
        const acceptHeaders = {
            headers: {
                Accept: 'application/*'
            }
        };
        const provider = this.providerService.getProvider();
        const response = await provider.get(AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH, acceptHeaders);

        return { isOnPremise: response.data.includes(FILTER.term), isUIFlex: response.data.includes(FILTER.scheme) };
    }

    /**
     * Retrieves applications from the specified system.
     * Throws an error if no applications are available after loading.
     *
     * @param {string} system - The identifier of the system.
     * @param {string} [username] - Optional username for provider authentication.
     * @param {string} [password] - Optional password for provider authentication.
     * @param {string} [client] - Optional client identifier for the provider.
     */
    private async getApplications(
        system: string,
        username?: string,
        password?: string,
        client?: string
    ): Promise<void> {
        await this.providerService.setProvider(system, client, username, password);

        if (!this.flexUISystem) {
            this.flexUISystem = await this.isFlexUISupportedSystem();
        }

        await this.appsService.loadApps(this.isCloudProject);

        const applications = this.appsService.getApps();

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
    private shouldAuthenticate(answers: ConfigurationInfoAnswers): boolean {
        return !!answers.system && this.hasSystemAuthentication && (answers.username === '' || answers.password === '');
    }

    private getSystemPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return isAppStudio() ? this.getSystemListPrompt() : this.getSystemNativePrompt();
    }

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
            validate: async (value: string) => await this.validateSystem(value),
            additionalMessages: () => {
                const isOnPremise = this.flexUISystem?.isOnPremise;
                const isUIFlex = this.flexUISystem?.isUIFlex;
                const projectTypes = this.systemInfo?.adaptationProjectTypes || [];

                if (!projectTypes.length) {
                    return;
                }

                let isCloudProject: boolean | undefined = undefined;
                if (projectTypes.length === 1) {
                    if (projectTypes[0] === AdaptationProjectType.CLOUD_READY) {
                        isCloudProject = true;
                    }
                    if (projectTypes[0] === AdaptationProjectType.ON_PREMISE) {
                        isCloudProject = false;
                    }
                } else if (projectTypes.length > 1) {
                    isCloudProject = false;
                }

                if (isCloudProject) {
                    return;
                }

                if (!isOnPremise) {
                    if (!isUIFlex) {
                        return {
                            message: t('validators.notDeployableNotFlexEnabledSystemError'),
                            severity: Severity.error
                        };
                    } else {
                        return {
                            message: t('validators.notDeployableSystemError'),
                            severity: Severity.error
                        };
                    }
                }

                if (isOnPremise && !isUIFlex) {
                    return {
                        message: t('validators.notFlexEnabledError'),
                        severity: Severity.warning
                    };
                }
            }
        } as ListQuestion<ConfigurationInfoAnswers>;
    }

    private getSystemNativePrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return this.isExtensionInstalled ? this.getSystemListPrompt() : this.getSystemInputPrompt();
    }

    private getSystemInputPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'system',
            message: t('prompts.systemUrlLabel'),
            validate: async (value: string) => await this.validateSystem(value),
            guiOptions: {
                mandatory: true,
                breadcrumb: t('prompts.systemUrlLabel')
            },
            store: false
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getSystemClientPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'client',
            message: t('prompts.systemClientLabel'),
            validate: validateClient,
            when: (answers: ConfigurationInfoAnswers) => {
                if (answers.system) {
                    return isAppStudio() ? false : !this.isExtensionInstalled;
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

    private getUsernamePrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'username',
            message: t('prompts.usernameLabel'),
            validate: (value: string) => {
                if (!isNotEmptyString(value)) {
                    return t('validators.inputCannotBeEmpty');
                }
                return true;
            },
            when: (answers: ConfigurationInfoAnswers) => {
                if (answers.system) {
                    return this.hasSystemAuthentication;
                } else {
                    return false;
                }
            },
            guiOptions: {
                mandatory: true,
                breadcrumb: 'Username'
            },
            store: false
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getPasswordPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'password',
            guiType: 'login',
            name: 'password',
            message: t('prompts.passwordLabel'),
            mask: '*',
            validate: async (value: string, answers: ConfigurationInfoAnswers) => {
                if (!isNotEmptyString(value)) {
                    return t('validators.inputCannotBeEmpty');
                }

                try {
                    await this.getSystemData(answers.system, answers.client, answers.username, value);
                    await this.validateSystemVersion(answers.system);
                    await this.getApplications(answers.system, answers.username, value, answers.client);
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
            when: (answers: ConfigurationInfoAnswers) => {
                if (answers.system) {
                    return this.hasSystemAuthentication;
                } else {
                    return false;
                }
            },
            guiOptions: {
                mandatory: true
            },
            store: false
        } as PasswordQuestion<ConfigurationInfoAnswers>;
    }

    private getProjectTypeListPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'list',
            name: 'projectType',
            message: t('prompts.projectTypeLabel'),
            when: (answers: ConfigurationInfoAnswers) =>
                !!answers.system &&
                !this.shouldAuthenticate(answers) &&
                this.systemInfo?.adaptationProjectTypes?.length &&
                (this.hasSystemAuthentication ? this.isLoginSuccessfull : true),
            choices: () => this.systemInfo.adaptationProjectTypes,
            default: () =>
                this.systemInfo.adaptationProjectTypes.includes(AdaptationProjectType.ON_PREMISE)
                    ? AdaptationProjectType.ON_PREMISE
                    : this.systemInfo.adaptationProjectTypes[0],
            validate: async (value: AdaptationProjectType, answers: ConfigurationInfoAnswers) => {
                this.isCloudProject = value === AdaptationProjectType.CLOUD_READY;
                this.setAdditionalPagesForCloudProjects();

                try {
                    await this.getApplications(answers.system, answers.username, answers.password, answers.client);
                } catch (e) {
                    this.logger.debug(`Failed to fetch applications for project type '${value}'. Reason: ${e.message}`);
                    return e.message;
                }

                if (!isNotEmptyString(value)) {
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
            additionalMessages: (_, prevAnswers) => {
                if (
                    prevAnswers?.system &&
                    !this.shouldAuthenticate(prevAnswers as ConfigurationInfoAnswers) &&
                    this.isCloudProject
                ) {
                    return {
                        message: t('prompts.currentUI5VersionLabel', { version: this.ui5Service.latestVersion }),
                        severity: Severity.information
                    };
                }
            }
        } as ListQuestion<ConfigurationInfoAnswers>;
    }

    private getApplicationListPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'list',
            name: 'application',
            message: t('prompts.applicationListLabel'),
            when: (answers: ConfigurationInfoAnswers) => {
                return (
                    !!answers.system &&
                    !this.shouldAuthenticate(answers) &&
                    (this.hasSystemAuthentication ? this.isLoginSuccessfull : true) &&
                    this.systemInfo?.adaptationProjectTypes?.length
                );
            },
            choices: () => {
                const apps = this.appsService.getApps();
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
            additionalMessages: (app) => {
                if (!app) {
                    return undefined;
                }

                if (this.appIdentifier.appSync && this.isApplicationSupported) {
                    return {
                        message: t('prompts.appInfoLabel'),
                        severity: Severity.information
                    };
                }

                const isSupported = this.appIdentifier.getIsSupportedAdpOverAdp();
                const isPartiallySupported = this.appIdentifier.getIsPartiallySupportedAdpOverAdp();

                if (!isSupported && !isPartiallySupported && this.isApplicationSupported) {
                    return {
                        message: t('prompts.notSupportedAdpOverAdpLabel'),
                        severity: Severity.warning
                    };
                }

                if (isPartiallySupported && this.isApplicationSupported) {
                    return {
                        message: t('prompts.isPartiallySupportedAdpOverAdpLabel'),
                        severity: Severity.warning
                    };
                }

                if (this.appIdentifier.isV4AppInternalMode) {
                    return {
                        message: t('prompts.v4AppNotOfficialLabel'),
                        severity: Severity.warning
                    };
                }
            }
        } as ListQuestion<ConfigurationInfoAnswers>;
    }

    private getUi5VersionPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'list',
            name: 'ui5Version',
            message: t('prompts.ui5VersionLabel'),
            when: (answers: ConfigurationInfoAnswers) => {
                return (
                    !!answers.system &&
                    !this.shouldAuthenticate(answers) &&
                    !this.isCloudProject &&
                    this.systemInfo?.adaptationProjectTypes?.length &&
                    (this.hasSystemAuthentication ? this.isLoginSuccessfull : true)
                );
            },
            choices: () => this.versionsOnSystem,
            guiOptions: {
                applyDefaultWhenDirty: true,
                hint: t('prompts.ui5VersionTooltip'),
                breadcrumb: 'SAP UI5 Version'
            },
            validate: this.ui5Service.validateUI5Version.bind(this),
            default: async () => await this.getVersionDefaultValue(),
            additionalMessages: (_, prevAnswers: unknown) => {
                if (
                    !this.shouldAuthenticate(prevAnswers as ConfigurationInfoAnswers) &&
                    !this.ui5VersionDetected &&
                    !this.isCloudProject &&
                    (this.hasSystemAuthentication ? this.isLoginSuccessfull : true)
                ) {
                    return {
                        message: t('validators.ui5VersionNotDetectedError'),
                        severity: Severity.warning
                    };
                }
            }
        } as ListQuestion<ConfigurationInfoAnswers>;
    }

    private getFioriIdPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'fioriId',
            message: t('prompts.fioriIdLabel'),
            guiOptions: {
                hint: t('prompts.fioriIdHint'),
                breadcrumb: t('prompts.fioriIdLabel')
            },
            when: (answers: ConfigurationInfoAnswers) => {
                return (
                    answers.system &&
                    answers.application &&
                    !this.isCustomerBase &&
                    !this.shouldAuthenticate(answers) &&
                    this.isApplicationSupported
                );
            },
            default: (answers: ConfigurationInfoAnswers) => {
                const manifest = this.manifestService.getManifest(answers?.application?.id);
                return manifest ? getCachedFioriId(manifest) : '';
            },
            store: false
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getACHprompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'applicationComponentHierarchy',
            message: t('prompts.achLabel'),
            guiOptions: {
                hint: t('prompts.achHint'),
                breadcrumb: t('prompts.achLabel'),
                mandatory: true
            },
            when: (answers: ConfigurationInfoAnswers) => {
                return (
                    answers.system &&
                    answers.application &&
                    !this.isCustomerBase &&
                    !this.shouldAuthenticate(answers) &&
                    this.isApplicationSupported
                );
            },
            default: (answers: ConfigurationInfoAnswers) => {
                const manifest = this.manifestService.getManifest(answers?.application?.id);
                return manifest ? getCachedACH(manifest) : '';
            },
            validate: (value: string) => validateAch(value, this.isCustomerBase),
            store: false
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getAppInfoErrorPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'applicationInfoError',
            message: t('prompts.adpNotSupported'),
            when: (answers: ConfigurationInfoAnswers) => {
                return (
                    answers.application &&
                    isAppStudio() &&
                    !this.isApplicationSupported &&
                    this.flexUISystem &&
                    this.flexUISystem.isOnPremise &&
                    this.flexUISystem.isUIFlex
                );
            },
            store: false,
            guiOptions: {
                type: 'label',
                link: {
                    text: '(more)',
                    url: 'https://help.sap.com/docs/bas/developing-sap-fiori-app-in-sap-business-application-studio/adaptation-project-for-on-premise-system'
                }
            }
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getConfirmExtProjPrompt(projectName: string): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'confirm',
            name: 'confirmPrompt',
            message: () => {
                return this.isApplicationSupported && this.appIdentifier.appSync
                    ? t('prompts.createExtProjectWithSyncViewsLabel', { value: projectName })
                    : t('prompts.createExtProjectLabel', { value: projectName });
            },
            default: false,
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            when: (answers: ConfigurationInfoAnswers) => answers.application && this.allowExtensionProject(),
            validate: (value: boolean) => {
                if (this.isApplicationSupported && this.appIdentifier.appSync) {
                    return !value ? true : this.validateExtensibilityGenerator();
                }

                return !value ? 'Please select whether you want to continue' : this.validateExtensibilityGenerator();
            }
        } as ConfirmQuestion<ConfigurationInfoAnswers>;
    }

    public async getConfigurationPrompts(projectName: string): Promise<YUIQuestion<ConfigurationInfoAnswers>[]> {
        await this.endpointsService.getEndpoints();
        this.systemNames = this.endpointsService.getEndpointNames();

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
