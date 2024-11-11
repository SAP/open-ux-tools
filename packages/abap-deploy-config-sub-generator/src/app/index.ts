import { join } from 'path';
import { AppWizard, MessageType } from '@sap-devx/yeoman-ui-types';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { DeploymentGenerator, ErrorMessages } from '@sap-ux/deploy-config-generator-common';
import {
    sendTelemetry,
    TelemetryHelper,
    isExtensionInstalled,
    YeomanEnvironment
} from '@sap-ux/fiori-generator-shared';
import { isAppStudio } from '@sap-ux/btp-utils';
import { UI5Config } from '@sap-ux/ui5-config';
import { generate as generateAbapDeployConfig } from '@sap-ux/abap-deploy-config-writer';
import {
    AbapDeployConfigAnswersInternal,
    getPrompts,
    TransportChoices,
    type AbapDeployConfigAnswers
} from '@sap-ux/abap-deploy-config-inquirer';
import { handleProjectDoesNotExist, indexHtmlExists, t } from '../utils';
import { PACKAGE_JSON, UI5_YAML, UI5_DEPLOY, DEFAULT_PACKAGE_ABAP, CREATE_TR_DURING_DEPLOY } from '../constants';
import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';
import type { AbapTarget } from '@sap-ux/system-access';
import type { SapSystem, ConnectedSystem } from '../types';
import type { Options, Answers, BackendConfig, DeployTaskConfig, AbapGenerator, AbapGeneratorOptions } from './types';
import { FileName } from '@sap-ux/project-access';

/**
 * Generator for creating a new UI5 library.
 *
 * @extends Generator
 */
export default class extends DeploymentGenerator implements AbapGenerator {
    options: AbapGeneratorOptions;
    answers: AbapDeployConfigAnswersInternal;
    backendConfig: BackendConfig;
    indexGenerationAllowed: boolean;
    appWizard: AppWizard;
    existingDeployTaskConfig?: DeployTaskConfig;
    launchDeployConfigAsSubGenerator?: boolean;
    baseFile: string;
    deployFile: string;

    constructor(args: string | string[], opts: AbapGeneratorOptions) {
        super(args, opts);
        this.launchDeployConfigAsSubGenerator = opts.launchDeployConfigAsSubGenerator;
        this.appWizard = opts.appWizard || AppWizard.create(opts);
        this.options = opts;
    }

    public async initializing(): Promise<void> {
        if ((this.env as unknown as YeomanEnvironment).conflicter) {
            (this.env as unknown as YeomanEnvironment).conflicter.force = this.options.force ?? true;
        }
        if (!this.launchDeployConfigAsSubGenerator) {
            await this._initializing();
        }
    }

    private _processDestinationRoot(): void {
        if (this.options.projectPath && this.options.projectName) {
            this.options.destinationRoot = join(this.options.projectPath, this.options.projectName);
        }
        if (this.options.destinationRoot) {
            this.destinationRoot(this.options.destinationRoot);
            DeploymentGenerator.logger?.debug(
                t('debug.projectPath', { destinationPath: this.options.destinationRoot })
            );
        }
    }

    /**
     * Init project config file names: ui5.yaml and ui5-deploy.yaml
     * Config files may be named differently and passed from generator options.
     */
    private _processProjectConfig(): void {
        this.baseFile = this.options.baseFile ?? FileName.Ui5Yaml;
        this.deployFile = this.options.deployFile ?? FileName.UI5DeployYaml;

        const baseExists = this.fs.exists(this.destinationPath(this.baseFile));
        if (!baseExists) {
            handleProjectDoesNotExist(this.destinationPath(this.baseFile), this.appWizard);
        }
    }

    private async _processIndexHtmlConfig(): Promise<void> {
        const htmlIndexExists = await indexHtmlExists(this.fs, this.destinationPath());
        if (htmlIndexExists) {
            this.indexGenerationAllowed = false;
            DeploymentGenerator.logger?.debug(t('debug.notOverwritingIndexHtml'));
        } else {
            this.indexGenerationAllowed = true;
        }
    }

    /**
     * Checks if the client can be set for the backend configuration.
     */
    private _initSapClient(): void {
        if (!isAppStudio() && this.backendConfig && !this.backendConfig.scp && !this.backendConfig.client) {
            this.backendConfig.client = this._getSuggestedClient();
        }
    }

    private async _initializing(): Promise<void> {
        this._processDestinationRoot();
        try {
            this._processProjectConfig();
            await this._processIndexHtmlConfig();
            this.backendConfig = initBaseConfig;
            this._initSapClient();
        } catch (e) {
            if (e !== ErrorMessages.abortSignal) {
                throw e;
            } else {
                DeploymentGenerator.logger?.debug(t('debug.initFailed'));
            }
        }
    }

    /**
     * Check if the preview script uses a client that could be used as default for the deployment config
     */
    public _getSuggestedClient(): string | undefined {
        try {
            if (this.fs.exists(this.destinationPath(PACKAGE_JSON))) {
                return getSuggestedClient(this.fs.readJSON(this.destinationPath(PACKAGE_JSON)) as object);
            }
        } catch (error) {
            // no problem, just do not suggest a default client
        }
        return undefined;
    }

    public async prompting(): Promise<void> {
        this.answers = {};
        if (this.abort || this.options.overwrite === false) {
            return;
        }

        if (!this.launchDeployConfigAsSubGenerator) {
            const { prompts: abapDeployConfigPrompts, answers: abapAnswers = {} } = await getABAPQuestions(
                this.fs,
                this.destinationPath(),
                undefined,
                this.backendConfig,
                this.options.config,
                this.calculatedOptions?.indexGenerationAllowed,
                showOverwriteQuestion(
                    this.launchDeployConfigAsSubGenerator,
                    this.launchStandaloneFromYui,
                    this.options.overwrite
                )
            );
            Object.assign(this.answers, await this.prompt(abapDeployConfigPrompts), abapAnswers);
        }
        this._reconcileAnswers();
    }

    /**
     * Reconcile answers from options and prompts, options are passed as part of the subgenerator call.
     *
     * @private
     */
    private _reconcileAnswers(): void {
        this.answers.client = this.options.client || this.options.appGenClient || this.answers.client;
        // SCP from options
        this.answers.scp = this.options.scp || this.answers.scp;
        if (!isAppStudio() && this.answers.scp) {
            delete this.answers.client;
        }
        // Set package
        if (!this.answers.package) {
            this.answers.package =
                this.options.package ||
                this.options.packageManual ||
                this.options.packageAutocomplete ||
                this.answers.packageManual ||
                this.answers.packageAutocomplete;
        }
        if (!this.answers.package) {
            this.answers.package = this.answers.scp ? '' : DEFAULT_PACKAGE_ABAP;
        }
        // Set transport
        if (!this.answers.transport) {
            this.answers.transport =
                this.options.transportManual ||
                this.options.transportFromList ||
                this.options.transportCreated ||
                (this.options.transportInputChoice === TransportChoices.CreateDuringDeployChoice
                    ? CREATE_TR_DURING_DEPLOY
                    : '') ||
                '';
        }
        // Transport from answers
        if (!this.answers.transport) {
            this.answers.transport =
                this.answers.transportManual ||
                this.answers.transportFromList ||
                this.answers.transportCreated ||
                (this.answers.transportInputChoice === TransportChoices.CreateDuringDeployChoice
                    ? CREATE_TR_DURING_DEPLOY
                    : '') ||
                '';
        }
        this.answers.destination = this.options.destination || this.answers.destination;
        this.answers.url = this.options.url || this.answers.url;
        this.answers.ui5AbapRepo = (
            this.options.name ||
            this.options.ui5AbapRepo ||
            this.answers.name ||
            this.answers.ui5AbapRepo
        )?.toUpperCase();
        this.answers.index = this.options.index || this.answers.index;
        this.answers.description = this.options.description || this.answers.description;
    }

    public async writing(): Promise<void> {
        if (!this.launchDeployConfigAsSubGenerator) {
            await this._writing();
        }
    }

    private async _writing(): Promise<void> {
        if (this.abort || this.answers.overwrite === false || this.options.overwrite === false) {
            return;
        }
        await generateAbapDeployConfig(
            this.destinationPath(),
            {
                target: {
                    url: this.answers.url,
                    client: this.answers.client,
                    scp: this.answers.scp,
                    destination: this.answers.destination
                },
                app: {
                    name: this.answers.ui5AbapRepo,
                    description: this.answers.description,
                    package: this.answers.package,
                    transport: this.answers.transport
                },
                index: this.answers.index
            },
            {
                baseFile: this.options.base,
                deployFile: this.options.config
            },
            this.fs
        );
    }

    public install(): void {
        if (!this.launchDeployConfigAsSubGenerator && this.answers.overwrite !== false) {
            this._install();
        }
    }

    private _install(): void {
        if (!this.options.skipInstall) {
            // Install dependencies in the application folder
            // The various flags are used to speed up installation
            // `--no-progress` also ensures the prompt in the end phase is not obscured by the progress bar
            // 'spawnCommand' is used instead of 'npmInstall' as yeoman runs 'npmInstall' only once no matter
            // how many times it's invoked
            // Note: please maintain the order of the npmInstall above and this call. Otherwise further prompts
            // are obscured and the user may not notice that the generator is waiting for input
            this.spawnCommand('npm', [
                'install',
                '--no-audit',
                '--no-fund',
                '--silent',
                '--prefer-offline',
                '--no-progress'
            ]);
        } else {
            DeploymentGenerator.logger?.info(t('INFO_INSTALL_SKIPPED_OPTION'));
        }
    }

    public async end(): Promise<void> {
        if (this.abort || this.answers.overwrite === false) {
            return;
        }

        // add warnings for typical mistakes
        const name = this.answers.ui5AbapRepo?.toUpperCase();
        if (this.answers.package?.startsWith('Z') && !name?.startsWith('Z')) {
            DeploymentGenerator.logger?.info(t('LOG_INCORRECT_APP_NAME'));
        }
        // Delayed process of deploy configuration generation if integrated with app generator
        if (this.launchDeployConfigAsSubGenerator) {
            await this._initializing();
            await this._writing();
            this._install();
        }

        if (
            this.launchStandaloneFromYui &&
            isExtensionInstalled(vscode, YUI_EXTENSION_ID, YUI_MIN_VER_FILES_GENERATED_MSG)
        ) {
            this.appWizard?.showInformation(t('INFO_MSG_FILES_GENERATED'), MessageType.notification);
        }

        // Send telemetry data after successful deploy
        await initTelemetrySettings({
            consumerModule: {
                name: '@sap/generator-fiori-deployment',
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });

        sendTelemetry(
            EventName.DEPLOY_CONFIG,
            TelemetryHelper.createTelemetryData({
                DeployTarget: 'ABAP',
                appType: this.options.appType
            }),
            this.destinationRoot()
        );
    }
}
