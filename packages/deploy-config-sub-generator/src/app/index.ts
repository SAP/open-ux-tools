import { basename, dirname, join } from 'path';
import dotenv from 'dotenv';
import autocomplete from 'inquirer-autocomplete-prompt';
import { withCondition } from '@sap-ux/inquirer-common';
import { UI5Config } from '@sap-ux/ui5-config';
import { FileName, getMtaPath, findCapProjectRoot } from '@sap-ux/project-access';
import { getAbapQuestions, indexHtmlExists } from '@sap-ux/abap-deploy-config-sub-generator';
import { ApiHubType, useAbapDirectServiceBinding } from '@sap-ux/cf-deploy-config-writer';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { isFullUrlDestination } from '@sap-ux/btp-utils';
import {
    DeploymentGenerator,
    bail,
    showOverwriteQuestion,
    generateDestinationName,
    getDestination,
    ErrorHandler,
    TargetName,
    getConfirmConfigUpdatePrompt
} from '@sap-ux/deploy-config-generator-shared';
import { getEnvApiHubConfig, t, generatorNamespace } from '../utils';
import {
    getCFQuestions,
    loadManifest,
    API_BUSINESS_HUB_ENTERPRISE_PREFIX,
    DESTINATION_AUTHTYPE_NOTFOUND
} from '@sap-ux/cf-deploy-config-sub-generator';
import { parseTarget } from './utils';
import { getDeployTargetQuestion } from '../common/prompts';
import type { CfDeployConfigAnswers, CfDeployConfigOptions } from '@sap-ux/cf-deploy-config-sub-generator';
import type { CfDeployConfigQuestions } from '@sap-ux/cf-deploy-config-inquirer';
import type { DeployConfigOptions, Target } from '../types';
import type { AbapDeployConfigAnswersInternal, AbapDeployConfigQuestion } from '@sap-ux/abap-deploy-config-inquirer';
import type { ApiHubConfig } from '@sap-ux/cf-deploy-config-writer';
import type { Answers, Question } from 'inquirer';
import type { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';

/**
 * The main deployment configuration generator.
 */
export default class extends DeploymentGenerator {
    private readonly launchDeployConfigAsSubGenerator: boolean;
    private launchStandaloneFromYui = false;
    private abapChoice: Target = { name: TargetName.ABAP, description: 'ABAP' };
    private cfChoice: Target = { name: TargetName.CF, description: 'Cloud Foundry' };
    private isLibrary = false;
    private apiHubConfig: ApiHubConfig;
    private target?: string;
    private indexGenerationAllowed = false;
    private cfDestination: string;

    /**
     * Constructor for the deployment config generator.
     *
     * @param args - the arguments passed in
     * @param opts - the options passed in
     */
    constructor(args: string | string[], opts: DeployConfigOptions) {
        super(args, opts);
        // this.env.adapter.promptModule is undefined when running in YUI
        this.env.adapter.promptModule?.registerPrompt('autocomplete', autocomplete);
        this.launchDeployConfigAsSubGenerator = opts.launchDeployConfigAsSubGenerator ?? false;
        this.target = parseTarget(args, opts);

        if (this.options.projectPath && this.options.projectName) {
            this.options.appRootPath = join(this.options.projectPath, this.options.projectName);
        } else {
            this.options.appRootPath = this.destinationRoot();
        }
        this.options.projectRoot = this.options.appRootPath;

        // Load .env file for api hub config
        dotenv.config();

        // Application Modeler launches Deployment Configuration Generator YUI.
        // Pass project folder from command palette input during launching.
        if (this.options.data?.destinationRoot) {
            this.destinationRoot(this.options.data.destinationRoot);
            this.launchDeployConfigAsSubGenerator = this.options.data.launchDeployConfigAsSubGenerator;
            this.launchStandaloneFromYui = true;
            this.options.appRootPath = join(dirname(this.destinationRoot()), basename(this.destinationRoot()));
            this.options.projectRoot = this.destinationRoot();
            dotenv.config({ path: join(this.destinationRoot(), '.env') });
        }
        this.apiHubConfig = this.options.apiHubConfig ?? getEnvApiHubConfig();
    }

    public async initializing(): Promise<void> {
        await super.initializing();
    }

    public async prompting(): Promise<void> {
        const { target, answers } = await this._prompting();

        if ((answers as Answers)?.confirmConfigUpdate !== false && target) {
            this._composeWithSubGenerator(target, answers);
        } else {
            DeploymentGenerator.logger?.debug(t('debug.exist'));
            process.exit(0); // only relevant for CLI
        }
    }

    /**
     * Determines the target deployment and runs all prompting if required.
     *
     * @returns - target deployment and answers
     */
    private async _prompting(): Promise<{
        target?: Target;
        answers?: AbapDeployConfigAnswersInternal | CfDeployConfigAnswers;
    }> {
        let target: Target | undefined;
        let answers: AbapDeployConfigAnswersInternal | CfDeployConfigAnswers = {};
        const projectPath = this.options.appRootPath ?? process.cwd();
        const configUpdatePrompts = await this._getConfirmConfigUpdatePrompts();
        const isCapProject = !!(await findCapProjectRoot(projectPath)); // CAP only supports CF
        const isCF = await getMtaPath(projectPath);
        const isCapAndMissingMta = isCapProject && !isCF?.mtaPath;
        const supportedTargets = await this._getSupportedTargets(this.options.appRootPath, isCapProject, !!isCF);

        if (isCapAndMissingMta) {
            // For CAP flow, the S4 prompting is not required, soo go straight to CF sub generator
            this.target = TargetName.CF;
        }

        if (this.target) {
            target = supportedTargets.find((t) => t.name === this.target);
            if (!target) {
                bail(ErrorHandler.unrecognizedTarget(this.target));
            }
        } else {
            answers = await this._getAnswers(supportedTargets, configUpdatePrompts);
            target = supportedTargets.find((t) => t.name === (answers as Answers)?.targetName);
        }
        return { target, answers };
    }

    /**
     * Get prompt to confirm the configuration is to be updated.
     *
     * @returns - confirm config update prompt
     */
    private async _getConfirmConfigUpdatePrompts(): Promise<Question[]> {
        const configUpdatePrompts: Question[] = [];
        // Show confirm prompt only if launched standalone or on CLI since Fiori gen will show UI warn message in previous step
        if (
            (getHostEnvironment() === hostEnvironment.cli || this.launchStandaloneFromYui) &&
            this.options.data?.additionalPrompts?.confirmConfigUpdate?.show
        ) {
            configUpdatePrompts.push(
                ...getConfirmConfigUpdatePrompt(this.options.data.additionalPrompts.confirmConfigUpdate.configType)
            );
        }
        return configUpdatePrompts;
    }

    /**
     * Determines the supported targets for deployment based on the project.
     *
     * @param cwd - the current working directory
     * @param isCap - whether cwd is a CAP project
     * @param isCf - whether cwd is a CF project
     * @returns - the supported targets
     */
    private async _getSupportedTargets(cwd: string, isCap: boolean, isCf: boolean): Promise<Target[]> {
        if (this.launchDeployConfigAsSubGenerator && this.options.appRootPath) {
            // Use default destination root if projectPath and projectName are not available.
            // E.g. destinationRoot (appRoot) is passed from Application Modeler launched command.
            cwd = this.options.appRootPath;
        }
        const isApiHubEnt = this.apiHubConfig?.apiHubType === ApiHubType.apiHubEnterprise;
        const isProjectExtension = this.fs.exists(join(cwd, '.extconfig.json'));
        const ui5Config = await UI5Config.newInstance(this.fs.read(join(cwd, this.options.base ?? FileName.Ui5Yaml)));
        this.isLibrary = ui5Config.getType() === 'library';

        if (isApiHubEnt || isCap) {
            return [this.cfChoice];
        } else if (this.isLibrary || isProjectExtension) {
            return [this.abapChoice]; // Extension projects, Library and systems using Reentrance tickets for auth
        } else {
            // If there's an mta.yaml in the hierarchy, it's probably a CF project
            // Offer that first and let the user decide
            return isCf ? [this.cfChoice, this.abapChoice] : [this.abapChoice, this.cfChoice];
        }
    }

    /**
     * Returns the answers from the prompts.
     * When ran as a subgenerator, all ABAP and CF prompts are merged and prompted in one step.
     * Otherwise, only the target deployment is prompted and the respective subgenerator is executed accordingly.
     *
     * @param supportedTargets - supported targets for deployment
     * @param configUpdatePrompts - config update prompts
     * @returns - the answers from the prompt(s)
     */
    private async _getAnswers(supportedTargets: Target[], configUpdatePrompts: Question[]): Promise<Answers> {
        let answers: Answers;
        if (this.launchDeployConfigAsSubGenerator) {
            answers = await this._promptDeployConfigQuestions(supportedTargets, configUpdatePrompts);
        } else {
            answers = await this._promptTarget(supportedTargets, configUpdatePrompts);
        }
        return answers;
    }

    /**
     * Merges all questions for ABAP and CF deploy configuration and prompts for the answers.
     *
     * @param supportedTargets - supported targets for deployment
     * @param configUpdatePrompts - config update prompts
     * @returns - the answers from the prompts
     */
    private async _promptDeployConfigQuestions(
        supportedTargets: Target[],
        configUpdatePrompts: Question[] = []
    ): Promise<AbapDeployConfigAnswersInternal | CfDeployConfigAnswers> {
        DeploymentGenerator.logger?.debug(t('debug.loadingPrompts'));
        let deployConfigAnswers = {} as AbapDeployConfigAnswersInternal | CfDeployConfigAnswers;
        const backendConfig = await this._getBackendConfig();
        const configExists = this.fs.exists(
            join(this.options.appRootPath, this.options.config || FileName.UI5DeployYaml)
        );
        const showOverwrite = showOverwriteQuestion(
            configExists,
            this.launchDeployConfigAsSubGenerator,
            this.launchStandaloneFromYui,
            this.options.overwrite
        );

        // ABAP prompts
        const { prompts: abapPrompts, answers: abapAnswers } = await this._getAbapQuestions(
            backendConfig,
            showOverwrite
        );
        // CF prompts
        const cfPrompts = await this._getCFQuestions(backendConfig, showOverwrite);
        // Combine all prompts
        const questions = this._combinePrompts({ supportedTargets, abapPrompts, cfPrompts, configUpdatePrompts });

        // Prompt and assign answers
        const answers = await this.prompt(questions);
        Object.assign(deployConfigAnswers, answers, abapAnswers);

        // Add additional CF options
        deployConfigAnswers = {
            ...deployConfigAnswers,
            ...(await this._getCfOptions(answers.targetName))
        };

        return deployConfigAnswers;
    }

    /**
     * Retrieves backend configuration from either the base config (ui5.yaml) or from the options passed in.
     *
     * @returns - backend configuration
     */
    private async _getBackendConfig(): Promise<FioriToolsProxyConfigBackend> {
        let backendConfig: FioriToolsProxyConfigBackend;
        // This is called when this generator is called as a subgenerator from
        // application generator or application modeler launcher (i.e. this.launchDeployConfigAsSubGenerator === true).
        if (this.launchStandaloneFromYui) {
            // Launched from app modeler where deploy config might already exist
            // need to retrieve backendConfig information.
            const ui5Config = await UI5Config.newInstance(
                this.fs.read(this.destinationPath(this.options.base ?? FileName.Ui5Yaml))
            );
            backendConfig = ui5Config.getBackendConfigsFromFioriToolsProxydMiddleware()[0];
            // when launched standalone we need to verify if index.html exists
            // with app gen flow the index.html is generated but not at the point this generator is called
            this.indexGenerationAllowed = !this.isLibrary && !(await indexHtmlExists(this.fs, this.destinationPath()));
        } else {
            // Launched as subgenerator from app gen
            backendConfig = {
                destination: this.options.appGenDestination,
                url: this.options.appGenServiceHost,
                client: this.options.appGenClient,
                scp: this.options.scp || false
            } as FioriToolsProxyConfigBackend;
        }
        return backendConfig;
    }

    /**
     * Retrieves ABAP deployment configuration questions.
     *
     * @param backendConfig - backend configuration
     * @param showOverwrite - whether to show the overwrite question
     * @returns - prompts and reference to prompt state (derived answers)
     */
    private async _getAbapQuestions(
        backendConfig: FioriToolsProxyConfigBackend,
        showOverwrite: boolean
    ): Promise<{
        prompts: AbapDeployConfigQuestion[];
        answers: Partial<AbapDeployConfigAnswersInternal>;
    }> {
        return getAbapQuestions({
            appRootPath: this.options.appRootPath,
            connectedSystem: this.options.connectedSystem,
            backendConfig,
            configFile: this.options.config,
            indexGenerationAllowed: this.indexGenerationAllowed,
            showOverwriteQuestion: showOverwrite,
            logger: DeploymentGenerator.logger
        });
    }

    /**
     * Retrieves CF deployment configuration questions.
     *
     * @param backendConfig - backend configuration
     * @param showOverwrite - whether to show the overwrite question
     * @returns - whether to show the overwrite question
     */
    private async _getCFQuestions(
        backendConfig: FioriToolsProxyConfigBackend,
        showOverwrite: boolean
    ): Promise<CfDeployConfigQuestions[]> {
        const apiHubCFDestination = await this._getApiHubCFDestination();
        this.cfDestination = apiHubCFDestination ?? this.options.appGenDestination ?? backendConfig?.destination;
        const capRoot = await findCapProjectRoot(this.options.appRootPath);
        const mtaPathResult = await getMtaPath(this.options.appRootPath);
        const mtaPath = mtaPathResult?.mtaPath;
        const isAbapDirectServiceBinding = await useAbapDirectServiceBinding(this.options.appRootPath, true);
        this.options.projectRoot = capRoot ?? mtaPath ?? this.options.appRootPath;

        return getCFQuestions({
            projectRoot: this.options.projectRoot,
            isAbapDirectServiceBinding,
            cfDestination: this.cfDestination,
            isCap: !!capRoot,
            addOverwrite: showOverwrite,
            apiHubConfig: this.apiHubConfig
        });
    }

    /**
     * Returns the destination name for API Hub Enterprise.
     *
     * @returns - destination name
     */
    private async _getApiHubCFDestination(): Promise<string | undefined> {
        let destinationName: string | undefined;
        if (this.apiHubConfig?.apiHubType === ApiHubType.apiHubEnterprise) {
            // appGenDestination may not have been passed in options e.g. launched from app modeler
            if (!this.options.appGenServicePath) {
                // Load service path from manifest.json file
                const manifest = await loadManifest(this.fs, this.options.appRootPath);
                this.options.appGenServicePath = manifest?.['sap.app'].dataSources?.mainService?.uri;
            }
            destinationName = generateDestinationName(
                API_BUSINESS_HUB_ENTERPRISE_PREFIX,
                this.options.appGenServicePath
            );
        }
        return destinationName;
    }

    /**
     * Merges all prompts for deployment configuration.
     *
     * @param opts - the prompt opts for the deployment configuration prompts
     * @param opts.supportedTargets - the support deployment targets
     * @param opts.abapPrompts - abap specific prompts
     * @param opts.cfPrompts - cf specific prompts
     * @param opts.configUpdatePrompts - confirm config update prompts
     * @returns - the combined prompts
     */
    private _combinePrompts({
        supportedTargets,
        abapPrompts,
        cfPrompts,
        configUpdatePrompts = []
    }: {
        supportedTargets: Target[];
        abapPrompts: AbapDeployConfigQuestion[];
        cfPrompts: CfDeployConfigQuestions[];
        configUpdatePrompts: Question[];
    }): Question<Answers>[] {
        let questions = getDeployTargetQuestion(supportedTargets, this.options.projectRoot);
        questions.push(
            ...withCondition(abapPrompts as Question[], (answers: Answers) => answers.targetName === TargetName.ABAP)
        );
        questions.push(...withCondition(cfPrompts, (answers: Answers) => answers.targetName === TargetName.CF));

        if (configUpdatePrompts.length > 0) {
            questions = withCondition(questions, (answers: Answers) => answers.confirmConfigUpdate);
            questions.unshift(...configUpdatePrompts);
        }

        return questions;
    }

    /**
     * For CF deployment config, additional options are derived from the answers.
     *
     * @param targetName - target deployment
     * @returns - additional CF options
     */
    private async _getCfOptions(targetName: string): Promise<Partial<CfDeployConfigOptions> | undefined> {
        let cfOptions: Partial<CfDeployConfigOptions> | undefined;
        if (targetName === TargetName.CF) {
            // additional CF specific options derived from the answers
            const btpDestination = await getDestination(this.cfDestination);
            const isFullUrlDest = btpDestination ? isFullUrlDestination(btpDestination) : false;
            const destinationAuthType = btpDestination?.Authentication ?? DESTINATION_AUTHTYPE_NOTFOUND;

            cfOptions = {
                isFullUrlDest,
                destinationAuthType
            };
        }
        return cfOptions;
    }

    /**
     * Directly prompts for the target deployment.
     *
     * @param supportedTargets - the supported deployment targets
     * @param configUpdatePrompts - confirm config update prompts
     * @returns - the target deployment answer
     */
    private async _promptTarget(supportedTargets: Target[], configUpdatePrompts: Question[] = []): Promise<Answers> {
        let questions: Question[] = getDeployTargetQuestion(supportedTargets, this.options.projectRoot);

        if (configUpdatePrompts.length > 0) {
            questions = withCondition(
                getDeployTargetQuestion(supportedTargets, this.options.projectRoot),
                (answers: Answers) => answers.confirmConfigUpdate
            );
            questions.unshift(...configUpdatePrompts);
        }
        return this.prompt(questions);
    }

    /**
     * Runs the subgenerator for the chosen target deployment (CF or ABAP).
     * When run as a subgenerator, the answers are passed to the subgenerator as options.
     * Otherwise, the prompting will occur in the subgenerator.
     *
     * @param target - the target deployment
     * @param answers - the answers from the prompting
     */
    private _composeWithSubGenerator(
        target: Target,
        answers?: AbapDeployConfigAnswersInternal | CfDeployConfigAnswers
    ): void {
        const generatorName = target?.name;
        const subGenOpts = this.launchDeployConfigAsSubGenerator
            ? {
                  ...this.options,
                  launchStandaloneFromYui: this.launchStandaloneFromYui,
                  launchDeployConfigAsSubGenerator: true,
                  ...(answers as Answers)
              }
            : { ...this.options, launchDeployConfigAsSubGenerator: false };

        if (this.apiHubConfig) {
            (subGenOpts as CfDeployConfigOptions).apiHubConfig = this.apiHubConfig;
        }
        this.composeWith(generatorNamespace(generatorName), subGenOpts);
    }
}

export type { DeployConfigOptions };
