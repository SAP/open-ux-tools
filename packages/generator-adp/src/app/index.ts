import * as util from 'util';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import Generator from 'yeoman-generator';
import { AppWizard, Prompts } from '@sap-devx/yeoman-ui-types';

import {
    AbapProvider,
    AdpWriterConfig,
    CustomConfig,
    EndpointsManager,
    FlexLayer,
    generate,
    getPackageJSONInfo
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
import type { AdpGeneratorOptions } from './types';

import { ConfigAnswers, getConfigurationQuestions } from './questions/configuration';
import { generateValidNamespace, getDefaultProjectName } from './questions/helper/default-values';

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
    private logger: ILogWrapper;

    private configAnswers: ConfigAnswers;
    private targetFolder: string;

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

        this._setupPages();

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

    async prompting(): Promise<void> {
        /**
         * TODO: Add first page prompting configuration
         */
        await EndpointsManager.init(this.toolsLogger);
        await AbapProvider.init(this.toolsLogger);

        const configQuestions = getConfigurationQuestions();

        this.configAnswers = await this.prompt<ConfigAnswers>(configQuestions);

        this.logger.info(`System: ${this.configAnswers.system}`);
        this.logger.info(`Application: ${JSON.stringify(this.configAnswers.application, null, 2)}`);
    }

    async writing(): Promise<void> {
        try {
            const provider = AbapProvider.getProvider();
            const ato = await provider.getAtoInfo();
            /**
             * TODO: Need a way to identify the layer, we already have such functionality.
             * import { isFeatureEnabled } from "@sap-devx/feature-toggle-node";
             * await isFeatureEnabled("adaptation-project", "internal");
             */
            const layer = ato.tenantType === 'SAP' ? FlexLayer.VENDOR : FlexLayer.CUSTOMER_BASE;

            const projectName = getDefaultProjectName(this.destinationPath());
            const namespace = generateValidNamespace(projectName, layer === FlexLayer.CUSTOMER_BASE);
            this.targetFolder = this.destinationPath(projectName);

            const operationsType = ato.operationsType ?? 'P';
            const config = await this._createConfigFromDefaults(operationsType, layer, {
                namespace
            });

            await generate(this.targetFolder, config, this.fs);
        } catch (error) {
            this.logger.error(`Writing phase failed: ${error}`);
            throw new Error(t('error.updatingApp'));
        }
    }

    async install(): Promise<void> {
        await this._installDependencies(this.targetFolder);
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
     * @param {ConfigAnswers} answers - User-provided answers.
     * @param {OperationsType} operationsType - Whether the project is cloud or on-premise.
     * @param {FlexLayer} layer - The UI5 Flex layer, indicating the deployment layer (e.g., CUSTOMER_BASE).
     * @param {object} defaults - Default project parameters.
     * @returns {Promise<AdpWriterConfig>} The generated project configuration.
     */
    private async _createConfigFromDefaults(
        operationsType: OperationsType,
        layer: FlexLayer,
        defaults: {
            namespace: string;
            title?: string;
        }
    ): Promise<AdpWriterConfig> {
        const target = await this._getTarget(operationsType === 'C');
        const customConfig = this._getCustomConfig(operationsType);

        return {
            app: {
                id: defaults.namespace,
                reference: this.configAnswers.application.id,
                layer,
                title: defaults.title ?? 'Some title',
                content: [this.getNewModelChange()]
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
     */
    private getNewModelChange() {
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
     * Constructs a custom configuration object.
     *
     * @param {OperationsType} operationsType - Whether the project is cloud or on-premise.
     * @returns {CustomConfig} The generated configuration.
     */
    private _getCustomConfig(operationsType: OperationsType): CustomConfig {
        const packageJson = getPackageJSONInfo();
        return {
            adp: {
                environment: operationsType,
                support: {
                    id: packageJson.name,
                    version: packageJson.version,
                    toolsId: uuidv4()
                }
            }
        };
    }

    /**
     * Constructs the ABAP target configuration based on the operational context and project type.
     *
     * @param {boolean} isCloudProject - Flag indicating whether the project is a cloud project.
     * @returns {AbapTarget} The configured ABAP target object.
     */
    private async _getTarget(isCloudProject: boolean): Promise<AbapTarget> {
        const systemDetails = await EndpointsManager.getSystemDetails(this.configAnswers.system);

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
     * Installs dependencies in the project directory.
     *
     * @param {string} projectPath - The project directory.
     */
    private async _installDependencies(projectPath: string): Promise<void> {
        const execAsync = util.promisify(exec);

        try {
            await execAsync(`cd ${projectPath} && npm i`);
        } catch (error) {
            throw 'Installation of dependencies failed.';
        }
    }

    /**
     * Sets up the initial pages.
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
     * @returns The initial configuration page.
     */
    private _getInitialPage(): { name: string; description: string } {
        return { name: t('yuiNavSteps.configurationName'), description: t('yuiNavSteps.configurationName') };
    }
}

export type { AdpGeneratorOptions };
