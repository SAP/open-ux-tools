import dotenv from 'dotenv';
import { basename, dirname, join } from 'path';
import { getMtaPath, findCapProjectRoot, getAppType } from '@sap-ux/project-access';
import {
    bail,
    DeploymentGenerator,
    ErrorHandler,
    TargetName,
    getExtensionGenPromptOpts
} from '@sap-ux/deploy-config-generator-shared';
import { parseTarget, getYUIDetails, registerNamespaces } from './utils';
import {
    getApiHubOptions,
    getEnvApiHubConfig,
    t,
    generatorNamespace,
    getBackendConfig,
    getSupportedTargets,
    generatorTitle
} from '../utils';
import { AppWizard, Prompts } from '@sap-devx/yeoman-ui-types';
import { promptDeployConfigQuestions } from './prompting';
import { promptNames } from '../prompts/deploy-target';
import type { Answers } from 'inquirer';
import type { AbapDeployConfigAnswersInternal } from '@sap-ux/abap-deploy-config-sub-generator';
import type { DeployConfigGenerator, DeployConfigOptions } from '../types';
import type { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import type { VSCodeInstance } from '@sap-ux/fiori-generator-shared';
import type { CommonPromptOptions } from '@sap-ux/inquirer-common';
import type {
    CfDeployConfigAnswers,
    CfDeployConfigOptions,
    ApiHubConfig
} from '@sap-ux/cf-deploy-config-sub-generator';

const deployConfigSubGenNamespace = '@sap-ux/deploy-config-sub-generator';
/**
 * The main deployment configuration generator.
 */
export default class extends DeploymentGenerator implements DeployConfigGenerator {
    readonly appWizard: AppWizard;
    readonly prompts: Prompts;
    readonly genNamespace: string;
    readonly launchStandaloneFromYui: boolean;
    readonly apiHubConfig: ApiHubConfig;
    launchDeployConfigAsSubGenerator: boolean;
    extensionPromptOpts?: Record<string, CommonPromptOptions>;
    vscode: VSCodeInstance;
    cfDestination: string;
    mtaPath?: string;
    backendConfig: FioriToolsProxyConfigBackend;
    isLibrary = false;
    isCap = false;

    target: string | undefined;
    answers?: Answers;

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
        this.genNamespace = opts.namespace;
        this.launchDeployConfigAsSubGenerator = opts.launchDeployConfigAsSubGenerator ?? false;
        this.target = parseTarget(args, opts);
        this.vscode = opts.vscode;

        registerNamespaces(
            this.rootGeneratorName(),
            this.genNamespace,
            this.env.isPackageRegistered.bind(this.env),
            this.env.lookup.bind(this.env)
        );

        // Extensions use options.data to pass in the options
        if (this.options.data?.destinationRoot) {
            this.launchStandaloneFromYui = true;
            this.launchDeployConfigAsSubGenerator ||= this.options.data.launchDeployConfigAsSubGenerator;
            this.options.appRootPath = join(
                dirname(this.options.data.destinationRoot),
                basename(this.options.data.destinationRoot)
            );
            this.options.projectRoot = this.options.data.destinationRoot;
            dotenv.config({ path: join(this.options.data.destinationRoot, '.env') });
        } else {
            if (this.options.projectPath && this.options.projectName) {
                this.options.appRootPath = join(this.options.projectPath, this.options.projectName);
            } else {
                this.options.appRootPath = this.destinationRoot(); // probably in a CLI context
            }
            // Load .env file for api hub config
            dotenv.config();
            this.apiHubConfig = this.options.apiHubConfig ?? getEnvApiHubConfig();
            this.launchStandaloneFromYui = false;
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

    /**
     * Initialization phase for deployment configuration.
     */
    public async initializing(): Promise<void> {
        await super.initializing();
        this.extensionPromptOpts = {
            ...(await getExtensionGenPromptOpts(
                this.env.create.bind(this.env),
                deployConfigSubGenNamespace,
                this.vscode
            )),
            ...this.options.subGenPromptOptions
        };
        const capRoot = await findCapProjectRoot(this.options.appRootPath);
        this.isCap = !!capRoot;
        this.mtaPath = (await getMtaPath(this.options.appRootPath))?.mtaPath;
        if (this.isCap && !this.mtaPath) {
            this.target = TargetName.CF; // when CAP project and no mta.yaml, default to Cloud Foundry
        }
        const appType = await getAppType(this.options.appRootPath);
        const isAdp = appType === 'Fiori Adaptation';
        if (isAdp) {
            this.target = TargetName.ABAP; // Adp projects support only ABAP deployment
            this.launchDeployConfigAsSubGenerator = false;
        }
        this.options.projectRoot = capRoot ?? (this.mtaPath && dirname(this.mtaPath)) ?? this.options.appRootPath;
        ({ backendConfig: this.backendConfig, isLibrary: this.isLibrary } = await getBackendConfig(
            this.fs,
            this.options as DeployConfigOptions,
            this.launchStandaloneFromYui,
            this.options.appRootPath
        ));
        const { destinationName, servicePath } = await getApiHubOptions(this.fs, {
            appPath: this.options.appRootPath,
            servicePath: this.options.appGenServicePath
        });
        this.options.appGenServicePath ||= servicePath;
        this.cfDestination = destinationName ?? this.options.appGenDestination ?? this.backendConfig?.destination;
    }

    /**
     * Prompting phase for deployment configuration.
     */
    public async prompting(): Promise<void> {
        const supportedTargets = await getSupportedTargets(
            this.fs,
            this.options.appRootPath,
            this.isCap,
            !!this.mtaPath,
            this.apiHubConfig
        );

        // target may have been passed in from the cli or determined in the init phase
        if (this.target) {
            const checkTarget = supportedTargets.find((t) => t.name === this.target);
            if (!checkTarget) {
                bail(ErrorHandler.unrecognizedTarget(this.target));
            }
        }

        if (!this.target || this.launchDeployConfigAsSubGenerator) {
            // if there is no specified target then prompting will occur
            const { target, answers } = await promptDeployConfigQuestions(
                this.fs,
                this.options as DeployConfigOptions,
                this.prompt.bind(this),
                {
                    launchDeployConfigAsSubGenerator: this.launchDeployConfigAsSubGenerator,
                    launchStandaloneFromYui: this.launchStandaloneFromYui,
                    extensionPromptOpts: this.extensionPromptOpts,
                    supportedTargets,
                    backendConfig: this.backendConfig,
                    cfDestination: this.cfDestination,
                    isCap: this.isCap,
                    apiHubConfig: this.apiHubConfig,
                    isLibrary: this.isLibrary
                },
                this.target
            );
            this.target = target;
            this.answers = answers;
        }

        if (this.target) {
            this._composeWithSubGenerator(this.target, this.answers);
        } else {
            DeploymentGenerator.logger?.debug(t('debug.exit'));
            process.exit(0); // only relevant for CLI
        }
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
        target: string,
        answers?: AbapDeployConfigAnswersInternal | CfDeployConfigAnswers
    ): void {
        try {
            const generatorName = target;
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
            this.composeWith(generatorNamespace(this.genNamespace, generatorName), subGenOpts);
        } catch (error) {
            DeploymentGenerator.logger?.error(error.message);
        }
    }
}

export { promptNames };
export type { DeployConfigOptions };
