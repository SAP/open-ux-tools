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
    launchFlpConfigAsSubGenerator: boolean;
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
        this.launchFlpConfigAsSubGenerator = Boolean(opts.launchFlpConfigAsSubGenerator);
        this.manifest = opts.manifest as Manifest;
        this.logger = new ToolsLogger();

        this.projectRootPath = opts.data?.projectRootPath ?? this.destinationRoot();

        // If launched standalone add nav steps
        if (!this.launchFlpConfigAsSubGenerator) {
            this.prompts = new Prompts([
                {
                    name: 'System Selection',
                    description: 'Select the system to use for the FLP Configuration'
                },
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
        }
    }

    async initializing(): Promise<void> {
        // Generator does not support CF projects
        if (isCFEnvironment(this.projectRootPath)) {
            this.appWizard.showError('FLP Configuration is not supported for CF projects', MessageType.notification);
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
        if (!this.launchFlpConfigAsSubGenerator) {
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
        // if (!this.launchFlpConfigAsSubGenerator) {
        await generateInboundConfig(this.projectRootPath, this.answers as InternalInboundNavigation, this.fs);
        // fs.commit(() => this.appWizard?.showInformation('FLP Configuration complete', MessageType.notification));
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
            this.appWizard.showError('Couldn not find the configured system', MessageType.notification);
            throw new Error('Could not find the configured system.');
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
        await this.prompt(systemSelectionQuestions.prompts);
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
