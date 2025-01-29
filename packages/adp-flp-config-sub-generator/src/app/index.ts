import type { Manifest } from '@sap-ux/project-access';
import type { FlpConfigOptions } from './types';
import type { Question } from 'inquirer';
import Generator from 'yeoman-generator';
import path, { join } from 'path';
import {
    type AxiosError,
    type AxiosRequestConfig,
    type ProviderConfiguration,
    isAxiosError
} from '@sap-ux/axios-extension';
import {
    ManifestService,
    getVariant,
    getAdpConfig,
    getInboundsFromManifest,
    getRegistrationIdFromManifest,
    isCFEnvironment,
    generateInboundConfig,
    type InternalInboundNavigation
} from '@sap-ux/adp-tooling';
import { ToolsLogger } from '@sap-ux/logger';
import { EventName } from '../telemetryEvents';
import { getPrompts, type FLPConfigAnswers } from '@sap-ux/flp-config-inquirer';
import { AppWizard, Prompts, MessageType } from '@sap-devx/yeoman-ui-types';
import { TelemetryHelper, sendTelemetry, isCli, type ILogWrapper } from '@sap-ux/fiori-generator-shared';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { FileName } from '@sap-ux/project-access';
import AdpFlpConfigLogger from '../utils/logger';
import { t, initI18n } from '../utils/i18n';
import { ErrorHandler, type CredentialsAnswers, getCredentialsPrompts } from '@sap-ux/inquirer-common';
import {
    createAbapServiceProvider,
    type AbapTarget,
    type UrlAbapTarget,
    getCredentialsFromStore
} from '@sap-ux/system-access';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';

/**
 * Generator for adding a FLP configuration to an Adaptation Project.
 *
 * @extends Generator
 */
export default class extends Generator {
    setPromptsCallback: (fn: object) => void;
    private prompts: Prompts;
    // Flag to determine if the generator was launched as a sub-generator or standalone
    private launchAsSubGen: boolean;
    private appWizard: AppWizard;
    private manifest: Manifest;
    private projectRootPath: string = '';
    private answers: FLPConfigAnswers;
    private toolsLogger: ToolsLogger;
    private logger: ILogWrapper;
    public options: FlpConfigOptions;
    private vscode: any;
    private authenticationRequired: boolean = false;
    // Flag to determine if the generator was aborted
    private abort: boolean = false;
    private configuredSystem: string | undefined;

    /**
     * Creates an instance of the generator.
     *
     * @param {string | string[]} args - The arguments passed to the generator.
     * @param {FlpConfigOptions} opts - The options for the generator.
     */
    constructor(args: string | string[], opts: FlpConfigOptions) {
        // Force the generator to overwrite existing files without additional prompting
        opts.force = true;
        super(args, opts);
        this.appWizard = opts.appWizard ?? AppWizard.create(opts);
        this.launchAsSubGen = !!opts.launchAsSubGen;
        this.manifest = opts.manifest;
        this.toolsLogger = new ToolsLogger();
        this.projectRootPath = opts.data?.projectRootPath ?? this.destinationRoot();
        this.options = opts;
        this.vscode = opts.vscode;

        this._setupPrompts();
        this._configureLogging();
    }

    async initializing(): Promise<void> {
        // Generator does not support CF projects
        if (isCFEnvironment(this.projectRootPath)) {
            throw new Error(t('error.cfNotSupported'));
        }

        await initI18n();
        this._setupFLPConfigPage();

        if (!this.manifest) {
            await this._fetchManifest();
        }
        // Add telemetry to be sent once adp-flp-config is generated
        await TelemetryHelper.initTelemetrySettings({
            consumerModule: {
                name: '@sap/generator-fiori-deployment:adp-flp-config',
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });
    }

    public async prompting(): Promise<void> {
        if (this.abort) {
            return;
        }
        if (this.authenticationRequired) {
            await this._promptAuthentication();
        }
        const inbounds = getInboundsFromManifest(this.manifest);
        const appId = getRegistrationIdFromManifest(this.manifest);

        const prompts: Question<FLPConfigAnswers>[] = await getPrompts(inbounds, appId, {
            overwrite: { hide: true },
            createAnotherInbound: { hide: true }
        });
        this.answers = (await this.prompt(prompts)) as FLPConfigAnswers;
    }

    async writing(): Promise<void> {
        if (this.abort) {
            return;
        }
        try {
            await generateInboundConfig(this.projectRootPath, this.answers as InternalInboundNavigation, this.fs);
        } catch (error) {
            this.logger.error(`Writing phase failed: ${error}`);
            throw new Error(t('error.updatingApp'));
        }
    }

    end(): void {
        if (this.abort) {
            return;
        }
        if (!this.launchAsSubGen) {
            this.appWizard?.showInformation(t('info.flpConfigAdded'), MessageType.notification);
        }
        const telemetryData =
            TelemetryHelper.createTelemetryData({
                appType: 'adp-flp-config',
                ...this.options.telemetryData
            }) ?? {};
        if (telemetryData) {
            sendTelemetry(EventName.ADP_FLP_CONFIG_ADDED, telemetryData, this.projectRootPath).catch((error) => {
                this.logger.error(t('error.telemetry', { error }));
            });
        }
    }

    /**
     * Fetches the manifest for the project.
     *
     * @param {CredentialsAnswers} credentials - The request options.
     * @returns {Promise<boolean | string>} A promise that resolves with a boolean or an error message.
     */
    private async _fetchManifest(credentials?: CredentialsAnswers): Promise<boolean | string> {
        const { target, ignoreCertErrors = false } = await getAdpConfig(
            this.projectRootPath,
            join(this.projectRootPath, FileName.Ui5Yaml)
        );
        this.configuredSystem = await this._findConfiguredSystem(target);
        if (!this.configuredSystem) {
            return false;
        }
        try {
            const requiestOptions: AxiosRequestConfig & Partial<ProviderConfiguration> = { ignoreCertErrors };
            if (credentials) {
                requiestOptions['auth'] = { username: credentials.username, password: credentials.password };
            }
            const provider = await createAbapServiceProvider(target, requiestOptions, false, this.toolsLogger);
            const variant = getVariant(this.projectRootPath);
            const manifestService = await ManifestService.initMergedManifest(
                provider,
                this.projectRootPath,
                variant,
                this.toolsLogger
            );
            this.manifest = manifestService.getManifest();
            return true;
        } catch (error) {
            return (await this._handleFetchingError(error)) ?? false;
        }
    }

    /**
     * Prompts the user for authentication credentials.
     *
     * @returns {void}
     */
    private async _promptAuthentication(): Promise<void> {
        const prompts = await getCredentialsPrompts(this._fetchManifest.bind(this));
        this.prompts.splice(0, 0, [
            {
                name: t('yuiNavSteps.flpCredentialsName'),
                description: t('yuiNavSteps.flpCredentialsDesc', { system: this.configuredSystem })
            }
        ]);
        await this.prompt(prompts);
    }

    /**
     * Handles errors that occur during the fetching of the manifest.
     *
     * @param {Error | AxiosError} error - The error that occurred.
     * @returns {Promise<undefined | string>} A promise that resolves with an error message or undefined.
     */
    private async _handleFetchingError(error: Error | AxiosError): Promise<undefined | string> {
        if (isAxiosError(error)) {
            this.logger.error(
                `Manifest fetching failed: ${error}. Status: ${error.response?.status}. URI: ${error.request?.path}`
            );
            if (error.response?.status === 401) {
                this.authenticationRequired = true;
                return t('error.authenticationFailed');
            }

            const errorHandler = new ErrorHandler();
            const errorHelp = errorHandler.getValidationErrorHelp(error);
            if (errorHelp) {
                this._showErrorNotification(
                    typeof errorHelp === 'string'
                        ? errorHelp
                        : `${errorHelp?.message} ([${errorHelp.link.text}](${errorHelp.link.url}))`
                );
                return;
            }
        }
        this.logger.error(`Manifest fetching failed: ${error}`);
        throw new Error(t('error.fetchingManifest'));
    }

    /**
     * Adds navigations steps and callback function for the generator prompts.
     */
    private _setupFLPConfigPage(): void {
        // if launched as a sub-generator, the navigation steps will be set by the parent generator
        if (!this.launchAsSubGen) {
            this.prompts.splice(0, 0, [
                {
                    name: t('yuiNavSteps.flpConfigName'),
                    description: t('yuiNavSteps.flpConfigDesc', { projectName: path.basename(this.projectRootPath) })
                }
            ]);
        }
    }

    /**
     * Sets up the prompts for the generator.
     */
    private _setupPrompts(): void {
        // If launched as a sub-generator, the prompts will be set by the parent generator
        if (!this.launchAsSubGen) {
            this.prompts = new Prompts([]);
            this.setPromptsCallback = (fn): void => {
                if (this.prompts) {
                    this.prompts.setCallback(fn);
                }
            };
        }
    }

    /**
     * Finds the configured system based on the provided target in ui5.yaml configuration.
     *
     * @param {AbapTarget} target - The target ABAP system.
     * @returns {Promise<string>} The configured system.
     */
    private async _findConfiguredSystem(target: AbapTarget): Promise<string | undefined> {
        let configuredSystem: string | undefined;
        if (isAppStudio()) {
            configuredSystem = target?.destination;
            if (!configuredSystem) {
                this._showErrorNotification(t('error.destinationNotFound'));
                return;
            }

            const destinations = await listDestinations();
            if (!(configuredSystem in destinations)) {
                this._showErrorNotification(t('error.destinationNotFoundInStore', { destination: configuredSystem }));
                return;
            }
        } else {
            const url = target?.url;
            if (!url) {
                this._showErrorNotification(t('error.systemNotFound'));
                return;
            }

            configuredSystem = (await getCredentialsFromStore(target as UrlAbapTarget, this.toolsLogger))?.name;
            if (!configuredSystem) {
                this._showErrorNotification(t('error.systemNotFoundInStore', { systemUrl: url }));
                return;
            }
        }

        return configuredSystem;
    }

    /**
     * Shows an error notification with the provided message and aborts the generator execution.
     *
     * @param {string} message - The error message to display.
     */
    private _showErrorNotification(message: string): void {
        if (isCli()) {
            this.toolsLogger.error(message);
        } else {
            this.vscode.window.showErrorMessage(message);
        }
        this.abort = true;
    }

    /**
     * Configures logging for the generator.
     */
    private _configureLogging(): void {
        AdpFlpConfigLogger.configureLogging(
            this.options.logger,
            this.rootGeneratorName(),
            this.log,
            this.options.vscode,
            this.options.logLevel,
            this.options.logWrapper
        );
        this.logger = AdpFlpConfigLogger.logger;
    }
}

export type { FlpConfigOptions };
