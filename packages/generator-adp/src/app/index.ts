import * as util from 'util';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
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
    CustomConfig,
    EndpointsManager,
    FlexLayer,
    ManifestManager,
    generate,
    getEndpointNames,
    getPackageJSONInfo
} from '@sap-ux/adp-tooling';
import { ConfigAnswers, getConfigurationQuestions } from './questions/configuration';
import { generateValidNamespace, getDefaultProjectName } from './questions/helper/default-values';
import { OperationsType } from '@sap-ux/axios-extension';
import { join } from 'path';
import { execNpmCommand } from '@sap-ux/project-access';
import { AbapTarget } from '@sap-ux/system-access';
import { isAppStudio } from '@sap-ux/btp-utils';
import { AuthenticationType } from '@sap-ux/store';

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

        this._setupConfigurationPage();

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
        const provider = AbapProvider.getProvider();
        const ato = await provider.getAtoInfo();
        const layer = ato.tenantType === 'SAP' ? FlexLayer.VENDOR : FlexLayer.CUSTOMER_BASE;

        const projectName = getDefaultProjectName(this.destinationPath());
        const namespace = generateValidNamespace(projectName, layer === FlexLayer.CUSTOMER_BASE);
        this.targetFolder = this.destinationPath(projectName);
        /**
         * Populate the config with the prompted system, and application answers
         * as well as the default values for project name, title, namespace, etc to generate a working adaptation project
         */
        const config = await this._createConfigFromDefaults(this.configAnswers, {
            operationsType: ato.operationsType ?? 'P',
            layer,
            namespace
        });
        try {
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
            sendTelemetry(EventName.ADAPTATION_PROJECT_CREATED, telemetryData, this.projectRootPath).catch((error) => {
                this.logger.error(t('error.telemetry', { error }));
            });
        }
    }

    private async _createConfigFromDefaults(
        answers: ConfigAnswers,
        defaults: {
            operationsType: OperationsType;
            namespace: string;
            layer: FlexLayer;
            title?: string;
            client?: string;
            ft?: boolean;
            ts?: boolean;
        }
    ): Promise<AdpWriterConfig> {
        const packageJson = getPackageJSONInfo();
        const customConfig: CustomConfig = {
            adp: {
                environment: defaults.operationsType,
                support: {
                    id: packageJson.name,
                    version: packageJson.version,
                    toolsId: uuidv4()
                }
            }
        };

        const target = await this._getTarget(defaults.operationsType === 'C');

        return {
            app: {
                id: defaults.namespace,
                reference: answers.application.id,
                layer: defaults.layer,
                title: defaults.title ?? 'Some title',
                content: [
                    {
                        changeType: 'appdescr_ui5_addNewModelEnhanceWith',
                        content: {
                            modelId: 'i18n',
                            bundleUrl: 'i18n/i18n.properties',
                            supportedLocales: [''],
                            fallbackLocale: ''
                        }
                    }
                ]
            },
            customConfig,
            target,
            options: {
                fioriTools: defaults.ft ?? true,
                enableTypeScript: defaults.ts ?? false
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

    private async _installDependencies(projectPath: string): Promise<void> {
        const execAsync = util.promisify(exec);

        try {
            await execAsync(`cd ${projectPath} && npm i`);
        } catch (error) {
            throw 'Installation of dependencies failed.';
        }
    }

    private _setupConfigurationPage(): void {
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

    private _getInitialPage() {
        return { name: t('yuiNavSteps.configurationName'), description: t('yuiNavSteps.configurationName') };
    }
}

export type { AdpGeneratorOptions };
