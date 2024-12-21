import Generator from 'yeoman-generator';
import type { Manifest } from '@sap-ux/project-access';
import type { FlpConfigOptions } from './types';
import type { Question } from 'inquirer';
import { getSystemSelectionQuestions } from '@sap-ux/odata-service-inquirer';

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
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { type AbapTarget } from '@sap-ux/system-access';
import { getPrompts, type FLPConfigAnswers } from '@sap-ux/flp-config-inquirer';
import { AppWizard, Prompts, MessageType } from '@sap-devx/yeoman-ui-types';
import { TelemetryHelper } from '@sap-ux/fiori-generator-shared';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { FileName } from '@sap-ux/project-access';
import { isAppStudio } from '@sap-ux/btp-utils';
import { SystemService, BackendSystemKey } from '@sap-ux/store';

/**
 * Generator for adding a FLP configuration to an Adaptation Project.
 *
 * @extends Generator
 */
export default class extends Generator {
    setPromptsCallback: (fn: object) => void;
    prompts: Prompts;
    existingProject: boolean; // Are we adding to an existing app or will a new app be generated in the writing phase of a parent generator
    appWizard: AppWizard;
    manifest: Manifest;
    projectRootPath: string = '';
    answers: FLPConfigAnswers;
    logger: ToolsLogger;

    /**
     * Creates an instance of the generator.
     *
     * @param {string | string[]} args - The arguments passed to the generator.
     * @param {FlpConfigOptions} opts - The options for the generator.
     */
    constructor(args: string | string[], opts: FlpConfigOptions) {
        super(args, opts);
        this.appWizard = opts.appWizard ?? AppWizard.create(opts);
        this.logger = new ToolsLogger();

        this.projectRootPath = opts.data?.projectRootPath ?? this.destinationRoot();

        // If launched standalone add nav steps
        if (!opts.launchFlpConfigAsSubGenerator) {
            this.prompts = new Prompts([
                {
                    name: 'FLP Configuration',
                    description: `FLP Configuration for ${path.basename(this.projectRootPath)}`
                }
            ]);
            this.setPromptsCallback = (fn) => {
                if (this.prompts) {
                    this.prompts.setCallback(fn);
                }
            };
            this.existingProject = true; // If this generator is composedWith Adaptation Project generator we assume the project is not written yet
        }
    }

    async initializing(): Promise<void> {
        // Generator does not support CF projects
        if (isCFEnvironment(this.projectRootPath)) {
            //TODO: Throw error in the UI
            //handleErrorMessage(this.appWizard, t('ERROR_CF_PROJECT_NOT_SUPPORTED'));
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
        await this._fetchManifest();
        const inbounds = getInboundsFromManifest(this.manifest);
        const appId = getRegistrationIdFromManifest(this.manifest);
        const prompts: Question<FLPConfigAnswers>[] = await getPrompts(inbounds, appId, { overwrite: { hide: true } });
        this.answers = (await this.prompt(prompts)) as FLPConfigAnswers;
    }

    async writing(): Promise<void> {
        if (this.existingProject) {
            const fs = await generateInboundConfig(this.projectRootPath, this.answers as InternalInboundNavigation);
            fs.commit(() => this.appWizard?.showInformation('FLP Configuration complete', MessageType.notification));
        }
    }

    public async end(): Promise<void> {
        // if (this.existingProject) {
        //     generateInboundConfig(this.projectRootPath, this.answers as InternalInboundNavigation);
        // }
    }

    /**
     * Finds the configured system based on the provided target.
     *
     * @param {AbapTarget} target - The target ABAP system.
     * @returns {Promise<string>} The configured system.
     */
    private async _findConfiguredSystem(target: AbapTarget): Promise<string> {
        let configuredSystem: string | undefined;
        if (isAppStudio()) {
            configuredSystem = target.destination;
        } else {
            const systemService = new SystemService(this.logger);
            const backendSystem = new BackendSystemKey({ url: target.url as string, client: target.client ?? '' });
            configuredSystem = (await systemService.read(backendSystem))?.name;
        }

        if (!configuredSystem) {
            //TODO: Throw error in the UI
            throw new Error("Couldn't find the configured system.");
        }

        return configuredSystem;
    }

    private async _fetchManifest(): Promise<void> {
        const { target } = await getAdpConfig(this.projectRootPath, join(this.projectRootPath, FileName.Ui5Yaml));

        const configuredSystem = await this._findConfiguredSystem(target);
        const systemSelectionQuestions = await getSystemSelectionQuestions({
            systemSelection: { onlyShowDefaultChoice: true, defaultChoice: configuredSystem },
            serviceSelection: { hide: true }
        });

        const variant = getVariant(this.projectRootPath);
        const manifestService = await ManifestService.initMergedManifest(
            systemSelectionQuestions.answers.connectedSystem?.serviceProvider as AbapServiceProvider,
            this.projectRootPath,
            variant,
            this.logger
        );
        this.manifest = manifestService.getManifest();
    }
}
