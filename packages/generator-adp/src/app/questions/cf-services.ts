import type { ToolsLogger } from '@sap-ux/logger';
import type { CFApp, FDCService, ServiceKeys } from '@sap-ux/adp-tooling';
import type { InputQuestion, ListQuestion } from '@sap-ux/inquirer-common';

import { cfServicesPromptNames } from '../types';
import type { CfServicesAnswers, CFServicesQuestion, CfServicesPromptOptions } from '../types';

export interface CFServicesPromptsConfig {
    fdcService: FDCService;
    isInternalUsage?: boolean;
    logger?: { log: (msg: string) => void; error: (msg: string) => void };
}

const MANAGED_APPROUTER = 'Managed HTML5 Application Runtime';
const STANDALONE_APPROUTER = 'Standalone HTML5 Application Runtime';

const getBaseAppChoices = (apps: CFApp[], fdcService: FDCService): { name: string; value: CFApp }[] => {
    return apps.map((result: CFApp) => ({
        name: fdcService.formatDiscovery?.(result) ?? `${result.title} (${result.appId}, ${result.appVersion})`,
        value: result
    }));
};

/**
 * Prompter for CF services.
 */
export class CFServicesPrompter {
    private readonly fdcService: FDCService;
    private readonly isInternalUsage: boolean;
    private readonly logger?: { log: (msg: string) => void; error: (msg: string) => void };

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
     * @param {FDCService} fdcService - FDC service instance.
     * @param {ToolsLogger} logger - Logger instance.
     * @param {boolean} [isInternalUsage] - Internal usage flag.
     */
    constructor(fdcService: FDCService, logger: ToolsLogger, isInternalUsage: boolean = false) {
        this.fdcService = fdcService;
        this.isInternalUsage = isInternalUsage;
        this.logger = logger;
    }

    /**
     * Public API: returns prompts for CF application sources.
     *
     * @param {string} mtaProjectPath - The path to the MTA project.
     * @param {boolean} isCFLoggedIn - Whether the user is logged in to Cloud Foundry.
     * @returns {Promise<any[]>} The prompts for CF application sources.
     */
    /**
     * Builds the CF services prompts, keyed and hide-filtered like attributes.ts.
     *
     * @param {string} mtaProjectPath - MTA project path
     * @param {boolean} isCFLoggedIn - Whether user is logged in to CF
     * @param {CfServicesPromptOptions} [promptOptions] - Optional per-prompt visibility controls
     * @returns {Promise<CFServicesQuestion[]>} CF services questions
     */
    public async getPrompts(
        mtaProjectPath: string,
        isCFLoggedIn: boolean,
        promptOptions?: CfServicesPromptOptions
    ): Promise<CFServicesQuestion[]> {
        this.isCFLoggedIn = isCFLoggedIn;
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
                return !(options && 'hide' in options && (options as { hide?: boolean }).hide);
            })
            .map(([, question]) => question);

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
            message: 'Enter a unique name for the business solution of the project',
            when: (answers: CfServicesAnswers) =>
                this.isCFLoggedIn &&
                answers.approuter === MANAGED_APPROUTER &&
                this.showSolutionNamePrompt &&
                answers.businessService
                    ? true
                    : false,
            validate: (value: string) => this.validateBusinessSolutionName(value),
            guiOptions: {
                mandatory: true,
                hint: 'Business solution name must consist of at least two segments and they should be separated by period.'
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
        const mtaProjectName =
            mtaProjectPath.indexOf('/') > -1 ? mtaProjectPath.split('/').pop() : mtaProjectPath.split('\\').pop();
        const options = [
            {
                name: MANAGED_APPROUTER,
                value: MANAGED_APPROUTER
            }
        ];
        if (this.isInternalUsage) {
            options.push({
                name: STANDALONE_APPROUTER,
                value: STANDALONE_APPROUTER
            });
        }

        return {
            type: 'list',
            name: cfServicesPromptNames.approuter,
            message: 'Select your HTML5 application runtime',
            choices: options,
            when: () => {
                const modules = this.fdcService.getModuleNames(mtaProjectPath);
                const hasRouter = this.fdcService.hasApprouter(mtaProjectName as string, modules);
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
                    return 'You are not logged in to Cloud Foundry.';
                }

                return this.validateEmptySelect(value, 'Approuter');
            },
            guiOptions: {
                hint: 'Select the HTML5 application runtime that you want to use'
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
            message: 'Select base application',
            choices: async (answers: CfServicesAnswers): Promise<any[]> => {
                try {
                    this.baseAppOnChoiceError = null;
                    if (this.cachedServiceName != answers.businessService) {
                        this.cachedServiceName = answers.businessService;
                        this.businessServiceKeys = await this.fdcService.getBusinessServiceKeys(
                            answers.businessService ?? ''
                        );
                        if (!this.businessServiceKeys) {
                            return [];
                        }
                        this.apps = await this.fdcService.getBaseApps(this.businessServiceKeys.credentials);
                        this.logger?.log(`Available applications: ${JSON.stringify(this.apps)}`);
                    }
                    return getBaseAppChoices(this.apps, this.fdcService);
                } catch (e) {
                    // log error: baseApp => choices
                    /* the error will be shown by the validation functionality */
                    this.baseAppOnChoiceError = e instanceof Error ? e.message : 'Unknown error';
                    this.logger?.error(`Failed to get base apps: ${e.message}`);
                    return [];
                }
            },
            validate: async (value: string) => {
                if (!value) {
                    return 'Base application has to be selected';
                }
                if (this.baseAppOnChoiceError !== null) {
                    return this.baseAppOnChoiceError;
                }
                return true;
            },
            when: (answers: any) => this.isCFLoggedIn && answers.businessService,
            guiOptions: {
                hint: 'Select the base application you want to use'
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
            message: 'Select business service',
            choices: this.businessServices,
            default: (_answers?: any) => (this.businessServices.length === 1 ? this.businessServices[0] ?? '' : ''),
            when: (answers: CfServicesAnswers) => {
                return this.isCFLoggedIn && (this.approuter || answers.approuter);
            },
            validate: async (value: string) => {
                if (!value) {
                    return 'Business service has to be selected';
                }
                this.businessServiceKeys = await this.fdcService.getBusinessServiceKeys(value);
                if (this.businessServiceKeys === null) {
                    return 'The service chosen does not exist in cockpit or the user is not member of the needed space.';
                }

                return true;
            },
            guiOptions: {
                mandatory: true,
                hint: 'Select the business service you want to use'
            }
        } as ListQuestion<CfServicesAnswers>;
    }

    /**
     * Validate empty select.
     *
     * @param {string} value - Value to validate.
     * @param {string} label - Label to validate.
     * @returns {string | true} Validation result.
     */
    private validateEmptySelect(value: string, label: string): string | true {
        if (!value) {
            return `${label} has to be selected`;
        }
        return true;
    }

    /**
     * Validate business solution name.
     *
     * @param {string} value - Value to validate.
     * @returns {string | boolean} Validation result.
     */
    private validateBusinessSolutionName(value: string): string | boolean {
        if (!value) {
            return 'Value cannot be empty';
        }
        const parts = String(value)
            .split('.')
            .filter((p) => p.length > 0);
        if (parts.length < 2) {
            return 'Business solution name must consist of at least two segments and they should be separated by period.';
        }
        return true;
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
    const prompter = new CFServicesPrompter(fdcService, logger, isInternalUsage);
    return prompter.getPrompts(mtaProjectPath, isCFLoggedIn);
}
