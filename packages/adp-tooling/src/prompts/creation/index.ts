import { t } from '../../i18n';
import { isCustomerBase } from '../../base/helper';
import { getProjectNames } from '../../base/file-system';
import { BasicInfoAnswers, ConfigurationInfoAnswers, TargetEnvAnswers } from '../../types';
import {
    isNotEmptyString,
    validateClient,
    validateEnvironment,
    validateNamespace,
    validateProjectName
} from '../../base/validators';

import { isAppStudio } from '@sap-ux/btp-utils';
import {
    AbapServiceProvider,
    AdaptationProjectType,
    AxiosRequestConfig,
    OperationsType,
    ProviderConfiguration,
    SystemInfo,
    UI5RtVersionService,
    UIFlexService
} from '@sap-ux/axios-extension';
import { Endpoint, checkEndpoints, isExtensionInstalledVsCode } from '@sap-ux/environment-check';
import type { UI5FlexLayer } from '@sap-ux/project-access';
import type { ListQuestion, InputQuestion, YUIQuestion, PasswordQuestion } from '@sap-ux/inquirer-common';
import { AbapTarget, createAbapServiceProvider } from '@sap-ux/system-access';
import { Logger, LoggerOptions } from '@sap-ux/logger';

export interface FlexUISupportedSystem {
    isUIFlex: boolean;
    isOnPremise: boolean;
}

export interface Auth {
    url?: string;
    client?: string;
}

interface Application {
    'sap.app/id': string;
    'sap.app/title': string;
    'sap.app/ach': string;
    'sap.fiori/registrationIds': string;
    'fileType': string;
    'url': string;
    'repoName': string;
}

export interface ChoiceOption<T = string> {
    name: string;
    value: T;
}

export function isVisible(isCFEnv: boolean, isLoggedIn: boolean): boolean {
    return !isCFEnv || (isCFEnv && isLoggedIn);
}

const S4HANAAppsParams = {
    'sap.app/type': 'application',
    'sap.fiori/cloudDevAdaptationStatus': 'released',
    'fields':
        'sap.app/id,repoName,sap.fiori/cloudDevAdaptationStatus,sap.app/ach,sap.fiori/registrationIds,sap.app/title,url,fileType'
};

const ABAPAppsParams = {
    'fields': 'sap.app/id,sap.app/ach,sap.fiori/registrationIds,sap.app/title,url,fileType,repoName',
    'sap.ui/technology': 'UI5',
    'sap.app/type': 'application',
    'fileType': 'appdescr'
};

const ABAPVariantsAppsParams = {
    'fields': 'sap.app/id,sap.app/ach,sap.fiori/registrationIds,sap.app/title,url,fileType,repoName',
    'sap.ui/technology': 'UI5',
    'sap.app/type': 'application',
    'fileType': 'appdescr_variant',
    'originLayer': 'VENDOR'
};

function getEnvironments(isCfInstalled: boolean): ChoiceOption<OperationsType>[] {
    const choices: ChoiceOption<OperationsType>[] = [{ name: 'OnPremise', value: 'P' }];

    if (isCfInstalled) {
        choices.push({ name: 'Cloud Foundry', value: 'C' });
    } else {
        // TODO: What to do in case of an error case where you need to call appWizard?
        // TODO: Make mechanism that shows errors or messages vscode style based on environment CLI or yeoman
        // this.appWizard.showInformation(Messages.CLOUD_FOUNDRY_NOT_INSTALLED, MessageType.prompt);
        // console.log(Messages.CLOUD_FOUNDRY_NOT_INSTALLED);
    }

    return choices;
}

export function getDefaultProjectName(path: string): string {
    const projectNames = getProjectNames(path);
    const defaultPrefix = 'app.variant';

    if (projectNames.length === 0) {
        return `${defaultPrefix}1`;
    }

    const lastProject = projectNames[0];
    const lastProjectIdx = lastProject.replace(defaultPrefix, '');
    const adpProjectIndex = parseInt(lastProjectIdx) + 1;

    return `${defaultPrefix}${adpProjectIndex}`;
}

export function getProjectNameTooltip(isCustomerBase: boolean) {
    return !isCustomerBase
        ? `${t('prompts.inputCannotBeEmpty')} ${t('validators.projectNameLengthErrorInt')} ${t(
              'validators.projectNameValidationErrorInt'
          )}`
        : `${t('prompts.inputCannotBeEmpty')} ${t('validators.projectNameLengthErrorExt')} ${t(
              'validators.projectNameValidationErrorExt'
          )}`;
}

export function generateValidNamespace(projectName: string, isCustomerBase: boolean): string {
    return !isCustomerBase ? projectName : 'customer.' + projectName;
}

export function getNamespacePrompt(
    isCustomerBase: boolean,
    isCfMode: boolean,
    isLoggedIn: boolean
): YUIQuestion<BasicInfoAnswers> {
    const prompt = {
        type: 'input',
        name: 'namespace',
        message: t('prompts.namespaceLabel'),
        guiOptions: {
            applyDefaultWhenDirty: true
        },
        default: (answers: BasicInfoAnswers) => generateValidNamespace(answers.projectName, isCustomerBase),
        store: false,
        when: () => isVisible(isCfMode, isLoggedIn)
    } as InputQuestion<BasicInfoAnswers>;

    if (!isCustomerBase && isVisible(isCfMode, isLoggedIn)) {
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

export async function getEndpoints(): Promise<Endpoint[]> {
    const { endpoints } = await checkEndpoints();
    return endpoints;
}

export async function getSystemNames(endpoints: Endpoint[]): Promise<Array<string>> {
    let destinationNames: Array<string> = [];

    try {
        if (endpoints) {
            destinationNames = Object.keys(endpoints)
                .map((item: any) => {
                    return endpoints[item].Name;
                })
                .sort((a, b) => {
                    return a.toLowerCase().localeCompare(b.toLowerCase(), 'en', { sensitivity: 'base' });
                });
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
    }

    return destinationNames;
}

export default class ProjectPrompter {
    private logger: Logger;
    private isCustomerBase: boolean;
    private hasSystemAuthentication: boolean;
    private isLoginSuccessfull: boolean;
    private isCFLoginSuccessfull: boolean;
    private flexUISystem: FlexUISupportedSystem | undefined;
    private systemInfo: SystemInfo;
    private applicationIds: any;
    private ui5VersionDetected = true;
    private isCloudProject: boolean;
    private isApplicationSupported: boolean;
    private appSync: boolean;
    private isV4AppInternalMode: boolean;

    private versionsOnSystem: string[];
    private systemNames: string[];
    private endpoints: Endpoint[];

    private provider: AbapServiceProvider;

    private readonly isExtensionInstalled: boolean;

    constructor(layer: UI5FlexLayer) {
        this.isCustomerBase = isCustomerBase(layer);
        this.isExtensionInstalled = isExtensionInstalledVsCode('sapse.sap-ux-application-modeler-extension');
    }

    private modifyAdaptationProjectTypes(): void {
        const { adaptationProjectTypes } = this.systemInfo;
        if (adaptationProjectTypes.includes(AdaptationProjectType.CLOUD_READY) && !this.isCustomerBase) {
            this.systemInfo.adaptationProjectTypes = adaptationProjectTypes.filter(
                (type) => type != AdaptationProjectType.CLOUD_READY
            );
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

    private async setAbapConnectionService(
        system: string,
        username?: string,
        password?: string,
        client?: string
    ): Promise<void> {
        if (isAppStudio()) {
            if (this.hasSystemAuthentication && username && password) {
                // this.abapConnectionService = this.abapConnectionManager.getService(system, username, password, client);
            } else {
                // this.abapConnectionService = this.abapConnectionManager.getService(system);
            }
        } else {
            if (!isAppStudio() && this.isExtensionInstalled) {
                // const systemAuthDetails = await this.localDestinationService.getSystemAuthDetails(system);
                // this.abapConnectionService = this.abapConnectionManager.getService(
                //     systemAuthDetails?.url,
                //     systemAuthDetails?.username,
                //     systemAuthDetails?.password,
                //     systemAuthDetails?.client
                // );
            } else {
                // this.abapConnectionService = this.abapConnectionManager.getService(system, username, password, client);
            }
        }
    }

    private async systemUI5VersionHandler(value: string): Promise<string[]> {
        if (value) {
            try {
                const service = await this.provider.getAdtService<UI5RtVersionService>(UI5RtVersionService);
                const version = await service?.getUI5Version();
                // this.versionsOnSystem = await UI5VersionsUtils.getSystemRelevantVersions(version);
            } catch (e) {
                // this.versionsOnSystem = await UI5VersionsUtils.getRelevantVersions();
            }
        } else {
            // this.versionsOnSystem = await UI5VersionsUtils.getRelevantVersions();
        }
        // this.ui5VersionDetected = UI5VersionsUtils.getDetectedVersion();
        return this.versionsOnSystem;
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
        // TODO:
        this.hasSystemAuthentication = await this.getSystemRequiresAuth(value);
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
                return e.message; // TODO: uncomment
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
            const auth = this.getSystemAuthDetails(system);
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
                // TODO:
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
        let result: any = [];

        const appIndex = this.provider.getAppIndex();

        try {
            if (isCloudSystem) {
                result = await appIndex.search(S4HANAAppsParams);
            } else {
                result = await appIndex.search(ABAPAppsParams);

                if (isCustomerBase) {
                    const extraApps = await appIndex.search(ABAPVariantsAppsParams);
                    result = result.concat(extraApps);
                }
            }

            applicationIds = result
                .map((app: Application) => {
                    return {
                        id: app['sap.app/id'],
                        title: app['sap.app/title'],
                        ach: app['sap.app/ach'],
                        registrationIds: app['sap.fiori/registrationIds'],
                        fileType: app['fileType'],
                        bspUrl: app['url'],
                        bspName: app['repoName']
                    };
                })
                .sort((appA: { title: string; id: string }, appB: { title: string; id: string }) => {
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

    private async getSystemRequiresAuth(systemName: string): Promise<boolean> {
        return isAppStudio()
            ? this.getDestinationRequiresAuth(systemName)
            : await this.getSystemRequiresAuthentication(systemName);
    }

    private getSystemAuthDetails(system: string): Auth | undefined {
        const foundSystemByName = this.endpoints.find((backEndSystem) => backEndSystem.Name === system);

        if (foundSystemByName) {
            return {
                client: foundSystemByName.Client,
                url: foundSystemByName.Url
            };
        }

        const foundSystemByUrl = this.endpoints.find((backEndSystem) => backEndSystem.Url === system);

        return foundSystemByUrl
            ? {
                  client: foundSystemByUrl.Client,
                  url: foundSystemByUrl.Url
              }
            : undefined;
    }

    private shouldAuthenticate(answers: ConfigurationInfoAnswers): boolean | string {
        return answers.system && this.hasSystemAuthentication && (answers.username === '' || answers.password === '');
    }

    private getDestinationRequiresAuth(systemName: string) {
        const found = this.endpoints.find((endpoint: Endpoint) => {
            return endpoint.Name === systemName;
        });

        return found?.Authentication === 'NoAuthentication';
    }

    private async getSystemRequiresAuthentication(systemName: string) {
        if (!this.isExtensionInstalled) {
            return true;
        }

        if (this.endpoints.length === 0) {
            return true;
        }

        return !(
            this.endpoints.filter((backEndSystem) => backEndSystem.Url === systemName).length > 0 ||
            this.endpoints.filter((backEndSystem) => backEndSystem.Name === systemName).length > 0
        );
    }

    public getTargetEnvPrompt(loginEnabled: boolean, isCfInstalled: boolean): YUIQuestion<TargetEnvAnswers>[] {
        return [
            {
                type: 'list',
                name: 'targetEnv',
                message: t('prompts.targetEnvLabel'),
                choices: () => getEnvironments(isCfInstalled),
                default: () => getEnvironments(isCfInstalled)[0]?.name,
                guiOptions: {
                    mandatory: true,
                    hint: t('prompts.targetEnvTooltip')
                },
                validate: (value: OperationsType) => validateEnvironment(value, loginEnabled)
            } as ListQuestion<TargetEnvAnswers>
        ];
    }

    private getNamespacePrompt(
        isCustomerBase: boolean,
        isCfMode: boolean,
        isLoggedIn: boolean
    ): YUIQuestion<BasicInfoAnswers> {
        const prompt: InputQuestion<BasicInfoAnswers> = {
            type: 'input',
            name: 'namespace',
            message: t('prompts.namespaceLabel'),
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            default: (answers: BasicInfoAnswers) => generateValidNamespace(answers.projectName, isCustomerBase),
            store: false,
            when: () => isVisible(isCfMode, isLoggedIn)
        } as InputQuestion<BasicInfoAnswers>;

        if (!isCustomerBase && isVisible(isCfMode, isLoggedIn)) {
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

    public getBasicInfoPrompts(path: string, isLoggedIn = false, isCFEnv = false): YUIQuestion<BasicInfoAnswers>[] {
        return [
            {
                type: 'input',
                name: 'projectName',
                message: () => (isCFEnv ? 'Module Name' : 'Project Name'),
                default: () => getDefaultProjectName(path),
                guiOptions: {
                    mandatory: true,
                    hint: getProjectNameTooltip(this.isCustomerBase)
                },
                validate: (value: string) => {
                    return validateProjectName(value, path, this.isCustomerBase, isCFEnv);
                },
                when: () => isVisible(isCFEnv, isLoggedIn),
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
                when: () => {
                    return isVisible(isCFEnv, isLoggedIn);
                },
                store: false
            } as InputQuestion<BasicInfoAnswers>,
            this.getNamespacePrompt(this.isCustomerBase, isCFEnv, isLoggedIn)
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
                    // TODO:
                    await this.getSystemData(answers.system, answers.client, answers.username, value);
                    // this.versionsOnSystem = await this._systemUI5VersionHandler(answers.system);
                    // await this._getApplications(answers.system, answers.username, value, answers.client);
                    this.isLoginSuccessfull = true;
                    if (isAppStudio()) {
                        return this.validateAdaptationProjectTypes();
                    }
                } catch (e) {
                    // this.flexUISystem = undefined;
                    this.flexUISystem = { isOnPremise: true, isUIFlex: true }; // TODO: Remove this fake assign
                    this.isCFLoginSuccessfull = false;
                    // return MessageUtils.getLoginErrorMessage(e?.response);
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
                // this._setAdditionalPagesForCloudProjects(); // TODO:

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

    private getApplicationPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
        return true ? this.getApplicationListPrompt() : this.getApplicationInputPrompt();
        // return this.isInYeomanUIContext ? this._getApplicationListPrompt() : this._getApplicationInputPrompt(); // TODO: ?
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
            validate: async (value: string, answers: ConfigurationInfoAnswers) => {
                // TODO:
                // const validationResult = await this._applicationPromptValidationHandler(value, answers);
                const validationResult = '';

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
            // TODO:
            // validate: this._applicationPromptValidationHandler.bind(this),
            store: false,
            guiOptions: {
                hint: t('prompts.applicationListTooltip')
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

    public async getConfigurationPrompts(): Promise<YUIQuestion<ConfigurationInfoAnswers>[]> {
        this.endpoints = await getEndpoints();
        this.systemNames = await getSystemNames(this.endpoints);

        return [
            await this.getSystemPrompt(),
            this.getSystemClientPrompt(),
            this.getUsernamePrompt(),
            this.getPasswordPrompt(),
            this.getProjectTypeListPrompt(),
            // ....
            // ....
            // ....
            // ....
            // ....
            this.getApplicationPrompt(),
            // ....
            // ....
            this.getApplicationInfoPrompt(),
            this.getApplicationV4InfoPrompt()
        ];
    }
}
