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
import { SystemLookup, generate, getConfig } from '@sap-ux/adp-tooling';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import type { AttributesAnswers, ConfigAnswers, FlexLayer } from '@sap-ux/adp-tooling';

import { getFlexLayer } from './layer';
import { t, initI18n } from '../utils/i18n';
import { EventName } from '../telemetryEvents';
import AdpFlpConfigLogger from '../utils/logger';
import { getPrompts } from './questions/attributes';
import { ConfigPrompter } from './questions/configuration';
import { getPackageInfo, installDependencies } from '../utils/deps';
import type { AdpGeneratorOptions, AttributePromptOptions } from './types';

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

        this._setupPrompts();
        this._setupLogging();
    }

    async initializing(): Promise<void> {
        await initI18n();

        const pages = [
            { name: t('yuiNavSteps.configurationName'), description: t('yuiNavSteps.configurationDescr') },
            { name: t('yuiNavSteps.projectAttributesName'), description: t('yuiNavSteps.projectAttributesDescr') }
        ];
        this.prompts.splice(0, 0, pages);

        this.layer = await getFlexLayer();

        this.systemLookup = new SystemLookup(this.toolsLogger);
        this.prompter = new ConfigPrompter(this.systemLookup, this.layer, this.toolsLogger);

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
        try {
            const packageJson = getPackageInfo();
            const config = await getConfig({
                provider: this.prompter.provider,
                configAnswers: this.configAnswers,
                attributeAnswers: this.attributeAnswers,
                publicVersions: this.prompter?.ui5?.publicVersions,
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
}

export type { AdpGeneratorOptions };
