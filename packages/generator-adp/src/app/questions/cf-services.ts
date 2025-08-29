import type {
    CfServicesAnswers,
    CFServicesQuestion,
    CfServicesPromptOptions,
    AppRouterType,
    AppContentService,
    CFConfig
} from '@sap-ux/adp-tooling';
import {
    cfServicesPromptNames,
    getModuleNames,
    getApprouterType,
    hasApprouter,
    isLoggedInCf,
    getMtaServices,
    getBaseApps
} from '@sap-ux/adp-tooling';
import type { ToolsLogger } from '@sap-ux/logger';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import type { InputQuestion, ListQuestion } from '@sap-ux/inquirer-common';
import { getBusinessServiceKeys, type CFApp, type ServiceKeys } from '@sap-ux/adp-tooling';

import { t } from '../../utils/i18n';
import { validateBusinessSolutionName } from './helper/validators';
import { getAppRouterChoices, getCFAppChoices } from './helper/choices';
import { showBusinessSolutionNameQuestion } from './helper/conditions';

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
     * The name of the cached business service.
     */
    private cachedServiceName: string | undefined;
    /**
     * The keys of the business service.
     */
    private businessServiceKeys: ServiceKeys | null = null;
    /**
     * The base apps available.
     */
    private apps: CFApp[] = [];
    /**
     * The error message when choosing a base app.
     */
    private baseAppOnChoiceError: string | null = null;

    /**
     * Constructor for CFServicesPrompter.
     *
     * @param {boolean} [isInternalUsage] - Internal usage flag.
     * @param {boolean} isCfLoggedIn - Whether the user is logged in to Cloud Foundry.
     * @param {AppContentService} appContentService - App content service instance.
     * @param {ToolsLogger} logger - Logger instance.
     */
    constructor(
        private readonly isInternalUsage: boolean = false,
        isCfLoggedIn: boolean,
        private readonly appContentService: AppContentService,
        private readonly logger: ToolsLogger
    ) {
        this.isCfLoggedIn = isCfLoggedIn;
    }

    /**
     * Builds the CF services prompts, keyed and hide-filtered like attributes.ts.
     *
     * @param {string} mtaProjectPath - MTA project path
     * @param {CFConfig} cfConfig - CF config service instance.
     * @param {CfServicesPromptOptions} [promptOptions] - Optional per-prompt visibility controls
     * @returns {Promise<CFServicesQuestion[]>} CF services questions
     */
    public async getPrompts(
        mtaProjectPath: string,
        cfConfig: CFConfig,
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
     * @param {CFConfig} cfConfig - CF config service instance.
     * @returns {CFServicesQuestion} Prompt for approuter.
     */
    private getAppRouterPrompt(mtaProjectPath: string, cfConfig: CFConfig): CFServicesQuestion {
        return {
            type: 'list',
            name: cfServicesPromptNames.approuter,
            message: t('prompts.approuterLabel'),
            choices: getAppRouterChoices(this.isInternalUsage),
            when: () => {
                const modules = getModuleNames(mtaProjectPath);
                const mtaProjectName =
                    (mtaProjectPath.indexOf('/') > -1
                        ? mtaProjectPath.split('/').pop()
                        : mtaProjectPath.split('\\').pop()) ?? '';

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
     * @param {CFConfig} cfConfig - CF config service instance.
     * @returns {CFServicesQuestion} Prompt for base application.
     */
    private getBaseAppPrompt(cfConfig: CFConfig): CFServicesQuestion {
        return {
            type: 'list',
            name: cfServicesPromptNames.baseApp,
            message: t('prompts.baseAppLabel'),
            choices: async (answers: CfServicesAnswers): Promise<any[]> => {
                try {
                    this.baseAppOnChoiceError = null;
                    if (this.cachedServiceName != answers.businessService) {
                        this.cachedServiceName = answers.businessService;
                        this.businessServiceKeys = await getBusinessServiceKeys(
                            answers.businessService ?? '',
                            cfConfig,
                            this.logger
                        );
                        if (!this.businessServiceKeys) {
                            return [];
                        }
                        this.apps = await getBaseApps(
                            this.businessServiceKeys.credentials,
                            cfConfig,
                            this.logger,
                            this.appContentService
                        );
                        this.logger?.log(`Available applications: ${JSON.stringify(this.apps)}`);
                    }
                    return getCFAppChoices(this.apps);
                } catch (e) {
                    // log error: baseApp => choices
                    /* the error will be shown by the validation functionality */
                    this.baseAppOnChoiceError = e instanceof Error ? e.message : 'Unknown error';
                    this.logger?.error(`Failed to get base apps: ${e.message}`);
                    return [];
                }
            },
            validate: (value: string) => {
                if (!value) {
                    return t('error.baseAppHasToBeSelected');
                }
                if (this.baseAppOnChoiceError !== null) {
                    return this.baseAppOnChoiceError;
                }
                return true;
            },
            when: (answers: any) => this.isCfLoggedIn && answers.businessService,
            guiOptions: {
                hint: t('prompts.baseAppTooltip'),
                breadcrumb: true
            }
        } as ListQuestion<CfServicesAnswers>;
    }

    /**
     * Prompt for business services.
     *
     * @param {CFConfig} cfConfig - CF config service instance.
     * @returns {CFServicesQuestion} Prompt for business services.
     */
    private getBusinessServicesPrompt(cfConfig: CFConfig): CFServicesQuestion {
        return {
            type: 'list',
            name: cfServicesPromptNames.businessService,
            message: t('prompts.businessServiceLabel'),
            choices: this.businessServices,
            default: (_: CfServicesAnswers) =>
                this.businessServices.length === 1 ? this.businessServices[0] ?? '' : '',
            when: (answers: CfServicesAnswers) => {
                return this.isCfLoggedIn && (this.approuter || answers.approuter);
            },
            validate: async (value: string) => {
                const validationResult = validateEmptyString(value);
                if (typeof validationResult === 'string') {
                    return t('error.businessServiceHasToBeSelected');
                }

                this.businessServiceKeys = await getBusinessServiceKeys(value, cfConfig, this.logger);
                if (this.businessServiceKeys === null) {
                    return t('error.businessServiceDoesNotExist');
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

/**
 * @param {object} param0 - Configuration object containing FDC service, internal usage flag, MTA project path, CF login status, and logger.
 * @param {CFConfig} param0.cfConfig - CF config service instance.
 * @param {boolean} [param0.isInternalUsage] - Internal usage flag.
 * @param {string} param0.mtaProjectPath - MTA project path.
 * @param {boolean} param0.isCfLoggedIn - CF login status.
 * @param {ToolsLogger} param0.logger - Logger instance.
 * @param {AppContentService} param0.appContentService - App content service instance.
 * @returns {Promise<CFServicesQuestion[]>} CF services questions.
 */
export async function getPrompts({
    cfConfig,
    isInternalUsage,
    mtaProjectPath,
    isCfLoggedIn,
    appContentService,
    logger
}: {
    cfConfig: CFConfig;
    isInternalUsage?: boolean;
    mtaProjectPath: string;
    isCfLoggedIn: boolean;
    appContentService: AppContentService;
    logger: ToolsLogger;
}): Promise<CFServicesQuestion[]> {
    const prompter = new CFServicesPrompter(isInternalUsage, isCfLoggedIn, appContentService, logger);
    return prompter.getPrompts(mtaProjectPath, cfConfig);
}
