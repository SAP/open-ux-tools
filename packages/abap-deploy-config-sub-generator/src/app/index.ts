import { AppWizard, MessageType } from '@sap-devx/yeoman-ui-types';
import {
    DeploymentGenerator,
    ERROR_TYPE,
    ErrorHandler,
    showOverwriteQuestion
} from '@sap-ux/deploy-config-generator-shared';
import {
    isExtensionInstalled,
    YUI_EXTENSION_ID,
    YUI_MIN_VER_FILES_GENERATED_MSG,
    sendTelemetry,
    TelemetryHelper
} from '@sap-ux/fiori-generator-shared';
import { getPackageAnswer, getTransportAnswer, reconcileAnswers } from '@sap-ux/abap-deploy-config-inquirer';
import { generate as generateAbapDeployConfig } from '@sap-ux/abap-deploy-config-writer';
import { UI5Config } from '@sap-ux/ui5-config';
import { FileName, getAppType } from '@sap-ux/project-access';
import { AuthenticationType } from '@sap-ux/store';
import {
    t,
    handleProjectDoesNotExist,
    indexHtmlExists,
    determineScpFromTarget,
    determineUrlFromDestination,
    determineS4HCFromTarget
} from '../utils';
import { getAbapQuestions } from './questions';
import { EventName } from '../telemetryEvents';
import { DeployProjectType } from './types';
import { initI18n } from '../utils/i18n';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { isAppStudio } from '@sap-ux/btp-utils';
import { DEFAULT_PACKAGE_ABAP } from '@sap-ux/abap-deploy-config-inquirer/dist/constants';
import type { YeomanEnvironment } from '@sap-ux/fiori-generator-shared';
import type { AbapDeployConfig, FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import type { AbapDeployConfigOptions } from './types';
import type {
    AbapDeployConfigAnswersInternal,
    AbapDeployConfigPromptOptions,
    AbapDeployConfigQuestion
} from '@sap-ux/abap-deploy-config-inquirer';
import { getVariantNamespace } from '../utils/project';

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
    private isAdp: boolean;

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

        DeploymentGenerator.logger?.debug(t('debug.initTelemetry'));
        await TelemetryHelper.initTelemetrySettings({
            consumerModule: {
                name: '@sap-ux/abap-deploy-config-sub-generator',
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });

        // hack to suppress yeoman's overwrite prompt when files already exist
        // required when running the deploy config generator in standalone mode
        if ((this.env as unknown as YeomanEnvironment).conflicter) {
            (this.env as unknown as YeomanEnvironment).conflicter.force = this.options.force ?? true;
        }
        if (!this.launchDeployConfigAsSubGenerator) {
            await this._initializing();
        }
    }

    private _initDestinationRoot(): void {
        if (this.options.appRootPath) {
            this.destinationRoot(this.options.appRootPath);
            DeploymentGenerator.logger?.debug(t('debug.appRootPath', { appRootPath: this.options.appRootPath }));
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
        if (this.projectType === DeployProjectType.Library) {
            this.indexGenerationAllowed = false;
        } else {
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
    }

    private async _initBackendConfig(): Promise<void> {
        const ui5Config = await UI5Config.newInstance(
            this.fs.read(this.destinationPath(this.options.base ?? FileName.Ui5Yaml))
        );
        this.projectType =
            ui5Config.getType() === 'library' ? DeployProjectType.Library : DeployProjectType.Application;
        this.backendConfig = ui5Config.getBackendConfigsFromFioriToolsProxyMiddleware()[0];
    }

    private async _initializing(): Promise<void> {
        this._initDestinationRoot();
        try {
            this._processProjectConfig();
            await this._initBackendConfig();
            await this._processIndexHtmlConfig();
        } catch (e) {
            if (e === ERROR_TYPE.ABORT_SIGNAL) {
                DeploymentGenerator.logger?.debug(
                    t('debug.initFailed', { error: ErrorHandler.getErrorMsgFromType(ERROR_TYPE.ABORT_SIGNAL) })
                );
            } else {
                throw e;
            }
        }
    }

    public async prompting(): Promise<void> {
        this.answers = {} as AbapDeployConfigAnswersInternal;
        if (this.abort) {
            return;
        }
        if (!this.launchDeployConfigAsSubGenerator) {
            const appType = await getAppType(this.destinationPath());
            this.isAdp = appType === 'Fiori Adaptation';
            const packageAdditionalValidation = {
                shouldValidatePackageForStartingPrefix: this.isAdp,
                shouldValidatePackageType: this.isAdp,
                shouldValidateFormatAndSpecialCharacters: this.isAdp
            };
            const promptOptions: AbapDeployConfigPromptOptions = {
                ui5AbapRepo: { hideIfOnPremise: this.isAdp },
                transportInputChoice: { hideIfOnPremise: this.isAdp },
                packageAutocomplete: {
                    additionalValidation: packageAdditionalValidation
                },
                packageManual: {
                    additionalValidation: packageAdditionalValidation
                },
                targetSystem: { additionalValidation: { shouldRestrictDifferentSystemType: this.isAdp } }
            };
            const indexGenerationAllowed = this.indexGenerationAllowed && !this.isAdp;
            const { prompts: abapDeployConfigPrompts, answers: abapAnswers = {} } = await getAbapQuestions({
                appRootPath: this.destinationRoot(),
                connectedSystem: this.options.connectedSystem,
                backendConfig: this.backendConfig,
                configFile: this.options.config,
                indexGenerationAllowed,
                showOverwriteQuestion: showOverwriteQuestion(
                    this.launchDeployConfigAsSubGenerator,
                    this.launchStandaloneFromYui,
                    this.options.overwrite,
                    this.configExists
                ),
                projectType: this.projectType,
                logger: DeploymentGenerator.logger,
                promptOptions
            });
            const prompAnswers = await this.prompt(abapDeployConfigPrompts);
            this.answers = reconcileAnswers(prompAnswers, abapAnswers);
        }
        await this._reconcileAnswersWithOptions();
    }

    private async _processAbapTargetAnswers(): Promise<void> {
        this.answers.destination = this.options.destination || this.answers.destination;
        this.answers.url =
            this.options.url || this.answers.url || (await determineUrlFromDestination(this.answers.destination));
        this.answers.client = this.options.client || this.answers.client;
        this.answers.scp =
            this.options.scp ||
            this.answers.scp ||
            (await determineScpFromTarget({
                url: this.answers.url,
                client: this.answers.client,
                destination: this.answers.destination
            }));
        this.answers.isAbapCloud =
            this.options.isAbapCloud ||
            this.answers.isAbapCloud ||
            (await determineS4HCFromTarget({
                url: this.answers.url,
                client: this.answers.client,
                destination: this.answers.destination
            }));

        if (!isAppStudio() && this.answers.scp) {
            // ensure there is no client for SCP on vscode
            delete this.answers.client;
        }
    }

    private _processBspAppAnswers(): void {
        this.answers.ui5AbapRepo = (this.options.ui5AbapRepo || this.answers.ui5AbapRepo)?.toUpperCase();
        this.answers.description = this.options.description || this.answers.description;

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
                this.options.transport ??
                (getTransportAnswer(this.options as AbapDeployConfigAnswersInternal) ||
                    getTransportAnswer(this.answers));
        }
    }

    /**
     * Reconcile answers with options.
     *
     * Options may be passed from parent generator, or from the command line.
     */
    private async _reconcileAnswersWithOptions(): Promise<void> {
        await this._processAbapTargetAnswers();
        this._processBspAppAnswers();
        this.answers.index = this.options.index ?? this.answers.index;
        this.answers.overwrite = this.options.overwrite ?? this.answers.overwrite;
    }

    public async writing(): Promise<void> {
        if (!this.launchDeployConfigAsSubGenerator) {
            await this._writing();
        } else {
            // Needed to delay `init` as the yaml configurations won't be ready!
            await this._initializing();
            await this._writing();
        }
    }

    private async _writing(): Promise<void> {
        if (this.abort || this.answers.overwrite === false) {
            return;
        }
        const namespace = await getVariantNamespace(this.destinationPath(), !!this.answers.isAbapCloud, this.fs);
        await generateAbapDeployConfig(
            this.destinationPath(),
            {
                target: {
                    url: this.answers.url,
                    client: this.answers.client,
                    scp: this.answers.scp,
                    destination: this.answers.destination,
                    authenticationType: this.answers.isAbapCloud ? AuthenticationType.ReentranceTicket : undefined
                },
                app: {
                    name: this.answers.ui5AbapRepo,
                    description: this.answers.description,
                    package: this.answers.package,
                    transport: this.answers.transport
                },
                index: this.answers.index,
                lrep: namespace
            } as AbapDeployConfig,
            {
                baseFile: this.options.base,
                deployFile: this.options.config,
                addBuildToUndeployScript: !this.isAdp
            },
            this.fs
        );
    }

    public install(): void {
        if (this.answers.overwrite !== false) {
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

export { AbapDeployConfigQuestion, AbapDeployConfigAnswersInternal };
export { getAbapQuestions } from './questions';
export { indexHtmlExists } from '../utils';
export { AbapDeployConfigOptions, DeployProjectType } from './types';
export { AbapDeployConfigPromptOptions } from '@sap-ux/abap-deploy-config-inquirer';
