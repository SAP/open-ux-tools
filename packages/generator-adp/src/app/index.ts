import Generator from 'yeoman-generator';
import { AppWizard, Prompts } from '@sap-devx/yeoman-ui-types';

import { AbapProvider, ConfigAnswers, FlexLayer, TargetSystems, WriterConfig, generate } from '@sap-ux/adp-tooling';
import { ToolsLogger } from '@sap-ux/logger';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { TelemetryHelper, sendTelemetry, type ILogWrapper } from '@sap-ux/fiori-generator-shared';

import { t, initI18n } from '../utils/i18n';
import { EventName } from '../telemetryEvents';
import AdpFlpConfigLogger from '../utils/logger';
import { installDependencies } from '../utils/deps';
import { ConfigPrompter } from './questions/configuration';
import type { AdpGeneratorOptions } from './types';
import { generateValidNamespace, getDefaultProjectName } from './questions/helper/default-values';
import { getFlexLayer } from './layer';

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

    private prompts: Prompts;
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
     * Target folder for the generated project.
     */
    private targetFolder: string;
    /**
     * EndpointsManager instance for managing system endpoints.
     */
    private targetSystems: TargetSystems;
    /**
     * AbapProvider instance for ABAP system connection.
     */
    private abapProvider: AbapProvider;

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
        this._setupPages();
        this.layer = await getFlexLayer();

        this.targetSystems = new TargetSystems(this.toolsLogger);
        this.abapProvider = new AbapProvider(this.targetSystems, this.toolsLogger);

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
        const prompter = new ConfigPrompter(this.abapProvider, this.targetSystems, this.layer, this.toolsLogger);

        const configQuestions = prompter.getPrompts();

        this.configAnswers = await this.prompt<ConfigAnswers>(configQuestions);

        this.logger.info(`System: ${this.configAnswers.system}`);
        this.logger.info(`Application: ${JSON.stringify(this.configAnswers.application, null, 2)}`);
    }

    async writing(): Promise<void> {
        try {
            const projectName = getDefaultProjectName(this.destinationPath());
            const namespace = generateValidNamespace(projectName, this.layer);
            this.targetFolder = this.destinationPath(projectName);

            const systemDetails = await this.targetSystems.getSystemDetails(this.configAnswers.system);
            if (systemDetails) {
                const writerConfig = new WriterConfig(this.abapProvider, this.layer);
                const config = await writerConfig.getConfig(this.configAnswers, systemDetails, { namespace });

                await generate(this.targetFolder, config, this.fs);
            }
        } catch (error) {
            this.logger.error(`Writing phase failed: ${error}`);
            throw new Error(t('error.updatingApp'));
        }
    }

    async install(): Promise<void> {
        await installDependencies(this.targetFolder);
    }

    end(): void {
        const telemetryData =
            TelemetryHelper.createTelemetryData({
                appType: 'generator-adp',
                ...this.options.telemetryData
            }) ?? {};
        if (telemetryData) {
            sendTelemetry(EventName.ADAPTATION_PROJECT_CREATED, telemetryData, this.targetFolder).catch((error) => {
                this.logger.error(t('error.telemetry', { error }));
            });
        }
    }

    /**
     * Sets up the initial pages for the generator prompts.
     */
    private _setupPages(): void {
        this.prompts.splice(0, 0, [this._getInitialPage()]);
    }

    /**
     * Returns the translated name and description for configuration page.
     *
     * @returns The initial configuration page with name and description.
     */
    private _getInitialPage(): { name: string; description: string } {
        return { name: t('yuiNavSteps.configurationName'), description: t('yuiNavSteps.configurationName') };
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
}

export type { AdpGeneratorOptions };
