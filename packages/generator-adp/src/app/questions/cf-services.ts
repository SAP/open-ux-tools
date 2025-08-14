import type { ToolsLogger } from '@sap-ux/logger';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import type { InputQuestion, ListQuestion } from '@sap-ux/inquirer-common';
import { getBusinessServiceKeys, type CFApp, type FDCService, type ServiceKeys } from '@sap-ux/adp-tooling';

import { t } from '../../utils/i18n';
import { cfServicesPromptNames } from '../types';
import { validateBusinessSolutionName } from './helper/validators';
import { getAppRouterChoices, getCFAppChoices } from './helper/choices';
import { showBusinessSolutionNameQuestion } from './helper/conditions';
import type { CfServicesAnswers, CFServicesQuestion, CfServicesPromptOptions } from '../types';

/**
 * Prompter for CF services.
 */
export class CFServicesPrompter {
    private readonly fdcService: FDCService;
    private readonly isInternalUsage: boolean;
    private readonly logger: ToolsLogger;

    /**
     * Whether the user is logged in to Cloud Foundry.
     */
    private isCFLoggedIn = false;
    /**
     * Whether to show the solution name prompt.
     */
    private showSolutionNamePrompt = false;
    /**
     * The type of approuter to use.
     */
    private approuter: string | undefined;
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
     * @param {FDCService} fdcService - FDC service instance.
     * @param {boolean} isCFLoggedIn - Whether the user is logged in to Cloud Foundry.
     * @param {ToolsLogger} logger - Logger instance.
     * @param {boolean} [isInternalUsage] - Internal usage flag.
     */
    constructor(fdcService: FDCService, isCFLoggedIn: boolean, logger: ToolsLogger, isInternalUsage: boolean = false) {
        this.fdcService = fdcService;
        this.isInternalUsage = isInternalUsage;
        this.logger = logger;
        this.isCFLoggedIn = isCFLoggedIn;
    }

    /**
     * Builds the CF services prompts, keyed and hide-filtered like attributes.ts.
     *
     * @param {string} mtaProjectPath - MTA project path
     * @param {CfServicesPromptOptions} [promptOptions] - Optional per-prompt visibility controls
     * @returns {Promise<CFServicesQuestion[]>} CF services questions
     */
    public async getPrompts(
        mtaProjectPath: string,
        promptOptions?: CfServicesPromptOptions
    ): Promise<CFServicesQuestion[]> {
        if (this.isCFLoggedIn) {
            this.businessServices = await this.fdcService.getServices(mtaProjectPath);
        }

        const keyedPrompts: Record<cfServicesPromptNames, CFServicesQuestion> = {
            [cfServicesPromptNames.approuter]: this.getAppRouterPrompt(mtaProjectPath),
            [cfServicesPromptNames.businessService]: this.getBusinessServicesPrompt(),
            [cfServicesPromptNames.businessSolutionName]: this.getBusinessSolutionNamePrompt(),
            [cfServicesPromptNames.baseApp]: this.getBaseAppPrompt()
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
                    this.isCFLoggedIn,
                    this.showSolutionNamePrompt,
                    answers.businessService
                ),
            validate: (value: string) => validateBusinessSolutionName(value),
            guiOptions: {
                mandatory: true,
                hint: t('prompts.businessSolutionNameTooltip'),
                breadcrumb: true
            },
            store: false
        } as InputQuestion<CfServicesAnswers>;
    }

    /**
     * Prompt for approuter.
     *
     * @param {string} mtaProjectPath - MTA project path.
     * @returns {CFServicesQuestion} Prompt for approuter.
     */
    private getAppRouterPrompt(mtaProjectPath: string): CFServicesQuestion {
        return {
            type: 'list',
            name: cfServicesPromptNames.approuter,
            message: t('prompts.approuterLabel'),
            choices: getAppRouterChoices(this.isInternalUsage),
            when: () => {
                const modules = this.fdcService.getModuleNames(mtaProjectPath);
                const mtaProjectName =
                    (mtaProjectPath.indexOf('/') > -1
                        ? mtaProjectPath.split('/').pop()
                        : mtaProjectPath.split('\\').pop()) ?? '';
                const hasRouter = this.fdcService.hasApprouter(mtaProjectName, modules);
                if (hasRouter) {
                    // keep behavior even if getApprouterType is not declared in typing
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    this.approuter = this.fdcService.getApprouterType?.();
                }

                if (this.isCFLoggedIn && !hasRouter) {
                    this.showSolutionNamePrompt = true;
                    return true;
                } else {
                    return false;
                }
            },
            validate: async (value: string) => {
                this.isCFLoggedIn = await this.fdcService.isLoggedIn();
                if (!this.isCFLoggedIn) {
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
     * @returns {CFServicesQuestion} Prompt for base application.
     */
    private getBaseAppPrompt(): CFServicesQuestion {
        return {
            type: 'list',
            name: cfServicesPromptNames.baseApp,
            message: t('prompts.baseAppLabel'),
            choices: async (answers: CfServicesAnswers): Promise<any[]> => {
                try {
                    this.baseAppOnChoiceError = null;
                    if (this.cachedServiceName != answers.businessService) {
                        this.cachedServiceName = answers.businessService;
                        const config = this.fdcService.getConfig();
                        this.businessServiceKeys = await getBusinessServiceKeys(
                            answers.businessService ?? '',
                            config,
                            this.logger
                        );
                        if (!this.businessServiceKeys) {
                            return [];
                        }
                        this.apps = await this.fdcService.getBaseApps(this.businessServiceKeys.credentials);
                        this.logger?.log(`Available applications: ${JSON.stringify(this.apps)}`);
                    }
                    return getCFAppChoices(this.apps, this.fdcService);
                } catch (e) {
                    // log error: baseApp => choices
                    /* the error will be shown by the validation functionality */
                    this.baseAppOnChoiceError = e instanceof Error ? e.message : 'Unknown error';
                    this.logger?.error(`Failed to get base apps: ${e.message}`);
                    return [];
                }
            },
            validate: (value: string) => {
                const validationResult = validateEmptyString(value);
                if (typeof validationResult === 'string') {
                    return t('error.baseAppHasToBeSelected');
                }

                if (this.baseAppOnChoiceError !== null) {
                    return this.baseAppOnChoiceError;
                }
                return true;
            },
            when: (answers: any) => this.isCFLoggedIn && answers.businessService,
            guiOptions: {
                hint: t('prompts.baseAppTooltip'),
                breadcrumb: true
            }
        } as ListQuestion<CfServicesAnswers>;
    }

    /**
     * Prompt for business services.
     *
     * @returns {CFServicesQuestion} Prompt for business services.
     */
    private getBusinessServicesPrompt(): CFServicesQuestion {
        return {
            type: 'list',
            name: cfServicesPromptNames.businessService,
            message: t('prompts.businessServiceLabel'),
            choices: this.businessServices,
            default: (_answers?: any) => (this.businessServices.length === 1 ? this.businessServices[0] ?? '' : ''),
            when: (answers: CfServicesAnswers) => {
                return this.isCFLoggedIn && (this.approuter || answers.approuter);
            },
            validate: async (value: string) => {
                const validationResult = validateEmptyString(value);
                if (typeof validationResult === 'string') {
                    return t('error.businessServiceHasToBeSelected');
                }

                const config = this.fdcService.getConfig();
                this.businessServiceKeys = await getBusinessServiceKeys(value, config, this.logger);
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
 * @param {FDCService} param0.fdcService - FDC service instance.
 * @param {boolean} [param0.isInternalUsage] - Internal usage flag.
 * @param {string} param0.mtaProjectPath - MTA project path.
 * @param {boolean} param0.isCFLoggedIn - CF login status.
 * @param {ToolsLogger} param0.logger - Logger instance.
 * @returns {Promise<CFServicesQuestion[]>} CF services questions.
 */
export async function getPrompts({
    fdcService,
    isInternalUsage,
    mtaProjectPath,
    isCFLoggedIn,
    logger
}: {
    fdcService: FDCService;
    isInternalUsage?: boolean;
    mtaProjectPath: string;
    isCFLoggedIn: boolean;
    logger: ToolsLogger;
}): Promise<CFServicesQuestion[]> {
    const prompter = new CFServicesPrompter(fdcService, isCFLoggedIn, logger, isInternalUsage);
    return prompter.getPrompts(mtaProjectPath);
}
