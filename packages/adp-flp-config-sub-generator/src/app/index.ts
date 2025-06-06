import type { FlpConfigOptions } from './types';
import type { Question } from 'inquirer';
import Generator from 'yeoman-generator';
import path, { join } from 'path';
import {
    type AxiosError,
    type AxiosRequestConfig,
    type ProviderConfiguration,
    type AbapServiceProvider,
    type Inbound,
    isAxiosError
} from '@sap-ux/axios-extension';
import {
    getVariant,
    getAdpConfig,
    isCFEnvironment,
    generateInboundConfig,
    flpConfigurationExists,
    SystemLookup,
    filterAndMapInboundsToManifest,
    type InternalInboundNavigation,
    type AdpPreviewConfig,
    type DescriptorVariant
} from '@sap-ux/adp-tooling';
import { ToolsLogger } from '@sap-ux/logger';
import { EventName } from '../telemetryEvents';
import {
    getPrompts,
    getAdpFlpConfigPromptOptions,
    getAdpFlpInboundsWriterConfig,
    getTileSettingsQuestions,
    type FLPConfigAnswers,
    type TileSettingsAnswers
} from '@sap-ux/flp-config-inquirer';
import { AppWizard, Prompts, MessageType } from '@sap-devx/yeoman-ui-types';
import {
    TelemetryHelper,
    sendTelemetry,
    isCli,
    type ILogWrapper,
    type YeomanEnvironment
} from '@sap-ux/fiori-generator-shared';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { FileName, getAppType } from '@sap-ux/project-access';
import AdpFlpConfigLogger from '../utils/logger';
import { t, initI18n } from '../utils/i18n';
import {
    ErrorHandler,
    type CredentialsAnswers,
    getCredentialsPrompts,
    type ValidationLink
} from '@sap-ux/inquirer-common';
import { createAbapServiceProvider, type AbapTarget, type UrlAbapTarget } from '@sap-ux/system-access';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { ManifestNamespace } from '@sap-ux/project-access';
import { initAppWizardCache, addToCache, getFromCache, deleteCache } from './appWizzardCache';

/**
 * Generator for adding a FLP configuration to an adaptation project.
 *
 * @extends Generator
 */
export default class AdpFlpConfigGenerator extends Generator {
    setPromptsCallback: (fn: object) => void;
    private prompts: Prompts;
    // Flag to determine if the generator was launched as a sub-generator or standalone
    private readonly launchAsSubGen: boolean;
    private readonly appWizard: AppWizard;
    private readonly vscode: any;
    private readonly toolsLogger: ToolsLogger;
    private readonly projectRootPath: string = '';
    private answers: FLPConfigAnswers;
    private logger: ILogWrapper;
    private authenticationRequired: boolean = false;
    // Flag to determine if the generator was aborted
    private abort: boolean = false;
    private ui5Yaml: AdpPreviewConfig;
    private credentials: CredentialsAnswers;
    private inbounds?: ManifestNamespace.Inbound;
    private appId: string;
    private variant: DescriptorVariant;
    private tileSettingsAnswers?: TileSettingsAnswers;
    private provider: AbapServiceProvider;

    /**
     * Creates an instance of the generator.
     *
     * @param {string | string[]} args - The arguments passed to the generator.
     * @param {FlpConfigOptions} opts - The options for the generator.
     */
    constructor(args: string | string[], opts: FlpConfigOptions) {
        super(args, opts);
        this.appWizard = opts.appWizard ?? AppWizard.create(opts);
        this.launchAsSubGen = !!opts.launchAsSubGen;
        this.toolsLogger = new ToolsLogger();
        this.projectRootPath = opts.data?.projectRootPath ?? this.destinationRoot();
        this.options = opts;
        this.vscode = opts.vscode;

        initAppWizardCache(opts.logger, this.appWizard);
        this._setupFLPConfigPrompts();
        this._setupLogging();
    }

    async initializing(): Promise<void> {
        await initI18n();

        // Force the generator to overwrite existing files without additional prompting
        if ((this.env as unknown as YeomanEnvironment).conflicter) {
            (this.env as unknown as YeomanEnvironment).conflicter.force = this.options.force ?? true;
        }

        this._setupFLPConfigPage();

        if (!this.launchAsSubGen) {
            await this._initializeStandAloneGenerator();
        } else {
            this.appId = this.options.appId as string;
        }

        await this._initAbapServiceProvider();

        try {
            this.inbounds = await this._getAppInbounds();
        } catch (error) {
            this.authenticationRequired = this._checkAuthRequired(error);
            if (this.authenticationRequired) {
                return;
            }
            this._handleFetchingError(error);
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
        if (this.authenticationRequired) {
            await this._promptAuthentication();
        }
        if (this.abort) {
            return;
        }
        if (!this.launchAsSubGen) {
            await this._validateProject();
            if (this.abort) {
                return;
            }
        }

        this.tileSettingsAnswers = await this._promptTileActions();
        const prompts: Question<FLPConfigAnswers>[] = await getPrompts(
            this.inbounds,
            getAdpFlpConfigPromptOptions(this.tileSettingsAnswers as TileSettingsAnswers, this.inbounds, this.variant)
        );
        this.answers = await this.prompt(prompts);
    }

    async writing(): Promise<void> {
        if (this.abort) {
            return;
        }
        try {
            const config = getAdpFlpInboundsWriterConfig(this.answers, this.tileSettingsAnswers as TileSettingsAnswers);
            await generateInboundConfig(this.projectRootPath, config as InternalInboundNavigation, this.fs);
        } catch (error) {
            this.logger.error(`Writing phase failed: ${error}`);
            throw new Error(t('error.updatingApp'));
        }
    }

    end(): void {
        deleteCache(this.appWizard, this.logger);
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
     * Retrieves the list of tile inbounds of the application.
     *
     * @returns {Promise<ManifestNamespace.Inbound>} list of tile inbounds of the application.
     */
    private async _getAppInbounds(): Promise<ManifestNamespace.Inbound | undefined> {
        const lrepService = this.provider.getLayeredRepository();
        const inbounds = (await lrepService.getSystemInfo(undefined, undefined, this.appId)).inbounds as Inbound[];

        if (!inbounds?.length) {
            return undefined;
        }

        return filterAndMapInboundsToManifest(inbounds);
    }

    /**
     * Creates and returns an instance of AbapServiceProvider using the current UI5 YAML configuration and credentials.
     *
     * @returns {Promise<AbapServiceProvider>} The ABAP service provider instance.
     */
    private async _getAbapServiceProvider(): Promise<AbapServiceProvider> {
        const { target, ignoreCertErrors = false } = this.ui5Yaml;
        const requestOptions: AxiosRequestConfig & Partial<ProviderConfiguration> = { ignoreCertErrors };
        if (this.credentials) {
            requestOptions['auth'] = { username: this.credentials.username, password: this.credentials.password };
        }
        return await createAbapServiceProvider(target, requestOptions, false, this.toolsLogger);
    }

    /**
     * Prompts the user for authentication credentials.
     *
     * @returns {void}
     */
    private async _promptAuthentication(): Promise<void> {
        const prompts = await getCredentialsPrompts(
            async (credentials: CredentialsAnswers): Promise<ValidationLink | string | boolean> => {
                this.credentials = credentials;
                try {
                    this.provider = await this._getAbapServiceProvider();
                    this.inbounds = await this._getAppInbounds();
                    addToCache(this.appWizard, { provider: this.provider }, this.logger);
                } catch (error) {
                    if (!isAxiosError(error)) {
                        this.logger.error(`Base application inbounds fetching failed: ${error}`);
                        throw new Error(t('error.baseAppInboundsFetching'));
                    }
                    this.authenticationRequired = this._checkAuthRequired(error);
                    if (this.authenticationRequired) {
                        return t('error.authenticationFailed');
                    }
                    return this._getErrorHandlerMessage(error) ?? false;
                }
                return true;
            }
        );

        const systemName = await this._findSystemName(this.ui5Yaml.target as UrlAbapTarget);
        if (!systemName) {
            return;
        }

        this.prompts.splice(0, 0, [
            {
                name: t('yuiNavSteps.flpCredentialsName'),
                description: t('yuiNavSteps.flpCredentialsDesc', { system: systemName })
            }
        ]);
        await this.prompt(prompts);
    }

    /**
     * Handles errors that occur during the fetching of the manifest.
     *
     * @param {Error | AxiosError} error - The error that occurred.
     */
    private _handleFetchingError(error: AxiosError): void {
        if (isAxiosError(error)) {
            this.logger.error(
                `Base application inbounds fetching failed: ${error}. Status: ${error.response?.status}. URI: ${error.request?.path}`
            );

            const errorHelp = this._getErrorHandlerMessage(error);
            if (errorHelp) {
                this._abortExecution(
                    typeof errorHelp === 'string'
                        ? errorHelp
                        : `${errorHelp?.message} ([${errorHelp.link.text}](${errorHelp.link.url}))`
                );
            }
            return;
        }
        this.logger.error(`Base application inbounds fetching failed: ${error}`);
        throw new Error(t('error.baseAppInboundsFetching'));
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
    private _setupFLPConfigPrompts(): void {
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
    private async _findSystemName(target: AbapTarget): Promise<string | undefined> {
        const systemLookup = new SystemLookup(this.toolsLogger);
        const isBas = isAppStudio();
        const endpoint = await systemLookup.getSystemByName((isBas ? target.destination : target.url) as string);
        if (!endpoint?.Name) {
            if (isBas) {
                this._abortExecution(t('error.destinationNotFound'));
            } else {
                this._abortExecution(t('error.systemNotFoundInStore'));
            }
            return undefined;
        }

        return endpoint.Name;
    }

    /**
     * Shows an error notification with the provided message and aborts the generator execution.
     *
     * @param {string} message - The error message to display.
     */
    private _abortExecution(message: string): void {
        if (isCli()) {
            this.toolsLogger.error(message);
        } else {
            this.vscode.window.showErrorMessage(message);
        }
        this.abort = true;
    }

    /**
     * Retrieves the error handler message for the provided error.
     *
     * @param {Error | AxiosError} error - The error to handle.
     * @returns {ValidationLink | string | undefined} The validation link or error message.
     */
    private _getErrorHandlerMessage(error: Error | AxiosError): ValidationLink | string | undefined {
        const errorHandler = new ErrorHandler();
        return errorHandler.getValidationErrorHelp(error);
    }

    /**
     * Checks if authentication is required based on the provided error.
     *
     * @param {Error | AxiosError} error - The error to check.
     * @returns {boolean} True if authentication is required, false otherwise.
     */
    private _checkAuthRequired(error: Error | AxiosError): boolean {
        if (isAxiosError(error)) {
            if (error.response?.status === 401) {
                return true;
            }
        }
        return false;
    }

    /**
     * Configures logging for the generator.
     */
    private _setupLogging(): void {
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

    /**
     * Prompts the user for tile actions and returns the answers.
     *
     * @returns {Promise<(TileSettingsAnswers & FLPConfigAnswers) | undefined>} The answers from the tile actions prompt, or undefined.
     */
    private async _promptTileActions(): Promise<(TileSettingsAnswers & FLPConfigAnswers) | undefined> {
        if (this.inbounds) {
            this._setTileSettingsPrompts();
            const promptOptions = {
                existingFlpConfigInfo: {
                    hide: true
                }
            };
            if (!this.launchAsSubGen && flpConfigurationExists(this.variant)) {
                promptOptions.existingFlpConfigInfo.hide = false;
            }
            const tileSettingsPrompts = getTileSettingsQuestions(promptOptions);
            return (await this.prompt(tileSettingsPrompts)) as TileSettingsAnswers & FLPConfigAnswers;
        }
        return undefined;
    }

    private _setTileSettingsPrompts(): void {
        const promptsIndex = this.prompts.size() === 1 ? 0 : 1;
        this.prompts.splice(promptsIndex, 0, [
            {
                name: t('yuiNavSteps.tileSettingsName'),
                description: t('yuiNavSteps.tileActionsDesc', {
                    projectName: path.basename(this.projectRootPath)
                })
            }
        ]);
    }

    /**
     * Validates the project type and cloud readiness.
     *
     * @throws {Error} If the project is not supported or not cloud ready.
     */
    private async _validateProject(): Promise<void> {
        const isFioriAdaptation = (await getAppType(this.projectRootPath)) === 'Fiori Adaptation';
        if (!isFioriAdaptation || isCFEnvironment(this.projectRootPath)) {
            this._abortExecution(t('error.projectNotSupported'));
            return;
        }
        const isCloud = await this.provider.isAbapCloud();
        if (!isCloud) {
            this._abortExecution(t('error.projectNotCloudReady'));
        }
    }

    /**
     * Initializes the generator when launched as a standalone generator.
     *
     * @returns {Promise<void>} A promise that resolves when the initialization is complete.
     */
    private async _initializeStandAloneGenerator(): Promise<void> {
        this.ui5Yaml = await getAdpConfig(this.projectRootPath, join(this.projectRootPath, FileName.Ui5Yaml));
        this.variant = await getVariant(this.projectRootPath, this.fs);
        this.appId = this.variant.reference;
    }

    private async _initAbapServiceProvider(): Promise<void> {
        if (this.launchAsSubGen) {
            this.provider = this.options.provider as AbapServiceProvider;
            return;
        }

        const cachedProvider = getFromCache<AbapServiceProvider>(this.appWizard, 'provider', this.logger);
        if (cachedProvider) {
            this.provider = cachedProvider;
            return;
        }

        this.provider = await this._getAbapServiceProvider();
        addToCache(this.appWizard, { provider: this.provider }, this.logger);
    }
}

export type { FlpConfigOptions };
