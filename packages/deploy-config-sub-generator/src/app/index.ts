import dotenv from 'dotenv';
import autocomplete from 'inquirer-autocomplete-prompt';
import { basename, dirname, join } from 'path';
import { getMtaPath, findCapProjectRoot } from '@sap-ux/project-access';
import { bail, DeploymentGenerator, ErrorHandler, TargetName } from '@sap-ux/deploy-config-generator-shared';
import { parseTarget, getYUIDetails } from './utils';
import {
    getApiHubOptions,
    getEnvApiHubConfig,
    t,
    generatorNamespace,
    generatorTitle,
    getBackendConfig,
    getSupportedTargets
} from '../utils';
import { AppWizard, Prompts } from '@sap-devx/yeoman-ui-types';
import { promptDeployConfigQuestions } from '../prompts';
import type { Answers } from 'inquirer';
import type { AbapDeployConfigAnswersInternal } from '@sap-ux/abap-deploy-config-sub-generator';
import type { DeployConfigOptions, Target } from '../types';
import type { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import type {
    CfDeployConfigAnswers,
    CfDeployConfigOptions,
    ApiHubConfig
} from '@sap-ux/cf-deploy-config-sub-generator';

/**
 * The main deployment configuration generator.
 */
export default class extends DeploymentGenerator {
    private readonly appWizard: AppWizard;
    private readonly prompts: Prompts;
    private readonly launchDeployConfigAsSubGenerator: boolean;
    private readonly apiHubConfig: ApiHubConfig;
    private target: string | undefined;
    private cfDestination: string;
    private isCap = false;
    private launchStandaloneFromYui = false;
    private mtaPath?: string;
    private backendConfig: FioriToolsProxyConfigBackend;
    private isLibrary: boolean;

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

        // Extensions use options.data to pass in options.
        if (this.options.data?.destinationRoot) {
            this.launchStandaloneFromYui = true;
            this.launchDeployConfigAsSubGenerator = this.options.data.launchDeployConfigAsSubGenerator;
            this.options.appRootPath = join(dirname(this.destinationRoot()), basename(this.destinationRoot()));
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
        const capRoot = await findCapProjectRoot(this.options.appRootPath);
        this.isCap = !!capRoot;
        this.mtaPath = (await getMtaPath(this.options.appRootPath))?.mtaPath;
        if (this.isCap && !this.mtaPath) {
            // when CAP project and no mta.yaml, default to Cloud Foundry
            this.target = TargetName.CF;
        }

        this.options.projectRoot = capRoot ?? this.mtaPath ?? this.options.appRootPath;

        ({ backendConfig: this.backendConfig, isLibrary: this.isLibrary } = await getBackendConfig(
            this.fs,
            this.options as DeployConfigOptions,
            this.launchStandaloneFromYui,
            this.options.projectRoot
        ));

        const { destinationName, servicePath } = await getApiHubOptions(this.fs, {
            appPath: this.options.appRootPath,
            servicePath: this.options.appGenServicePath
        });

        this.options.appGenServicePath ||= servicePath;
        this.cfDestination = destinationName ?? this.options.appGenDestination ?? this.backendConfig.destination;
    }

    public async prompting(): Promise<void> {
        const supportedTargets = await getSupportedTargets(
            this.fs,
            this.options.appRootPath,
            this.isCap,
            !!this.mtaPath,
            this.apiHubConfig
        );

        // this.target may have been passed in from the command line or determined in init phase
        if (this.target) {
            const checkTarget = supportedTargets.find((t) => t.name === this.target);
            if (!checkTarget) {
                bail(ErrorHandler.unrecognizedTarget(this.target));
            }
        }

        const { target, answers } = await promptDeployConfigQuestions(
            this.fs,
            this.options as DeployConfigOptions,
            this.prompt,
            this.launchDeployConfigAsSubGenerator,
            this.launchStandaloneFromYui,
            supportedTargets,
            {
                backendConfig: this.backendConfig,
                cfDestination: this.cfDestination,
                isCap: this.isCap,
                apiHubConfig: this.apiHubConfig,
                isLibrary: this.isLibrary
            }
        );

        this.target = target;
        if ((answers as Answers)?.confirmConfigUpdate !== false && target) {
            this._composeWithSubGenerator(target, answers);
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
        this.composeWith(generatorNamespace(generatorName), subGenOpts);
    }
}

export type { DeployConfigOptions };
