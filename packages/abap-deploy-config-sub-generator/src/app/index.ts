import { AppWizard, MessageType } from '@sap-devx/yeoman-ui-types';
import { DeploymentGenerator, ErrorMessages } from '@sap-ux/deploy-config-generator-shared';
import {
    isExtensionInstalled,
    YUI_EXTENSION_ID,
    YUI_MIN_VER_FILES_GENERATED_MSG,
    sendTelemetry,
    TelemetryHelper
} from '@sap-ux/fiori-generator-shared';
import { getPackageAnswer, getTransportAnswer, reconcileAnswers } from '@sap-ux/abap-deploy-config-inquirer';
import { generate as generateAbapDeployConfig } from '@sap-ux/abap-deploy-config-writer';
import { initTelemetrySettings } from '@sap-ux/telemetry';
import { UI5Config } from '@sap-ux/ui5-config';
import { FileName } from '@sap-ux/project-access';
import { AuthenticationType } from '@sap-ux/store';
import { join } from 'path';
import { t, handleProjectDoesNotExist, indexHtmlExists, showOverwriteQuestion } from '../utils';
import { getAbapQuestions } from './questions';
import { EventName } from '../telemetryEvents';
import { initI18n } from '../utils/i18n';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { isAppStudio } from '@sap-ux/btp-utils';
import { DEFAULT_PACKAGE_ABAP } from '@sap-ux/abap-deploy-config-inquirer/dist/constants';
import type { AbapDeployConfig, FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import type { YeomanEnvironment } from '@sap-ux/fiori-generator-shared';
import type { AbapDeployConfigOptions, DeployProjectType } from './types';
import type { AbapDeployConfigAnswersInternal } from '@sap-ux/abap-deploy-config-inquirer';

/**
 * ABAP deploy config generator.
 */
export default class extends DeploymentGenerator {
    private readonly appWizard: AppWizard;
    private readonly vscode: unknown;
    private readonly launchDeployConfigAsSubGenerator: boolean;
    private readonly launchStandaloneFromYui?: boolean;
    private abort = false;
    private backendConfig: FioriToolsProxyConfigBackend;
    private indexGenerationAllowed: boolean;
    private configExists: boolean;
    private answers: AbapDeployConfigAnswersInternal;
    private projectType: DeployProjectType;

    /**
     * Constructor for the ABAP deploy config generator.
     *
     * @param args - arguments passed to the generator
     * @param opts - options passed to the generator
     */
    constructor(args: string | string[], opts: AbapDeployConfigOptions) {
        super(args, opts);
        this.launchDeployConfigAsSubGenerator = opts.launchDeployConfigAsSubGenerator ?? false;
        this.launchStandaloneFromYui = opts.launchStandaloneFromYui;

        this.appWizard = opts.appWizard || AppWizard.create(opts);
        this.vscode = opts.vscode;
        this.options = opts;
    }

    public async initializing(): Promise<void> {
        await super.initializing();
        await initI18n();

        if ((this.env as unknown as YeomanEnvironment).conflicter) {
            (this.env as unknown as YeomanEnvironment).conflicter.force = this.options.force ?? true;
        }

        DeploymentGenerator.logger?.info(t('info.initTelemetry'));
        await initTelemetrySettings({
            consumerModule: {
                name: '@sap-ux/abap-deploy-config-sub-generator',
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });

        if (!this.launchDeployConfigAsSubGenerator) {
            await this._initializing();
        }
    }

    private _initDestinationRoot(): void {
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

    private _processProjectConfig(): void {
        this.options.base = this.options.base || FileName.Ui5Yaml;
        this.options.config = this.options.config || FileName.UI5DeployYaml;

        // check base exists
        const baseExists = this.fs.exists(this.destinationPath(this.options.base));
        if (!baseExists) {
            this.abort = true;
            handleProjectDoesNotExist(this.appWizard, this.destinationPath(this.options.base));
        }

        // check config exists
        this.configExists = this.fs.exists(this.destinationPath(this.options.config));
        if (this.configExists) {
            DeploymentGenerator.logger?.debug(
                t('debug.configExists', { configPath: this.destinationPath(this.options.config) })
            );
        }
    }

    private async _processIndexHtmlConfig(): Promise<void> {
        const htmlIndexExists = await indexHtmlExists(this.fs, this.destinationPath());
        if (htmlIndexExists) {
            this.indexGenerationAllowed = false;
            if (this.options.index) {
                DeploymentGenerator.logger?.debug(t('debug.indexExists'));
            }
            delete this.options.index;
        } else {
            this.indexGenerationAllowed = true;
        }
    }

    private async _initBackendConfig(): Promise<void> {
        const ui5Config = await UI5Config.newInstance(
            this.fs.read(this.destinationPath(this.options.base ?? FileName.Ui5Yaml))
        );
        this.projectType = ui5Config.getType() as DeployProjectType;
        this.backendConfig = ui5Config.getBackendConfigsFromFioriToolsProxydMiddleware()[0];
    }

    private async _initializing(): Promise<void> {
        this._initDestinationRoot();
        try {
            this._processProjectConfig();
            await this._processIndexHtmlConfig();
            await this._initBackendConfig();
        } catch (e) {
            if (e !== ErrorMessages.abortSignal) {
                throw e;
            } else {
                DeploymentGenerator.logger?.debug(t('error.initFailed', { error: e }));
            }
        }
    }

    public async prompting(): Promise<void> {
        this.answers = {} as AbapDeployConfigAnswersInternal;
        if (this.abort) {
            return;
        }
        if (!this.launchDeployConfigAsSubGenerator) {
            const { prompts: abapDeployConfigPrompts, answers: abapAnswers = {} } = await getAbapQuestions({
                projectPath: this.destinationPath(),
                connectedSystem: this.options.connectedSystem,
                backendConfig: this.backendConfig,
                configFile: this.options.config,
                indexGenerationAllowed: this.indexGenerationAllowed,
                showOverwriteQuestion: showOverwriteQuestion(
                    this.launchDeployConfigAsSubGenerator,
                    this.launchStandaloneFromYui,
                    this.options.overwrite,
                    this.configExists
                ),
                projectType: this.projectType
            });
            const prompAnswers = await this.prompt(abapDeployConfigPrompts);
            this.answers = reconcileAnswers(prompAnswers, abapAnswers);
        }
        this._reconcileAnswersWithOptions();
    }

    private _processAbapTargetAnswers(): void {
        this.answers.destination = this.options.destination || this.answers.destination;
        this.answers.url = this.options.url || this.answers.url;
        this.answers.client = this.options.client || this.answers.client;
        this.answers.scp = this.options.scp || this.answers.scp;
        this.answers.isS4HC = this.options.isS4HC || this.answers.isS4HC;

        if (!isAppStudio() && this.answers.scp) {
            // ensure there is no client for SCP on vscode
            delete this.answers.client;
        }
    }

    private _processBspAppAnswers(): void {
        this.answers.ui5AbapRepo = (this.options.ui5AbapRepo || this.answers.ui5AbapRepo)?.toUpperCase();

        // Set package
        if (!this.answers.package) {
            this.answers.package =
                getPackageAnswer(this.options as AbapDeployConfigAnswersInternal, this.options.package) ||
                getPackageAnswer(this.answers) ||
                (this.answers.scp ? '' : DEFAULT_PACKAGE_ABAP);
        }

        // Set transport
        if (!this.answers.transport) {
            this.answers.transport =
                getTransportAnswer(this.options as AbapDeployConfigAnswersInternal) || getTransportAnswer(this.answers);
        }
    }

    /**
     * Reconcile answers with options.
     *
     * Options may be passed from parent generator, or from the command line.
     */
    private _reconcileAnswersWithOptions(): void {
        this._processAbapTargetAnswers();
        this._processBspAppAnswers();
        this.answers.index = this.options.index || this.answers.index;
        this.answers.description = this.options.description || this.answers.description;
        this.answers.overwrite = this.options.overwrite || this.answers.overwrite;
    }

    public async writing(): Promise<void> {
        if (!this.launchDeployConfigAsSubGenerator) {
            await this._writing();
        }
    }

    private async _writing(): Promise<void> {
        if (this.abort || this.answers.overwrite === false) {
            return;
        }
        await generateAbapDeployConfig(
            this.destinationPath(),
            {
                target: {
                    url: this.answers.url,
                    client: this.answers.client,
                    scp: this.answers.scp,
                    destination: this.answers.destination,
                    authenticationType: this.answers.isS4HC ? AuthenticationType.ReentranceTicket : undefined // only reentrance ticket is relevant for writing to deploy config
                },
                app: {
                    name: this.answers.ui5AbapRepo,
                    description: this.answers.description,
                    package: this.answers.package,
                    transport: this.answers.transport
                },
                index: this.answers.index
            } as AbapDeployConfig,
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
            this.spawnCommand('npm', [
                'install',
                '--no-audit',
                '--no-fund',
                '--silent',
                '--prefer-offline',
                '--no-progress'
            ]);
        } else {
            DeploymentGenerator.logger?.info(t('info.skippedInstallation'));
        }
    }

    public async end(): Promise<void> {
        if (this.abort || this.answers.overwrite === false) {
            return;
        }

        // Delayed process of deploy configuration generation if integrated with app generator
        if (this.launchDeployConfigAsSubGenerator) {
            await this._initializing();
            await this._writing();
            this._install();
        }

        if (
            this.launchStandaloneFromYui &&
            isExtensionInstalled(this.vscode, YUI_EXTENSION_ID, YUI_MIN_VER_FILES_GENERATED_MSG)
        ) {
            this.appWizard?.showInformation(t('info.filesGenerated'), MessageType.notification);
        }

        // Send telemetry data after adding deployment configuration
        sendTelemetry(
            EventName.DEPLOY_CONFIG,
            TelemetryHelper.createTelemetryData({
                DeployTarget: 'ABAP',
                ...this.options.telemetryData
            }) ?? {},
            this.destinationRoot()
        )?.catch((error) => {
            DeploymentGenerator.logger.error(t('error.telemetry', { error }));
        });
    }
}

export { getAbapQuestions } from './questions';
export { indexHtmlExists, showOverwriteQuestion } from '../utils';
export { AbapDeployConfigOptions, DeployProjectType } from './types';
