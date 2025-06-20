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
    type InternalInboundNavigation,
    type AdpPreviewConfig
} from '@sap-ux/adp-tooling';
import { ToolsLogger } from '@sap-ux/logger';
import { EventName } from '../telemetryEvents';
import { getPrompts, type FLPConfigAnswers } from '@sap-ux/flp-config-inquirer';
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
import {
    createAbapServiceProvider,
    type AbapTarget,
    type UrlAbapTarget,
    getCredentialsFromStore
} from '@sap-ux/system-access';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';

/**
 * Generator for adding a FLP configuration to an adaptation project.
 *
 * @extends Generator
 */
export default class extends Generator {
    setPromptsCallback: (fn: object) => void;
    private prompts: Prompts;
    // Flag to determine if the generator was launched as a sub-generator or standalone
    private readonly launchAsSubGen: boolean;
    private readonly appWizard: AppWizard;
    private readonly vscode: any;
    private readonly toolsLogger: ToolsLogger;
    private readonly projectRootPath: string = '';
    private manifest: Manifest;
    private answers: FLPConfigAnswers;
    private logger: ILogWrapper;
    private authenticationRequired: boolean = false;
    // Flag to determine if the generator was aborted
    private abort: boolean = false;
    private configuredSystem: string | undefined;
    private ui5Yaml: AdpPreviewConfig;
    private credentials: CredentialsAnswers;

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
        this.configuredSystem = opts.system;
        this.manifest = opts.manifest;
        this.toolsLogger = new ToolsLogger();
        this.projectRootPath = opts.data?.projectRootPath ?? this.destinationRoot();
        this.options = opts;
        this.vscode = opts.vscode;

        this._setupPrompts();
        this._setupLogging();
    }

    async initializing(): Promise<void> {
        await initI18n();

        // Check if the project is supported
        if (!this.launchAsSubGen) {
            const isFioriAdaptation = (await getAppType(this.projectRootPath)) === 'Fiori Adaptation';
            if (!isFioriAdaptation || isCFEnvironment(this.projectRootPath)) {
                throw new Error(t('error.projectNotSupported'));
            }
        }

        // Force the generator to overwrite existing files without additional prompting
        if ((this.env as unknown as YeomanEnvironment).conflicter) {
            (this.env as unknown as YeomanEnvironment).conflicter.force = this.options.force ?? true;
        }

        this._setupFLPConfigPage();

        if (!this.launchAsSubGen) {
            this.ui5Yaml = await getAdpConfig(this.projectRootPath, join(this.projectRootPath, FileName.Ui5Yaml));
            this.configuredSystem ??= await this._findConfiguredSystem(this.ui5Yaml.target);
        }
        if (!this.configuredSystem) {
            return;
        }

        if (!this.manifest) {
            try {
                this.manifest = await this._getManifest();
            } catch (error) {
                this.authenticationRequired = this._checkAuthRequired(error);
                if (this.authenticationRequired) {
                    return;
                }
                this._handleFetchingError(error);
            }
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
        const inbounds = getInboundsFromManifest(this.manifest);
        const appId = getRegistrationIdFromManifest(this.manifest);
        const prompts: Question<FLPConfigAnswers>[] = await getPrompts(inbounds, appId, {
            overwrite: { hide: true },
            createAnotherInbound: { hide: true },
            emptyInboundsInfo: { hide: isCli() }
        });
        this.answers = await this.prompt(prompts);
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
     * Retrieves the merged manifest for the project.
     *
     * @returns {Promise<Manifest>} The project manifest.
     */
    private async _getManifest(): Promise<Manifest> {
        const { target, ignoreCertErrors = false } = this.ui5Yaml;
        const requestOptions: AxiosRequestConfig & Partial<ProviderConfiguration> = { ignoreCertErrors };
        if (this.credentials) {
            requestOptions['auth'] = { username: this.credentials.username, password: this.credentials.password };
        }
        const provider = await createAbapServiceProvider(target, requestOptions, false, this.toolsLogger);
        const variant = await getVariant(this.projectRootPath);
        const manifestService = await ManifestService.initMergedManifest(
            provider,
            this.projectRootPath,
            variant,
            this.toolsLogger
        );
        return manifestService.getManifest();
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
                    this.manifest = await this._getManifest();
                } catch (error) {
                    if (!isAxiosError(error)) {
                        this.logger.error(`Manifest fetching failed: ${error}`);
                        throw new Error(t('error.fetchingManifest'));
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
     */
    private _handleFetchingError(error: AxiosError): void {
        if (isAxiosError(error)) {
            this.logger.error(
                `Manifest fetching failed: ${error}. Status: ${error.response?.status}. URI: ${error.request?.path}`
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
                this._abortExecution(t('error.destinationNotFound'));
                return;
            }

            const destinations = await listDestinations();
            if (!(configuredSystem in destinations)) {
                this._abortExecution(t('error.destinationNotFoundInStore', { destination: configuredSystem }));
                return;
            }
        } else {
            const url = target?.url;
            if (!url) {
                this._abortExecution(t('error.systemNotFound'));
                return;
            }

            configuredSystem = (await getCredentialsFromStore(target as UrlAbapTarget, this.toolsLogger))?.name;
            if (!configuredSystem) {
                this._abortExecution(t('error.systemNotFoundInStore', { systemUrl: url }));
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
        const errorHandler = new ErrorHandler(undefined, undefined, '@sap-ux/adp-flp-config');
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
}

export type { FlpConfigOptions };
