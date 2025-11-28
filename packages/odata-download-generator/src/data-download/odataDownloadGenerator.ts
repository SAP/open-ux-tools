import { MessageType, Prompts, type AppWizard } from '@sap-devx/yeoman-ui-types';
import { AbapServiceProvider, ExternalService } from '@sap-ux/axios-extension';
import {
    DefaultLogger,
    getHostEnvironment,
    hostEnvironment,
    ILogWrapper,
    LogWrapper
} from '@sap-ux/fiori-generator-shared';
import type { Logger } from '@sap-ux/logger';
import { writeExternalServiceMetadata, OdataVersion } from '@sap-ux/odata-service-writer';
import { DirName, FileName, getMockServerConfig } from '@sap-ux/project-access';
import type { IVSCodeExtLogger, LogLevel } from '@vscode-logging/logger';
import { join } from 'path';
import Generator, { GeneratorOptions } from 'yeoman-generator';
import { t } from '../utils/i18n';
import {
    getODataDownloaderPrompts,
    promptNames,
    SelectedEntityAnswerAsJSONString,
    type SelectedEntityAnswer
} from './prompts';
import { type ReferencedEntities } from './types';
import { convertODataResultToEntityFileData } from './utils';
import { getValueHelpSelectionPrompt } from './value-help-prompts';
import prettifyXml from 'prettify-xml';

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
         * The metadata for mock server
         */
        mockMetaDataPath?: string;
        /**
         * The application referenced entities used as the roots for data download
         */
        appEntities?: ReferencedEntities;
        /**
         * User selected entities
         */
        selectedEntities?: SelectedEntityAnswer[];
        /**
         * The downloaded entity odata as JSON
         */
        entityData?: object;
        /**
         * The downloaded value help odata as JSON
         */
        valueHelpData?: ExternalService[];
        /**
         * Value help metadata
         */
        valueHelpMetadata?: ExternalService[];
        /**
         * The main odata service path of the app
         */
        mainServicePath?: string;
        /**
         * The name of the main odata service
         */
        mainServiceName?: string;
        /**
         *
         */
        updateMainServiceMetadata?: boolean;
        /**
         *
         */
        mainServiceMetadata?: string;
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
            },
            {
                description: 'Value Help selection',
                name: 'Value Help selection'
            }
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
                answers: { application, odataQueryResult, odataServiceAnswers },
                questions
            } = await getODataDownloaderPrompts();
            const promptAnswers = await this.prompt(questions);
            this.state.entityData = odataQueryResult.odata;
            this.state.appRootPath = application.appAccess?.getAppRoot();
            this.state.mainServicePath = odataServiceAnswers.servicePath;
            this.state.mainServiceName = application.appAccess?.app.mainService;
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
                // metadata path
                const metadataPath = mockConfig.services?.[0]?.metadataPath?.match(/^(.*\/)([^\/]*)$/)?.[0];
                this.state.mockMetaDataPath = metadataPath ?? join(DirName.Webapp, DirName.LocalService);
            }

            this.state.updateMainServiceMetadata = promptAnswers[promptNames.updateMainServiceMetadata];
            this.state.mainServiceMetadata = odataServiceAnswers.metadata;

            const { questions: valueHelpQuestions, valueHelpData } = getValueHelpSelectionPrompt(
                odataServiceAnswers.servicePath!,
                odataServiceAnswers.metadata!,
                odataServiceAnswers.connectedSystem?.serviceProvider as AbapServiceProvider
            );
            const vhPromptAnswers = await this.prompt(valueHelpQuestions);
            this.state.valueHelpData = valueHelpData;
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
                this.destinationRoot(join(this.state.appRootPath!));

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
                    this.writeDestinationJSON(join(this.state.mockDataRootPath!, `${entityName}.json`), entityData);
                });
            } catch (error) {
                ODataDownloadGenerator.logger.error(error);
                //this._exitOnError(error);
            }
        } else {
            ODataDownloadGenerator.logger.info('No service entity data to write.');
        }

        // Write value help data files
        if (this.state.valueHelpData) {
            // Service metadata writing will create the necessary data folders
            // Passing the webapp folder might be invalid, but we cant pass the path from the mocker server here.
            await writeExternalServiceMetadata(
                this.fs,
                join(this.state.appRootPath!, DirName.Webapp),
                this.state.valueHelpData,
                this.state.mainServiceName,
                this.state.mainServicePath
            );
        } else {
            ODataDownloadGenerator.logger.info('No Value Help service data to write.');
        }

        if (this.state.updateMainServiceMetadata && this.state.mainServiceMetadata && this.state.mainServiceName) {
            const mainServiceMetadataPath = join(
                this.state.appRootPath!,
                DirName.Webapp,
                DirName.LocalService,
                this.state.mainServiceName,
                'metadata.xml'
            );
            this.writeDestination(mainServiceMetadataPath, prettifyXml(this.state.mainServiceMetadata, { indent: 4 }));
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
