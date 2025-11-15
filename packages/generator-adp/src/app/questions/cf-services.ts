import path from 'node:path';

import type {
    CfServicesAnswers,
    CFServicesQuestion,
    CfServicesPromptOptions,
    AppRouterType,
    CfConfig,
    CFApp,
    ServiceInfo
} from '@sap-ux/adp-tooling';
import {
    cfServicesPromptNames,
    getModuleNames,
    getApprouterType,
    hasApprouter,
    isLoggedInCf,
    getMtaServices,
    getCfApps,
    downloadAppContent,
    validateSmartTemplateApplication,
    validateODataEndpoints,
    getBusinessServiceInfo,
    getOAuthPathsFromXsApp,
    getBackendUrlFromServiceKeys
} from '@sap-ux/adp-tooling';
import type { HTML5Content } from '@sap-ux/adp-tooling';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import type { InputQuestion, ListQuestion } from '@sap-ux/inquirer-common';

import { t } from '../../utils/i18n';
import { validateBusinessSolutionName } from './helper/validators';
import { getAppRouterChoices, getCFAppChoices } from './helper/choices';
import { shouldShowBaseAppPrompt, showBusinessSolutionNameQuestion } from './helper/conditions';

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
     * The type of approuter to use.
     */
    private approuter: AppRouterType;
    /**
     * The business services available.
     */
    private businessServices: string[] = [];
    /**
     * The info of the business service.
     */
    private businessServiceInfo: ServiceInfo | null = null;
    /**
     * The base apps available.
     */
    private apps: CFApp[] = [];
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
     * Returns the backend URL from service keys endpoints.
     *
     * @returns {string | undefined} Backend URL from the first endpoint that has a url property, or undefined.
     */
    public get backendUrl(): string | undefined {
        const serviceKeys = this.businessServiceInfo?.serviceKeys ?? [];
        return getBackendUrlFromServiceKeys(serviceKeys);
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
            this.businessServices = await getMtaServices(mtaProjectPath, this.logger);
        }

        const keyedPrompts: Record<cfServicesPromptNames, CFServicesQuestion> = {
            [cfServicesPromptNames.approuter]: this.getAppRouterPrompt(mtaProjectPath, cfConfig),
            [cfServicesPromptNames.businessService]: this.getBusinessServicesPrompt(cfConfig),
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
                    answers.businessService
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
     * @param {string} mtaProjectPath - MTA project path.
     * @param {CfConfig} cfConfig - CF config service instance.
     * @returns {CFServicesQuestion} Prompt for approuter.
     */
    private getAppRouterPrompt(mtaProjectPath: string, cfConfig: CfConfig): CFServicesQuestion {
        return {
            type: 'list',
            name: cfServicesPromptNames.approuter,
            message: t('prompts.approuterLabel'),
            choices: getAppRouterChoices(this.isInternalUsage),
            when: () => {
                const modules = getModuleNames(mtaProjectPath);
                const mtaProjectName = path.basename(mtaProjectPath);
                const hasRouter = hasApprouter(mtaProjectName, modules);
                if (hasRouter) {
                    this.approuter = getApprouterType(mtaProjectPath);
                }

                if (this.isCfLoggedIn && !hasRouter) {
                    this.showSolutionNamePrompt = true;
                    return true;
                } else {
                    return false;
                }
            },
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
     * Prompt for business services.
     *
     * @param {CfConfig} cfConfig - CF config service instance.
     * @returns {CFServicesQuestion} Prompt for business services.
     */
    private getBusinessServicesPrompt(cfConfig: CfConfig): CFServicesQuestion {
        return {
            type: 'list',
            name: cfServicesPromptNames.businessService,
            message: t('prompts.businessServiceLabel'),
            choices: this.businessServices,
            default: (_: CfServicesAnswers) =>
                this.businessServices.length === 1 ? this.businessServices[0] ?? '' : '',
            when: (answers: CfServicesAnswers) => this.isCfLoggedIn && (this.approuter || answers.approuter),
            validate: async (value: string) => {
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
