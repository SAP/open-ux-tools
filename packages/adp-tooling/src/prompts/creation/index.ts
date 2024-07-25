import { isAppStudio } from '@sap-ux/btp-utils';
import {
    AbapServiceProvider,
    AdaptationProjectType,
    AppIndex,
    AxiosRequestConfig,
    OperationsType,
    ProviderConfiguration,
    SystemInfo,
    UI5RtVersionService,
    UIFlexService
} from '@sap-ux/axios-extension';
import { Logger } from '@sap-ux/logger';
import type { Manifest, UI5FlexLayer } from '@sap-ux/project-access';
import { isExtensionInstalledVsCode } from '@sap-ux/environment-check';
import { AbapTarget, createAbapServiceProvider } from '@sap-ux/system-access';
import type { ListQuestion, InputQuestion, YUIQuestion, PasswordQuestion } from '@sap-ux/inquirer-common';

import { t } from '../../i18n';
import { isCustomerBase } from '../../base/helper';
import {
    Application,
    BasicInfoAnswers,
    ChoiceOption,
    ConfigurationInfoAnswers,
    FlexUISupportedSystem,
    Prompts,
    TargetEnvAnswers
} from '../../types';
import {
    isNotEmptyString,
    validateAch,
    validateByRegex,
    validateClient,
    validateEmptyInput,
    validateEnvironment,
    validateNamespace,
    validateParameters,
    validateProjectName
} from '../../base/validators';

import { EndpointsService } from '../../base/services/endpoints-service';
import { UI5VersionService, isFeatureSupportedVersion } from '../../base/services/ui5-version-service';
import {
    generateValidNamespace,
    getDefaultProjectName,
    getEnvironments,
    getProjectNameTooltip
} from './prompt-helpers';
import { getApplicationType, isSupportedAppTypeForAdaptationProject, isV4Application } from '../../base/app-utils';
import { ABAP_APPS_PARAMS, ABAP_VARIANT_APPS_PARAMS, S4HANA_APPS_PARAMS } from './constants';

export function getInboundIds(manifest: Manifest): string[] {
    let inboundIds: string[] = [];
    if (manifest['sap.app'].crossNavigation && manifest['sap.app'].crossNavigation.inbounds) {
        // we are taking the first inbound id from the manifest
        inboundIds = Object.keys(manifest['sap.app'].crossNavigation.inbounds);
    }

    return inboundIds;
}

export default class ProjectPrompter {
    private logger: Logger;
    private isCustomerBase: boolean;
    private hasSystemAuthentication: boolean;
    private isLoginSuccessfull: boolean;
    private flexUISystem: FlexUISupportedSystem | undefined;
    private systemInfo: SystemInfo;
    private applicationIds: any;
    private ui5VersionDetected = true;
    private isCloudProject: boolean;
    private isApplicationSupported: boolean;
    private isV4AppInternalMode: boolean;
    private isSupportedAdpOverAdp: boolean;
    private isPartiallySupportedAdpOverAdp: boolean;

    private appSync: boolean;

    private versionsOnSystem: string[];
    private systemNames: string[];

    private provider: AbapServiceProvider;

    private appManifest: Manifest | null;
    private appManifestUrl: string | null;

    private inboundIds: string[];

    private readonly isExtensionInstalled: boolean;

    private ui5Service: UI5VersionService;
    private endpointsService: EndpointsService;

    private prompts?: Prompts;

    constructor(layer: UI5FlexLayer, prompts?: Prompts) {
        this.prompts = prompts;
        this.isCustomerBase = isCustomerBase(layer);
        this.isExtensionInstalled = isExtensionInstalledVsCode('sapse.sap-ux-application-modeler-extension');

        this.ui5Service = new UI5VersionService(this.isCustomerBase);
        this.endpointsService = new EndpointsService(this.isExtensionInstalled);
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

        if (this.isCloudProject && totalPagesCount === 3) {
            const flpConfigPageLabel = {
                name: t('prompts.flpConfigurationStep'),
                description: t('prompts.flpConfigurationDescription')
            };
            const deployConfigPageLabel = {
                name: t('prompts.deploymentConfigStep'),
                description: t('prompts.deploymentConfigDescription')
            };

            this.prompts.splice(3, 0, [flpConfigPageLabel, deployConfigPageLabel]);
        } else if (!this.isCloudProject && totalPagesCount === 5) {
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

    private async systemUI5VersionHandler(value: string): Promise<string[]> {
        if (value) {
            try {
                const service = await this.provider.getAdtService<UI5RtVersionService>(UI5RtVersionService);
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

    private getCachedFioriId(): string {
        if (
            this.appManifest &&
            this.appManifest['sap.fiori'] &&
            this.appManifest['sap.fiori'].registrationIds &&
            this.appManifest['sap.fiori'].registrationIds.length > 0
        ) {
            return this.appManifest['sap.fiori'].registrationIds.toString();
        }
        return '';
    }

    public async isAppSupported(appId: string): Promise<boolean> {
        this.appManifest = null;
        this.appManifestUrl = null;

        const appIndex = this.provider.getAppIndex();
        const supportsManifest: boolean = await appIndex.getIsManiFirstSupported(appId);

        if (supportsManifest === true) {
            return await this.checkManifestUrlExists(appId);
        } else {
            throw new Error(t('validators.appDoesNotSupportManifest'));
        }
    }

    private async getManifestUrl(appId: string): Promise<string> {
        const appIndex = this.provider.getAppIndex();
        const data = await appIndex.getAppInfo(appId);

        let manifestUrl: string = '';
        if (data) {
            const appInfo = Object.values(data)[0];
            manifestUrl = appInfo?.manifestUrl ?? appInfo?.manifest ?? '';
        }

        this.appManifestUrl = manifestUrl;

        return manifestUrl;
    }

    private async checkManifestUrlExists(id: string) {
        const sManifestUrl = await this.getManifestUrl(id);
        if (sManifestUrl) {
            return true;
        } else {
            throw new Error(t('validators.adpPluginSmartTemplateProjectError'));
        }
    }

    public async validateSelectedApplication(
        applicationData: { fileType: string },
        checkForAdpOverAdpSupport: boolean,
        checkForAdpOverAdpPartialSupport: boolean,
        manifest: Manifest
    ): Promise<void> {
        if (!applicationData) {
            throw new Error(t('validators.selectCannotBeEmptyError', { value: 'Application' }));
        }

        this.isV4AppInternalMode = false;
        const fileType = applicationData.fileType;

        this.setAdpOverAdpSupport(checkForAdpOverAdpSupport, checkForAdpOverAdpPartialSupport, fileType);
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

    public async getManifest(manifestUrl: string): Promise<Manifest> {
        try {
            const config: AxiosRequestConfig = {
                url: manifestUrl
            };

            const response = await this.provider.request(config);

            const data = JSON.parse(response.data);

            if (typeof data !== 'object') {
                throw new Error('Manifest parsing error: Manifest is not in expected format.');
            }

            this.appManifest = data;

            return data;
        } catch (error) {
            // this.log.error(`Failed to fetch the manifest with url ${manifestUrl}.`);
            // this.log.debug(error);
            throw error;
        }
    }

    private getCachedApplicationComponentHierarchy(): string {
        if (
            this.appManifest &&
            this.appManifest['sap.app'] &&
            this.appManifest['sap.app'].ach &&
            this.appManifest['sap.app'].ach.length > 0
        ) {
            return this.appManifest['sap.app'].ach.toString();
        }
        return '';
    }

    private async applicationPromptValidationHandler(
        value: Application,
        answers: ConfigurationInfoAnswers
    ): Promise<boolean | string> {
        if (value) {
            try {
                const res = await this.isAppSupported(value.id);

                if (res) {
                    const manifestUrl = await this.getManifestUrl(value.id);
                    const manifest = await this.getManifest(manifestUrl);

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
                        manifest
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
        this.applicationIds = [];
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
                if (isAppStudio()) {
                    return this.validateAdaptationProjectTypes();
                } else {
                    await this.getApplications(value);
                }
            } catch (e) {
                // this.logger.log(e);
                return e.message;
            }
        }

        return true;
    }

    private async setProvider(system: string, client?: string, username?: string, password?: string) {
        let target: AbapTarget;

        if (isAppStudio()) {
            target = {
                destination: system
            };
        } else {
            const auth = this.endpointsService.getSystemAuthDetails(system);
            target = {
                url: auth?.url,
                client: client ?? auth?.client,
                destination: ''
            };
        }

        const requestOptions: AxiosRequestConfig & Partial<ProviderConfiguration> = {
            ignoreCertErrors: false
        };

        if (username && password) {
            requestOptions.auth = { username, password };
        }

        this.provider = await createAbapServiceProvider(target, requestOptions, true, {} as Logger);
    }

    private async getSystemData(system: string, client?: string, username?: string, password?: string): Promise<void> {
        await this.setProvider(system, client, username, password);
        // this.flexUISystem = await this.isFlexUISupportedSystem(); // TODO: Does not work
        this.flexUISystem = { isOnPremise: true, isUIFlex: true }; // TODO: remove fake assign
        if (isAppStudio()) {
            try {
                const lrep = this.provider.getLayeredRepository();
                this.systemInfo = await lrep.getSystemInfo();
            } catch (e) {
                // in case request to /sap/bc/lrep/dta_folder/system_info throws error we continue to standart onPremise flow
                this.systemInfo = {
                    adaptationProjectTypes: [AdaptationProjectType.ON_PREMISE],
                    activeLanguages: []
                };
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

        const adtService = await this.provider.getAdtService<UIFlexService>(UIFlexService);
        const settings = await adtService?.getUIFlex();

        return settings;
    }

    public async getApps(isCustomerBase: boolean, isCloudSystem: boolean) {
        let applicationIds = [];
        let result: AppIndex = [];

        const appIndex = this.provider.getAppIndex();

        try {
            if (isCloudSystem) {
                result = await appIndex.search(S4HANA_APPS_PARAMS);
            } else {
                result = await appIndex.search(ABAP_APPS_PARAMS);

                if (isCustomerBase) {
                    const extraApps = await appIndex.search(ABAP_VARIANT_APPS_PARAMS);
                    result = result.concat(extraApps);
                }
            }

            applicationIds = result
                .map((app) => {
                    return {
                        id: app['sap.app/id'] ?? '',
                        title: app['sap.app/title'] ?? '',
                        ach: app['sap.app/ach'],
                        registrationIds: app['sap.fiori/registrationIds'],
                        fileType: app['fileType'],
                        bspUrl: app['url'],
                        bspName: app['repoName']
                    };
                })
                .sort((appA, appB) => {
                    let titleA = appA.title.toUpperCase();
                    let titleB = appB.title.toUpperCase();
                    if (!titleA.trim()) {
                        titleA = appA.id.toUpperCase();
                    }

                    if (!titleB.trim()) {
                        titleB = appB.id.toUpperCase();
                    }

                    if (titleA < titleB) {
                        return -1;
                    }
                    if (titleA > titleB) {
                        return 1;
                    }
                    return 0;
                });
        } catch (e) {
            throw new Error(t('validators.cannotLoadApplicationsError'));
        }
        return applicationIds;
    }

    private async getApplications(
        system: string,
        username?: string,
        password?: string,
        client?: string
    ): Promise<void> {
        await this.setProvider(system, client, username, password);
        if (!this.flexUISystem) {
            this.flexUISystem = await this.isFlexUISupportedSystem();
        }

        this.applicationIds =
            this.isCloudProject || (this.flexUISystem && (this.flexUISystem.isOnPremise || this.flexUISystem.isUIFlex))
                ? await this.getApps(this.isCustomerBase, this.isCloudProject)
                : [];
        if (this.applicationIds.length === 0) {
            this.logger.log('Applications list is empty. No errors were thrown during execution of the request.');
        }
    }

    private shouldAuthenticate(answers: ConfigurationInfoAnswers): boolean | string {
        return answers.system && this.hasSystemAuthentication && (answers.username === '' || answers.password === '');
    }

    private getNamespacePrompt(isCustomerBase: boolean): YUIQuestion<BasicInfoAnswers> {
        const prompt: InputQuestion<BasicInfoAnswers> = {
            type: 'input',
            name: 'namespace',
            message: t('prompts.namespaceLabel'),
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            default: (answers: BasicInfoAnswers) => generateValidNamespace(answers.projectName, isCustomerBase),
            store: false
        } as InputQuestion<BasicInfoAnswers>;

        if (!isCustomerBase) {
            if (prompt.guiOptions) {
                prompt.guiOptions.type = 'label';
            }
            prompt.when = (answers: BasicInfoAnswers) => {
                return !!answers.projectName;
            };
        } else {
            if (prompt.guiOptions) {
                prompt.guiOptions.mandatory = true;
            }
            prompt.validate = (value: string, answers: BasicInfoAnswers) =>
                validateNamespace(value, answers.projectName, isCustomerBase);
        }

        return prompt;
    }

    public getBasicInfoPrompts(path: string): YUIQuestion<BasicInfoAnswers>[] {
        return [
            {
                type: 'input',
                name: 'projectName',
                message: () => 'Project Name',
                default: () => getDefaultProjectName(path),
                guiOptions: {
                    mandatory: true,
                    hint: getProjectNameTooltip(this.isCustomerBase)
                },
                validate: (value: string) => {
                    return validateProjectName(value, path, this.isCustomerBase);
                },
                store: false
            } as InputQuestion<BasicInfoAnswers>,
            {
                type: 'input',
                name: 'applicationTitle',
                message: t('prompts.appTitleLabel'),
                default: () => t('prompts.appTitleDefault'),
                guiOptions: {
                    mandatory: true,
                    hint: t('prompts.appTitleTooltip')
                },
                validate: (value: string) => {
                    if (!isNotEmptyString(value)) {
                        return t('validators.cannotBeEmpty');
                    }
                    return true;
                },
                store: false
            } as InputQuestion<BasicInfoAnswers>,
            this.getNamespacePrompt(this.isCustomerBase)
        ];
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
                hint: t('prompts.systemTooltip')
            },
            when: isAppStudio() ? this.systemInfo?.adaptationProjectTypes?.length : true,
            validate: this.systemPromptValidationHandler.bind(this)
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
                mandatory: true
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
                mandatory: true
            },
            store: false
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getUsernamePrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'username',
            message: t('prompts.usernameLabel'),
            validate: async (value: string) => {
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
                mandatory: true
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
                    // return MessageUtils.getLoginErrorMessage(e?.response);
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
                this.systemInfo.adaptationProjectTypes.length > 1 &&
                isAppStudio() &&
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
                applyDefaultWhenDirty: true
            }
        } as ListQuestion<ConfigurationInfoAnswers>;
    }

    private getProjectTypeLabelPrompt(projectType: AdaptationProjectType): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            message: `Project Type: ${projectType}`,
            name: `projectType${projectType}Label`,
            value: this.systemInfo?.adaptationProjectTypes[0],
            when: (answers: ConfigurationInfoAnswers) =>
                !!answers.system &&
                !this.shouldAuthenticate(answers) &&
                this.systemInfo?.adaptationProjectTypes?.length &&
                this.systemInfo.adaptationProjectTypes.length == 1 &&
                this.systemInfo.adaptationProjectTypes[0] == projectType &&
                isAppStudio() &&
                (this.hasSystemAuthentication ? this.isLoginSuccessfull : true),
            validate: async (_: string, answers: ConfigurationInfoAnswers) => {
                this.isCloudProject = projectType == AdaptationProjectType.CLOUD_READY;
                this.setAdditionalPagesForCloudProjects();

                try {
                    await this.getApplications(answers.system, answers.username, answers.password, answers.client);
                } catch (e) {
                    return e.message;
                }

                return true;
            },
            guiOptions: {
                type: 'label',
                hint: t('prompts.projectTypeInfoTooltip', { type: projectType })
            }
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getNotFlexAndNotDeployableSystemLabelPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'notDeployableAndNotFlexSystemLabel',
            message: t('validators.notDeployableNotFlexEnabledSystemError'),
            guiOptions: {
                type: 'label'
            },
            when: () =>
                this.flexUISystem &&
                !this.flexUISystem.isOnPremise &&
                !this.flexUISystem.isUIFlex &&
                !this.isCloudProject &&
                (isAppStudio() ? this.systemInfo?.adaptationProjectTypes?.length : true),
            store: false
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getNotFlexEnabledSystemLabelPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'notFlexEnabledSystemLabel',
            message: t('validators.notFlexEnabledError'),
            guiOptions: {
                type: 'label'
            },
            when: () =>
                this.flexUISystem &&
                !this.flexUISystem.isUIFlex &&
                this.flexUISystem.isOnPremise &&
                !this.isCloudProject &&
                (isAppStudio() ? this.systemInfo?.adaptationProjectTypes?.length : true),

            store: false
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getNotDeployableSystemLabelPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'notDeployableSystemLabel',
            message: t('validators.notDeployableSystemError'),
            guiOptions: {
                type: 'label'
            },
            when: () =>
                this.flexUISystem &&
                !this.flexUISystem.isOnPremise &&
                this.flexUISystem.isUIFlex &&
                !this.isCloudProject &&
                (isAppStudio() ? this.systemInfo?.adaptationProjectTypes?.length : true),
            store: false
        } as InputQuestion<ConfigurationInfoAnswers>;
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
                // show the field when the system is selected and the user is authenticated if needed
                return (
                    !!answers.system &&
                    !this.shouldAuthenticate(answers) &&
                    (this.hasSystemAuthentication ? this.isLoginSuccessfull : true) &&
                    // In vscode the flow does not rely on systemInfo
                    (isAppStudio() ? this.systemInfo?.adaptationProjectTypes?.length : true)
                );
            },
            choices: () => {
                return Array.isArray(this.applicationIds)
                    ? this.applicationIds.map((app) => {
                          const name = app.title
                              ? `${app.title} (${app.id}, ${app.registrationIds}, ${app.ach})`
                              : `${app.id} (${app.registrationIds}, ${app.ach})`;
                          return {
                              value: { id: app.id, fileType: app.fileType, bspUrl: app.bspUrl, bspName: app.bspName },
                              name: name
                                  .replace('(, )', '')
                                  .replace(', , ', ', ')
                                  .replace(', )', ')')
                                  .replace('(, ', '(')
                          };
                      })
                    : this.applicationIds;
            },
            default: '',
            guiOptions: {
                applyDefaultWhenDirty: true,
                hint: t('prompts.applicationListTooltip')
            },
            validate: async (value: Application, answers: ConfigurationInfoAnswers) => {
                const validationResult = await this.applicationPromptValidationHandler(value, answers);

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
                hint: t('prompts.applicationListTooltip')
            }
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getAdpOverAdpInfoPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'adpOverAdpInfo',
            message: t('prompts.notSupportedAdpOverAdpLabel'),
            when: (answers: ConfigurationInfoAnswers) =>
                !!answers.application &&
                !this.getIsSupportedAdpOverAdp() &&
                !this.getIsPartiallySupportedAdpOverAdp() &&
                this.isApplicationSupported,
            guiOptions: {
                type: 'label',
                applyDefaultWhenDirty: true
            }
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getAdpOverAdpPartialSupportInfoPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'adpOverAdpPartialInfo',
            message: t('prompts.isPartiallySupportedAdpOverAdpLabel'),
            when: (answers: ConfigurationInfoAnswers) =>
                !!answers.application && this.isPartiallySupportedAdpOverAdp && this.isApplicationSupported,
            guiOptions: {
                type: 'label',
                applyDefaultWhenDirty: true
            }
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getApplicationInfoPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'appInfo',
            message: t('prompts.appInfoLabel'),
            when: (answers: ConfigurationInfoAnswers) =>
                this.appSync && this.isApplicationSupported && !!answers.application,
            guiOptions: {
                type: 'label',
                applyDefaultWhenDirty: true
            }
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getApplicationV4InfoPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'v4Info',
            message: t('prompts.v4AppNotOfficialLabel'),
            when: () => this.isV4AppInternalMode,
            guiOptions: {
                type: 'label',
                applyDefaultWhenDirty: true
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
                    (!isAppStudio() ? true : this.systemInfo?.adaptationProjectTypes?.length) &&
                    (this.hasSystemAuthentication ? this.isLoginSuccessfull : true)
                );
            },
            choices: () => Promise.resolve(this.versionsOnSystem),
            guiOptions: {
                applyDefaultWhenDirty: true,
                hint: t('prompts.ui5VersionTooltip')
            },
            validate: this.ui5Service.validateUI5Version.bind(this),
            default: async () => await this.getVersionDefaultValue()
        } as ListQuestion<ConfigurationInfoAnswers>;
    }

    private getCurrentUI5VersionPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'latestUI5version',
            message: t('prompts.currentUI5VersionLabel', { version: this.ui5Service.latestVersion }),
            when: (answers: ConfigurationInfoAnswers) => {
                return answers.system && !this.shouldAuthenticate(answers) && this.isCloudProject;
            },
            guiOptions: {
                type: 'label',
                hint: t('prompts.currentUI5VersionTooltip')
            }
        } as InputQuestion<ConfigurationInfoAnswers>;
    }

    private getVersionInfoPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return {
            type: 'input',
            name: 'versionInfo',
            message: t('validators.ui5VersionNotDetectedError'),
            when: (answers: ConfigurationInfoAnswers) =>
                !this.shouldAuthenticate(answers) &&
                !this.ui5VersionDetected &&
                !this.isCloudProject &&
                (this.hasSystemAuthentication ? this.isLoginSuccessfull : true),
            guiOptions: {
                type: 'label',
                applyDefaultWhenDirty: true
            }
        } as InputQuestion<ConfigurationInfoAnswers>;
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
            default: this.getCachedFioriId(),
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
            default: () => {
                return this.appManifest ? this.getCachedApplicationComponentHierarchy() : '';
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

    // ----

    public async getConfigurationPrompts(): Promise<YUIQuestion<ConfigurationInfoAnswers>[]> {
        await this.endpointsService.getEndpoints();
        this.systemNames = this.endpointsService.getEndpointNames();

        return [
            await this.getSystemPrompt(),
            this.getSystemClientPrompt(),
            this.getUsernamePrompt(),
            this.getPasswordPrompt(),
            this.getProjectTypeListPrompt(),
            this.getProjectTypeLabelPrompt(AdaptationProjectType.CLOUD_READY),
            this.getProjectTypeLabelPrompt(AdaptationProjectType.ON_PREMISE),
            this.getNotFlexAndNotDeployableSystemLabelPrompt(),
            this.getNotFlexEnabledSystemLabelPrompt(),
            this.getNotDeployableSystemLabelPrompt(),
            this.getApplicationPrompt(),
            this.getAdpOverAdpInfoPrompt(),
            this.getAdpOverAdpPartialSupportInfoPrompt(),
            this.getApplicationInfoPrompt(),
            this.getApplicationV4InfoPrompt(),
            this.getUi5VersionPrompt(),
            this.getCurrentUI5VersionPrompt(),
            this.getVersionInfoPrompt(),
            this.getFioriIdPrompt(),
            this.getACHprompt(),
            this.getAppInfoErrorPrompt()
            // ....
        ];
    }

    //FLP Configuration prompts
    private getInboundListPrompt() {
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
        };
    }

    private getFlpInfoPrompt(appId: string) {
        return {
            type: 'input',
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

    private getFlpConfigurationTypePrompt() {
        return {
            type: 'input',
            name: 'flpConfigurationTypeLabel',
            message: t('prompts.flpConfigurationType'),
            when: this.isCloudProject,
            validate: true,
            guiOptions: {
                type: 'label',
                hint: t('tooltips.flpConfigurationType'),
                mandatory: false
            }
        };
    }

    private getSemanticObjectPrompt() {
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

    private getActionPrompt() {
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

    public getTitlePrompt() {
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

    public getSubtitlePrompt() {
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

    public getParametersPrompt() {
        return {
            type: 'editor',
            name: 'parameters',
            message: t('prompts.parameters'),
            validate: (value: string) => validateParameters(value),
            store: false,
            guiOptions: {
                hint: t('tooltips.parameters'),
                mandatory: false
            },
            when: this.isCloudProject && this.inboundIds.length === 0
        };
    }

    public async getFlpConfigurationPrompts(appId: string): Promise<any> {
        if (!this.appManifest) {
            if (!this.appManifestUrl) {
                this.appManifestUrl = await this.getManifestUrl(appId);
            }

            this.appManifest = await this.getManifest(this.appManifestUrl);
        }

        this.inboundIds = getInboundIds(this.appManifest);

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
}
