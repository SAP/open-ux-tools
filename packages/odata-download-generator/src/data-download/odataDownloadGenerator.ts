import { MessageType, Prompts, type AppWizard } from '@sap-devx/yeoman-ui-types';
import type { AbapServiceProvider, ExternalService } from '@sap-ux/axios-extension';
import type { ILogWrapper } from '@sap-ux/fiori-generator-shared';
import { DefaultLogger, getHostEnvironment, hostEnvironment, LogWrapper } from '@sap-ux/fiori-generator-shared';
import type { Logger } from '@sap-ux/logger';
import { writeExternalServiceMetadata } from '@sap-ux/odata-service-writer';
import { DirName, getMockServerConfig } from '@sap-ux/project-access';
import type { IVSCodeExtLogger, LogLevel } from '@vscode-logging/logger';
import { join } from 'path';
import prettifyXml from 'prettify-xml';
import type { GeneratorOptions } from 'yeoman-generator';
import Generator from 'yeoman-generator';
import { initI18nODataDownloadGnerator, t } from '../utils/i18n';
import type { EntitySetsFlat } from './odata-query';
import { getODataDownloaderPrompts, promptNames } from './prompts/prompts';
import { type ReferencedEntities } from './types';
import { createEntitySetData } from './utils';
import { getValueHelpSelectionPrompt } from './value-help-prompts';

export const APP_GENERATOR_MODULE = '@sap/generator-fiori';

/**
 * The root generator for Fiori Elements and Fiori Freestyle generators.
 * All common functionality is implemented here.
 */
export class ODataDownloadGenerator extends Generator {
    private readonly vscode: unknown;
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
         * Mock data path relative to app root, determined from mock yaml config or default
         */
        mockDataRootPath?: string;
        /**
         * The application referenced entities used as the roots for data download
         */
        appEntities?: ReferencedEntities;
        /**
         * The downloaded entity odata as JSON
         */
        entityOData?: { odata: []; entitySetsFlat: EntitySetsFlat };
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
        // @ts-expect-error no types available
        if (this.env.conflicter) {
            // @ts-expect-error no types available
            this.env.conflicter.force = true;
        }
        this.options.force = true;

        // Generator steps
        this.prompts = new Prompts([
            {
                description: t('steps.odataDownloader.description'),
                name: t('steps.odataDownloader.name')
            },
            {
                description: t('steps.valueHelpSelection.description'),
                name: t('steps.valueHelpSelection.name')
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
        await initI18nODataDownloadGnerator();

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
            this.state.entityOData = odataQueryResult;
            this.state.appRootPath = application.appAccess?.getAppRoot();
            this.state.mainServicePath = odataServiceAnswers.servicePath;
            this.state.mainServiceName = application.appAccess?.app.mainService;
            this.state.appEntities = application.referencedEntities;

            if (this.state.appRootPath) {
                const mockConfig = await getMockServerConfig(this.state.appRootPath);
                let serviceConfig;
                if (mockConfig?.services) {
                    ODataDownloadGenerator.logger.debug(`Mock config: ${JSON.stringify(mockConfig)}`);
                    // Find the matching service from mock config ignoring leading and trailing '/'
                    serviceConfig = mockConfig.services.find(
                        (service) =>
                            service.urlPath.replace(/^\/+|\/+$/g, '') ===
                            this.state.mainServicePath?.replace(/^\/+|\/+$/g, '')
                    );
                }
                // If no config found use the default location for mock data
                this.state.mockDataRootPath =
                    serviceConfig?.mockdataPath ?? join(DirName.Webapp, DirName.LocalService, DirName.Mockdata);
            }

            this.state.updateMainServiceMetadata = promptAnswers[promptNames.updateMainServiceMetadata];
            this.state.mainServiceMetadata = odataServiceAnswers.metadata;

            const { questions: valueHelpQuestions, valueHelpData } = getValueHelpSelectionPrompt(
                odataServiceAnswers.servicePath!,
                odataServiceAnswers.metadata!,
                odataServiceAnswers.connectedSystem?.serviceProvider as AbapServiceProvider
            );
            await this.prompt(valueHelpQuestions);
            this.state.valueHelpData = valueHelpData;
        } catch (error) {
            // Fatal prompting error
            ODataDownloadGenerator.logger.error(error);
            this._exitOnError(error);
        }
    }

    async writing(): Promise<void> {
        if (this.state.entityOData?.odata && this.state.appEntities) {
            try {
                // Set target dir to mock data path
                this.destinationRoot(join(this.state.appRootPath!));

                const entityFileData = createEntitySetData(
                    this.state.entityOData.odata,
                    this.state.entityOData.entitySetsFlat,
                    this.state.appEntities.listEntity.entitySetName
                );

                Object.entries(entityFileData).forEach(([entityName, entityData]) => {
                    // Writes relative to destination root path
                    this.writeDestinationJSON(join(this.state.mockDataRootPath!, `${entityName}.json`), entityData);
                });
            } catch (error) {
                ODataDownloadGenerator.logger.error(error);
            }
        } else {
            ODataDownloadGenerator.logger.info(t('info.noServiceEntityData'));
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
            ODataDownloadGenerator.logger.info(t('info.noValueHelpData'));
        }
        // Update the metadata
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

    /**
     *
     * @param error
     */
    private _exitOnError(error: string): void {
        if (getHostEnvironment() !== hostEnvironment.cli) {
            this.appWizard?.showError(error, MessageType.notification);
        }
        throw new Error(error);
    }

    /**
     * Configures the vscode logger and yeoman logger to share single wrapper.
     * Set as an option to be passed to sub-gens.
     *
     * @param logLevel
     * @param vscLogger
     * @param vscode
     */
    _configureLogging(logLevel: LogLevel, vscLogger: IVSCodeExtLogger, vscode?: object): ILogWrapper {
        const logWrapper = new LogWrapper(
            this.rootGeneratorName(),
            this.log,
            logLevel, // Only used for CLI
            vscLogger,
            vscode
        );
        logWrapper.info(t('info.loggingInitialised', { logLevel: logWrapper.getLogLevel() }));
        return logWrapper;
    }
}
