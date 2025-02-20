import { basename, dirname, join } from 'path';
import dotenv from 'dotenv';
import type { Answers, Question } from 'inquirer';
import autocomplete from 'inquirer-autocomplete-prompt';
import { UI5Config } from '@sap-ux/ui5-config';
import { FileName, getMtaPath, findCapProjectRoot } from '@sap-ux/project-access';
import {
    DeploymentGenerator,
    bail,
    showOverwriteQuestion,
    ErrorHandler,
    TargetName
} from '@sap-ux/deploy-config-generator-shared';
import {
    getCFQuestions,
    type CfDeployConfigQuestions,
    type CfDeployConfigAnswers,
    type CfDeployConfigOptions,
    type ApiHubConfig
} from '@sap-ux/cf-deploy-config-sub-generator';
import {
    getAbapQuestions,
    type AbapDeployConfigQuestion,
    type AbapDeployConfigAnswersInternal,
    DeployProjectType,
    indexHtmlExists
} from '@sap-ux/abap-deploy-config-sub-generator';
import type { DeployConfigOptions, Target } from '../types';
import { getApiHubOptions, getSupportedTargets, parseTarget } from './utils';
import {
    combineAllPrompts,
    getConfirmConfigUpdatePrompts,
    getDeployTargetPrompts,
    getYUIDetails
} from '../common/prompts';
import type { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import type { MtaPath } from '@sap-ux/project-access';
import { getEnvApiHubConfig, t, generatorNamespace, generatorTitle } from '../utils';
import { AppWizard, Prompts } from '@sap-devx/yeoman-ui-types';

/**
 * The main deployment configuration generator.
 */
export default class extends DeploymentGenerator {
    private readonly appWizard: AppWizard;
    private readonly prompts: Prompts;
    private readonly launchDeployConfigAsSubGenerator: boolean;
    private readonly apiHubConfig: ApiHubConfig;
    private target?: string;
    private cfDestination: string;
    private mtaOptions: MtaPath | undefined;
    private isCap = false;
    private launchStandaloneFromYui = false;

    setPromptsCallback: (fn: object) => void;

    /**
     * Constructor for the deployment config generator.
     *
     * @param args - the arguments passed in
     * @param opts - the options passed in
     */
    constructor(args: string | string[], opts: DeployConfigOptions) {
        super(args, opts);
        this.appWizard = opts.appWizard ?? AppWizard.create(opts);
        // this.env.adapter.promptModule is undefined when running in YUI
        this.env.adapter.promptModule?.registerPrompt('autocomplete', autocomplete);
        this.launchDeployConfigAsSubGenerator = opts.launchDeployConfigAsSubGenerator ?? false;
        this.target = parseTarget(args, opts);

        // Application Modeler launches Deployment Configuration Generator YUI.
        // Pass project folder from command palette input during launching.
        if (this.options.data?.destinationRoot) {
            this.destinationRoot(this.options.data.destinationRoot);
            this.launchDeployConfigAsSubGenerator = this.options.data.launchDeployConfigAsSubGenerator;
            this.launchStandaloneFromYui = true;
            this.options.appRootPath = join(dirname(this.destinationRoot()), basename(this.destinationRoot()));
            this.options.projectRoot = this.destinationRoot();
            dotenv.config({ path: join(this.destinationRoot(), '.env') });
        } else {
            if (this.options.projectPath && this.options.projectName) {
                this.options.appRootPath = join(this.options.projectPath, this.options.projectName);
            } else {
                this.options.appRootPath = this.destinationRoot();
            }
            this.options.projectRoot = this.options.appRootPath ?? process.cwd();

            // Load .env file for api hub config
            dotenv.config();
            this.apiHubConfig = this.options.apiHubConfig ?? getEnvApiHubConfig();
        }

        // If launched standalone, set the header, title and description
        if (this.launchStandaloneFromYui) {
            this.appWizard.setHeaderTitle(generatorTitle);
            this.prompts = new Prompts(getYUIDetails(this.options.projectRoot));
            this.setPromptsCallback = (fn): void => {
                if (this.prompts) {
                    this.prompts.setCallback(fn);
                }
            };
        }
    }

    public async initializing(): Promise<void> {
        await super.initializing();
        this.isCap = !!(await findCapProjectRoot(this.options.appRootPath));
        this.mtaOptions = await getMtaPath(this.options.appRootPath);
        this.options.projectRoot ||= this.mtaOptions?.mtaPath;
    }

    public async prompting(): Promise<void> {
        const { target, answers } = await this.getPromptsWithAnswers();
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
     * @returns - target deployment CF | ABAP and answers
     */
    private async getPromptsWithAnswers(): Promise<{
        target?: Target;
        answers?: AbapDeployConfigAnswersInternal | CfDeployConfigAnswers;
    }> {
        let target: Target | undefined;
        let answers: AbapDeployConfigAnswersInternal | CfDeployConfigAnswers = {};
        const supportedTargets = await getSupportedTargets(
            this.fs,
            this.options.appRootPath,
            this.isCap,
            !!this.mtaOptions,
            this.apiHubConfig
        );

        // For CAP flow, the S4 prompting is not required, soo go straight to CF sub generator
        if (this.isCap && !this.mtaOptions?.mtaPath) {
            this.target = TargetName.CF;
        }

        if (this.target) {
            target = supportedTargets.find((t) => t.name === this.target);
            if (!target) {
                bail(ErrorHandler.unrecognizedTarget(this.target));
            }
        } else {
            answers = await this._getTargetAnswers([...supportedTargets]);
            target = supportedTargets.find((t) => t.name === (answers as Answers)?.targetName);
        }
        return { target, answers };
    }

    /**
     * Returns the answers from the prompts.
     * When ran as a subgenerator, all ABAP and CF prompts are merged and prompted in one step.
     * Otherwise, only the target deployment is prompted and the respective subgenerator is executed accordingly.
     *
     * @param supportedTargets - supported targets for deployment
     * @returns - the answers from the prompt(s)
     */
    private async _getTargetAnswers(supportedTargets: Target[]): Promise<Answers> {
        let answers: Answers;
        const configUpdatePrompts = getConfirmConfigUpdatePrompts(
            this.launchStandaloneFromYui,
            this.options.data?.additionalPrompts?.confirmConfigUpdate
        );
        if (this.launchDeployConfigAsSubGenerator) {
            answers = await this._getSubGeneratorPromptsWithAnswers(supportedTargets, configUpdatePrompts);
        } else {
            answers = await this.prompt(
                getDeployTargetPrompts([...supportedTargets], configUpdatePrompts, this.options.projectRoot)
            );
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
    private async _getSubGeneratorPromptsWithAnswers(
        supportedTargets: Target[],
        configUpdatePrompts: Question[] = []
    ): Promise<AbapDeployConfigAnswersInternal | CfDeployConfigAnswers> {
        DeploymentGenerator.logger?.debug(t('debug.loadingPrompts'));
        const deployConfigAnswers = {} as AbapDeployConfigAnswersInternal | CfDeployConfigAnswers;
        const { backendConfig, isLibrary } = await this._getBackendConfig();
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
        const { prompts: abapPrompts, answers: abapAnswers } = await this._getABAPSubGenQuestions(
            showOverwrite,
            backendConfig,
            isLibrary
        );
        // CF prompts
        const cfPrompts = await this._getCFSubGenQuestions(showOverwrite, backendConfig?.destination);
        // Combine all prompts
        const questions = combineAllPrompts(this.options.projectRoot, {
            supportedTargets,
            abapPrompts,
            cfPrompts,
            configUpdatePrompts
        });

        // Prompt and assign answers
        const answers = await this.prompt(questions);
        Object.assign(deployConfigAnswers, answers, abapAnswers);
        return deployConfigAnswers;
    }

    /**
     * Retrieves backend configuration from either the base config (ui5.yaml) or from the options passed in.
     *
     * @returns - backend configuration
     */
    private async _getBackendConfig(): Promise<{ backendConfig: FioriToolsProxyConfigBackend; isLibrary: boolean }> {
        let backendConfig: FioriToolsProxyConfigBackend;
        let isLibrary = false;
        // This is called when this generator is called as a subgenerator from
        // application generator or application modeler launcher (i.e. this.launchDeployConfigAsSubGenerator === true).
        if (this.launchStandaloneFromYui) {
            // Launched from app modeler where deploy config might already exist
            // need to retrieve backendConfig information.
            const ui5Config = await UI5Config.newInstance(
                this.fs.read(this.destinationPath(this.options.base ?? FileName.Ui5Yaml))
            );
            backendConfig = ui5Config.getBackendConfigsFromFioriToolsProxydMiddleware()[0];
            isLibrary = ui5Config.getType() === DeployProjectType.Library;
        } else {
            // Launched as subgenerator from app gen
            backendConfig = {
                destination: this.options.appGenDestination,
                url: this.options.appGenServiceHost,
                client: this.options.appGenClient,
                scp: this.options.scp || false
            } as FioriToolsProxyConfigBackend;
        }
        return { backendConfig, isLibrary };
    }

    /**
     * Retrieves ABAP deployment configuration questions.
     *
     * @param showOverwrite - whether to show the overwrite question
     * @param backendConfig - backend configuration
     * @param isLibrary - is a library application
     * @returns - prompts and reference to prompt state (derived answers)
     */
    private async _getABAPSubGenQuestions(
        showOverwrite: boolean,
        backendConfig: FioriToolsProxyConfigBackend,
        isLibrary: boolean
    ): Promise<{
        prompts: AbapDeployConfigQuestion[];
        answers: Partial<AbapDeployConfigAnswersInternal>;
    }> {
        const indexGenerationAllowed = !isLibrary && !(await indexHtmlExists(this.fs, this.options.appRootPath));
        return getAbapQuestions({
            appRootPath: this.options.appRootPath,
            connectedSystem: this.options.connectedSystem,
            backendConfig,
            configFile: this.options.config,
            indexGenerationAllowed,
            showOverwriteQuestion: showOverwrite,
            logger: DeploymentGenerator.logger
        });
    }

    /**
     * Retrieves CF deployment configuration questions.
     *
     * @param addOverwrite - whether to show the overwrite question
     * @param destination - destination
     * @returns - whether to show the overwrite question
     */
    private async _getCFSubGenQuestions(
        addOverwrite: boolean,
        destination?: string
    ): Promise<CfDeployConfigQuestions[]> {
        const appPath = this.options.appRootPath;
        const { destinationName, servicePath } = await getApiHubOptions(this.fs, {
            appPath,
            servicePath: this.options.appGenServicePath
        });
        this.options.appGenServicePath ||= servicePath;
        this.cfDestination = destinationName ?? this.options.appGenDestination ?? destination;
        return getCFQuestions({
            projectRoot: this.options.projectRoot,
            cfDestination: this.cfDestination,
            isCap: this.isCap,
            addOverwrite,
            apiHubConfig: this.apiHubConfig
        });
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
