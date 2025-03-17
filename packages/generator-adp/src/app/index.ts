import Generator from 'yeoman-generator';
import { AppWizard, Prompts } from '@sap-devx/yeoman-ui-types';

import { ToolsLogger } from '@sap-ux/logger';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { TelemetryHelper, sendTelemetry, type ILogWrapper } from '@sap-ux/fiori-generator-shared';

import { t, initI18n } from '../utils/i18n';
import { EventName } from '../telemetryEvents';
import AdpFlpConfigLogger from '../utils/logger';
import type { AdpGeneratorOptions } from './types';
import {
    AbapProvider,
    AdpWriterConfig,
    ApplicationManager,
    EndpointsManager,
    ManifestManager,
    generate,
    getEndpointNames
} from '@sap-ux/adp-tooling';
import { getConfigurationQuestions } from './questions/configuration';

/**
 * Generator for creating an Adaptation Project.
 *
 * @extends Generator
 */
export default class extends Generator {
    setPromptsCallback: (fn: object) => void;
    private prompts: Prompts;

    private readonly appWizard: AppWizard;
    private readonly vscode: any;
    private readonly toolsLogger: ToolsLogger;
    private readonly projectRootPath: string = '';
    private logger: ILogWrapper;

    private appsManager: ApplicationManager;
    private providerManager: AbapProvider;
    private manifestManager: ManifestManager;
    private endpointsManager: EndpointsManager;

    public isCustomerBase: boolean;
    public isCloudProject: boolean;

    /**
     * Creates an instance of the generator.
     *
     * @param {string | string[]} args - The arguments passed to the generator.
     * @param {AdpGeneratorOptions} opts - The options for the generator.
     */
    constructor(args: string | string[], opts: AdpGeneratorOptions) {
        super(args, opts);
        this.appWizard = opts.appWizard ?? AppWizard.create(opts);
        this.toolsLogger = new ToolsLogger();
        this.options = opts;
        this.vscode = opts.vscode;

        this._setupPrompts();
        this._setupLogging();
    }

    async initializing(): Promise<void> {
        await initI18n();

        this.manifestManager = new ManifestManager(this.providerManager, this.toolsLogger);
        this.appsManager = new ApplicationManager(this.isCustomerBase, this.toolsLogger);

        // Add telemetry to be sent once generator-adp is generated
        await TelemetryHelper.initTelemetrySettings({
            consumerModule: {
                name: '@sap/generator-fiori:generator-adp', // What should the namespace be?
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });
    }

    public async prompting(): Promise<void> {
        /**
         * TODO: Add first page prompting configuration
         */
        await EndpointsManager.init(this.toolsLogger);
        await AbapProvider.init(this.toolsLogger);

        const configQuestions = getConfigurationQuestions();

        await this.prompt(configQuestions);
    }

    async writing(): Promise<void> {
        const config = {} as AdpWriterConfig;
        /**
         * Populate the config with the prompted system, and application answers
         * as well as the default values for project name, title, namespace, etc to generate a working adaptation project
         */
        try {
            /**
             * TODO: Generate ADP
             */
            await generate(this.destinationRoot(), config);
        } catch (error) {
            this.logger.error(`Writing phase failed: ${error}`);
            throw new Error(t('error.updatingApp'));
        }
    }

    end(): void {
        const telemetryData =
            TelemetryHelper.createTelemetryData({
                appType: 'adp-generator',
                ...this.options.telemetryData
            }) ?? {};
        if (telemetryData) {
            sendTelemetry(EventName.ADAPTATION_PROJECT_CREATED, telemetryData, this.projectRootPath).catch((error) => {
                this.logger.error(t('error.telemetry', { error }));
            });
        }
    }

    /**
     * Sets up the prompts for the generator.
     */
    private _setupPrompts(): void {
        // If launched as a sub-generator, the prompts will be set by the parent generator
        this.prompts = new Prompts([this._getInitialPage()]);
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

    private _getInitialPage() {
        return { name: t('yuiNavSteps.configurationName'), description: t('yuiNavSteps.configurationName') };
    }
}

export type { AdpGeneratorOptions };
