import { join } from 'path';
import Generator from 'yeoman-generator';
import { AppWizard, MessageType, Prompts as YeomanUiSteps } from '@sap-devx/yeoman-ui-types';

import {
    FlexLayer,
    SystemLookup,
    fetchPublicVersions,
    generate,
    getConfig,
    getConfiguredProvider,
    loadApps,
    type AttributesAnswers,
    type ConfigAnswers,
    type UI5Version,
    SourceManifest,
    isCFEnvironment
} from '@sap-ux/adp-tooling';
import {
    TelemetryHelper,
    getDefaultTargetFolder,
    getHostEnvironment,
    hostEnvironment,
    sendTelemetry,
    type ILogWrapper
} from '@sap-ux/fiori-generator-shared';
import { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';

import { getFlexLayer } from './layer';
import { initI18n, t } from '../utils/i18n';
import { EventName } from '../telemetryEvents';
import { getWizardPages } from '../utils/steps';
import AdpFlpConfigLogger from '../utils/logger';
import { getPrompts } from './questions/attributes';
import { ConfigPrompter } from './questions/configuration';
import { validateJsonInput } from './questions/helper/validators';
import { getPackageInfo, installDependencies } from '../utils/deps';
import { cacheClear, cacheGet, cachePut, initCache } from '../utils/appWizardCache';
import { getFirstArgAsString, parseJsonInput } from '../utils/parse-json-input';
import type { AdpGeneratorOptions, AttributePromptOptions, JsonInput } from './types';
import { getExtensionProjectData, resolveNodeModuleGenerator } from './extension-project';
import { getDefaultNamespace, getDefaultProjectName } from './questions/helper/default-values';

/**
 * Generator for creating an Adaptation Project.
 *
 * @extends Generator
 */
export default class extends Generator {
    setPromptsCallback: (fn: object) => void;
    private readonly appWizard: AppWizard;
    private readonly vscode: any;
    private readonly toolsLogger: ToolsLogger;

    /**
     * A boolean flag indicating whether node_modules should be installed after project generation.
     */
    private readonly shouldInstallDeps: boolean;
    /**
     * A boolean flag indicating whether an extension project should be created.
     */
    private shouldCreateExtProject: boolean;
    /**
     * Generator prompts.
     */
    private prompts: YeomanUiSteps;
    /**
     * Instance of the logger.
     */
    private logger: ILogWrapper;
    /**
     * Flex layer indicating customer or vendor base.
     */
    private layer: FlexLayer;
    /**
     * Answers collected from configuration prompts.
     */
    private configAnswers: ConfigAnswers;
    /**
     * Project attribute answers.
     */
    private attributeAnswers: AttributesAnswers;
    /**
     * SystemLookup instance for managing system endpoints.
     */
    private systemLookup: SystemLookup;
    /**
     * Instance of the configuration prompter class.
     */
    private prompter: ConfigPrompter;
    /**
     * JSON object representing the complete adaptation project configuration,
     * passed as a CLI argument.
     */
    private readonly jsonInput?: JsonInput;
    /**
     * Instance of AbapServiceProvider.
     */
    private abapProvider: AbapServiceProvider;
    /**
     * Application manifest.
     */
    private manifest: Manifest;
    /**
     * Publicly available UI5 versions.
     */
    private publicVersions: UI5Version;
    /**
     * Indicates if the current layer is based on a customer base.
     */
    private isCustomerBase: boolean;

    /**
     * Creates an instance of the generator.
     *
     * @param {string | string[]} args - The arguments passed to the generator.
     * @param {AdpGeneratorOptions} opts - The options for the generator.
     */
    constructor(args: string | string[], opts: AdpGeneratorOptions) {
        super(args, opts);
        this.appWizard = opts.appWizard ?? AppWizard.create(opts);
        this.shouldInstallDeps = opts.shouldInstallDeps ?? true;
        this.toolsLogger = new ToolsLogger();
        this.vscode = opts.vscode;
        this.options = opts;

        this._setupLogging();
        const jsonInputString = getFirstArgAsString(args);
        this.jsonInput = parseJsonInput(jsonInputString, this.toolsLogger);

        if (!this.jsonInput) {
            initCache(this.logger, this.appWizard);
            this.prompts = new YeomanUiSteps([]);
            this.setPromptsCallback = (fn): void => {
                if (this.prompts) {
                    this.prompts.setCallback(fn);
                }
            };
        }
    }

    async initializing(): Promise<void> {
        await initI18n();

        this.layer = await getFlexLayer();
        this.isCustomerBase = this.layer === FlexLayer.CUSTOMER_BASE;

        this.systemLookup = new SystemLookup(this.toolsLogger);

        if (!this.jsonInput) {
            this.prompts.splice(0, 0, getWizardPages());
            this.prompter = this._getOrCreatePrompter();
        }

        await TelemetryHelper.initTelemetrySettings({
            consumerModule: {
                name: '@sap/generator-fiori:generator-adp',
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });
    }

    async prompting(): Promise<void> {
        if (this.jsonInput) {
            return;
        }

        const isCLI = getHostEnvironment() === hostEnvironment.cli;

        const configQuestions = this.prompter.getPrompts({
            appValidationCli: { hide: !isCLI },
            systemValidationCli: { hide: !isCLI }
        });
        this.configAnswers = await this.prompt<ConfigAnswers>(configQuestions);
        this.shouldCreateExtProject = !!this.configAnswers.shouldCreateExtProject;

        this.logger.info(`System: ${this.configAnswers.system}`);
        this.logger.info(`Application: ${JSON.stringify(this.configAnswers.application, null, 2)}`);

        const { ui5Versions, systemVersion } = this.prompter.ui5;
        const promptConfig = {
            ui5Versions,
            isVersionDetected: !!systemVersion,
            isCloudProject: this.prompter.isCloud,
            layer: this.layer,
            prompts: this.prompts
        };
        const defaultFolder = getDefaultTargetFolder(this.options.vscode) ?? process.cwd();
        const options: AttributePromptOptions = {
            targetFolder: { default: defaultFolder, hide: this.shouldCreateExtProject },
            ui5ValidationCli: { hide: !isCLI },
            enableTypeScript: { hide: this.shouldCreateExtProject }
        };
        const attributesQuestions = getPrompts(this.destinationPath(), promptConfig, options);

        this.attributeAnswers = await this.prompt(attributesQuestions);

        this.logger.info(`Project Attributes: ${JSON.stringify(this.attributeAnswers, null, 2)}`);

        if (this.attributeAnswers?.addFlpConfig) {
            this._callFlpGen();
        }
    }

    async writing(): Promise<void> {
        try {
            if (this.jsonInput) {
                await this._initFromJson();
            }

            if (this.shouldCreateExtProject) {
                await this._generateExtensionProject();
                return;
            }

            const provider = this.jsonInput ? this.abapProvider : this.prompter.provider;
            const publicVersions = this.jsonInput ? this.publicVersions : this.prompter.ui5.publicVersions;
            const manifest = this.jsonInput ? this.manifest : this.prompter.manifest;

            const packageJson = getPackageInfo();
            const config = await getConfig({
                provider,
                configAnswers: this.configAnswers,
                attributeAnswers: this.attributeAnswers,
                systemVersion: this.prompter?.ui5?.systemVersion,
                publicVersions,
                manifest,
                layer: this.layer,
                packageJson,
                logger: this.toolsLogger
            });

            await generate(this._getProjectPath(), config, this.fs);
        } catch (e) {
            this.logger.error(`Writing phase failed: ${e}`);
            throw new Error(t('error.updatingApp'));
        } finally {
            cacheClear(this.appWizard, this.logger);
        }
    }

    async install(): Promise<void> {
        if (!this.shouldInstallDeps || this.shouldCreateExtProject) {
            return;
        }

        try {
            await installDependencies(this._getProjectPath());
        } catch (e) {
            this.logger.error(`Installation of dependencies failed: ${e.message}`);
        } finally {
            cacheClear(this.appWizard, this.logger);
        }
    }

    end(): void {
        const telemetryData =
            TelemetryHelper.createTelemetryData({
                appType: 'generator-adp',
                ...this.options.telemetryData
            }) ?? {};
        if (telemetryData) {
            sendTelemetry(EventName.ADAPTATION_PROJECT_CREATED, telemetryData, this._getProjectPath()).catch(
                (error) => {
                    this.logger.error(t('error.telemetry', { error }));
                }
            );
        }

        try {
            const fsPath = this._getProjectPath();
            if (!isCFEnvironment(fsPath)) {
                this.vscode?.commands?.executeCommand?.('sap.ux.application.info', { fsPath });
            }
        } catch (e) {
            this.appWizard.showError(e.message, MessageType.notification);
        } finally {
            cacheClear(this.appWizard, this.logger);
        }
    }

    private _callFlpGen(): void {
        try {
            this.composeWith(require.resolve('@sap-ux/adp-flp-config-sub-generator/generators/app'), {
                launchAsSubGen: true,
                manifest: this.prompter.manifest,
                system: this.configAnswers.system,
                data: { projectRootPath: this._getProjectPath() },
                appWizard: this.appWizard
            });
            this.logger.info('FLP sub-generator composed.');
        } catch (e) {
            this.logger.error(e);
            throw new Error(`Could not call sub-generator: ${e.message}`);
        }
    }

    private _getOrCreatePrompter(): ConfigPrompter {
        const cached = cacheGet<ConfigPrompter>(this.appWizard, 'prompter', this.logger);
        if (cached) {
            return cached;
        }

        const fresh = new ConfigPrompter(this.systemLookup, this.layer, this.toolsLogger);
        cachePut(this.appWizard, { prompter: fresh }, this.logger);
        return fresh;
    }

    /**
     * Generates an extension project if the application is not supported by Adaptation Project.
     */
    private async _generateExtensionProject(): Promise<void> {
        try {
            const data = await getExtensionProjectData(this.configAnswers, this.attributeAnswers, this.systemLookup);

            const generator = resolveNodeModuleGenerator();
            this.composeWith(generator!, {
                arguments: [JSON.stringify(data)],
                appWizard: this.appWizard
            });
            this.logger.info(`'@bas-dev/generator-extensibility-sub' was called.`);
        } catch (e) {
            this.logger.info(t('error.creatingExtensionProjectError'));
            this.logger.error(e.message);
            this.appWizard.showError(e.message, MessageType.notification);
        }
    }

    /**
     * Combines the target folder and project name.
     *
     * @returns {string} The project path from the answers.
     */
    private _getProjectPath(): string {
        return join(this.attributeAnswers.targetFolder, this.attributeAnswers.projectName);
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
     * Initialize the project generator from a json.
     */
    private async _initFromJson(): Promise<void> {
        if (!this.jsonInput) {
            return;
        }

        const {
            system,
            client,
            username = '',
            password = '',
            application: baseApplicationName,
            applicationTitle,
            targetFolder = '/home/user/projects',
            projectName = getDefaultProjectName(targetFolder, `${baseApplicationName}.variant`),
            namespace = getDefaultNamespace(projectName, this.isCustomerBase)
        } = this.jsonInput;

        await validateJsonInput(this.systemLookup, this.isCustomerBase, {
            projectName,
            targetFolder,
            namespace,
            system
        });

        this.publicVersions = await fetchPublicVersions();

        const providerOptions = {
            system,
            client,
            username,
            password
        };
        this.abapProvider = await getConfiguredProvider(providerOptions, this.toolsLogger);

        const applications = await loadApps(this.abapProvider, this.isCustomerBase);
        const application = applications.find((application) => application.id === baseApplicationName);
        if (!application) {
            throw new Error(t('error.applicationNotFound', { appName: baseApplicationName }));
        }

        const sourceManifest = new SourceManifest(this.abapProvider, application.id);
        this.manifest = await sourceManifest.getManifest();

        this.configAnswers = {
            system,
            username,
            password,
            application
        };

        this.attributeAnswers = {
            projectName,
            title: applicationTitle ?? `${application.title} (variant)`,
            namespace,
            targetFolder,
            // If not provided, latest ui5 version will be used. See getConfig() for a reference.
            ui5Version: '',
            enableTypeScript: false
        };
    }
}

export type { AdpGeneratorOptions };
