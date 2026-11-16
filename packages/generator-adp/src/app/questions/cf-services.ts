import type {
    CfServicesAnswers,
    CFServicesQuestion,
    CfServicesPromptOptions,
    AppRouterType,
    CfConfig,
    CFApp,
    CfServiceInstanceChoice,
    ServiceInfo,
    HTML5Content
} from '@sap-ux/adp-tooling';
import {
    cfServicesPromptNames,
    getModuleNames,
    getApprouterType,
    hasApprouter,
    isLoggedInCf,
    getMtaServices,
    getAdpServiceInstances,
    getAdaptableBusinessServices,
    getSapCloudServiceName,
    getCfApps,
    downloadAppContent,
    validateSmartTemplateApplication,
    validateODataEndpoints,
    getBusinessServiceInfo,
    getOAuthPathsFromXsApp,
    getBackendUrlsFromServiceKeys
} from '@sap-ux/adp-tooling';
import { Severity } from '@sap-devx/yeoman-ui-types';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import type { InputQuestion, ListQuestion } from '@sap-ux/inquirer-common';

import { t } from '../../utils/i18n.js';
import { validateBusinessSolutionName } from './helper/validators.js';
import { getAppRouterChoices, getCFAppChoices, getServiceInstanceChoices } from './helper/choices.js';
import { shouldShowBaseAppPrompt, showBusinessSolutionNameQuestion } from './helper/conditions.js';

/**
 * Prompter for CF services.
 */
export class CFServicesPrompter {
    /**
     * Whether the user is logged in to Cloud Foundry.
     */
    private isCfLoggedIn = false;
    /**
     * Whether to show the solution name prompt.
     */
    private showSolutionNamePrompt = false;
    /**
     * Whether the MTA already declares an approuter module.
     */
    private hasExistingApprouter = false;
    /**
     * The type of approuter to use.
     */
    private approuter: AppRouterType;
    /**
     * The business services available.
     */
    private businessServices: string[] = [];
    /**
     * The live CF service instances available to bind when the MTA has no service yet.
     */
    private serviceInstances: CfServiceInstanceChoice[] = [];
    /**
     * Memoised live instances filtered to those FDC reports as having at least one adaptable app.
     */
    private adaptableInstances: CfServiceInstanceChoice[] | undefined;
    /**
     * The info of the business service.
     */
    private businessServiceInfo: ServiceInfo | null = null;
    /**
     * The base apps available.
     */
    private apps: CFApp[] = [];
    /**
     * The MTA-declared business service that is reachable (present among the live CF service
     * instances). When set, it is shown as a read-only label and no other service can be chosen.
     */
    private reachableBusinessService: string | undefined;
    /**
     * Result of the eager discovery performed for the reachable business service: `true` when it
     * resolved and exposes apps, otherwise an error message surfaced by the read-only label.
     */
    private singleServiceResult: string | true = true;
    /**
     * The service instance GUID.
     */
    private html5RepoServiceInstanceGuid: string;
    /**
     * The manifest.
     */
    private appManifest: Manifest | undefined;
    /**
     * The zip entries from the downloaded app content.
     */
    private appContentEntries: HTML5Content['entries'] | undefined;

    /**
     * Returns the loaded application manifest.
     *
     * @returns Application manifest.
     */
    public get manifest(): Manifest | undefined {
        return this.appManifest;
    }

    /**
     * Returns the HTML5 repo service instance GUID.
     *
     * @returns {string} HTML5 repo service instance GUID.
     */
    public get html5RepoRuntimeGuid(): string {
        return this.html5RepoServiceInstanceGuid;
    }

    /**
     * Returns the business service instance GUID.
     *
     * @returns {string | undefined} Business service instance GUID.
     */
    public get serviceInstanceGuid(): string | undefined {
        return this.businessServiceInfo?.serviceInstance?.guid;
    }

    /**
     * Returns all backend URLs from service keys endpoints.
     *
     * @returns {string[]} Array of backend URLs from all endpoints.
     */
    public get backendUrls(): string[] {
        const serviceKeys = this.businessServiceInfo?.serviceKeys ?? [];
        return getBackendUrlsFromServiceKeys(serviceKeys);
    }

    /**
     * Returns the OAuth paths extracted from xs-app.json routes that have a source property.
     *
     * @returns {string[]} Array of path patterns that should receive OAuth Bearer tokens.
     */
    public get oauthPaths(): string[] {
        if (!this.appContentEntries) {
            return [];
        }
        return getOAuthPathsFromXsApp(this.appContentEntries);
    }

    /**
     * Constructor for CFServicesPrompter.
     *
     * @param {boolean} [isInternalUsage] - Internal usage flag.
     * @param {boolean} isCfLoggedIn - Whether the user is logged in to Cloud Foundry.
     * @param {ToolsLogger} logger - Logger instance.
     */
    constructor(
        private readonly isInternalUsage: boolean = false,
        isCfLoggedIn: boolean,
        private readonly logger: ToolsLogger
    ) {
        this.isCfLoggedIn = isCfLoggedIn;
    }

    /**
     * Builds the CF services prompts, keyed and hide-filtered like attributes.ts.
     *
     * @param {string} mtaProjectPath - MTA project path
     * @param {CfConfig} cfConfig - CF config service instance.
     * @param {CfServicesPromptOptions} [promptOptions] - Optional per-prompt visibility controls
     * @returns {Promise<CFServicesQuestion[]>} CF services questions
     */
    public async getPrompts(
        mtaProjectPath: string,
        cfConfig: CfConfig,
        promptOptions?: CfServicesPromptOptions
    ): Promise<CFServicesQuestion[]> {
        if (this.isCfLoggedIn) {
            await this.loadCfState(mtaProjectPath, cfConfig);
        }

        const keyedPrompts: Record<cfServicesPromptNames, CFServicesQuestion> = {
            [cfServicesPromptNames.approuter]: this.getAppRouterPrompt(cfConfig),
            [cfServicesPromptNames.businessService]: this.getBusinessServicesPrompt(),
            [cfServicesPromptNames.serviceInstance]: this.getServiceInstancePrompt(cfConfig),
            [cfServicesPromptNames.businessSolutionName]: this.getBusinessSolutionNamePrompt(),
            [cfServicesPromptNames.baseApp]: this.getBaseAppPrompt(cfConfig)
        };

        const questions = Object.entries(keyedPrompts)
            .filter(([promptName]) => {
                const options = promptOptions?.[promptName as cfServicesPromptNames];
                return !(options && 'hide' in options && options.hide);
            })
            .map(([_, question]) => question);

        return questions;
    }

    /**
     * Loads the CF state the prompts depend on before any prompt's `when`/`validate`/`choices` runs.
     *
     * Ordered: the reachability resolution needs both the MTA business services and the live service
     * instances, so those load first; approuter detection is independent and runs last.
     *
     * @param {string} mtaProjectPath - MTA project path.
     * @param {CfConfig} cfConfig - CF config service instance.
     * @returns {Promise<void>} Resolves once all eager state has been loaded.
     */
    private async loadCfState(mtaProjectPath: string, cfConfig: CfConfig): Promise<void> {
        await this.loadBusinessServices(mtaProjectPath);
        await this.loadServiceInstances(cfConfig);
        await this.resolveReachableBusinessService(cfConfig);
        this.detectExistingApprouter(mtaProjectPath);

        if (!this.reachableBusinessService && this.serviceInstances.length > 0) {
            await this.getAdaptableInstances(cfConfig);
        }
    }

    /**
     * Loads the business services declared in the MTA project into `this.businessServices`.
     *
     * @param {string} mtaProjectPath - MTA project path.
     * @returns {Promise<void>} Resolves once the business services have been loaded.
     */
    private async loadBusinessServices(mtaProjectPath: string): Promise<void> {
        try {
            this.businessServices = await getMtaServices(mtaProjectPath, this.logger);
        } catch (e) {
            // A brand-new MTA (no mta.yaml yet) or an MTA without a service definition has no
            // business services; fall back to binding a live CF service instance instead.
            this.businessServices = [];
            this.logger.log(`No business services found in MTA project: ${e.message}`);
        }
    }

    /**
     * Loads the live CF service instances up front into `this.serviceInstances`: they are both the
     * reachability check for an MTA-declared business service and the fallback picker when none is reachable.
     *
     * @param {CfConfig} cfConfig - CF config service instance.
     * @returns {Promise<void>} Resolves once the service instances have been loaded.
     */
    private async loadServiceInstances(cfConfig: CfConfig): Promise<void> {
        try {
            this.serviceInstances = await getAdpServiceInstances(cfConfig.space.GUID, this.logger);
        } catch (e) {
            this.serviceInstances = [];
            this.logger.log(`Could not load CF service instances: ${e.message}`);
        }
    }

    /**
     * Resolves the MTA-declared business service that is actually reachable (exists among the live
     * service instances) and eagerly discovers its apps.
     *
     * Only the reachable service is shown, as a read-only label; its discovery side-effects can't be
     * driven by a label's `validate`, so they are resolved here. Depends on `loadBusinessServices` and
     * `loadServiceInstances` having run first.
     *
     * @param {CfConfig} cfConfig - CF config service instance.
     * @returns {Promise<void>} Resolves once the reachable business service has been resolved.
     */
    private async resolveReachableBusinessService(cfConfig: CfConfig): Promise<void> {
        const reachable = this.businessServices.filter((service) =>
            this.serviceInstances.some((instance) => instance.name === service)
        );
        if (reachable.length >= 1) {
            this.reachableBusinessService = reachable[0];
            this.singleServiceResult = await this.discoverBusinessServiceApps(reachable[0] ?? '', cfConfig);
        }
    }

    /**
     * Detects an existing approuter eagerly so `showSolutionNamePrompt` is set before any prompt's
     * `when` runs. Yeoman-UI does not guarantee the approuter prompt's `when` (which used to set this
     * flag) executes before the business-solution-name prompt's `when` reads it.
     *
     * @param {string} mtaProjectPath - MTA project path.
     */
    private detectExistingApprouter(mtaProjectPath: string): void {
        let modules: string[] = [];
        try {
            modules = getModuleNames(mtaProjectPath);
        } catch (e) {
            // Brand-new MTA has no mta.yaml yet, treat it as having no modules / no existing approuter.
            this.logger.log(`No mta.yaml found for approuter detection at ${mtaProjectPath}: ${e.message}`);
        }
        this.hasExistingApprouter = hasApprouter(modules);
        if (this.hasExistingApprouter) {
            this.approuter = getApprouterType(mtaProjectPath);
        } else {
            this.showSolutionNamePrompt = true;
        }
    }

    /**
     * Prompt for business solution name.
     *
     * @returns {CFServicesQuestion} Prompt for business solution name.
     */
    private getBusinessSolutionNamePrompt(): CFServicesQuestion {
        return {
            type: 'input',
            name: cfServicesPromptNames.businessSolutionName,
            message: t('prompts.businessSolutionNameLabel'),
            when: (answers: CfServicesAnswers) =>
                showBusinessSolutionNameQuestion(
                    answers,
                    this.isCfLoggedIn,
                    this.showSolutionNamePrompt,
                    answers.businessService ||
                        answers.serviceInstance?.name ||
                        this.reachableBusinessService ||
                        this.serviceInstances[0]?.name
                ),
            validate: (value: string) => validateBusinessSolutionName(value),
            guiOptions: {
                mandatory: true,
                hint: t('prompts.businessSolutionNameTooltip'),
                breadcrumb: t('prompts.businessSolutionBreadcrumb')
            },
            store: false
        } as InputQuestion<CfServicesAnswers>;
    }

    /**
     * Prompt for approuter.
     *
     * @param {CfConfig} cfConfig - CF config service instance.
     * @returns {CFServicesQuestion} Prompt for approuter.
     */
    private getAppRouterPrompt(cfConfig: CfConfig): CFServicesQuestion {
        return {
            type: 'list',
            name: cfServicesPromptNames.approuter,
            message: t('prompts.approuterLabel'),
            choices: getAppRouterChoices(this.isInternalUsage),
            when: () => this.isCfLoggedIn && !this.hasExistingApprouter,
            validate: async (value: string) => {
                this.isCfLoggedIn = await isLoggedInCf(cfConfig, this.logger);
                if (!this.isCfLoggedIn) {
                    return t('error.cfNotLoggedIn');
                }

                const validationResult = validateEmptyString(value);
                if (typeof validationResult === 'string') {
                    return validationResult;
                }

                return true;
            },
            guiOptions: {
                hint: t('prompts.approuterTooltip'),
                breadcrumb: true
            }
        } as ListQuestion<CfServicesAnswers>;
    }

    /**
     * Prompt for base application.
     *
     * @param {CfConfig} cfConfig - CF config service instance.
     * @returns {CFServicesQuestion} Prompt for base application.
     */
    private getBaseAppPrompt(cfConfig: CfConfig): CFServicesQuestion {
        return {
            type: 'list',
            name: cfServicesPromptNames.baseApp,
            message: t('prompts.baseAppLabel'),
            choices: (_: CfServicesAnswers) => getCFAppChoices(this.apps),
            validate: async (app: CFApp) => {
                if (!app) {
                    return t('error.baseAppHasToBeSelected');
                }

                try {
                    const { entries, serviceInstanceGuid, manifest } = await downloadAppContent(
                        cfConfig.space.GUID,
                        app,
                        this.logger
                    );
                    this.appManifest = manifest;
                    this.html5RepoServiceInstanceGuid = serviceInstanceGuid;
                    this.appContentEntries = entries;

                    await validateSmartTemplateApplication(manifest);
                    await validateODataEndpoints(entries, this.businessServiceInfo!.serviceKeys, this.logger);
                } catch (e) {
                    return e.message;
                }

                return true;
            },
            when: (answers: CfServicesAnswers) => shouldShowBaseAppPrompt(answers, this.isCfLoggedIn, this.apps),
            guiOptions: {
                hint: t('prompts.baseAppTooltip'),
                breadcrumb: true
            }
        } as ListQuestion<CfServicesAnswers>;
    }

    /**
     * Prompt for the business service declared in the MTA.
     *
     * Rendered as a read-only label of the MTA's reachable business service (one that exists among the
     * live CF service instances) the developer cannot change it. Its discovery runs eagerly in
     * `getPrompts`, so this prompt only has to surface a discovery failure via `validate`.
     *
     * @returns {CFServicesQuestion} Prompt for the business service.
     */
    private getBusinessServicesPrompt(): CFServicesQuestion {
        return {
            type: 'input',
            name: cfServicesPromptNames.businessService,
            message: t('prompts.businessServiceLabel'),
            default: (_: CfServicesAnswers) => this.reachableBusinessService ?? '',
            when: (answers: CfServicesAnswers) =>
                this.isCfLoggedIn && !!this.reachableBusinessService && !!(this.approuter || answers.approuter),
            additionalMessages: () =>
                this.reachableBusinessService
                    ? {
                          message: t('prompts.mtaAlreadyHasServiceInfo', {
                              serviceParameters: this.reachableBusinessService
                          }),
                          severity: Severity.information
                      }
                    : undefined,
            validate: () => this.singleServiceResult,
            guiOptions: {
                type: 'label',
                hint: t('prompts.businessServiceTooltip'),
                breadcrumb: true
            }
        } as InputQuestion<CfServicesAnswers>;
    }

    /**
     * Resolves a business service and discovers its base apps, populating `this.businessServiceInfo`
     * and `this.apps` — the side-effects the base-app prompt and the writer depend on.
     *
     * @param {string} value - The business service name.
     * @param {CfConfig} cfConfig - CF config service instance.
     * @returns {Promise<string | true>} `true` when the service resolved and exposes apps, otherwise an error message.
     */
    private async discoverBusinessServiceApps(value: string, cfConfig: CfConfig): Promise<string | true> {
        const validationResult = validateEmptyString(value);
        if (typeof validationResult === 'string') {
            return t('error.businessServiceHasToBeSelected');
        }

        try {
            this.businessServiceInfo = await getBusinessServiceInfo(value, cfConfig, this.logger);
            if (this.businessServiceInfo === null) {
                return t('error.businessServiceDoesNotExist');
            }

            this.apps = await getCfApps(this.businessServiceInfo.serviceKeys, cfConfig, this.logger);
            this.logger?.log(`Available applications: ${JSON.stringify(this.apps)}`);

            if (this.apps.length === 0) {
                return t('error.noAppsFoundForBusinessService');
            }
        } catch (e) {
            this.apps = [];
            this.logger?.error(`Failed to get available applications: ${e.message}`);
            return e.message;
        }

        return true;
    }

    /**
     * Live service instances filtered to those FDC reports as having at least one cloud-adaptable app.
     * Best-effort and memoised: the FDC call runs at most once per prompter. When FDC confirms none are
     * adaptable, or the lookup fails, the list is emptied so the picker shows an error rather than
     * offering instances that cannot be adapted.
     *
     * @param {CfConfig} cfConfig - CF config service instance.
     * @returns {Promise<CfServiceInstanceChoice[]>} The adaptable instances, or `[]` when none are adaptable or the lookup fails.
     */
    private async getAdaptableInstances(cfConfig: CfConfig): Promise<CfServiceInstanceChoice[]> {
        if (this.adaptableInstances) {
            return this.adaptableInstances;
        }

        let result: CfServiceInstanceChoice[] = [];
        try {
            const resolved = await Promise.all(
                this.serviceInstances.map(async (instance) => {
                    try {
                        return { instance, cloudService: await getSapCloudServiceName(instance.guid, this.logger) };
                    } catch (e) {
                        this.logger.log(`Could not resolve sap.cloud.service for '${instance.name}': ${e.message}`);
                        return { instance, cloudService: undefined as string | undefined };
                    }
                })
            );

            const cloudServiceNames = resolved
                .map((entry) => entry.cloudService)
                .filter((name): name is string => !!name);
            const adaptable = await getAdaptableBusinessServices(cloudServiceNames, cfConfig, this.logger);

            result = resolved
                .filter((entry) => !!entry.cloudService && adaptable.has(entry.cloudService))
                .map((entry) => entry.instance);

            if (result.length === 0) {
                this.logger.log('FDC reported no adaptable service instances');
            }
        } catch (e) {
            this.logger.log(`Could not determine adaptable service instances: ${e.message}`);
        }

        this.adaptableInstances = result;
        return result;
    }

    /**
     * Prompt for a live CF service instance to bind, shown when the MTA has no service yet.
     *
     * The selected instance seeds the same discovery the business-service prompt performs
     * (business service info + base apps) and is later written as an `org.cloudfoundry.existing-service`
     * resource into the project's `mta.yaml`.
     *
     * @param {CfConfig} cfConfig - CF config service instance.
     * @returns {CFServicesQuestion} Prompt for service instance.
     */
    private getServiceInstancePrompt(cfConfig: CfConfig): CFServicesQuestion {
        return {
            type: 'list',
            name: cfServicesPromptNames.serviceInstance,
            message: t('prompts.businessServiceLabel'),
            choices: async (_: CfServicesAnswers) =>
                getServiceInstanceChoices(await this.getAdaptableInstances(cfConfig)),
            when: (answers: CfServicesAnswers) =>
                this.isCfLoggedIn && !this.reachableBusinessService && !!(this.approuter || answers.approuter),
            additionalMessages: () => {
                if (this.serviceInstances.length === 0) {
                    return { message: t('error.noServiceInstancesFound'), severity: Severity.error };
                }
                if (this.adaptableInstances?.length === 0) {
                    return { message: t('error.noAdaptableServiceInstancesFound'), severity: Severity.error };
                }
                return undefined;
            },
            validate: async (instance: CfServiceInstanceChoice) => {
                if (!instance) {
                    return t('error.serviceInstanceHasToBeSelected');
                }

                // Verify the instance exists and is keyable before it can be written to mta.yaml.
                try {
                    this.businessServiceInfo = await getBusinessServiceInfo(instance.name, cfConfig, this.logger);
                } catch (e) {
                    this.logger?.error(`Failed to verify service instance '${instance.name}': ${e.message}`);
                    return e.message;
                }

                if (this.businessServiceInfo === null) {
                    return t('error.businessServiceDoesNotExist');
                }

                // The picker is FDC-filtered to services with adaptable apps, so an empty app list or a
                // discovery failure here is a real error: the writer needs the selected base app's manifest.
                try {
                    this.apps = await getCfApps(this.businessServiceInfo.serviceKeys, cfConfig, this.logger);
                    this.logger?.log(`Available applications: ${JSON.stringify(this.apps)}`);
                    if (this.apps.length === 0) {
                        return t('error.noAppsFoundForBusinessService');
                    }
                } catch (e) {
                    this.apps = [];
                    this.logger?.error(`Failed to get available applications: ${e.message}`);
                    return e.message;
                }

                return true;
            },
            guiOptions: {
                mandatory: true,
                hint: t('prompts.businessServiceTooltip'),
                breadcrumb: true
            }
        } as ListQuestion<CfServicesAnswers>;
    }
}
