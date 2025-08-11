import fs from 'fs';
import { join } from 'path';
import Generator from 'yeoman-generator';
import { AppWizard, MessageType, Prompts as YeomanUiSteps, type IPrompt } from '@sap-devx/yeoman-ui-types';

import type { CFConfig } from '@sap-ux/adp-tooling';
import { getPrompts as getCFLoginPrompts } from './questions/cf-login';
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
    isCFEnvironment,
    getBaseAppInbounds,
    YamlUtils
} from '@sap-ux/adp-tooling';
import { ToolsLogger } from '@sap-ux/logger';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { TelemetryHelper, getDefaultTargetFolder, isCli, sendTelemetry } from '@sap-ux/fiori-generator-shared';

import { getFlexLayer } from './layer';
import { initI18n, t } from '../utils/i18n';
import { EventName } from '../telemetryEvents';
import { setHeaderTitle } from '../utils/opts';
import AdpGeneratorLogger from '../utils/logger';
import { getPrompts } from './questions/attributes';
import { getPrompts as getCFServicesPrompts } from './questions/cf-services';
import { ConfigPrompter } from './questions/configuration';
import { validateJsonInput } from './questions/helper/validators';
import { getPackageInfo, installDependencies } from '../utils/deps';
import { getFirstArgAsString, parseJsonInput } from '../utils/parse-json-input';
import { addDeployGen, addExtProjectGen, addFlpGen } from '../utils/subgenHelpers';
import { cacheClear, cacheGet, cachePut, initCache } from '../utils/appWizardCache';
import { getDefaultNamespace, getDefaultProjectName } from './questions/helper/default-values';
import type { TargetEnvAnswers, CfServicesAnswers } from './types';
import { TargetEnv } from './types';
import { type AdpGeneratorOptions, type AttributePromptOptions, type JsonInput } from './types';
import {
    getWizardPages,
    updateFlpWizardSteps,
    updateWizardSteps,
    getDeployPage,
    updateCfWizardSteps
} from '../utils/steps';
import { existsInWorkspace, showWorkspaceFolderWarning, handleWorkspaceFolderChoice } from '../utils/workspace';
import { FDCService } from '@sap-ux/adp-tooling';
import { getTargetEnvPrompt, getProjectPathPrompt } from './questions/target-env';
import { isAppStudio } from '@sap-ux/btp-utils';

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
     * Base application inbounds, if the base application is an FLP app.
     */
    private baseAppInbounds?: ManifestNamespace.Inbound;
    private readonly fdcService: FDCService;
    private readonly isMtaYamlFound: boolean;
    private targetEnv: TargetEnv;
    private isCfEnv = false;
    private isCFLoggedIn = false;
    private cfConfig: CFConfig;
    private projectLocation: string;
    private cfProjectDestinationPath: string;
    private cfServicesAnswers: CfServicesAnswers;

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
        this.fdcService = new FDCService(this.logger, opts.vscode);
        this.isMtaYamlFound = YamlUtils.isMtaProject(process.cwd());
        this.vscode = opts.vscode;
        this.options = opts;

        this._setupLogging();

        const jsonInputString = getFirstArgAsString(args);
        this.jsonInput = parseJsonInput(jsonInputString, this.logger);

        if (!this.jsonInput) {
            this.env.lookup({
                packagePatterns: ['@sap/generator-fiori', '@sap-ux/adp-flp-config-sub-generator']
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

        if (isAppStudio()) {
            const isCfInstalled = await this.fdcService.isCfInstalled();
            this.logger.info(`isCfInstalled: ${isCfInstalled}`);

            const targetEnvAnswers = await this.prompt<TargetEnvAnswers>([
                getTargetEnvPrompt(this.appWizard, isCfInstalled, this.fdcService)
            ]);
            this.targetEnv = targetEnvAnswers.targetEnv;
            this.isCfEnv = this.targetEnv === TargetEnv.CF;
            this.logger.info(`Target environment: ${this.targetEnv}`);
            updateCfWizardSteps(this.isCfEnv, this.prompts);
        } else {
            this.targetEnv = TargetEnv.ABAP;
        }

        if (!this.isCfEnv) {
            const configQuestions = this.prompter.getPrompts({
                appValidationCli: { hide: !this.isCli },
                systemValidationCli: { hide: !this.isCli }
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
            if (this.prompter.isCloud) {
                this.baseAppInbounds = await getBaseAppInbounds(
                    this.configAnswers.application.id,
                    this.prompter.provider
                );
            }
            const options: AttributePromptOptions = {
                targetFolder: { default: defaultFolder, hide: this.shouldCreateExtProject },
                ui5ValidationCli: { hide: !this.isCli },
                enableTypeScript: { hide: this.shouldCreateExtProject },
                addFlpConfig: { hasBaseAppInbounds: !!this.baseAppInbounds, hide: this.shouldCreateExtProject },
                addDeployConfig: { hide: this.shouldCreateExtProject || !this.isCustomerBase }
            };
            const attributesQuestions = getPrompts(this.destinationPath(), promptConfig, options);

            this.attributeAnswers = await this.prompt(attributesQuestions);

            // Steps need to be updated here to be available after back navigation in Yeoman UI.
            this._updateWizardStepsAfterNavigation();

            this.logger.info(`Project Attributes: ${JSON.stringify(this.attributeAnswers, null, 2)}`);

            if (this.attributeAnswers.addDeployConfig) {
                const client = (await this.systemLookup.getSystemByName(this.configAnswers.system))?.Client;
                addDeployGen(
                    {
                        projectName: this.attributeAnswers.projectName,
                        targetFolder: this.attributeAnswers.targetFolder,
                        connectedSystem: this.configAnswers.system,
                        client
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
                        inbounds: this.baseAppInbounds,
                        layer: this.layer
                    },
                    this.composeWith.bind(this),
                    this.logger,
                    this.appWizard
                );
            }
        } else {
            this.isCFLoggedIn = await this.fdcService.isLoggedIn();

            this._setCFLoginPageDescription(this.isCFLoggedIn);

            await this.prompt(getCFLoginPrompts(this.vscode, this.fdcService, this.isCFLoggedIn));
            this.cfConfig = this.fdcService.getConfig();
            this.isCFLoggedIn = await this.fdcService.isLoggedIn();

            this.logger.log(`Project organization information: ${JSON.stringify(this.cfConfig.org, null, 2)}`);
            this.logger.log(`Project space information: ${JSON.stringify(this.cfConfig.space, null, 2)}`);
            this.logger.log(`Project apiUrl information: ${JSON.stringify(this.cfConfig.url, null, 2)}`);

            if (!this.isMtaYamlFound) {
                const pathAnswers = await this.prompt([
                    getProjectPathPrompt(this.fdcService, this.isCFLoggedIn, this.vscode)
                ]);
                this.projectLocation = pathAnswers.projectLocation;
                this.projectLocation = fs.realpathSync(this.projectLocation, 'utf-8');
                this.cfProjectDestinationPath = this.destinationRoot(this.projectLocation);
                this.logger.log(`Project path information: ${this.projectLocation}`);
            } else {
                this.cfProjectDestinationPath = this.destinationRoot(process.cwd());
                YamlUtils.loadYamlContent(join(this.cfProjectDestinationPath, 'mta.yaml'));
                this.logger.log(`Project path information: ${this.cfProjectDestinationPath}`);
            }

            const options: AttributePromptOptions = {
                targetFolder: { hide: true },
                ui5Version: { hide: true },
                ui5ValidationCli: { hide: true },
                enableTypeScript: { hide: true },
                addFlpConfig: { hide: true },
                addDeployConfig: { hide: true }
            };

            const attributesQuestions = getPrompts(
                this.destinationPath(),
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

            const cfServicesQuestions = await getCFServicesPrompts({
                isCFLoggedIn: this.isCFLoggedIn,
                fdcService: this.fdcService,
                mtaProjectPath: this.cfProjectDestinationPath,
                isInternalUsage: isInternalFeaturesSettingEnabled(),
                logger: this.logger
            });
            this.cfServicesAnswers = await this.prompt<CfServicesAnswers>(cfServicesQuestions);
            this.logger.info(`CF Services Answers: ${JSON.stringify(this.cfServicesAnswers, null, 2)}`);
        }
    }

    private _setCFLoginPageDescription(isLoggedIn: boolean): void {
        const pageLabel = {
            name: 'Login to Cloud Foundry',
            description: isLoggedIn ? '' : 'Provide credentials.'
        };
        this.prompts.splice(1, 1, [pageLabel]);
    }

    async writing(): Promise<void> {
        try {
            if (this.isCfEnv) {
                // Will be removed once CF project generation is supported.
                this.vscode.showInformationMessage('CF project generation is not supported yet.');
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

        if (isCFEnvironment(projectPath) || this.isCli) {
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
                !!this.baseAppInbounds,
                this.prompts,
                this.attributeAnswers.projectName,
                !!this.attributeAnswers.addFlpConfig
            );
        }
    }
}

export type { AdpGeneratorOptions };
