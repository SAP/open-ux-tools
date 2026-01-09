import { AppWizard, MessageType, Prompts } from '@sap-devx/yeoman-ui-types';
import type { AbapServiceProvider, UiServiceGenerator } from '@sap-ux/axios-extension';
import type { Destination } from '@sap-ux/btp-utils';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { sendTelemetry, setYeomanEnvConflicterForce, TelemetryHelper } from '@sap-ux/fiori-generator-shared';
import { type Logger } from '@sap-ux/logger';
import type { ServiceConfig, SystemSelectionAnswers, UiServiceAnswers } from '@sap-ux/ui-service-inquirer';
import { getConfigPrompts, getSystemSelectionPrompts, ObjectType } from '@sap-ux/ui-service-inquirer';
import Generator from 'yeoman-generator';
import { boUri, cdsUri, initI18n, prompts, SERVICE_GENERATION_SUCCESS, t, UI_SERVICE_CACHE } from '../utils';
import UiServiceGenLogger from '../utils/logger';
import { getTelemetryData } from './telemetryHelper';
import { BAS_OBJECT } from './types';
import {
    addToCache,
    authenticateInputData,
    generateService,
    getAppGenSystemData,
    getFromCache,
    runPostGenHook,
    setToolbarMessage,
    writeBASMetadata
} from './utils';

/**
 * Generator for creating a new UI Service.
 *
 * @extends Generator
 */
export default class extends Generator {
    answers: UiServiceAnswers = {
        url: '',
        package: ''
    };
    prompts: Prompts;
    appWizard: AppWizard;
    vscode: unknown;
    systemSelectionAnswers: SystemSelectionAnswers = {};
    serviceConfigAnswers: ServiceConfig = {
        content: '',
        serviceName: '',
        showDraftEnabled: false
    };
    setPromptsCallback: (fn: any) => void;

    /**
     * Constructor for the generator.
     *
     * @param args - arguments passed to the generator
     * @param opts - options passed to the generator
     */
    constructor(args: string | string[], opts: Generator.GeneratorOptions) {
        super(args, opts);
        setYeomanEnvConflicterForce(this.env, this.options.force);

        this.appWizard = AppWizard.create(opts);
        this.vscode = opts.vscode;
        UiServiceGenLogger.configureLogging(
            this.options.logger,
            this.rootGeneratorName(),
            this.log,
            this.options.vscode,
            this.options.logLevel
        );

        const steps = prompts;
        // if options.data is present, skip the first step
        // options.data is passeed from BAS service center
        if (this.options.data?.systemName) {
            steps.shift();
        }

        this.appWizard = AppWizard.create(opts);
        if (!(this.appWizard as any)[UI_SERVICE_CACHE]) {
            (this.appWizard as any)[UI_SERVICE_CACHE] = {};
        }

        this.appWizard.setHeaderTitle('UI Service Generator');
        this.prompts = new Prompts(steps);
        this.setPromptsCallback = (fn): void => {
            if (this.prompts) {
                this.prompts.setCallback(fn);
            }
        };
    }

    public async initializing(): Promise<void> {
        await TelemetryHelper.initTelemetrySettings({
            consumerModule: {
                name: '@sap/generator-fiori-ui-service',
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });
        await initI18n();
        if (this.options.data?.systemName) {
            UiServiceGenLogger.logger.debug('Options passed into generator: ' + JSON.stringify(this.options.data));
            await this._initSteps();
        }
    }

    private async _initSteps(): Promise<void> {
        await authenticateInputData(this.options.data, this.systemSelectionAnswers);
        if (this.systemSelectionAnswers.connectedSystem?.serviceProvider) {
            try {
                if (this.options.data.id && this.options.data.type) {
                    // new BAS service center data interface, for BO and CDS
                    const objectUri = this.options.data.type === BAS_OBJECT.BUSINESS_OBJECT ? boUri : cdsUri;
                    this.systemSelectionAnswers.objectGenerator = await (
                        this.systemSelectionAnswers.connectedSystem.serviceProvider as AbapServiceProvider
                    ).getUiServiceGenerator({
                        name: this.options.data.id,
                        uri: `${objectUri}${this.options.data.id.toLowerCase()}`
                    });
                } else {
                    // old interface, for BO only
                    // to be removed once BAS release new interface
                    this.systemSelectionAnswers.objectGenerator = await (
                        this.systemSelectionAnswers.connectedSystem.serviceProvider as AbapServiceProvider
                    ).getUiServiceGenerator({
                        name: this.options.data.businessObject,
                        uri: `${boUri}${this.options.data.businessObject.toLowerCase()}`
                    });
                }
                this.systemSelectionAnswers.connectedSystem.destination = {
                    Name: this.options.data.systemName
                } as Destination;
            } catch (error) {
                UiServiceGenLogger.logger.error(t('error.fetchingGenerator', { error: error.message }));
            }
        }
    }

    public async prompting(): Promise<void> {
        // SAP System step
        if (!this.options.data?.systemName) {
            // prompt system selection
            const systemPrompts = await getSystemSelectionPrompts(
                ...getFromCache(this.appWizard),
                UiServiceGenLogger.logger as unknown as Logger
            );
            const systemSelectionAnswers = await this.prompt(systemPrompts.prompts);
            Object.assign(this.answers, systemSelectionAnswers);
            Object.assign(this.systemSelectionAnswers, systemPrompts.answers);
            addToCache(this.appWizard, this.systemSelectionAnswers, this.answers);
        }

        // UI Service configuration step
        setToolbarMessage(this.options.data, this.systemSelectionAnswers, this.appWizard);
        // prompt service configuration
        const configPrompts = await getConfigPrompts(
            this.systemSelectionAnswers,
            {
                useDraftEnabled: !(
                    this.answers.objectType === ObjectType.CDS_VIEW || this.options.data?.type === BAS_OBJECT.CDS
                )
            },
            UiServiceGenLogger.logger as unknown as Logger
        );

        const configAnswers = await this.prompt(configPrompts.prompts);
        Object.assign(this.answers, configAnswers);
        Object.assign(this.serviceConfigAnswers, configPrompts.answers);
    }

    async end(): Promise<void> {
        // UI Service Generation
        this.appWizard.showWarning(t('info.generatingUiService'), MessageType.prompt);
        const transportReqNumber =
            this.answers.transportFromList ?? this.answers.transportManual ?? this.answers.transportCreated ?? '';
        TelemetryHelper.createTelemetryData({
            ...getTelemetryData(this.answers, this.options.data)
        });
        TelemetryHelper.markAppGenStartTime();
        await generateService(
            this.systemSelectionAnswers.objectGenerator as UiServiceGenerator,
            this.serviceConfigAnswers.content,
            transportReqNumber,
            this.appWizard
        ).then(async (res) => {
            if (res) {
                sendTelemetry(SERVICE_GENERATION_SUCCESS, TelemetryHelper.telemetryData).catch((error) => {
                    UiServiceGenLogger.logger.error(t('error.sendingTelemetry', { error: error.message }));
                });

                // check if data passed from BAS service center to write BAS .service.metadata file
                if (this.options.data?.path && this.options.data?.providerSystem) {
                    await writeBASMetadata(
                        this.serviceConfigAnswers,
                        this.fs,
                        this.appWizard,
                        this.options.data,
                        this.systemSelectionAnswers.connectedSystem!.serviceProvider
                    );
                } else {
                    this.appWizard.showInformation(
                        t('info.generationSuccessful', { serviceName: this.serviceConfigAnswers.serviceName }),
                        MessageType.notification
                    );
                    UiServiceGenLogger.logger.info(
                        `Generation of service ${this.serviceConfigAnswers.serviceName} successful`
                    );
                    UiServiceGenLogger.logger.debug(`Generation response: ${JSON.stringify(res)}`);
                }
                UiServiceGenLogger.logger.info('Generation completed');
                if (this.answers.launchAppGen && this.systemSelectionAnswers.connectedSystem) {
                    UiServiceGenLogger.logger.info('Running post generation hook');
                    await runPostGenHook(
                        this.options,
                        getAppGenSystemData(this.systemSelectionAnswers),
                        this.serviceConfigAnswers.content,
                        this.systemSelectionAnswers.connectedSystem?.serviceProvider
                    );
                }
            }
        });
    }
}
