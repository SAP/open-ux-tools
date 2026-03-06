import { type AppWizard, MessageType, type Prompts as YeomanUiSteps } from '@sap-devx/yeoman-ui-types';
import { isAppStudio } from '@sap-ux/btp-utils';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import {
    type FioriElementsApp,
    generate as generateFioriElementsApp,
    type TemplateType as TemplateTypeFE
} from '@sap-ux/fiori-elements-writer';
import { type FreestyleApp, generate as generateFioriFreestyleApp } from '@sap-ux/fiori-freestyle-writer';
import type { BasicAppSettings } from '@sap-ux/fiori-freestyle-writer/dist/types';
import {
    DefaultLogger,
    getHostEnvironment,
    hostEnvironment,
    type ILogWrapper,
    sendTelemetry,
    TelemetryHelper,
    getFlpId
} from '@sap-ux/fiori-generator-shared';
import type { Logger } from '@sap-ux/logger';
import type { EntityRelatedAnswers } from '@sap-ux/odata-service-inquirer';
import { DatasourceType, getEntityRelatedPrompts } from '@sap-ux/odata-service-inquirer';
import { initTelemetrySettings } from '@sap-ux/telemetry';
import type { UI5ApplicationAnswers } from '@sap-ux/ui5-application-inquirer';
import { getUI5Versions, latestVersionString, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';
import { join } from 'node:path';
import type { Adapter } from 'yeoman-environment';
import Generator from 'yeoman-generator';
import type { FioriStep, Service, State, YeomanUiStepConfig } from '../types';
import {
    defaultNavActionDisplay,
    defaultNavActionTile,
    FIORI_STEPS,
    FloorplanFF,
    generatorName,
    STEP_DATASOURCE_AND_SERVICE,
    STEP_DEPLOY_CONFIG,
    STEP_FLP_CONFIG,
    STEP_PROJECT_ATTRIBUTES,
    FloorplanFE
} from '../types';
import {
    addToCache,
    deleteCache,
    getAppId,
    getCdsUi5PluginInfo,
    getFromCache,
    getRequiredOdataVersion,
    getTelemetryBusinessHubType,
    getTelemetrySapSystemType,
    hasActiveStep,
    hasStep,
    initAppWizardCache,
    initI18nFioriAppSubGenerator,
    restoreServiceProviderLoggers,
    t,
    updateDependentStep
} from '../utils';
import { runPostGenerationTasks } from './end';
import type { FioriAppGeneratorOptions } from './fioriAppGeneratorOptions';
import { installDependencies } from './install';
import {
    getViewQuestion,
    type OdataServiceInquirerOptions,
    promptOdataServiceAnswers,
    promptUI5ApplicationAnswers,
    type ViewNameAnswer
} from './prompting';
import { addDeployGen, addFlpGen } from './subgenHelpers';
import { getTemplateType, transformState } from './transforms';
import { writeAppGenInfoFiles, writeAPIHubKeyFiles } from './writing';

export const APP_GENERATOR_MODULE = '@sap/generator-fiori';

/**
 * The root generator for Fiori Elements and Fiori Freestyle generators.
 * All common functionality is implemented here.
 */
export class FioriAppGenerator extends Generator {
    private readonly vscode: unknown;
    // Performance measurement
    private generationTime0: number; // start of writing phase millisecond timestamp
    private appWizard: AppWizard | undefined;

    protected state: State;
    // The logger is static to allow convenient access from everywhere, cross-cutting concern
    private static _logger: ILogWrapper & Logger = DefaultLogger;
    // Generator name for use in telemetry, readmes etc.
    protected generatorVersion = this.rootGeneratorVersion();

    // The configuration of steps in YUI and their interdependence
    private yeomanUiStepConfig: YeomanUiStepConfig;
    private readonly setPromptsCallback: (fn: any) => void;
    private prompts: YeomanUiSteps;
    protected fioriSteps: FioriStep[];

    /**
     *
     * @param args
     * @param opts
     */
    constructor(args: string | string[], opts: FioriAppGeneratorOptions) {
        super(args, opts, {
            unique: 'namespace'
        });
        this.vscode = opts['vscode'];

        FioriAppGenerator._logger = this.options.logWrapper ?? DefaultLogger;
        // Init the generator state
        this.state = opts.state ?? ({ project: {}, service: {} } as State);
    }

    /**
     * Static getter for the logger.
     *
     * @returns {ILogWrapper & Logger}
     */
    public static get logger(): ILogWrapper & Logger {
        return FioriAppGenerator._logger;
    }

    async initializing(): Promise<void> {
        // Ensure i18n bundles are loaded, default loading is unreliable
        await initI18nFioriAppSubGenerator();
        // When running in YUI context back navigation is supported and state may be cached.
        if (this.options.appWizard) {
            this.appWizard = this.options.appWizard;
            initAppWizardCache(FioriAppGenerator._logger, this.options.appWizard as AppWizard);
        }

        await initTelemetrySettings({
            consumerModule: { name: APP_GENERATOR_MODULE, version: this.rootGeneratorVersion() },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });

        TelemetryHelper.createTelemetryData({
            ...this.options.telemetryData
        });

        /**
         * Preloading UI5 versions to be retreived from cache later in generation flow
         * Not required when version is already in project state e.g S4
         */
        if (!this.state.project?.ui5Version) {
            const filterOptions: UI5VersionFilterOptions = {
                useCache: true
            };
            // do not await as this is pre-loading the cache
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            getUI5Versions(filterOptions);
        }

        // Floorplans, externally configured either via adapters or headless config
        if (this.options.floorplan) {
            this.state.floorplan = this.options.floorplan;
        }

        // Configuration of steps in YUI and their interdependance
        this.fioriSteps = this.options.fioriSteps ?? FIORI_STEPS;
        this.yeomanUiStepConfig = this.options.yeomanUiStepConfig;
        this.prompts = this.yeomanUiStepConfig?.activeSteps;
    }

    async prompting(): Promise<void> {
        try {
            const generatorOptions: FioriAppGeneratorOptions = this.options;
            const isFioriFreestyleTemplate = this.state.floorplan === FloorplanFF.FF_SIMPLE;
            if (hasStep(this.fioriSteps, STEP_DATASOURCE_AND_SERVICE)) {
                const cachedService = getFromCache<Service>(this.appWizard, 'service', FioriAppGenerator.logger);

                restoreServiceProviderLoggers(
                    FioriAppGenerator.logger as Logger,
                    cachedService?.connectedSystem?.serviceProvider
                );
                const options: OdataServiceInquirerOptions = {
                    capService: cachedService?.capService ?? this.state.service?.capService,
                    requiredOdataVersion: getRequiredOdataVersion(this.state.floorplan),
                    allowNoDatasource: isFioriFreestyleTemplate,
                    promptOptions: generatorOptions.promptSettings?.['@sap/generator-fiori'],
                    showCollabDraftWarning: generatorOptions.showCollabDraftWarning,
                    workspaceFolders: generatorOptions.workspaceFolders
                };
                let serviceAnswers = await promptOdataServiceAnswers(
                    options,
                    FioriAppGenerator.logger as Logger,
                    this.env.adapter as unknown as Adapter,
                    cachedService?.connectedSystem
                );
                /** Back button handling */
                // Persist derived state to facilitate backwards navigation
                if (getHostEnvironment() !== hostEnvironment.cli) {
                    if (serviceAnswers.source === DatasourceType.none || serviceAnswers.edmx) {
                        // When navigating back YUI re-applies the answers from the previous steps up to the current step, however on Windows it removes some required properties
                        // of the service answers property: `ConnectedSystem`, so we need to re-apply them from our own cache.
                        if (
                            cachedService?.connectedSystem &&
                            JSON.stringify(serviceAnswers.connectedSystem?.backendSystem) ===
                                JSON.stringify(cachedService?.connectedSystem?.backendSystem)
                        ) {
                            serviceAnswers.connectedSystem = cachedService?.connectedSystem;
                        }
                        addToCache(this.appWizard, { service: serviceAnswers }, FioriAppGenerator.logger);
                    } else {
                        serviceAnswers =
                            getFromCache(this.appWizard, 'service', FioriAppGenerator.logger) ?? serviceAnswers;
                    }
                    if (!(serviceAnswers.source === DatasourceType.none || serviceAnswers.edmx)) {
                        FioriAppGenerator.logger?.error(t('error.fatalError'));
                    }
                }

                restoreServiceProviderLoggers(
                    FioriAppGenerator.logger as Logger,
                    serviceAnswers?.connectedSystem?.serviceProvider
                );
                /** END: Back button temp fix */
                this.state.service = { ...this.state?.service, ...serviceAnswers };
            }

            // Freestyle templates require a view name
            if (isFioriFreestyleTemplate) {
                const viewNameAnswer: ViewNameAnswer = await this.prompt([getViewQuestion()]);
                this.state.viewName = viewNameAnswer.viewName;
            } else if (this.state.service.edmx) {
                // Fiori Elements templates require entity and related settings
                const templateType = getTemplateType(this.state.floorplan) as TemplateTypeFE;
                const promptOptions = {
                    defaultMainEntityName: generatorOptions.preselectedEntityName,
                    useAutoComplete: getHostEnvironment() === hostEnvironment.cli,
                    hideTableLayoutPrompts: generatorOptions.showLayoutPrompts === false, // Defaults to show layout prompts
                    ...(templateType === FloorplanFE.FE_FPM && { displayPageBuildingBlockPrompt: true }) // If templateType is FPM, add displayPageBuildingBlockPrompt to promptOptions
                };

                const entityQuestions = getEntityRelatedPrompts(
                    this.state.service.edmx,
                    templateType,
                    !!this.state.service.capService,
                    promptOptions,
                    this.state.service.annotations?.[0],
                    FioriAppGenerator.logger as Logger,
                    getHostEnvironment() !== hostEnvironment.cli
                );
                const entityRelatedAnswers: EntityRelatedAnswers = await this.prompt(entityQuestions);
                // Some state may have been assigned by adaptors, and then certain prompts hidden, so we must merge the answers
                this.state.entityRelatedConfig = Object.assign(
                    this.state.entityRelatedConfig ?? {},
                    entityRelatedAnswers
                );
            } else {
                // Not Freestyle and no entity related config is an error and we cannot proceed
                FioriAppGenerator.logger.error(t('error.edmxNotFound'));
                this._exitOnError(t('error.edmxNotFound'));
            }

            // Pre-load the CAP project and get all relevant info in one call,
            // this prevents re-reading from disc and parsing multiple times later
            if (this.state.service.capService && !this.state.service.capService.cdsUi5PluginInfo) {
                this.state.service.capService.cdsUi5PluginInfo = await getCdsUi5PluginInfo(
                    this.state.service.capService.projectPath,
                    this.fs,
                    this.state.service.capService.cdsVersionInfo
                );
            }
            // get project information
            if (hasStep(this.fioriSteps, STEP_PROJECT_ATTRIBUTES)) {
                const {
                    ui5AppAnswers,
                    localUI5Version
                }: { ui5AppAnswers: UI5ApplicationAnswers; localUI5Version?: string } =
                    await promptUI5ApplicationAnswers(
                        {
                            projectName: this.state.project?.name,
                            targetFolder: this.state.project?.targetFolder,
                            service: this.state.service,
                            entityRelatedConfig: this.state.entityRelatedConfig,
                            floorplan: this.state.floorplan,
                            promptSettings: generatorOptions.promptSettings?.['@sap/generator-fiori'],
                            promptExtension: generatorOptions.extensions
                        },
                        [this.yeomanUiStepConfig],
                        this.env.adapter as unknown as Adapter
                    );
                this.state.project = Object.assign(this.state.project ?? {}, ui5AppAnswers, {
                    ui5Version: ui5AppAnswers?.ui5Version || localUI5Version,
                    localUI5Version
                });
                // Some extensions may reference this before the writing phase where normally the flpAppId is set
                this.state.project.flpAppId = getFlpId(
                    getAppId(this.state.project.name, ui5AppAnswers.namespace ?? ''),
                    this.state.floorplan === FloorplanFF.FF_SIMPLE ? defaultNavActionDisplay : defaultNavActionTile
                );
            }

            if (this.state.project?.addDeployConfig) {
                // Allows back nav where we have iinterdependent steps
                // Re-add dependant steps on back nav
                if (
                    hasStep(this.fioriSteps, STEP_DEPLOY_CONFIG) &&
                    !hasActiveStep(t('steps.deployConfig.title'), this.yeomanUiStepConfig.activeSteps)
                ) {
                    updateDependentStep(
                        t('steps.projectAttributesConfig.title'),
                        [this.yeomanUiStepConfig],
                        true,
                        t('steps.deployConfig.title')
                    );
                }
                await addDeployGen(
                    {
                        service: this.state.service,
                        projectName: this.state.project.name,
                        targetFolder: this.state.project.targetFolder,
                        applicationType: this.state.floorplan === FloorplanFF.FF_SIMPLE ? 'FF' : 'FE' // Telemetry data
                    },
                    this.composeWith.bind(this),
                    FioriAppGenerator.logger,
                    this.appWizard,
                    generatorOptions.promptSettings?.['@sap-ux/deploy-config-sub-generator']
                );
            }

            if (this.state.project?.addFlpConfig) {
                // Allows back nav where we have interdependent steps
                // Re-add dependant steps on back nav
                if (
                    hasStep(this.fioriSteps, STEP_FLP_CONFIG) &&
                    !hasActiveStep(t('steps.flpConfig.title'), this.yeomanUiStepConfig.activeSteps)
                ) {
                    updateDependentStep(
                        t('steps.projectAttributesConfig.title'),
                        [this.yeomanUiStepConfig],
                        true,
                        t('steps.flpConfig.title')
                    );
                }
                await addFlpGen(
                    {
                        projectName: this.state.project.name,
                        targetFolder: this.state.project.targetFolder,
                        title: this.state.project.title,
                        skipPrompt: !hasStep(this.fioriSteps, STEP_FLP_CONFIG)
                    },
                    this.composeWith.bind(this),
                    FioriAppGenerator.logger,
                    generatorOptions.vscode,
                    this.appWizard,
                    generatorOptions.promptSettings?.['@sap-ux/flp-config-sub-generator']
                );
            }
        } catch (error) {
            // Fatal prompting error
            FioriAppGenerator.logger.error(`${t('error.fatalError')} : ${error}`);
            this._exitOnError(error);
        }
    }

    async writing(): Promise<void> {
        try {
            this.generationTime0 = performance.now();
            TelemetryHelper.markAppGenStartTime();
            const { service, project, floorplan } = this.state;
            FioriAppGenerator.logger.info(
                t('logMessages.copyingTemplateFiles', { templateName: this.state.floorplan })
            );

            // Set the template folder
            // this.sourceRoot(join(__dirname, '..', '..', 'templates')); // Path must match webpacked template paths
            const destRoot = this.destinationRoot(join(project.targetFolder, project.name));

            const t1 = performance.now();
            let appConfig: FioriElementsApp<unknown> | FreestyleApp<BasicAppSettings> | undefined;

            // Determine which type of app to generate based on the selected floorplan (template type)
            if (this.state.floorplan === FloorplanFF.FF_SIMPLE) {
                const ffApp = await transformState<FreestyleApp<BasicAppSettings>>(
                    this.state,
                    !!service.capService || this.options.generateIndexHtml
                );
                await generateFioriFreestyleApp(destRoot, ffApp, this.fs);
                appConfig = ffApp;
            } else {
                const feApp = await transformState<FioriElementsApp<{}>>(
                    this.state,
                    !!service.capService || this.options.generateIndexHtml
                );
                await generateFioriElementsApp(destRoot, feApp, this.fs);
                appConfig = feApp;
            }

            const t2 = performance.now();
            FioriAppGenerator.logger.debug(
                `Writing Fiori application files from template took ${Math.round(t2 - t1)} milliseconds.`
            );

            TelemetryHelper.createTelemetryData({
                Template: t(`floorplans.label.${floorplan}`, {
                    odataVersion: service.version
                }),
                DataSource: service.source,
                UI5Version: project.ui5Version || latestVersionString,
                Theme: project.ui5Theme,
                AppGenVersion: this.generatorVersion,
                AppGenSourceType: service.source,
                AppGenSapSystemType:
                    service.source === DatasourceType.sapSystem && service.connectedSystem
                        ? getTelemetrySapSystemType(service.connectedSystem)
                        : 'n/a',
                AppGenBusinessHubType: getTelemetryBusinessHubType(service.apiHubConfig?.apiHubType),
                EnableEslint: project.enableEslint,
                EnableTypeScript: project.enableTypeScript,
                EnableVirtualEndpoints: project.enableVirtualEndpoints,
                ToolsId: appConfig.app.sourceTemplate?.toolsId,
                ValueHelpCount: service.valueListMetadata?.length ?? 0
            });

            if (service.apiHubConfig && isAppStudio()) {
                writeAPIHubKeyFiles(this.fs, destRoot, service.apiHubConfig);
            }

            // Write after app, using values from the transformed state so defaults have been applied
            const readMeUpdated = { ui5Version: appConfig.ui5?.minUI5Version };
            await writeAppGenInfoFiles(
                this.state,
                generatorName,
                this.generatorVersion,
                destRoot,
                this.fs,
                readMeUpdated
            );
        } catch (error) {
            FioriAppGenerator.logger.fatal(`${t('error.errorWritingApplicationFiles')} : ${error}`);
            this._exitOnError(error);
        }
    }

    async install(): Promise<void> {
        if (!this.options.skipInstall) {
            await installDependencies(
                {
                    appPackagePath: this.destinationPath(),
                    capService: this.state.service.capService,
                    // Assumption that npm workspaces will be enabled if cds ui5 plugin is a depenedency
                    useNpmWorkspaces: !!(
                        this.state.project.enableTypeScript || // If typescript is enabled, it is required that the CAP project will be updated to use NPM workspaces
                        this.state.service.capService?.cdsUi5PluginInfo?.isCdsUi5PluginEnabled ||
                        this.state.service.capService?.cdsUi5PluginInfo?.hasCdsUi5Plugin ||
                        this.state.service.capService?.cdsUi5PluginInfo?.isWorkspaceEnabled
                    ),
                    ui5Version: this.state.project?.ui5Version
                },
                FioriAppGenerator.logger
            );
        } else {
            FioriAppGenerator.logger.info(t('logMessages.installSkippedOptionSpecified'));
        }
    }

    async end(): Promise<void> {
        deleteCache(this.appWizard, FioriAppGenerator.logger);

        await runPostGenerationTasks(
            {
                service: {
                    backendSystem: this.state.service.connectedSystem?.backendSystem,
                    capService: this.state.service.capService,
                    sapClient: this.state.service.client,
                    odataVersion: this.state.service.version,
                    datasourceType: this.state.service.source
                },
                project: {
                    targetFolder: this.state.project.targetFolder,
                    name: this.state.project.name,
                    flpAppId: this.state.project.flpAppId,
                    enableVirtualEndpoints: this.state.project.enableVirtualEndpoints
                }
            },
            this.fs,
            FioriAppGenerator.logger,
            this.vscode,
            this.appWizard,
            this.options.followUpCommand
        );

        const generationTime02 = performance.now();
        FioriAppGenerator.logger.info(
            `Total time taken: ${Math.round((generationTime02 - this.generationTime0) / 1000)} seconds.`
        );
    }

    /**
     *
     * @param error
     */
    private _exitOnError(error: string): void {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        sendTelemetry('GENERATION_WRITING_FAIL', TelemetryHelper.telemetryData);
        if (getHostEnvironment() !== hostEnvironment.cli) {
            this.appWizard?.showError(`${t('error.fatalError')} : ${error}`, MessageType.notification);
        }
        throw new Error(`${t('error.fatalError')} : ${error}`);
    }
}
