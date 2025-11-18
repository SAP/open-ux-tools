import { type AppWizard, MessageType, Prompts } from '@sap-devx/yeoman-ui-types';
import {
    DefaultLogger,
    getHostEnvironment,
    hostEnvironment,
    ILogWrapper,
    LogWrapper
} from '@sap-ux/fiori-generator-shared';
import type { Logger } from '@sap-ux/logger';
import type { IVSCodeExtLogger, LogLevel } from '@vscode-logging/logger';
import Generator, { GeneratorOptions } from 'yeoman-generator';
import {
    getODataDownloaderPrompts,
    promptNames,
    SelectedEntityAnswerAsJSONString,
    type SelectedEntityAnswer
} from './prompts';
import { PromptFunction } from 'inquirer';
import { type ODataService } from '@sap-ux/axios-extension';
import { DirName, getMockServerConfig } from '@sap-ux/project-access';
import { join } from 'path';
import { fetchData } from './odataQuery';
import { convertODataResultToEntityFileData } from './utils';
import { t } from '../utils/i18n';
import { type ReferencedEntities } from './types';

export const APP_GENERATOR_MODULE = '@sap/generator-fiori';

/**
 * The root generator for Fiori Elements and Fiori Freestyle generators.
 * All common functionality is implemented here.
 */
export class ODataDownloadGenerator extends Generator {
    private readonly vscode: unknown;
    // Performance measurement
    private generationTime0: number; // start of writing phase millisecond timestamp
    private appWizard: AppWizard | undefined;

    // The logger is static to allow convenient access from everywhere, cross-cutting concern
    private static _logger: ILogWrapper & Logger = DefaultLogger;
    // Generator name for use in telemetry, readmes etc.
    protected generatorVersion = this.rootGeneratorVersion();
    prompts: Prompts;
    setPromptsCallback: (fn: object) => void;

    private state: {
        /**
         * The root path to the application being used as the data source
         */
        appRootPath?: string;
        /**
         * Root disk path for mockdata
         */
        mockDataRootPath?: string;
        /**
         * The application referenced entities used as the roots for data download
         */
        appEntities?: ReferencedEntities;
        /**
         * User selected entities
         */
        selectedEntities?: SelectedEntityAnswer[];
        /**
         * The downloaded entity data as JSON
         */
        entityData?: object;
    } = {};

    /**
     *
     * @param args
     * @param opts
     */
    constructor(args: string | string[], opts: GeneratorOptions) {
        super(args, opts, {
            unique: 'namespace'
        });
        // @ts-ignore - available types are not up-to-date
        if (this.env.conflicter) {
            // @ts-ignore
            this.env.conflicter.force = true;
        }
        this.options.force = true;

        this.prompts = new Prompts([
            {
                description: 'Download data from an OData service for use with the UX Tools Mockdata Server',
                name: 'OData Downloader'
            } /* , {
            description: 'Entity selection for data download',
            name: 'Entity Selection'
        } */
        ]);

        this.setPromptsCallback = (fn): void => {
            if (this.prompts) {
                this.prompts.setCallback(fn);
            }
        };
    }

    /**
     * Static getter for the logger.
     *
     * @returns {ILogWrapper & Logger}
     */
    public static get logger(): ILogWrapper & Logger {
        return ODataDownloadGenerator._logger;
    }

    async initializing(): Promise<void> {
        // Ensure i18n bundles are loaded, default loading is unreliable
        // await initI18nODataDownloadGnerator();
        /* await initTelemetrySettings({
            consumerModule: { name: APP_GENERATOR_MODULE, version: this.rootGeneratorVersion() },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });

        TelemetryHelper.createTelemetryData({
            ...this.options.telemetryData
        }); */
        ODataDownloadGenerator._logger = this._configureLogging(
            this.options.logLevel,
            this.options.logger,
            this.options.vscode
        ) as ILogWrapper & Logger;
    }

    async prompting(): Promise<void> {
        try {
            const {
                answers: { application, odataQueryResult },
                questions
            } = await getODataDownloaderPrompts();
            const promptAnswers = await this.prompt(questions);
            this.state.entityData = odataQueryResult.odata;
            this.state.appRootPath = application.appAccess?.getAppRoot();
            this.state.appEntities = application.referencedEntities;
            this.state.selectedEntities =
                (promptAnswers[promptNames.relatedEntitySelection] as SelectedEntityAnswerAsJSONString[])?.map(
                    (selEntityAnswer) => JSON.parse(selEntityAnswer) as SelectedEntityAnswer // silly workaround for YUI checkbox issue
                ) ?? [];

            if (this.state.appRootPath) {
                const mockConfig = await getMockServerConfig(this.state.appRootPath);
                ODataDownloadGenerator.logger.info(`Mock config: ${JSON.stringify(mockConfig)}`);
                // todo: Find the matching service, for now use the first one
                this.state.mockDataRootPath =
                    mockConfig.services?.[0]?.mockdataPath ??
                    join(DirName.Webapp, DirName.LocalService, DirName.Mockdata);
            }

            /* if (system.metadata && application.appAccess && system.connectedSystem) {
                if (system.servicePath && application.appAccess && application.referencedEntities) {
                    system.connectedSystem.serviceProvider.log = ODataDownloadGenerator.logger;
                    const odataService = system.connectedSystem?.serviceProvider.service<ODataService>(
                        system.servicePath
                    );
                    
                    if (promptAnswers[promptNames.confirmDownload] === true) {
                        this.state.appEntities = application.referencedEntities;
                        this.state.selectedEntities = promptAnswers[promptNames.relatedEntitySelection];
                        const result = await fetchData(this.state.appEntities, odataService!, this.state.selectedEntities, 10);
                        if (result.entityData) {
                            ODataDownloadGenerator.logger.info('Got result rows:' + `${result.entityData.length}`);

                            this.state.entityData = result.entityData;
                            this.state.appRootPath = application.appAccess.getAppRoot();
                            const mockConfig = await getMockServerConfig(this.state.appRootPath);

                            this.log.info(`Mock config: ${JSON.stringify(mockConfig)}`);

                            // todo: Find the matching service, for now use the first one
                            this.state.mockDataRootPath =
                                mockConfig.services?.[0]?.mockdataPath ??
                                join(DirName.Webapp, DirName.LocalService, DirName.Mockdata);
                        } else if (result.error) {
                            this.appWizard?.showError(result.error, MessageType.notification);
                        }
                    }
                }
            } */
        } catch (error) {
            // Fatal prompting error
            ODataDownloadGenerator.logger.error(error);
            this._exitOnError(error);
        }
    }

    async writing(): Promise<void> {
        if (this.state.entityData) {
            try {
                this.generationTime0 = performance.now();
                // Set target dir to mock data path
                this.destinationRoot(join(this.state.appRootPath!, this.state.mockDataRootPath!));

                const entityFileData = convertODataResultToEntityFileData(
                    this.state.appEntities!,
                    this.state.entityData!,
                    this.state.selectedEntities
                );

                // const mainEntityPath = join(`${this.state.appEntities.listEntity}.json`);
                // Write main entity data file (todo: do we need to treat this differently? )
                // this.writeDestinationJSON(mainEntityPath, this.state.entityData);

                Object.entries(entityFileData).forEach(([entityName, entityData]) => {
                    // Writes relative to destination root path
                    this.writeDestinationJSON(join(`${entityName}.json`), entityData);
                });
            } catch (error) {
                ODataDownloadGenerator.logger.fatal(error);
                this._exitOnError(error);
            }
        } else {
            ODataDownloadGenerator.logger.info('No data to write. All done.');
        }
    }

    async end(): Promise<void> {
        // await runPostGenerationTasks
    }

    /**
     *
     * @param error
     */
    private _exitOnError(error: string): void {
        /*   sendTelemetry('GENERATION_WRITING_FAIL', TelemetryHelper.telemetryData); */
        if (getHostEnvironment() !== hostEnvironment.cli) {
            this.appWizard?.showError(error, MessageType.notification);
        }
        throw new Error(error);
    }

    /**
     * Configures the vscode logger and yeoman logger to share single wrapper.
     * Set as an option to be passed to sub-gens.
     */
    _configureLogging(logLevel: LogLevel, vscLogger: IVSCodeExtLogger, vscode?: object): ILogWrapper {
        const logWrapper = new LogWrapper(
            this.rootGeneratorName(),
            this.log,
            logLevel, // Only used for CLI
            vscLogger,
            vscode
        );
        logWrapper.debug(t('LOGGING_INITIALISED', { logLevel }));
        return logWrapper;
    }
}
