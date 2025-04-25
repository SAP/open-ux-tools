import { join } from 'path';
import Generator from 'yeoman-generator';
import { AppWizard, Prompts } from '@sap-devx/yeoman-ui-types';

import {
    TelemetryHelper,
    sendTelemetry,
    type ILogWrapper,
    getHostEnvironment,
    hostEnvironment,
    getDefaultTargetFolder
} from '@sap-ux/fiori-generator-shared';
import { ToolsLogger } from '@sap-ux/logger';
import {
    SystemLookup,
    fetchPublicVersions,
    generate,
    getConfig,
    getConfiguredProvider,
    loadApps,
    type UI5Version
} from '@sap-ux/adp-tooling';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { type AttributesAnswers, type ConfigAnswers, FlexLayer } from '@sap-ux/adp-tooling';

import { getFlexLayer } from './layer';
import { t, initI18n } from '../utils/i18n';
import { EventName } from '../telemetryEvents';
import AdpFlpConfigLogger from '../utils/logger';
import { getPrompts } from './questions/attributes';
import { ConfigPrompter } from './questions/configuration';
import { getPackageInfo, installDependencies } from '../utils/deps';
import type { AdpGeneratorOptions, AttributePromptOptions } from './types';
import { getFirstArgAsString, parseJsonInput } from '../utils/parse-json-arg';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { getDefaultNamespace, getDefaultProjectName } from './questions/helper/default-values';
import { validateNamespaceAdp, validateProjectName } from '@sap-ux/project-input-validator';
import { isString } from '../utils/type-guards';

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
     * Generator prompts.
     */
    private prompts: Prompts;
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
    private jsonInput?: Record<string, string>;
    /**
     * Instance of AbapServiceProvider.
     */
    private abapProvider: AbapServiceProvider;
    /**
     * Publicly available UI5 versions.
     */
    private publicVersions: UI5Version;
    /**
     * @returns true if the current layer is based on a customer base.
     */
    private get isCustomerBase(): boolean {
        return this.layer === FlexLayer.CUSTOMER_BASE;
    }

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
        this.jsonInput = parseJsonInput(jsonInputString);
        if (!this.jsonInput) {
            this._setupPrompts();
        }
    }

    async initializing(): Promise<void> {
        await initI18n();

        this.layer = await getFlexLayer();

        this.systemLookup = new SystemLookup(this.toolsLogger);

        if (!this.jsonInput) {
            const pages = [
                { name: t('yuiNavSteps.configurationName'), description: t('yuiNavSteps.configurationDescr') },
                { name: t('yuiNavSteps.projectAttributesName'), description: t('yuiNavSteps.projectAttributesDescr') }
            ];
            this.prompts.splice(0, 0, pages);

            this.prompter = new ConfigPrompter(this.systemLookup, this.layer, this.toolsLogger);
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

        this.logger.info(`System: ${this.configAnswers.system}`);
        this.logger.info(`Application: ${JSON.stringify(this.configAnswers.application, null, 2)}`);

        const { ui5Versions, systemVersion } = this.prompter.ui5;
        const promptConfig = {
            ui5Versions,
            isVersionDetected: !!systemVersion,
            isCloudProject: this.prompter.isCloud,
            layer: this.layer
        };
        const defaultFolder = getDefaultTargetFolder(this.options.vscode) ?? process.cwd();
        const options: AttributePromptOptions = {
            targetFolder: { default: defaultFolder },
            ui5ValidationCli: { hide: !isCLI }
        };
        const attributesQuestions = getPrompts(this.destinationPath(), promptConfig, options);

        this.attributeAnswers = await this.prompt(attributesQuestions);

        this.logger.info(`Project Attributes: ${JSON.stringify(this.attributeAnswers, null, 2)}`);
    }

    async writing(): Promise<void> {
        if (this.jsonInput) {
            await this._initFromJson();
        }

        try {
            const packageJson = getPackageInfo();
            const config = await getConfig({
                provider: this._getProvider(),
                configAnswers: this.configAnswers,
                attributeAnswers: this.attributeAnswers,
                publicVersions: this._getPublicVersions(),
                layer: this.layer,
                packageJson,
                logger: this.toolsLogger
            });

            await generate(this._getProjectPath(), config, this.fs);
        } catch (e) {
            this.logger.error(`Writing phase failed: ${e}`);
            throw new Error(t('error.updatingApp'));
        }
    }

    async install(): Promise<void> {
        try {
            if (this.shouldInstallDeps) {
                await installDependencies(this._getProjectPath());
            }
        } catch (e) {
            this.logger.error(`Installation of dependencies failed: ${e.message}`);
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
     * Sets up the prompts for the generator.
     */
    private _setupPrompts(): void {
        this.prompts = new Prompts([]);
        this.setPromptsCallback = (fn): void => {
            if (this.prompts) {
                this.prompts.setCallback(fn);
            }
        };
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
            // System config
            system,
            client,
            username,
            password,
            // Application config
            application: baseApplicationName,
            applicationTitle,
            applicationComponentHierarchy = '',
            targetFolder = '/home/user/projects',
            projectName = getDefaultProjectName(targetFolder, `${baseApplicationName}.variant`),
            namespace = getDefaultNamespace(projectName, this.isCustomerBase)
        } = this.jsonInput;

        await this._validateJsonInput({
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

        this.configAnswers = {
            system,
            username,
            password,
            application,
            applicationComponentHierarchy
        };

        this.attributeAnswers = {
            projectName,
            title: applicationTitle || `${application.title} (variant)`,
            namespace,
            targetFolder,
            // If not provided, latest ui5 version will be used. See getConfig() for a reference.
            ui5Version: '',
            enableTypeScript: false
        };
    }

    /**
     * Validates the json input containing project configuration.
     *
     * @param param Object containing values from the json input being validated.
     * @param param.projectName The name of the project.
     * @param param.targetFolder The name of the folder.
     * @param param.namespace The project namespace.
     * @param param.system The system name.
     */
    private async _validateJsonInput({
        projectName,
        targetFolder,
        namespace,
        system
    }: {
        projectName: string;
        targetFolder: string;
        namespace: string;
        system: string;
    }): Promise<void> {
        let validationResult = validateProjectName(projectName, targetFolder, this.isCustomerBase);
        if (isString(validationResult)) {
            throw new Error(validationResult);
        }

        validationResult = validateNamespaceAdp(namespace, projectName, this.isCustomerBase);
        if (isString(validationResult)) {
            throw new Error(validationResult);
        }

        const systemEndpoint = await this.systemLookup.getSystemByName(system);
        if (!systemEndpoint) {
            throw new Error(t('error.systemNotFound', { systemName: system }));
        }
    }

    /**
     * @returns The instance of the abap service provider.
     */
    private _getProvider(): AbapServiceProvider {
        if (this.jsonInput) {
            return this.abapProvider;
        }
        return this.prompter.provider;
    }

    /**
     * @returns The ui5 public versions info.
     */
    private _getPublicVersions(): UI5Version {
        if (this.jsonInput) {
            return this.publicVersions;
        }
        return this.prompter.ui5.publicVersions;
    }
}

export type { AdpGeneratorOptions };
