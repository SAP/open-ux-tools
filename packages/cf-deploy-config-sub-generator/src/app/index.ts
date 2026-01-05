import { join, dirname } from 'node:path';
import { platform } from 'node:os';
import hasbin = require('hasbin');
import { AppWizard, MessageType } from '@sap-devx/yeoman-ui-types';
import {
    sendTelemetry,
    TelemetryHelper,
    isExtensionInstalled,
    YUI_EXTENSION_ID,
    YUI_MIN_VER_FILES_GENERATED_MSG,
    setYeomanEnvConflicterForce
} from '@sap-ux/fiori-generator-shared';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { isFullUrlDestination } from '@sap-ux/btp-utils';
import {
    generateAppConfig,
    generateCAPConfig,
    ApiHubType,
    useAbapDirectServiceBinding,
    DefaultMTADestination
} from '@sap-ux/cf-deploy-config-writer';
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
import { getMtaPath, findCapProjectRoot, FileName, type Package } from '@sap-ux/project-access';
import { EventName } from '../telemetryEvents';
import { getCFQuestions, getCAPMTAQuestions } from './questions';
import type { ApiHubConfig, CFAppConfig, CAPConfig } from '@sap-ux/cf-deploy-config-writer';
import type { Logger } from '@sap-ux/logger';
import { CfDeployConfigOptions } from './types';
import {
    type CfAppRouterDeployConfigAnswers,
    type CfDeployConfigQuestions,
    type CfDeployConfigPromptOptions,
    CfDeployConfigAnswers,
    RouterModuleType
} from '@sap-ux/cf-deploy-config-inquirer';
import type { Answers } from 'inquirer';

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
    private appRouterAnswers: CfAppRouterDeployConfigAnswers;
    private projectRoot: string;
    private mtaPath?: string;
    private isCap = false;
    private isAbapDirectServiceBinding = false;
    private lcapModeOnly = false;
    private servicePath?: string;
    private destinationName: string;
    private abort = false;
    private deployConfigExists = false;
    private packageName: string;

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
        this.addMtaDestination = opts.addMTADestination ?? false; // by default, it's false unless passed in i.e. headless flow
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

        DeploymentGenerator.logger?.debug(t('cfGen.debug.initTelemetry'));

        // hack to suppress yeoman's overwrite prompt when files already exist
        // required when running the deploy config generator in standalone mode
        setYeomanEnvConflicterForce(this.env, this.options.force);

        await TelemetryHelper.initTelemetrySettings({
            consumerModule: {
                name: '@sap-ux/cf-deploy-config-sub-generator',
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });

        // Note: the init phase has to be delayed when loaded as a sub-gen as the yaml configurations are not available.
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

        this.isAbapDirectServiceBinding = await useAbapDirectServiceBinding(this.appPath, false, this.mtaPath);
        // restricting local changes is only applicable for CAP flows
        if (!this.isCap) {
            this.lcapModeOnly = false;
        }
    }

    /**
     * Processes the project paths.
     * Checks if the project is a CAP project or contains an mta.
     */
    private async _processProjectPaths(): Promise<void> {
        const mtaPathResult = await getMtaPath(this.appPath);
        this.mtaPath = mtaPathResult?.mtaPath;
        const capRoot = await findCapProjectRoot(this.appPath, true, this.fs);
        if (capRoot) {
            if (!hasbin.sync(cdsExecutable)) {
                bail(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_CDS_BIN));
            }
            this.isCap = true;
            this.projectRoot = capRoot;
            try {
                this.packageName =
                    (this.fs.readJSON(join(this.projectRoot, FileName.Package)) as unknown as Package)?.name ?? '';
            } catch {
                // Ignore errors while reading the package.json file, will be handled in the validators of the respective modules
            }
        } else if (this.mtaPath) {
            this.projectRoot = dirname(this.mtaPath);
        }
    }

    /**
     * Processes the project configurations.
     * Checks if the base config file exists.
     */
    private async _processProjectConfigs(): Promise<void> {
        const baseConfigFile = this.options.base ?? FileName.Ui5Yaml;
        const baseConfigExists = this.fs.exists(join(this.appPath, baseConfigFile));
        if (!baseConfigExists) {
            bail(ErrorHandler.noBaseConfig(baseConfigFile));
        }
        this.deployConfigExists = this.fs.exists(join(this.appPath, this.options.config ?? FileName.Ui5Yaml));
    }

    public async prompting(): Promise<void> {
        if (this.abort) {
            return;
        }
        if (!this.launchDeployConfigAsSubGenerator) {
            await this._prompting();
        }
        await this._reconcileAnswersWithOptions();
    }

    private async _prompting(): Promise<void> {
        const isCAPMissingMTA = this.isCap && this.projectRoot && !this.mtaPath;
        if (isCAPMissingMTA) {
            DeploymentGenerator.logger?.debug(t('cfGen.debug.capMissingMTA'));
            this.appRouterAnswers = (await this.prompt(
                await getCAPMTAQuestions({ projectRoot: this.projectRoot ?? process.cwd() })
            )) as CfAppRouterDeployConfigAnswers;
            if ((this.appRouterAnswers as Answers).addCapMtaContinue !== true) {
                this.abort = true;
                return;
            }
            // Configure defaults
            this.appRouterAnswers.mtaId = this.packageName; // Required for the MTA validation
            this.destinationName = DefaultMTADestination;
            this.options.overwrite = true; // Don't prompt the user to overwrite files we've just written!
            this.answers = {};
            this.answers.destinationName = this.destinationName;
            this.answers.addManagedAppRouter = false;
        } else {
            await this._handleApiHubConfig();
            const questions = await this._getCFQuestions();
            this.answers = await this.prompt(questions);
        }
    }

    /**
     * Handles specific logic for api hub configurations.
     */
    private async _handleApiHubConfig(): Promise<void> {
        // generate a new instance dest name for api hub
        if (this.apiHubConfig && this.apiHubConfig.apiHubType === ApiHubType.apiHubEnterprise) {
            // full service path is only available from the manifest.json
            if (!this.servicePath) {
                const manifest = await loadManifest(this.fs, this.appPath);
                this.servicePath = manifest?.['sap.app']?.dataSources?.mainService?.uri;
            }
            this.destinationName = generateDestinationName(API_BUSINESS_HUB_ENTERPRISE_PREFIX, this.servicePath);
        }
    }

    /**
     * Fetches the Cloud Foundry deployment configuration questions.
     *
     * @returns {Promise<CfDeployConfigQuestions[]>} - Cloud Foundry deployment configuration questions
     */
    private async _getCFQuestions(): Promise<CfDeployConfigQuestions[]> {
        return getCFQuestions({
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
    }

    /**
     * Reconciles the answers with the options which may be passed from the parent generator.
     */
    private async _reconcileAnswersWithOptions(): Promise<void> {
        const destinationName = this.destinationName || this.answers.destinationName;
        const destination = await getDestination(destinationName);
        const isDestinationFullUrl =
            this.options.isFullUrlDest ?? (destination && isFullUrlDestination(destination)) ?? false;
        const addManagedAppRouter =
            this.options.addManagedAppRouter ??
            (this.options.routerType === RouterModuleType.Managed ||
                this.answers.routerType === RouterModuleType.Managed);
        const addAppFrontendRouter =
            this.options.addAppFrontendRouter ??
            (this.options.routerType === RouterModuleType.AppFront ||
                this.answers.routerType === RouterModuleType.AppFront);
        const destinationAuthentication =
            this.options.destinationAuthType ?? destination?.Authentication ?? DESTINATION_AUTHTYPE_NOTFOUND;
        const overwrite = this.options.overwrite ?? this.answers.overwrite;

        this.answers = {
            destinationName,
            addManagedAppRouter,
            isDestinationFullUrl,
            destinationAuthentication,
            overwrite,
            addAppFrontendRouter
        };
    }

    public async writing(): Promise<void> {
        if (this.abort || this.options.overwrite === false) {
            return;
        }

        if (!this.launchDeployConfigAsSubGenerator) {
            await this._writing();
        } else {
            // Need to delay `init` as the yaml configurations won't be ready!
            await this._init();
            await this._writing();
        }
    }

    private async _writing(): Promise<void> {
        try {
            // Step1. (Optional) Generate CAP MTA with specific approuter type managed | standalone
            if (this.appRouterAnswers) {
                await generateCAPConfig(
                    this.appRouterAnswers as CAPConfig,
                    this.fs,
                    DeploymentGenerator.logger as unknown as Logger
                );
            }
            // Step2. Append HTML5 app to MTA
            await generateAppConfig(this._getAppConfig(), this.fs, DeploymentGenerator.logger as unknown as Logger);
        } catch (error) {
            this.abort = true;
            handleErrorMessage(this.appWizard, { errorMsg: t('cfGen.error.writing', { error }) });
        }
    }

    /**
     * Gets the Cloud Foundry app configuration based on the answers.
     *
     * @returns {CFAppConfig} - Cloud Foundry app configuration
     */
    private _getAppConfig(): CFAppConfig {
        return {
            appPath: this.appPath,
            addManagedAppRouter: this.answers.addManagedAppRouter,
            addAppFrontendRouter: this.answers.addAppFrontendRouter,
            destinationName: this.answers.destinationName,
            destinationAuthentication: this.answers.destinationAuthentication,
            isDestinationFullUrl: this.answers.isDestinationFullUrl,
            apiHubConfig: this.apiHubConfig,
            serviceHost: this.serviceBase,
            lcapMode: this.lcapModeOnly,
            addMtaDestination: this.addMtaDestination,
            cloudServiceName: this.cloudServiceName
        };
    }

    public async install(): Promise<void> {
        if (this.options.overwrite !== false && !this.abort) {
            await this._install();
        }
    }

    private async _install(): Promise<void> {
        if (!this.options.skipInstall) {
            try {
                await this._runNpmInstall(this.projectRoot);

                // prevent installing twice if the project root is the same as the app path
                if (this.projectRoot !== this.appPath) {
                    await this._runNpmInstall(this.appPath);
                }
            } catch (error) {
                handleErrorMessage(this.appWizard, { errorMsg: t('cfGen.error.install', { error: error.message }) });
            }
        } else {
            DeploymentGenerator.logger?.info(t('cfGen.info.skippedInstallation'));
        }
    }

    /**
     * Runs npm install in the specified path.
     *
     * @param path - the path to run npm install
     */
    private async _runNpmInstall(path: string): Promise<void> {
        const npm = platform() === 'win32' ? 'npm.cmd' : 'npm';

        // install dependencies
        await this.spawnCommand(
            npm,
            ['install', '--no-audit', '--no-fund', '--silent', '--prefer-offline', '--no-progress'],
            {
                cwd: path
            }
        );
    }

    public async end(): Promise<void> {
        try {
            if (
                (this.options.launchStandaloneFromYui || !this.launchDeployConfigAsSubGenerator) &&
                !this.abort &&
                isExtensionInstalled(this.vscode, YUI_EXTENSION_ID, YUI_MIN_VER_FILES_GENERATED_MSG)
            ) {
                this.appWizard?.showInformation(t('cfGen.info.filesGenerated'), MessageType.notification);
            }
            await this._sendTelemetry();
        } catch (error) {
            DeploymentGenerator.logger?.error(t('cfGen.error.end', { error }));
        }
    }

    private async _sendTelemetry(): Promise<void> {
        const telemetryData =
            TelemetryHelper.createTelemetryData({
                DeployTarget: 'CF',
                ManagedApprouter: this.answers.addManagedAppRouter,
                AppFrontendRouter: this.answers.addAppFrontendRouter,
                MTA: this.mtaPath ? 'true' : 'false',
                ...this.options.telemetryData
            }) ?? {};
        await sendTelemetry(EventName.DEPLOY_CONFIG, telemetryData, this.appPath);
    }
}

export { getCFQuestions, loadManifest };
export { API_BUSINESS_HUB_ENTERPRISE_PREFIX, DESTINATION_AUTHTYPE_NOTFOUND };
export {
    CfDeployConfigOptions,
    CfDeployConfigAnswers,
    CfDeployConfigQuestions,
    CfDeployConfigPromptOptions,
    ApiHubConfig,
    ApiHubType
};
