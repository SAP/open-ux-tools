import type { Manifest } from '@sap-ux/project-access';
import type { FlpConfigOptions } from './types';
import type { Question } from 'inquirer';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { AbapTarget, UrlAbapTarget } from '@sap-ux/system-access';
import { getSystemSelectionQuestions } from '@sap-ux/odata-service-inquirer';
import Generator from 'yeoman-generator';
import path, { join } from 'path';
import {
    ManifestService,
    getVariant,
    getAdpConfig,
    getInboundsFromManifest,
    getRegistrationIdFromManifest,
    isCFEnvironment,
    generateInboundConfig,
    type InternalInboundNavigation
} from '@sap-ux/adp-tooling';
import { ToolsLogger } from '@sap-ux/logger';
import { EventName } from '../telemetryEvents';
import { getPrompts, type FLPConfigAnswers } from '@sap-ux/flp-config-inquirer';
import { AppWizard, Prompts, MessageType } from '@sap-devx/yeoman-ui-types';
import { TelemetryHelper, sendTelemetry, type ILogWrapper } from '@sap-ux/fiori-generator-shared';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { FileName } from '@sap-ux/project-access';
import { isAppStudio } from '@sap-ux/btp-utils';
import { getCredentialsFromStore } from '@sap-ux/system-access';
import AdpFlpConfigLogger from '../utils/logger';
import { t } from '../utils/i18n';

/**
 * Generator for adding a FLP configuration to an Adaptation Project.
 *
 * @extends Generator
 */
export default class extends Generator {
    setPromptsCallback: (fn: object) => void;
    prompts: Prompts;
    // Flag to determine if the generator was launched as a sub-generator or standalone
    launchAsSubGen: boolean;
    appWizard: AppWizard;
    manifest: Manifest;
    projectRootPath: string = '';
    answers: FLPConfigAnswers;
    toolsLogger: ToolsLogger;
    logger: ILogWrapper;

    /**
     * Creates an instance of the generator.
     *
     * @param {string | string[]} args - The arguments passed to the generator.
     * @param {FlpConfigOptions} opts - The options for the generator.
     */
    constructor(args: string | string[], opts: FlpConfigOptions) {
        // Force the generator to overwrite existing files without additional prompting
        opts.force = true;
        super(args, opts);
        this.appWizard = opts.appWizard ?? AppWizard.create(opts);
        this.launchAsSubGen = !!opts.launchAsSubGen;
        this.manifest = opts.manifest as Manifest;
        this.toolsLogger = new ToolsLogger();
        this.logger = AdpFlpConfigLogger.logger;

        this.projectRootPath = opts.data?.projectRootPath ?? this.destinationRoot();

        // If launched standalone add navigation steps
        if (!this.launchAsSubGen) {
            this._setupPrompts();
        }
    }

    async initializing(): Promise<void> {
        // Generator does not support CF projects
        if (isCFEnvironment(this.projectRootPath)) {
            this.appWizard.showError(t('error.cfNotSupported'), MessageType.notification);
            return;
        }
        // Add telemetry to be sent once adp-flp-config is generated
        await TelemetryHelper.initTelemetrySettings({
            consumerModule: {
                name: '@sap/generator-fiori-deployment:adp-flp-config',
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });
    }

    public async prompting(): Promise<void> {
        if (!this.manifest) {
            await this._fetchManifest();
        }
        const inbounds = getInboundsFromManifest(this.manifest);
        const appId = getRegistrationIdFromManifest(this.manifest);

        const prompts: Question<FLPConfigAnswers>[] = await getPrompts(inbounds, appId, {
            overwrite: { hide: true },
            createAnotherInbound: { hide: true }
        });
        this.answers = (await this.prompt(prompts)) as FLPConfigAnswers;
    }

    async writing(): Promise<void> {
        try {
            await generateInboundConfig(this.projectRootPath, this.answers as InternalInboundNavigation, this.fs);
        } catch (error) {
            this.logger.error(t('error.writingPhase', { error }));
            throw new Error(t('error.updatingApp'));
        }
    }

    end(): void {
        if (!this.launchAsSubGen) {
            this.appWizard.showInformation(t('info.flpConfigAdded'), MessageType.notification);
        }
        try {
            const telemetryData = TelemetryHelper.createTelemetryData();
            if (telemetryData) {
                sendTelemetry(EventName.ADP_FLP_CONFIG_ADDED, telemetryData, this.projectRootPath).catch((error) => {
                    this.logger.error(t('error.telemetry', { error }));
                });
            }
        } catch (error) {
            this.logger.error(t('error.endPhase', { error }));
        }
    }

    /**
     * Finds the configured system based on the provided target in ui5.yaml configuration.
     *
     * @param {AbapTarget} target - The target ABAP system.
     * @returns {Promise<string>} The configured system.
     */
    private async _findConfiguredSystem(target: AbapTarget): Promise<string | undefined> {
        let configuredSystem: string | undefined;

        if (isAppStudio()) {
            configuredSystem = target.destination;
            if (!configuredSystem) {
                throw new Error(t('error.destinationNotFound'));
            }
        } else {
            const { url } = target;
            if (!url) {
                throw new Error(t('error.systemNotFound'));
            }

            const configuredSystem = (await getCredentialsFromStore(target as UrlAbapTarget, this.toolsLogger))?.name;
            if (!configuredSystem) {
                throw new Error(t('error.systemNotFoundInStore', { url }));
            }
        }

        return configuredSystem;
    }

    /**
     * Fetches the manifest for the project.
     *
     * @returns {Promise<void>} A promise that resolves when the manifest has been fetched.
     */
    private async _fetchManifest(): Promise<void> {
        try {
            const { target } = await getAdpConfig(this.projectRootPath, join(this.projectRootPath, FileName.Ui5Yaml));

            const configuredSystem = await this._findConfiguredSystem(target);
            const systemSelectionQuestions = await getSystemSelectionQuestions({
                systemSelection: { onlyShowDefaultChoice: true, defaultChoice: configuredSystem },
                serviceSelection: { hide: true }
            });
            await this.prompt(systemSelectionQuestions.prompts);
            const variant = getVariant(this.projectRootPath);
            const manifestService = await ManifestService.initMergedManifest(
                systemSelectionQuestions.answers.connectedSystem?.serviceProvider as AbapServiceProvider,
                this.projectRootPath,
                variant,
                this.toolsLogger
            );
            this.manifest = manifestService.getManifest();
        } catch (error) {
            this.logger.error(t('error.fetchingManifest', { error }));
            throw new Error(t('error.fetchingManifest'));
        }
    }

    /**
     * Adds navigations steps and callback function for the generator prompts.
     */
    private _setupPrompts(): void {
        this.prompts = new Prompts([
            {
                name: t('yuiNavSteps.sysConfirmName'),
                description: t('yuiNavSteps.sysConfirmDesc')
            },
            {
                name: t('yuiNavSteps.flpConfigName'),
                description: t('yuiNavSteps.flpConfigDesc', { projectName: path.basename(this.projectRootPath) })
            }
        ]);
        this.setPromptsCallback = (fn) => {
            if (this.prompts) {
                this.prompts.setCallback(fn);
            }
        };
    }
}
