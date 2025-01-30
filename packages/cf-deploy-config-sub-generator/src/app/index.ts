import { join, dirname } from 'path';
import { platform } from 'os';
import hasbin = require('hasbin');
import { AppWizard, MessageType } from '@sap-devx/yeoman-ui-types';
import {
    sendTelemetry,
    TelemetryHelper,
    isExtensionInstalled,
    YUI_EXTENSION_ID,
    YUI_MIN_VER_FILES_GENERATED_MSG
} from '@sap-ux/fiori-generator-shared';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { isFullUrlDestination } from '@sap-ux/btp-utils';
import { generateAppConfig, ApiHubType, useAbapDirectServiceBinding } from '@sap-ux/cf-deploy-config-writer';
import {
    DeploymentGenerator,
    showOverwriteQuestion,
    bail,
    handleErrorMessage,
    ErrorHandler,
    ERROR_TYPE,
    mtaExecutable,
    cdsExecutable,
    generateDestinationName,
    getDestination
} from '@sap-ux/deploy-config-generator-shared';
import { t, initI18n, DESTINATION_AUTHTYPE_NOTFOUND, API_BUSINESS_HUB_ENTERPRISE_PREFIX } from '../utils';
import { loadManifest } from './utils';
import { getMtaPath, findCapProjectRoot, FileName } from '@sap-ux/project-access';
import { EventName } from '../telemetryEvents';
import { getCFQuestions } from './questions';
import type { ApiHubConfig, CFAppConfig } from '@sap-ux/cf-deploy-config-writer';
import type { Logger } from '@sap-ux/logger';
import type { CfDeployConfigOptions } from './types';
import type { Manifest } from '@sap-ux/project-access';
import type { CfDeployConfigAnswers } from '@sap-ux/cf-deploy-config-inquirer/dist/types';
import type { YeomanEnvironment } from '@sap-ux/fiori-generator-shared';

/**
 * Cloud Foundry deployment configuration generator.
 */
export default class extends DeploymentGenerator {
    private readonly appWizard: AppWizard;
    private readonly vscode: unknown;
    private readonly launchDeployConfigAsSubGenerator: boolean;
    private readonly launchStandaloneFromYui?: boolean;
    private readonly appPath: string;
    private readonly addMtaDestination: boolean;
    private readonly apiHubConfig?: ApiHubConfig;
    private readonly cloudServiceName?: string;
    private readonly serviceBase?: string;

    private answers: CfDeployConfigAnswers & Partial<CFAppConfig> = {};
    private projectRoot: string;
    private manifest?: Manifest;
    private mtaPath?: string;
    private isCap = false;
    private isAbapDirectServiceBinding = false;
    private lcapModeOnly = false;
    private servicePath?: string;
    private destinationName: string;

    private abort = false;
    private deployConfigExists = false;

    /**
     * Constructor for the CF deployment configuration generator.
     *
     * @param args - arguments
     * @param opts - cf deploy config options
     */
    constructor(args: string | string[], opts: CfDeployConfigOptions) {
        super(args, opts);

        this.launchDeployConfigAsSubGenerator = opts.launchDeployConfigAsSubGenerator ?? false;
        this.launchStandaloneFromYui = opts.launchStandaloneFromYui;
        this.appWizard = opts.appWizard ?? AppWizard.create(opts);
        this.vscode = opts.vscode;
        this.options = opts;

        this.destinationName = opts.destinationName ?? '';
        this.addMtaDestination = opts.addMTADestination ?? false; // by default it's false unless passed in i.e. headless flow
        this.lcapModeOnly = opts.lcapModeOnly ?? false;
        this.cloudServiceName = opts.cloudServiceName || undefined;
        this.apiHubConfig = opts.apiHubConfig;
        this.servicePath = opts.appGenServicePath;
        this.serviceBase = opts.appGenServiceHost;
        this.appPath = opts.appRootPath ?? this.destinationRoot();
        this.projectRoot = opts.projectRoot ?? this.destinationRoot();
    }

    public async initializing(): Promise<void> {
        await super.initializing();
        await initI18n();

        if ((this.env as unknown as YeomanEnvironment).conflicter) {
            (this.env as unknown as YeomanEnvironment).conflicter.force = this.options.force ?? true;
        }

        DeploymentGenerator.logger?.debug(t('cfGen.debug.initTelemetry'));

        await TelemetryHelper.initTelemetrySettings({
            consumerModule: {
                name: '@sap-ux/cf-deploy-config-sub-generator',
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });

        if (!this.launchDeployConfigAsSubGenerator) {
            await this._init();
        }
    }

    private async _init(): Promise<void> {
        // mta executable is required as mta-lib is used
        if (!hasbin.sync(mtaExecutable)) {
            this.abort = true;
            handleErrorMessage(this.appWizard, { errorType: ERROR_TYPE.NO_MTA_BIN });
        }

        await this._processProjectPaths();
        await this._processProjectConfigs();
        await this._processManifest();

        this.isAbapDirectServiceBinding = await useAbapDirectServiceBinding(this.appPath, false, this.mtaPath);

        // restricting local changes is only applicable for CAP flows
        if (!this.isCap) {
            this.lcapModeOnly = false;
        }
    }

    private async _processProjectPaths(): Promise<void> {
        const mtaPathResult = await getMtaPath(this.appPath);
        this.mtaPath = mtaPathResult?.mtaPath;
        const capRoot = await findCapProjectRoot(this.appPath);
        if (capRoot) {
            if (!hasbin.sync(cdsExecutable)) {
                bail(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_CDS_BIN));
            }
            this.isCap = true;
            this.projectRoot = capRoot;
        } else if (this.mtaPath) {
            this.projectRoot = dirname(this.mtaPath);
        }
    }

    private async _processProjectConfigs(): Promise<void> {
        const baseConfigFile = this.options.base ?? FileName.Ui5Yaml;
        const baseConfigExists = this.fs.exists(join(this.appPath, baseConfigFile));
        if (!baseConfigExists) {
            bail(ErrorHandler.noBaseConfig(baseConfigFile));
        }

        this.deployConfigExists = this.fs.exists(join(this.appPath, this.options.config ?? FileName.Ui5Yaml));
    }

    private async _processManifest(): Promise<void> {
        try {
            this.manifest = await loadManifest(this.fs, this.appPath);
        } catch (error) {
            this.abort = true;
            handleErrorMessage(this.appWizard, { errorMsg: error });
        }
    }

    public async prompting(): Promise<void> {
        if (this.abort) {
            return;
        }

        if (this.isCap && this.projectRoot && !this.mtaPath) {
            // if the user is adding deploy config to a CAP project and there is no mta.yaml in the root, then log error and exit
            this.abort = true;
            handleErrorMessage(this.appWizard, { errorType: ERROR_TYPE.CAP_DEPLOYMENT_NO_MTA });
            return;
        }

        if (!this.launchDeployConfigAsSubGenerator) {
            this._handleApiHubConfig();

            const questions = await getCFQuestions({
                projectRoot: this.projectRoot,
                isAbapDirectServiceBinding: this.isAbapDirectServiceBinding,
                cfDestination: this.destinationName,
                isCap: this.isCap,
                addOverwrite: showOverwriteQuestion(
                    this.deployConfigExists,
                    this.launchDeployConfigAsSubGenerator,
                    this.launchStandaloneFromYui,
                    this.options.overwrite
                ),
                apiHubConfig: this.apiHubConfig
            });

            this.answers = await this.prompt(questions);
        }

        await this._reconcileAnswersWithOptions();
    }

    private _handleApiHubConfig(): void {
        // generate a new instance dest name for api hub
        if (this.apiHubConfig && this.apiHubConfig.apiHubType === ApiHubType.apiHubEnterprise) {
            // full service path is only available from the manifest.json
            if (!this.servicePath) {
                this.servicePath = this.manifest?.['sap.app']?.dataSources?.mainService?.uri;
            }
            this.destinationName = generateDestinationName(API_BUSINESS_HUB_ENTERPRISE_PREFIX, this.servicePath);
        }
    }

    private async _reconcileAnswersWithOptions(): Promise<void> {
        const destinationName = this.destinationName || this.answers.destinationName;
        const destination = await getDestination(destinationName);
        const addManagedAppRouter = this.options.addManagedAppRouter ?? false;
        const isDestinationFullUrl =
            this.options.isFullUrlDest ?? (destination && isFullUrlDestination(destination)) ?? false;
        const destinationAuthentication =
            this.options.destinationAuthType ?? destination?.Authentication ?? DESTINATION_AUTHTYPE_NOTFOUND;
        const overwrite = this.options.overwrite ?? this.answers.overwrite;

        this.answers = {
            destinationName,
            addManagedAppRouter,
            isDestinationFullUrl,
            destinationAuthentication,
            overwrite
        };
    }

    public async writing(): Promise<void> {
        if (this.abort || this.options.overwrite === false) {
            return;
        }

        if (!this.launchDeployConfigAsSubGenerator) {
            await this._writing();
        }
    }

    private async _writing(): Promise<void> {
        try {
            const appConfig = {
                appPath: this.appPath,
                addManagedAppRouter: this.answers.addManagedAppRouter,
                destinationName: this.answers.destinationName,
                destinationAuthentication: this.answers.destinationAuthentication,
                isDestinationFullUrl: this.answers.isDestinationFullUrl,
                apiHubConfig: this.apiHubConfig,
                serviceHost: this.serviceBase,
                lcapMode: this.lcapModeOnly,
                addMtaDestination: this.addMtaDestination,
                cloudServiceName: this.cloudServiceName
            } satisfies CFAppConfig;
            await generateAppConfig(appConfig, this.fs, DeploymentGenerator.logger as unknown as Logger);
        } catch (error) {
            this.abort = true;
            handleErrorMessage(this.appWizard, { errorMsg: t('cfGen.error.writing', { error }) });
        }
    }

    public async install(): Promise<void> {
        if (!this.launchDeployConfigAsSubGenerator && this.options.overwrite !== false && !this.abort) {
            await this._install();
        }
    }

    private async _install(): Promise<void> {
        if (!this.options.skipInstall) {
            const npm = platform() === 'win32' ? 'npm.cmd' : 'npm';
            try {
                // install dependencies in project root
                await this.spawnCommand(
                    npm,
                    ['install', '--no-audit', '--no-fund', '--silent', '--prefer-offline', '--no-progress'],
                    {
                        cwd: this.projectRoot
                    }
                );

                // prevent installing twice if the project root is the same as the app path
                if (this.projectRoot !== this.appPath) {
                    // install dependencies in the application folder
                    await this.spawnCommand(
                        npm,
                        ['install', '--no-audit', '--no-fund', '--silent', '--prefer-offline', '--no-progress'],
                        {
                            cwd: this.appPath
                        }
                    );
                }
            } catch (error) {
                handleErrorMessage(this.appWizard, { errorMsg: t('cfGen.error.install', { error }) });
            }
        } else {
            DeploymentGenerator.logger?.info(t('cfGen.info.skippedInstallation'));
        }
    }

    public async end(): Promise<void> {
        try {
            if ((this.launchDeployConfigAsSubGenerator && !this.abort) || this.options.overwrite === true) {
                await this._init();
                await this._writing();
                await this._install();
            }
            if (
                this.options.launchStandaloneFromYui &&
                isExtensionInstalled(this.vscode, YUI_EXTENSION_ID, YUI_MIN_VER_FILES_GENERATED_MSG)
            ) {
                this.appWizard?.showInformation(t('cfGen.info.filesGenerated'), MessageType.notification);
            }

            const telemetryData =
                TelemetryHelper.createTelemetryData({
                    DeployTarget: 'CF',
                    ManagedApprouter: this.answers.addManagedAppRouter,
                    MTA: this.mtaPath ? 'true' : 'false',
                    ...this.options.telemetryData
                }) ?? {};
            await sendTelemetry(EventName.DEPLOY_CONFIG, telemetryData, this.appPath);
        } catch (error) {
            DeploymentGenerator.logger?.error(t('cfGen.error.end', { error }));
        }
    }
}

export { getCFQuestions, loadManifest };
export { CfDeployConfigOptions, CfDeployConfigAnswers };
