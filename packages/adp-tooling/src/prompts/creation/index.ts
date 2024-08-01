import { resolve } from 'path';
import { Severity } from '@sap-devx/yeoman-ui-types';

import { isAppStudio } from '@sap-ux/btp-utils';
import {
    AdaptationProjectType,
    SystemInfo,
    UI5RtVersionService,
    UIFlexService,
    isAxiosError
} from '@sap-ux/axios-extension';
import { Logger } from '@sap-ux/logger';
import type { Manifest, UI5FlexLayer } from '@sap-ux/project-access';
import { isExtensionInstalledVsCode } from '@sap-ux/environment-check';
import type {
    ListQuestion,
    InputQuestion,
    YUIQuestion,
    PasswordQuestion,
    ConfirmQuestion,
    AutocompleteQuestion
} from '@sap-ux/inquirer-common';

import { t } from '../../i18n';
import { isCustomerBase } from '../../base/helper';
import {
    Application,
    BasicInfoAnswers,
    ChoiceOption,
    ConfigurationInfoAnswers,
    DeployConfigAnswers,
    FlexUISupportedSystem,
    FlpConfigAnswers,
    InputChoice,
    Prompts
} from '../../types';
import {
    isNotEmptyString,
    validateAbapRepository,
    validateAch,
    validateByRegex,
    validateClient,
    validateEmptyInput,
    validateNamespace,
    validatePackage,
    validatePackageChoiceInput,
    validateParameters,
    validateProjectName,
    validateTransportChoiceInput
} from '../../base/validators';

import { EndpointsService } from '../../base/services/endpoints-service';
import { UI5VersionService, isFeatureSupportedVersion } from '../../base/services/ui5-version-service';
import { generateValidNamespace, getDefaultProjectName, getProjectNameTooltip } from './prompt-helpers';
import { getApplicationType, isSupportedAppTypeForAdaptationProject } from '../../base/app-utils';
import {
    ManifestService,
    getCachedACH,
    getCachedFioriId,
    getInboundIds,
    isV4Application
} from '../../base/services/manifest-service';
import { ProviderService } from '../../base/services/abap-provider-service';
import { listTransports } from '../../base/services/list-transports-service';
import { ABAP_PACKAGE_SEARCH_MAX_RESULTS, listPackages } from '../../base/services/list-packages-service';
import { ApplicationService, getApplicationChoices } from '../../base/services/application-service';

export default class ProjectPrompter {
    private logger: Logger;
    private isCustomerBase: boolean;
    private hasSystemAuthentication: boolean;
    private isLoginSuccessfull: boolean;
    private flexUISystem: FlexUISupportedSystem | undefined;
    private systemInfo: SystemInfo;
    private ui5VersionDetected = true;
    private isCloudProject: boolean;
    private isApplicationSupported: boolean;
    private isV4AppInternalMode: boolean;
    private isSupportedAdpOverAdp: boolean;
    private isPartiallySupportedAdpOverAdp: boolean;
    private extensibilitySubGenerator: string | undefined = undefined;

    private appSync: boolean;

    private versionsOnSystem: string[];
    private systemNames: string[];

    private providerService: ProviderService;

    private inboundIds: string[];

    private readonly isExtensionInstalled: boolean;

    private ui5Service: UI5VersionService;
    private manifestService: ManifestService;
    private endpointsService: EndpointsService;
    private appsService: ApplicationService;

    private prompts?: Prompts;
    private packageInputChoiceValid: string | boolean;
    private transportList: string[] | undefined;

    constructor(layer: UI5FlexLayer, prompts?: Prompts) {
        this.prompts = prompts;
        this.isCustomerBase = isCustomerBase(layer);
        this.isExtensionInstalled = isExtensionInstalledVsCode('sapse.sap-ux-application-modeler-extension');

        this.ui5Service = new UI5VersionService(this.isCustomerBase);
        this.endpointsService = new EndpointsService(this.isExtensionInstalled);
        this.providerService = new ProviderService(this.endpointsService);
        this.manifestService = new ManifestService(this.providerService);
        this.appsService = new ApplicationService(this.providerService, this.isCustomerBase);
    }

    private modifyAdaptationProjectTypes(): void {
        const { adaptationProjectTypes } = this.systemInfo;
        if (adaptationProjectTypes.includes(AdaptationProjectType.CLOUD_READY) && !this.isCustomerBase) {
            this.systemInfo.adaptationProjectTypes = adaptationProjectTypes.filter(
                (type) => type != AdaptationProjectType.CLOUD_READY
            );
        }
    }

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

    private validateAdaptationProjectTypes(): boolean | string {
        const { adaptationProjectTypes } = this.systemInfo;
        if (adaptationProjectTypes.length === 0) {
            return !this.isCustomerBase ? t('validators.unsupportedSystemInt') : t('validators.unsupportedSystemExt');
        }

        if (
            adaptationProjectTypes.length === 1 &&
            adaptationProjectTypes[0] === AdaptationProjectType.CLOUD_READY &&
            !isCustomerBase
        ) {
            this.systemInfo.adaptationProjectTypes = [];
            return t('validators.unsupportedCloudSystemInt');
        }

        // Internal users are not allowed to create adp cloud projects
        this.modifyAdaptationProjectTypes();

        return true;
    }

    private allowExtensionProject() {
        return (
            !this.isCloudProject &&
            this.flexUISystem &&
            this.flexUISystem.isOnPremise &&
            isAppStudio() &&
            (!this.isApplicationSupported ||
                (this.isApplicationSupported &&
                    ((this.flexUISystem && (!this.flexUISystem.isOnPremise || !this.flexUISystem.isUIFlex)) ||
                        this.appSync)))
        );
    }

    private resolveNodeModuleGenerator() {
        const nodePath = process.env['NODE_PATH'];
        const nodePaths = nodePath?.split(':') || [];

        if (this.extensibilitySubGenerator) {
            return true;
        }

        for (let i = 0; i < nodePaths.length; i++) {
            try {
                this.extensibilitySubGenerator = require.resolve(
                    resolve(nodePaths[i], '@bas-dev/generator-extensibility-sub/generators/app')
                );
            } catch (e) {
                // We don't care if there's an error while resolving the module
                // Continue with the next node_module path
            }

            if (this.extensibilitySubGenerator !== undefined) {
                // this.logger.log(`'@bas-dev/generator-extensibility-sub' generator found for path: ${nodePaths[i]}.`);
                break;
            }
        }

        if (this.extensibilitySubGenerator === undefined) {
            // this.logger.log(
            //     `'@bas-dev/generator-extensibility-sub' generator was not found for paths: ${JSON.stringify(
            //         nodePaths
            //     )}.`
            // );
            return 'Extensibility Project generator plugin was not found in your dev space, and is required for this action. To proceed, please install the <SAPUI5 Layout Editor & Extensibility> extension.';
        }

        return true;
    }

    private async systemUI5VersionHandler(value: string): Promise<string[]> {
        if (value) {
            try {
                const provider = this.providerService.getProvider();
                const service = await provider.getAdtService<UI5RtVersionService>(UI5RtVersionService);
                const version = await service?.getUI5Version();
                this.versionsOnSystem = await this.ui5Service.getSystemRelevantVersions(version);
            } catch (e) {
                this.versionsOnSystem = await this.ui5Service.getRelevantVersions();
            }
        } else {
            this.versionsOnSystem = await this.ui5Service.getRelevantVersions();
        }
        this.ui5VersionDetected = this.ui5Service.detectedVersion;
        return this.versionsOnSystem;
    }

    private async getVersionDefaultValue() {
        if (this.versionsOnSystem && (await this.ui5Service.validateUI5Version(this.versionsOnSystem[0])) === true) {
            return this.versionsOnSystem[0];
        } else {
            return '';
        }
    }

    public async validateSelectedApplication(
        application: Application,
        checkForAdpOverAdpSupport: boolean,
        checkForAdpOverAdpPartialSupport: boolean,
        manifest: Manifest | null
    ): Promise<void> {
        if (!application) {
            throw new Error(t('validators.selectCannotBeEmptyError', { value: 'Application' }));
        }

        if (!manifest) {
            throw new Error(t('validators.manifestCouldNotBeValidated'));
        }

        this.isV4AppInternalMode = false;
        this.setAdpOverAdpSupport(checkForAdpOverAdpSupport, checkForAdpOverAdpPartialSupport, application.fileType);

        await this.validateSmartTemplateApplication(manifest);
    }

    private setAdpOverAdpSupport(
        checkForAdpOverAdpSupport: boolean,
        checkForAdpOverAdpPartialSupport: boolean,
        fileType: string
    ) {
        this.isSupportedAdpOverAdp = !(checkForAdpOverAdpSupport && fileType === 'appdescr_variant');
        this.isPartiallySupportedAdpOverAdp = checkForAdpOverAdpPartialSupport && fileType === 'appdescr_variant';
    }

    private checkForSyncLoadedViews(ui5Settings: Manifest['sap.ui5']) {
        if (ui5Settings?.rootView) {
            // @ts-ignore // TODO:
            this.appSync = !ui5Settings['rootView']['async'];
            return;
        }
        if (ui5Settings?.routing && ui5Settings['routing']['config']) {
            this.appSync = !ui5Settings['routing']['config']['async'];
            return;
        }
        this.appSync = false;
    }

    private async validateSmartTemplateApplication(manifest: Manifest) {
        const isV4App = isV4Application(manifest);
        this.isV4AppInternalMode = isV4App && !this.isCustomerBase;
        const sAppType = getApplicationType(manifest);

        if (isSupportedAppTypeForAdaptationProject(sAppType)) {
            if (manifest['sap.ui5']) {
                if (manifest['sap.ui5'].flexEnabled === false) {
                    throw new Error(t('validators.appDoesNotSupportAdaptation'));
                }
                this.checkForSyncLoadedViews(manifest['sap.ui5']);
            }
        } else {
            throw new Error(t('validators.adpPluginSmartTemplateProjectError'));
        }
    }

    private async applicationPromptValidationHandler(value: Application): Promise<boolean | string> {
        if (value) {
            try {
                const res = await this.manifestService.isAppSupported(value.id);

                if (res) {
                    await this.manifestService.loadManifest(value.id);

                    const systemVersion = this.ui5Service.systemVersion;
                    const checkForAdpOverAdpSupport =
                        this.ui5VersionDetected && !isFeatureSupportedVersion('1.96.0', systemVersion);
                    const checkForAdpOverAdpPartialSupport =
                        this.ui5VersionDetected &&
                        checkForAdpOverAdpSupport &&
                        isFeatureSupportedVersion('1.90.0', systemVersion);

                    await this.validateSelectedApplication(
                        value,
                        checkForAdpOverAdpSupport,
                        checkForAdpOverAdpPartialSupport,
                        this.manifestService.getManifest(value.id)
                    );
                }
                this.isApplicationSupported = true;
            } catch (e) {
                // this.logger.log(e);
                return e.message;
            }
        } else {
            return t('validators.selectCannotBeEmptyError', { value: 'Application' });
        }
        return true;
    }

    public getIsSupportedAdpOverAdp() {
        return this.isSupportedAdpOverAdp && !this.isPartiallySupportedAdpOverAdp;
    }

    public getIsPartiallySupportedAdpOverAdp() {
        return this.isPartiallySupportedAdpOverAdp;
    }

    private async systemPromptValidationHandler(value: string): Promise<boolean | string> {
        this.manifestService.resetCache();
        this.appsService.resetApps();
        this.ui5VersionDetected = true;

        if (!value) {
            if (isAppStudio()) {
                return t('validators.selectCannotBeEmptyError', { value: 'System' });
            }

            return t('validators.inputCannotBeEmpty');
        }

        this.hasSystemAuthentication = this.endpointsService.getSystemRequiresAuth(value);
        if (!this.hasSystemAuthentication) {
            try {
                await this.getSystemData(value);
                this.versionsOnSystem = await this.systemUI5VersionHandler(value);
                return this.validateAdaptationProjectTypes();
            } catch (e) {
                // this.logger.log(e);
                return e.message;
            }
        }

        return true;
    }

    private async getSystemData(system: string, client?: string, username?: string, password?: string): Promise<void> {
        await this.providerService.setProvider(system, client, username, password);
        // this.flexUISystem = await this.isFlexUISupportedSystem(); // TODO: Does not work
        this.flexUISystem = { isOnPremise: true, isUIFlex: true }; // TODO: remove fake assign

        try {
            const provider = this.providerService.getProvider();
            const lrep = provider.getLayeredRepository();
            this.systemInfo = await lrep.getSystemInfo();
        } catch (e) {
            // in case request to /sap/bc/lrep/dta_folder/system_info throws error we continue to standart onPremise flow
            this.systemInfo = {
                adaptationProjectTypes: [AdaptationProjectType.ON_PREMISE],
                activeLanguages: []
            };

            if (isAxiosError(e)) {
                if (e.response?.status === 401 || e.response?.status === 403) {
                    throw new Error(e.message);
                }
            }
        }
    }

    private async isFlexUISupportedSystem(): Promise<FlexUISupportedSystem | undefined> {
        if (!this.isCustomerBase) {
            return {
                isOnPremise: true,
                isUIFlex: true
            };
        }

        const provider = this.providerService.getProvider();
        const adtService = await provider.getAdtService<UIFlexService>(UIFlexService);
        const settings = await adtService?.getUIFlex();

        return settings;
    }

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
            //this.logger.log('Applications list is empty. No errors were thrown during execution of the request.');
            throw new Error('Applications list is empty. No errors were thrown during execution of the request.'); // TODO: Should we throw error here?
        }
    }

    private shouldAuthenticate(answers: ConfigurationInfoAnswers): boolean | string {
        return answers.system && this.hasSystemAuthentication && (answers.username === '' || answers.password === '');
    }

    private async getSystemPrompt() {
        return isAppStudio() ? await this.getSystemListPrompt() : await this.getSystemNativePrompt();
    }

    private async getSystemListPrompt(): Promise<YUIQuestion<ConfigurationInfoAnswers>> {
        return {
            type: 'list',
            name: 'system',
            message: t('prompts.systemLabel'),
            choices: () => this.systemNames,
            guiOptions: {
                hint: t('prompts.systemTooltip'),
                breadcrumb: t('prompts.systemLabel')
            },
            when: isAppStudio() ? this.systemInfo?.adaptationProjectTypes?.length : true,
            validate: this.systemPromptValidationHandler.bind(this),
            additionalMessages: () => {
                if (
                    this.flexUISystem &&
                    !this.flexUISystem.isOnPremise &&
                    !this.flexUISystem.isUIFlex &&
                    !this.isCloudProject &&
                    this.systemInfo?.adaptationProjectTypes?.length
                ) {
                    return {
                        message: t('validators.notDeployableNotFlexEnabledSystemError'),
                        severity: Severity.error
                    };
                }

                if (
                    this.flexUISystem &&
                    !this.flexUISystem.isOnPremise &&
                    this.flexUISystem.isUIFlex &&
                    !this.isCloudProject &&
                    this.systemInfo?.adaptationProjectTypes?.length
                ) {
                    return {
                        message: t('validators.notDeployableSystemError'),
                        severity: Severity.error
                    };
                }

                if (
                    this.flexUISystem &&
                    !this.flexUISystem.isUIFlex &&
                    this.flexUISystem.isOnPremise &&
                    !this.isCloudProject &&
                    this.systemInfo?.adaptationProjectTypes?.length
                ) {
                    return {
                        message: t('validators.notFlexEnabledError'),
                        severity: Severity.warning
                    };
                }
            }
        } as ListQuestion<ConfigurationInfoAnswers>;
    }

    private async getSystemNativePrompt(): Promise<YUIQuestion<ConfigurationInfoAnswers>> {
        return this.isExtensionInstalled ? this.getSystemListPrompt() : this.getSystemInputPrompt();
    }

    private getSystemInputPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'system',
            message: 'System URL',
            validate: this.systemPromptValidationHandler.bind(this),
            guiOptions: {
                mandatory: true,
                breadcrumb: 'System URL'
            },
            store: false
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getSystemClientPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'client',
            message: 'System client',
            validate: validateClient,
            when: (answers: ConfigurationInfoAnswers) => {
                if (answers.system) {
                    return isAppStudio() ? false : !this.isExtensionInstalled;
                }
                return false;
            },
            guiOptions: {
                mandatory: true,
                breadcrumb: 'System client'
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
                    return t('prompts.inputCannotBeEmpty');
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
                breadcrumb: t('prompts.usernameLabel')
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
                    return t('prompts.inputCannotBeEmpty');
                }

                // answers.password not set yet, use "value" instead
                try {
                    await this.getSystemData(answers.system, answers.client, answers.username, value);
                    this.versionsOnSystem = await this.systemUI5VersionHandler(answers.system);
                    await this.getApplications(answers.system, answers.username, value, answers.client);
                    this.isLoginSuccessfull = true;
                    if (isAppStudio()) {
                        return this.validateAdaptationProjectTypes();
                    }
                } catch (e) {
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
                    return e.message;
                }

                if (!isNotEmptyString(value)) {
                    return t('prompts.inputCannotBeEmpty');
                }

                return true;
            },
            guiOptions: {
                hint: t('prompts.projectTypeTooltip'),
                breadcrumb: t('prompts.projectTypeLabel'),
                applyDefaultWhenDirty: true
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

    private getApplicationPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return this.prompts ? this.getApplicationListPrompt() : this.getApplicationInputPrompt();
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
                breadcrumb: t('prompts.applicationListLabel')
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
                if (this.appSync && this.isApplicationSupported && !!app) {
                    return {
                        message: t('prompts.appInfoLabel'),
                        severity: Severity.information
                    };
                }

                if (
                    !!app &&
                    !this.getIsSupportedAdpOverAdp() &&
                    !this.isPartiallySupportedAdpOverAdp &&
                    this.isApplicationSupported
                ) {
                    return {
                        message: t('prompts.notSupportedAdpOverAdpLabel'),
                        severity: Severity.warning
                    };
                }

                if (!!app && this.isPartiallySupportedAdpOverAdp && this.isApplicationSupported) {
                    return {
                        message: t('prompts.isPartiallySupportedAdpOverAdpLabel'),
                        severity: Severity.warning
                    };
                }

                if (this.isV4AppInternalMode) {
                    return {
                        message: t('prompts.v4AppNotOfficialLabel'),
                        severity: Severity.warning
                    };
                }
            }
        } as ListQuestion<ConfigurationInfoAnswers>;
    }

    private getApplicationInputPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'application',
            message: t('prompts.applicationListLabel'),
            validate: this.applicationPromptValidationHandler.bind(this),
            store: false,
            guiOptions: {
                hint: t('prompts.applicationListTooltip'),
                breadcrumb: t('prompts.applicationListLabel')
            },
            additionalMessages: (app) => {
                if (this.appSync && this.isApplicationSupported && !!app) {
                    return {
                        // TODO: appInfoLabel is in two places rn
                        message: t('prompts.appInfoLabel'),
                        severity: Severity.information
                    };
                }
            }
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getUi5VersionPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'list',
            name: 'ui5Version',
            message: t('prompts.ui5VersionLabel'),
            when: (answers: ConfigurationInfoAnswers) => {
                // show the field when the system is selected
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
                breadcrumb: t('prompts.ui5VersionLabel')
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
                hint: t('prompts.fioriIdHint')
            },
            when: (answers: ConfigurationInfoAnswers) => {
                // show the field when the system is selected and in internal mode
                return (
                    answers.system &&
                    !this.isCustomerBase &&
                    !this.shouldAuthenticate(answers) &&
                    this.isApplicationSupported
                );
            },
            default: (answers: ConfigurationInfoAnswers) => {
                const manifest = this.manifestService.getManifest(answers.application.id);
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
                mandatory: true
            },
            when: (answers: ConfigurationInfoAnswers) => {
                // show the field when the system is selected and in internal mode
                return (
                    answers.system &&
                    !this.isCustomerBase &&
                    !this.shouldAuthenticate(answers) &&
                    this.isApplicationSupported
                );
            },
            default: (answers: ConfigurationInfoAnswers) => {
                const manifest = this.manifestService.getManifest(answers.application.id);
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
                return this.isApplicationSupported && this.appSync
                    ? t('prompts.createExtProjectWithSyncViewsLabel', { value: projectName })
                    : t('prompts.createExtProjectLabel', { value: projectName });
            },
            default: false,
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            when: (answers: ConfigurationInfoAnswers) => answers.application && this.allowExtensionProject(),
            validate: (value: boolean) => {
                if (this.isApplicationSupported && this.appSync) {
                    return !value ? true : this.resolveNodeModuleGenerator();
                }

                return !value ? 'Please select whether you want to continue' : this.resolveNodeModuleGenerator();
            }
        } as ConfirmQuestion<ConfigurationInfoAnswers>;
    }

    public async getConfigurationPrompts(projectName: string): Promise<YUIQuestion<ConfigurationInfoAnswers>[]> {
        await this.endpointsService.getEndpoints();
        this.systemNames = this.endpointsService.getEndpointNames();

        return [
            await this.getSystemPrompt(),
            this.getSystemClientPrompt(),
            this.getUsernamePrompt(),
            this.getPasswordPrompt(),
            this.getProjectTypeListPrompt(),
            this.getApplicationPrompt(),
            this.getUi5VersionPrompt(),
            this.getFioriIdPrompt(),
            this.getACHprompt(),
            this.getAppInfoErrorPrompt(),
            this.getConfirmExtProjPrompt(projectName)
        ];
    }

    //FLP Configuration prompts
    private getInboundListPrompt(): YUIQuestion<FlpConfigAnswers> {
        return {
            type: 'list',
            name: 'inboundId',
            message: t('prompts.inboundId'),
            choices: this.inboundIds,
            default: this.inboundIds[0],
            validate: (value: string) => validateEmptyInput(value, 'inboundId'),
            when: this.isCloudProject && this.inboundIds.length > 0,
            guiOptions: {
                hint: t('tooltips.inboundId')
            }
        } as ListQuestion<FlpConfigAnswers>;
    }

    private getFlpInfoPrompt(appId: string): YUIQuestion<FlpConfigAnswers> {
        return {
            type: 'input',
            name: 'flpInfo',
            message: t('prompts.flpInfo'),
            guiOptions: {
                type: 'label',
                mandatory: false,
                link: {
                    text: 'application page.',
                    url: `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/${
                        appId ? `index.html?appId=${appId}&releaseGroupTextCombined=SC` : '#/home'
                    }`
                }
            },
            when: this.isCloudProject && this.inboundIds.length === 0
        };
    }

    private getFlpConfigurationTypePrompt(): YUIQuestion<FlpConfigAnswers> {
        return {
            type: 'input',
            name: 'flpConfigurationTypeLabel',
            message: t('prompts.flpConfigurationType'),
            when: this.isCloudProject,
            guiOptions: {
                type: 'label',
                hint: t('tooltips.flpConfigurationType'),
                mandatory: false
            }
        };
    }

    private getSemanticObjectPrompt(): YUIQuestion<FlpConfigAnswers> {
        return {
            type: 'input',
            name: 'semanticObject',
            message: t('prompts.semanticObject'),
            validate: (value: string) => validateByRegex(value, 'semanticObject', '^[A-Za-z0-9_]{0,30}$'),
            guiOptions: {
                hint: t('prompts.semanticObject'),
                mandatory: true
            },
            when: this.isCloudProject && !this.inboundIds.length
        };
    }

    private getActionPrompt(): YUIQuestion<FlpConfigAnswers> {
        return {
            type: 'input',
            name: 'action',
            message: t('prompts.action'),
            validate: (value: string) => validateByRegex(value, 'action', '^[A-Za-z0-9_]{0,60}$'),
            guiOptions: {
                hint: t('tooltips.action'),
                mandatory: true
            },
            when: this.isCloudProject && !this.inboundIds.length
        };
    }

    private getTitlePrompt(): YUIQuestion<FlpConfigAnswers> {
        return {
            type: 'input',
            name: 'title',
            message: t('prompts.title'),
            guiOptions: {
                mandatory: true,
                hint: t('tooltips.title')
            },
            when: this.isCloudProject,
            validate: (value: string) => validateEmptyInput(value, 'title')
        };
    }

    private getSubtitlePrompt(): YUIQuestion<FlpConfigAnswers> {
        return {
            type: 'input',
            name: 'subtitle',
            message: t('prompts.subtitle'),
            guiOptions: {
                hint: t('tooltips.subtitle')
            },
            when: this.isCloudProject
        };
    }

    private getParametersPrompt(): YUIQuestion<FlpConfigAnswers> {
        return {
            type: 'editor',
            name: 'parameters',
            message: t('prompts.parameters'),
            validate: (value: string) => validateParameters(value),
            guiOptions: {
                hint: t('tooltips.parameters'),
                mandatory: false
            },
            when: this.isCloudProject && this.inboundIds.length === 0
        };
    }

    public async getFlpConfigurationPrompts(appId: string): Promise<YUIQuestion<FlpConfigAnswers>[]> {
        if (!this.manifestService.getManifest(appId)) {
            await this.manifestService.loadManifest(appId);
        }
        const manifest = this.manifestService.getManifest(appId);
        this.inboundIds = getInboundIds(manifest);

        return [
            this.getInboundListPrompt(),
            this.getFlpInfoPrompt(appId),
            this.getFlpConfigurationTypePrompt(),
            this.getSemanticObjectPrompt(),
            this.getActionPrompt(),
            this.getTitlePrompt(),
            this.getSubtitlePrompt(),
            this.getParametersPrompt()
        ];
    }

    //DEPLOY CONFIG PROMPTS
    private getAbapRepositoryPrompt(): YUIQuestion<DeployConfigAnswers> {
        return {
            type: 'input',
            name: 'abapRepository',
            message: t('prompts.abapRepository'),
            guiOptions: {
                hint: t('tooltips.abapRepository'),
                mandatory: true
            },
            validate: (value: string) => validateAbapRepository(value)
        };
    }

    private getInputChoiceOptions(): ChoiceOption[] {
        return [
            { name: InputChoice.ENTER_MANUALLY, value: InputChoice.ENTER_MANUALLY },
            { value: InputChoice.CHOOSE_FROM_EXISTING, name: InputChoice.CHOOSE_FROM_EXISTING }
        ];
    }

    private getDeployConfigDescriptionPrompt(): YUIQuestion<DeployConfigAnswers> {
        return {
            type: 'input',
            name: 'deployConfigDescription',
            message: t('prompts.deployConfigDescription'),
            guiOptions: {
                hint: t('tooltips.deployConfigDescription')
            }
        };
    }

    private getPackageInputChoicePrompt(): YUIQuestion<DeployConfigAnswers> {
        const options = this.getInputChoiceOptions();
        return {
            type: 'list',
            name: 'packageInputChoice',
            message: t('prompts.packageInputChoice'),
            choices: () => options,
            default: (answers: DeployConfigAnswers) => answers?.packageInputChoice ?? InputChoice.ENTER_MANUALLY,
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            validate: async (value: InputChoice) => {
                this.packageInputChoiceValid = await validatePackageChoiceInput(
                    value,
                    this.providerService.getProvider()
                );
                return this.packageInputChoiceValid;
            }
        } as ListQuestion<DeployConfigAnswers>;
    }

    private async setTransportList(packageName: string, repository: string): Promise<void> {
        try {
            this.transportList = await listTransports(packageName, repository, this.providerService.getProvider());
        } catch (error) {
            //In case that the request fails we should not break package validation
            //this.logger.error(`Could not set transportList! Error: ${error.message}`);
        }
    }

    private async validatePackage(value: string, answers: DeployConfigAnswers): Promise<string | boolean> {
        const errorMessage = validatePackage(value, answers.abapRepository);
        if (errorMessage) {
            return errorMessage;
        }

        try {
            const lRepService = await this.providerService.getProvider().getLayeredRepository();
            const systemInfo = await lRepService.getSystemInfo(undefined, value);
            //When passing package to the API for getting system info the response contains the type of the package (cloud or onPremise)
            //If the package is cloud in adaptationProjectTypes we will have array with only one element 'cloudReady', if it is 'onPremise' the element in the array will be 'onPremise'
            if (systemInfo.adaptationProjectTypes[0] !== AdaptationProjectType.CLOUD_READY) {
                return t('validators.package.notCloudPackage');
            }

            if (answers.abapRepository && answers.transportInputChoice === InputChoice.CHOOSE_FROM_EXISTING) {
                await this.setTransportList(value, answers.abapRepository);
            }

            return true;
        } catch (error) {
            //If there is no such package the API will response with 400 or 404 status codes
            if (error.response && (error.response.status === 400 || error.response.status === 404)) {
                return t('validators.package.notCloudPackage');
            }
            //In case of different response status code than 400 or 404 we are showing the error message
            return error.message;
        }
    }

    private getPackageManualPrompt(): YUIQuestion<DeployConfigAnswers> {
        return {
            type: 'input',
            name: 'packageManual',
            message: t('prompts.package'),
            guiOptions: {
                hint: t('tooltips.package'),
                mandatory: true
            },
            when: (answers: DeployConfigAnswers) => {
                return (
                    answers?.packageInputChoice === InputChoice.ENTER_MANUALLY ||
                    (answers.packageInputChoice === InputChoice.CHOOSE_FROM_EXISTING &&
                        typeof this.packageInputChoiceValid === 'string')
                );
            },
            validate: async (value: string, answers: DeployConfigAnswers) => await this.validatePackage(value, answers)
        };
    }

    private getPackageAutoCompletePrompt(): YUIQuestion<DeployConfigAnswers> {
        let morePackageResultsMsg = '';
        return {
            type: 'autocomplete',
            name: 'packageAutocomplete',
            message: t('prompts.package'),
            guiOptions: {
                mandatory: true,
                hint: t('tooltips.package')
            },
            source: async (answers: DeployConfigAnswers, input: string) => {
                let packages: string[] | undefined = [];
                try {
                    packages = await listPackages(input, this.providerService.getProvider());
                    morePackageResultsMsg =
                        packages && packages.length === ABAP_PACKAGE_SEARCH_MAX_RESULTS
                            ? t('info.moreSearchResults', { count: packages.length })
                            : '';
                    return packages ?? [];
                } catch (error) {
                    this.logger.error(`Could not get packages. Error: ${error.message}`);
                }

                return packages ?? [];
            },
            additionalInfo: () => morePackageResultsMsg,
            when: (answers: DeployConfigAnswers) => {
                return (
                    this.packageInputChoiceValid === true &&
                    answers?.packageInputChoice === InputChoice.CHOOSE_FROM_EXISTING
                );
            },
            validate: async (value: string, answers: DeployConfigAnswers) => await this.validatePackage(value, answers)
        } as AutocompleteQuestion<DeployConfigAnswers>;
    }

    private shouldShowTransportRelatedPrompt(answers: DeployConfigAnswers): boolean {
        return (
            (answers?.packageAutocomplete?.toUpperCase() !== '$TMP' &&
                answers?.packageInputChoice === InputChoice.CHOOSE_FROM_EXISTING) ||
            (answers?.packageManual?.toUpperCase() !== '$TMP' &&
                answers?.packageInputChoice === InputChoice.ENTER_MANUALLY)
        );
    }

    private getTransportInputChoice(): YUIQuestion<DeployConfigAnswers> {
        const options = this.getInputChoiceOptions();
        return {
            type: 'list',
            name: 'transportInputChoice',
            message: t('prompts.transportInputChoice'),
            choices: () => options,
            default: (answers: DeployConfigAnswers) => answers.transportInputChoice ?? InputChoice.ENTER_MANUALLY,
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            validate: async (value: InputChoice, answers: DeployConfigAnswers) =>
                await validateTransportChoiceInput(
                    value,
                    answers.packageInputChoice === InputChoice.ENTER_MANUALLY
                        ? answers.packageManual!
                        : answers.packageAutocomplete!,
                    answers.abapRepository,
                    this.providerService.getProvider()
                ),
            when: (answers: DeployConfigAnswers) => this.shouldShowTransportRelatedPrompt(answers)
        } as ListQuestion<DeployConfigAnswers>;
    }

    private getTransportListPrompt(): YUIQuestion<DeployConfigAnswers> {
        return {
            type: 'list',
            name: 'transportFromList',
            message: t('prompts.transport'),
            choices: () => this.transportList ?? [],
            validate: (value: string) => validateEmptyInput(value, 'transport'),
            when: (answers: DeployConfigAnswers) =>
                this.shouldShowTransportRelatedPrompt(answers) &&
                answers?.transportInputChoice === InputChoice.CHOOSE_FROM_EXISTING,
            guiOptions: {
                hint: t('tooltips.transport'),
                mandatory: true
            }
        } as ListQuestion<DeployConfigAnswers>;
    }

    private getTransportManualPrompt(): YUIQuestion<DeployConfigAnswers> {
        return {
            type: 'input',
            name: 'transportManual',
            message: t('prompts.transport'),
            validate: (value: string) => validateEmptyInput(value, 'transport'),
            when: (answers: DeployConfigAnswers) =>
                this.shouldShowTransportRelatedPrompt(answers) &&
                answers?.transportInputChoice === InputChoice.ENTER_MANUALLY,
            guiOptions: {
                hint: t('tooltips.transport'),
                mandatory: true
            }
        };
    }

    public getDeployConfigPrompts(): YUIQuestion<DeployConfigAnswers>[] {
        return [
            this.getAbapRepositoryPrompt(),
            this.getDeployConfigDescriptionPrompt(),
            this.getPackageInputChoicePrompt(),
            this.getPackageManualPrompt(),
            this.getPackageAutoCompletePrompt(),
            this.getTransportInputChoice(),
            this.getTransportListPrompt(),
            this.getTransportManualPrompt()
        ];
    }
}
