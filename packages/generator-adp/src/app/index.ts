import fs from 'node:fs';
import { join } from 'node:path';
import Generator from 'yeoman-generator';
import { AppWizard, MessageType, Prompts as YeomanUiSteps, type IPrompt } from '@sap-devx/yeoman-ui-types';

import {
    FlexLayer,
    SourceManifest,
    SystemLookup,
    fetchPublicVersions,
    generate,
    generateCf,
    getCfConfig,
    getConfig,
    getConfiguredProvider,
    getYamlContent,
    isCfInstalled,
    isLoggedInCf,
    isMtaProject,
    loadApps,
    loadCfConfig
} from '@sap-ux/adp-tooling';
import {
    TelemetryHelper,
    getDefaultTargetFolder,
    isCli,
    isExtensionInstalled,
    sendTelemetry
} from '@sap-ux/fiori-generator-shared';
import { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import type { CfConfig, CfServicesAnswers, AttributesAnswers, ConfigAnswers, UI5Version } from '@sap-ux/adp-tooling';

import { EventName } from '../telemetryEvents';
import { cacheClear, cacheGet, cachePut, initCache } from '../utils/appWizardCache';
import { getPackageInfo, installDependencies } from '../utils/deps';
import { initI18n, t } from '../utils/i18n';
import AdpGeneratorLogger from '../utils/logger';
import { setHeaderTitle } from '../utils/opts';
import { getFirstArgAsString, parseJsonInput } from '../utils/parse-json-input';
import {
    getDeployPage,
    getWizardPages,
    updateCfWizardSteps,
    updateFlpWizardSteps,
    updateWizardSteps
} from '../utils/steps';
import { addDeployGen, addExtProjectGen, addFlpGen } from '../utils/subgenHelpers';
import { getTemplatesOverwritePath } from '../utils/templates';
import { existsInWorkspace, handleWorkspaceFolderChoice, showWorkspaceFolderWarning } from '../utils/workspace';
import { getFlexLayer } from './layer';
import { getPrompts } from './questions/attributes';
import { CFServicesPrompter } from './questions/cf-services';
import { ConfigPrompter } from './questions/configuration';
import { getDefaultNamespace, getDefaultProjectName } from './questions/helper/default-values';
import { validateJsonInput } from './questions/helper/validators';
import {
    TargetEnv,
    type TargetEnvAnswers,
    type AdpGeneratorOptions,
    type AttributePromptOptions,
    type JsonInput
} from './types';
import { isAppStudio } from '@sap-ux/btp-utils';
import { getProjectPathPrompt, getTargetEnvPrompt } from './questions/target-env';

const generatorTitle = 'Adaptation Project';

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
    private isCli: boolean;

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
    private readonly prompts: YeomanUiSteps;
    /**
     * Instance of the logger.
     */
    private logger: ToolsLogger;
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
     * Instance of the CF services prompter class.
     */
    private cfPrompter: CFServicesPrompter;
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
     * Target environment.
     */
    private targetEnv: TargetEnv;
    /**
     * Indicates if the current environment is a CF environment.
     */
    private isCfEnv = false;
    /**
     * Indicates if the user is logged in to CF.
     */
    private isCfLoggedIn = false;
    /**
     * CF config.
     */
    private cfConfig: CfConfig;
    /**
     * Indicates if the current project is an MTA project.
     */
    private readonly isMtaYamlFound: boolean;
    /**
     * CF services answers.
     */
    private cfServicesAnswers: CfServicesAnswers;
    /**
     * Indicates if the extension is installed.
     */
    private readonly isExtensionInstalled: boolean;
    /**
     * Indicates if CF is installed.
     */
    private cfInstalled: boolean;

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
        this._setupLogging();
        this.options = opts;

        this.isMtaYamlFound = isMtaProject(process.cwd()) as boolean;
        this.isExtensionInstalled = isInternalFeaturesSettingEnabled()
            ? isExtensionInstalled(opts.vscode, 'SAP.adp-ve-bas-ext')
            : false;

        const jsonInputString = getFirstArgAsString(args);
        this.jsonInput = parseJsonInput(jsonInputString, this.logger);

        if (!this.jsonInput) {
            this.env.lookup({
                packagePatterns: ['@sap/generator-fiori', '@bas-dev/generator-extensibility-sub']
            });
            setHeaderTitle(opts, this.logger, generatorTitle);

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

        this.isCli = isCli();
        this.layer = getFlexLayer();
        this.isCustomerBase = this.layer === FlexLayer.CUSTOMER_BASE;
        this.systemLookup = new SystemLookup(this.logger);

        this.cfInstalled = await isCfInstalled(this.logger);
        this.cfConfig = loadCfConfig(this.logger);
        this.isCfLoggedIn = await isLoggedInCf(this.cfConfig, this.logger);
        this.logger.info(`isCfInstalled: ${this.cfInstalled}`);

        const isInternalUsage = isInternalFeaturesSettingEnabled();
        if (!this.jsonInput) {
            const shouldShowTargetEnv = isAppStudio() && this.cfInstalled && this.isExtensionInstalled;
            this.prompts.splice(0, 0, getWizardPages(shouldShowTargetEnv));
            this.prompter = this._getOrCreatePrompter();
            this.cfPrompter = new CFServicesPrompter(isInternalUsage, this.isCfLoggedIn, this.logger);
        }

        await TelemetryHelper.initTelemetrySettings({
            consumerModule: {
                name: '@sap/generator-fiori:generator-adp',
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalUsage,
            watchTelemetrySettingStore: false
        });
    }

    async prompting(): Promise<void> {
        if (this.jsonInput) {
            return;
        }

        await this._determineTargetEnv();

        if (this.isCfEnv) {
            await this._promptForCfEnvironment();
        } else {
            const isExtensibilityExtInstalled = isExtensionInstalled(this.vscode, 'SAP.vscode-bas-extensibility');
            const configQuestions = this.prompter.getPrompts({
                appValidationCli: { hide: !this.isCli },
                systemValidationCli: { hide: !this.isCli },
                shouldCreateExtProject: { isExtensibilityExtInstalled }
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
                ui5ValidationCli: { hide: !this.isCli },
                enableTypeScript: { hide: this.shouldCreateExtProject },
                addFlpConfig: {
                    hasBaseAppInbounds: !!this.prompter.baseAppInbounds,
                    hide: this.shouldCreateExtProject
                },
                addDeployConfig: { hide: this.shouldCreateExtProject || !this.isCustomerBase }
            };
            const attributesQuestions = getPrompts(this.destinationPath(), promptConfig, options);
            this.attributeAnswers = await this.prompt(attributesQuestions);

            // Steps need to be updated here to be available after back navigation in Yeoman UI.
            this._updateWizardStepsAfterNavigation();

            this.logger.info(`Project Attributes: ${JSON.stringify(this.attributeAnswers, null, 2)}`);
            if (this.attributeAnswers.addDeployConfig) {
                const system = await this.systemLookup.getSystemByName(this.configAnswers.system);
                addDeployGen(
                    {
                        projectName: this.attributeAnswers.projectName,
                        projectPath: this.attributeAnswers.targetFolder,
                        connectedSystem: this.configAnswers.system,
                        system
                    },
                    this.composeWith.bind(this),
                    this.logger,
                    this.appWizard
                );
            }

            if (this.attributeAnswers?.addFlpConfig) {
                addFlpGen(
                    {
                        vscode: this.vscode,
                        projectRootPath: this._getProjectPath(),
                        inbounds: this.prompter.baseAppInbounds,
                        layer: this.layer
                    },
                    this.composeWith.bind(this),
                    this.logger,
                    this.appWizard
                );
            }
        }
    }

    async writing(): Promise<void> {
        try {
            if (this.isCfEnv) {
                await this._generateAdpProjectArtifactsCF();
                return;
            }

            if (this.jsonInput) {
                await this._initFromJson();
            }

            if (this.shouldCreateExtProject) {
                await addExtProjectGen(
                    {
                        configAnswers: this.configAnswers,
                        attributeAnswers: this.attributeAnswers,
                        systemLookup: this.systemLookup
                    },
                    this.composeWith.bind(this),
                    this.logger,
                    this.appWizard
                );
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

            if (config.options) {
                config.options.templatePathOverwrite = getTemplatesOverwritePath();
            }

            await generate(this._getProjectPath(), config, this.fs);
        } catch (e) {
            this.logger.error(`Writing phase failed: ${e}`);
            throw new Error(t('error.updatingApp'));
        } finally {
            cacheClear(this.appWizard, this.logger);
        }
    }

    async install(): Promise<void> {
        if (!this.shouldInstallDeps || this.shouldCreateExtProject || this.isCfEnv) {
            return;
        }

        try {
            await installDependencies(this._getProjectPath());
        } catch (e) {
            this.logger.error(`Installation of dependencies failed: ${e.message}`);
        }
    }

    async end(): Promise<void> {
        if (this.shouldCreateExtProject || this.isCfEnv) {
            return;
        }

        const telemetryData =
            TelemetryHelper.createTelemetryData({
                appType: 'generator-adp',
                ...this.options.telemetryData
            }) ?? {};
        const projectPath = this._getProjectPath();
        if (telemetryData) {
            sendTelemetry(EventName.ADAPTATION_PROJECT_CREATED, telemetryData, projectPath).catch((error) => {
                this.logger.error(t('error.telemetry', { error }));
            });
        }

        if (this.isCli) {
            return;
        }

        try {
            if (!existsInWorkspace(this.vscode, projectPath)) {
                const userChoice = await showWorkspaceFolderWarning(this.vscode, projectPath);
                if (!userChoice) {
                    return;
                }
                await handleWorkspaceFolderChoice(this.vscode, projectPath, userChoice);
                return;
            }
            await this.vscode?.commands?.executeCommand?.('sap.ux.application.info', { fsPath: projectPath });
        } catch (e) {
            this.appWizard.showError(e.message, MessageType.notification);
        }
    }

    /**
     * Prompts the user for the CF project path.
     */
    private async _promptForCfProjectPath(): Promise<void> {
        if (this.isMtaYamlFound) {
            const path = this.destinationRoot(process.cwd());
            getYamlContent(join(path, 'mta.yaml'));
            this.logger.log(`Project path information: ${path}`);
        } else {
            const pathAnswers = await this.prompt([getProjectPathPrompt(this.logger, this.vscode)]);
            const path = this.destinationRoot(fs.realpathSync(pathAnswers.projectLocation, 'utf-8'));
            this.logger.log(`Project path information: ${path}`);
        }
    }

    /**
     * Determines the target environment based on the current context.
     * Sets the target environment and updates related state accordingly.
     */
    private async _determineTargetEnv(): Promise<void> {
        const hasRequiredExtensions = this.isExtensionInstalled && this.cfInstalled;

        if (isAppStudio() && hasRequiredExtensions) {
            await this._promptForTargetEnvironment();
        } else {
            this.targetEnv = TargetEnv.ABAP;
        }
    }

    /**
     * Prompts the user to select the target environment and updates related state.
     */
    private async _promptForTargetEnvironment(): Promise<void> {
        const targetEnvAnswers = await this.prompt<TargetEnvAnswers>([
            getTargetEnvPrompt(this.appWizard, this.cfInstalled, this.isCfLoggedIn, this.cfConfig, this.vscode)
        ]);

        this.targetEnv = targetEnvAnswers.targetEnv;
        this.isCfEnv = this.targetEnv === TargetEnv.CF;
        this.logger.info(`Target environment: ${this.targetEnv}`);

        updateCfWizardSteps(this.isCfEnv, this.prompts);

        this.logger.log(`Project organization information: ${JSON.stringify(this.cfConfig.org, null, 2)}`);
        this.logger.log(`Project space information: ${JSON.stringify(this.cfConfig.space, null, 2)}`);
        this.logger.log(`Project apiUrl information: ${JSON.stringify(this.cfConfig.url, null, 2)}`);
    }

    /**
     * Prompts the user for the CF environment.
     */
    private async _promptForCfEnvironment(): Promise<void> {
        await this._promptForCfProjectPath();

        const options: AttributePromptOptions = {
            targetFolder: { hide: true },
            ui5Version: { hide: true },
            ui5ValidationCli: { hide: true },
            enableTypeScript: { hide: true },
            addFlpConfig: { hide: true },
            addDeployConfig: { hide: true }
        };

        const projectPath = this.destinationPath();
        const attributesQuestions = getPrompts(
            projectPath,
            {
                ui5Versions: [],
                isVersionDetected: false,
                isCloudProject: false,
                layer: this.layer,
                prompts: this.prompts,
                isCfEnv: true
            },
            options
        );

        this.attributeAnswers = await this.prompt(attributesQuestions);
        this.logger.info(`Project Attributes: ${JSON.stringify(this.attributeAnswers, null, 2)}`);

        const cfServicesQuestions = await this.cfPrompter.getPrompts(projectPath, this.cfConfig);
        this.cfServicesAnswers = await this.prompt<CfServicesAnswers>(cfServicesQuestions);
        this.logger.info(`CF Services Answers: ${JSON.stringify(this.cfServicesAnswers, null, 2)}`);
    }

    /**
     * Retrieves the ConfigPrompter instance from cache if it exists, otherwise creates a new instance.
     *
     * @returns {ConfigPrompter} Cached config prompter if going back a page.
     */
    private _getOrCreatePrompter(): ConfigPrompter {
        const cached = cacheGet<ConfigPrompter>(this.appWizard, 'prompter', this.logger);
        if (cached) {
            return cached;
        }

        const prompter = new ConfigPrompter(this.systemLookup, this.layer, this.logger);
        cachePut(this.appWizard, { prompter }, this.logger);
        return prompter;
    }

    /**
     * Generates the ADP project artifacts for the CF environment.
     */
    private async _generateAdpProjectArtifactsCF(): Promise<void> {
        const projectPath = this.isMtaYamlFound ? process.cwd() : this.destinationPath();
        const publicVersions = await fetchPublicVersions(this.logger);

        const manifest = this.cfPrompter.manifest;
        if (!manifest) {
            throw new Error('Manifest not found for base app.');
        }

        const html5RepoRuntimeGuid = this.cfPrompter.serviceInstanceGuid;
        const config = getCfConfig({
            attributeAnswers: this.attributeAnswers,
            cfServicesAnswers: this.cfServicesAnswers,
            cfConfig: this.cfConfig,
            layer: this.layer,
            manifest,
            html5RepoRuntimeGuid,
            projectPath,
            publicVersions
        });

        if (config.options) {
            config.options.templatePathOverwrite = getTemplatesOverwritePath();
        }

        await generateCf(projectPath, config, this.logger, this.fs);
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
        AdpGeneratorLogger.configureLogging(
            this.options.logger,
            this.rootGeneratorName(),
            this.log,
            this.options.vscode,
            this.options.logLevel,
            this.options.logWrapper
        );
        this.logger = AdpGeneratorLogger.logger as unknown as ToolsLogger;
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

        this.publicVersions = await fetchPublicVersions(this.logger);

        const providerOptions = {
            system,
            client,
            username,
            password
        };
        this.abapProvider = await getConfiguredProvider(providerOptions, this.logger);

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

    /**
     * Updates the FLP wizard steps in the prompt sequence if the FLP configuration page(s) does not already exist.
     *
     */
    private _updateWizardStepsAfterNavigation(): void {
        const pages: IPrompt[] = this.prompts['items'];
        const flpPagesExist = pages.some((p) => p.name === t('yuiNavSteps.flpConfigName'));
        const deployPageExists = pages.some((p) => p.name === t('yuiNavSteps.deployConfigName'));

        if (!deployPageExists) {
            updateWizardSteps(
                this.prompts,
                getDeployPage(),
                t('yuiNavSteps.projectAttributesName'),
                this.attributeAnswers.addDeployConfig
            );
        }

        if (!flpPagesExist) {
            updateFlpWizardSteps(
                !!this.prompter.baseAppInbounds,
                this.prompts,
                this.attributeAnswers.projectName,
                !!this.attributeAnswers.addFlpConfig
            );
        }
    }
}

export type { AdpGeneratorOptions };
