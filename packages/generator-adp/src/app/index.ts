import Generator from 'yeoman-generator';
import { AppWizard, Prompts } from '@sap-devx/yeoman-ui-types';
import { isFeatureEnabled } from '@sap-devx/feature-toggle-node';

import {
    AbapProvider,
    AdpWriterConfig,
    Content,
    FlexLayer,
    TargetSystems,
    generate,
    getCustomConfig
} from '@sap-ux/adp-tooling';
import { ToolsLogger } from '@sap-ux/logger';
import { isAppStudio } from '@sap-ux/btp-utils';
import { AbapTarget } from '@sap-ux/system-access';
import { AuthenticationType } from '@sap-ux/store';
import { OperationsType } from '@sap-ux/axios-extension';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { TelemetryHelper, sendTelemetry, type ILogWrapper } from '@sap-ux/fiori-generator-shared';

import { t, initI18n } from '../utils/i18n';
import { EventName } from '../telemetryEvents';
import AdpFlpConfigLogger from '../utils/logger';
import { installDependencies } from '../utils/deps';
import { ConfigPrompter } from './questions/configuration';
import type { AdpGeneratorOptions, ConfigAnswers } from './types';
import { generateValidNamespace, getDefaultProjectName } from './questions/helper/default-values';

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
        await this._setLayer();

        this._setupPages();

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

            const provider = this.abapProvider.getProvider();
            const ato = await provider.getAtoInfo();

            const operationsType = ato.operationsType ?? 'P';
            const config = await this._createConfigFromDefaults(operationsType, {
                namespace
            });

            await generate(this.targetFolder, config, this.fs);
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
     * Generates the configuration object for the Adaptation Project.
     *
     * @param {OperationsType} operationsType - The operations type indicating a cloud ('C') or on-premise project.
     * @param {object} defaults - Default project parameters.
     * @param {string} defaults.namespace - The namespace for the project.
     * @param {string} [defaults.title] - Optional title for the project.
     * @returns {Promise<AdpWriterConfig>} The generated project configuration.
     */
    private async _createConfigFromDefaults(
        operationsType: OperationsType,
        defaults: {
            namespace: string;
            title?: string;
        }
    ): Promise<AdpWriterConfig> {
        const target = await this._getTarget(operationsType === 'C');
        const customConfig = getCustomConfig(operationsType);

        return {
            app: {
                id: defaults.namespace,
                reference: this.configAnswers.application.id,
                layer: this.layer,
                title: defaults.title ?? '',
                content: [this._getNewModelEnhanceWithChange()]
            },
            customConfig,
            target,
            options: {
                fioriTools: true,
                enableTypeScript: false
            }
        };
    }

    /**
     * Returns a model enhancement change configuration.
     *
     * @returns {Content} The model change configuration.
     */
    private _getNewModelEnhanceWithChange(): Content {
        return {
            changeType: 'appdescr_ui5_addNewModelEnhanceWith',
            content: {
                modelId: 'i18n',
                bundleUrl: 'i18n/i18n.properties',
                supportedLocales: [''],
                fallbackLocale: ''
            }
        };
    }

    /**
     * Constructs the ABAP target configuration based on the operational context and project type.
     *
     * @param {boolean} isCloudProject - Flag indicating whether the project is a cloud project.
     * @returns {Promise<AbapTarget>} The configured ABAP target object.
     */
    private async _getTarget(isCloudProject: boolean): Promise<AbapTarget> {
        const systemDetails = await this.targetSystems.getSystemDetails(this.configAnswers.system);

        const target = {
            client: systemDetails?.client,
            ...(isAppStudio() ? { destination: this.configAnswers.system } : { url: systemDetails?.url })
        } as AbapTarget;

        if (
            !isAppStudio() &&
            isCloudProject &&
            systemDetails?.authenticationType === AuthenticationType.ReentranceTicket
        ) {
            target['authenticationType'] = AuthenticationType.ReentranceTicket;
        }

        return target;
    }

    /**
     * Sets the flex layer for the project based on internal usage.
     *
     * @returns {Promise<void>}
     */
    private async _setLayer(): Promise<void> {
        const isInternalUsage = await this._isInternalUsage();
        this.layer = isInternalUsage ? FlexLayer.VENDOR : FlexLayer.CUSTOMER_BASE;
    }

    /**
     * Determines whether the generator is being run in an internal context.
     *
     * @returns {Promise<boolean>} True if internal usage; otherwise, false.
     */
    private async _isInternalUsage(): Promise<boolean> {
        if (isAppStudio()) {
            return isFeatureEnabled('adaptation-project', 'internal');
        }
        return false;
    }

    /**
     * Sets up the initial pages for the generator prompts.
     */
    private _setupPages(): void {
        this.prompts.splice(0, 0, [this._getInitialPage()]);
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
     * Returns the translated name and description for configuration page.
     *
     * @returns The initial configuration page with name and description.
     */
    private _getInitialPage(): { name: string; description: string } {
        return { name: t('yuiNavSteps.configurationName'), description: t('yuiNavSteps.configurationName') };
    }
}

export type { AdpGeneratorOptions };
