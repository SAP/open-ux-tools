import { join } from 'path';
import { AppWizard, MessageType, Prompts } from '@sap-devx/yeoman-ui-types';
import {
    DeploymentGenerator,
    handleErrorMessage,
    isS4Installed,
    getS4Prompts
} from '@sap-ux/deploy-config-generator-shared';
import { getPrompts } from '@sap-ux/flp-config-inquirer';
import { generateInboundNavigationConfig } from '@sap-ux/app-config-writer';
import { FileName, getWebappPath, getI18nPropertiesPaths } from '@sap-ux/project-access';
import { createPropertiesI18nEntries } from '@sap-ux/i18n';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import {
    sendTelemetry,
    TelemetryHelper,
    isExtensionInstalled,
    getHostEnvironment,
    hostEnvironment,
    YUI_EXTENSION_ID,
    YUI_MIN_VER_FILES_GENERATED_MSG
} from '@sap-ux/fiori-generator-shared';
import { withCondition } from '@sap-ux/inquirer-common';
import { generatorTitle, i18nKeySubTitle, i18nKeyTitle } from '../utils/constants';
import { t } from '../utils';
import { getYuiNavStep } from '../utils/prompts';
import { EventName } from '../telemetryEvents';
import type { FLPConfigAnswers } from '@sap-ux/flp-config-inquirer';
import type { YeomanEnvironment, VSCodeInstance } from '@sap-ux/fiori-generator-shared';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import type { FlpConfigOptions } from './types';
import type { Answers, Question } from 'inquirer';

/**
 * FLP config generator adds an inbound navigation config to an existing manifest.json.
 */
export default class extends DeploymentGenerator {
    private readonly appWizard: AppWizard;
    private readonly vscode?: VSCodeInstance;
    private readonly launchFlpConfigAsSubGenerator: boolean;
    private readonly existingApp: boolean;
    private readonly appRootPath: string;
    private readonly prompts: Prompts;
    private answers: FLPConfigAnswers;
    private abort = false;
    private manifest: Partial<Manifest>;
    private manifestPath: string;
    public options: FlpConfigOptions;

    setPromptsCallback: (fn: object) => void;

    /**
     * Constructor for FLP config generator.
     *
     * @param args - arguments passed to the generator
     * @param opts - options passed to the generator
     */
    constructor(args: string | string[], opts: FlpConfigOptions) {
        super(args, opts);

        this.appWizard = opts.appWizard ?? AppWizard.create(opts);
        this.vscode = opts.vscode;
        this.launchFlpConfigAsSubGenerator = opts.launchFlpConfigAsSubGenerator ?? false;
        this.appRootPath = opts?.data?.appRootPath ?? opts?.appRootPath ?? this.destinationRoot();
        this.options = opts;

        // If launched standalone, add nav steps
        if (!this.launchFlpConfigAsSubGenerator) {
            this.appWizard.setHeaderTitle(generatorTitle);
            this.prompts = new Prompts(getYuiNavStep(this.appRootPath));
            this.setPromptsCallback = (fn): void => {
                if (this.prompts) {
                    this.prompts.setCallback(fn);
                }
            };
            this.existingApp = true; // generator is launched standalone so app must exist
        }
    }

    public async initializing(): Promise<void> {
        if ((this.env as unknown as YeomanEnvironment).conflicter) {
            (this.env as unknown as YeomanEnvironment).conflicter.force = this.options.force ?? true;
        }

        await TelemetryHelper.initTelemetrySettings({
            consumerModule: {
                name: '@sap/generator-fiori-deployment:flp-config',
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });

        if (this.existingApp) {
            this.manifestPath = join(await getWebappPath(this.appRootPath), FileName.Manifest);
            this.manifest = this.fs.readJSON(this.manifestPath) as Partial<Manifest> as Manifest;

            if (!this.manifest) {
                handleErrorMessage(this.appWizard, t('error.noManifest', { path: this.manifestPath }));
            }
            if (!this.manifest['sap.app']) {
                handleErrorMessage(this.appWizard, t('error.sapNotDefined'));
            }
        }
    }

    public async prompting(): Promise<void> {
        // FLP answers may already be provided. e.g. headless or LCAP flow.
        if (
            this.launchFlpConfigAsSubGenerator &&
            this.options.inboundConfig?.semanticObject !== undefined &&
            this.options.inboundConfig?.action !== undefined &&
            this.options.inboundConfig?.title !== undefined &&
            this.options.skipPrompt
        ) {
            this.answers = {
                overwrite: true,
                semanticObject: this.options.inboundConfig.semanticObject,
                action: this.options.inboundConfig.action,
                title: this.options.inboundConfig.title,
                subTitle: this.options.inboundConfig.subTitle
            };
            return;
        }

        // Get existing inbounds
        let inbounds: ManifestNamespace.Inbound = {};

        if (this.manifest?.['sap.app']?.crossNavigation?.inbounds) {
            inbounds = this.manifest?.['sap.app']?.crossNavigation?.inbounds;
        }

        const silentOverwrite = this.options.overwrite;
        let questions: Question[] = (await getPrompts(inbounds, undefined, {
            silentOverwrite,
            inboundId: { hide: true },
            emptyInboundsInfo: { hide: true },
            additionalParameters: { hide: true },
            createAnotherInbound: { hide: true }
        })) as Question[];

        // Show S/4 specific prompt only if launched standalone or CLI since Fiori generator will show warn when run in YUI
        if (
            (getHostEnvironment() === hostEnvironment.cli || !this.options.launchFlpConfigAsSubGenerator) &&
            (await isS4Installed(this.options.vscode?.workspace?.getConfiguration()))
        ) {
            const s4Prompts = getS4Prompts('FLP');
            questions = withCondition(questions, (answers: Answers) => answers.s4Continue);
            questions.unshift(...s4Prompts);
        }

        this.answers = {} as FLPConfigAnswers;

        const answers = await this.prompt(questions);
        if (answers.s4Continue === false || (answers.overwrite === false && !silentOverwrite)) {
            this.abort = true;
            process.exit(0); // only relevant for CLI
        }

        if (answers.subTitle === '') {
            // '' (empty string) should be set as undefined
            answers.subTitle = undefined;
        }

        Object.assign(this.answers, answers);
    }

    public async writing(): Promise<void> {
        if (this.abort === false && this.existingApp) {
            await this._updateFiles(this.answers);
        }
    }

    /**
     * Updates the manifest and i18n files with the inbound config.
     *
     * @param inboundConfig - the inbound config
     * @param inboundConfig.semanticObject - the semantic object
     * @param inboundConfig.action - the action
     * @param inboundConfig.title - the title
     * @param inboundConfig.subTitle - the subtitle
     * @returns a promise that resolves when the files have been updated
     */
    private async _updateFiles({ semanticObject, action, title, subTitle }: FLPConfigAnswers): Promise<void> {
        let keysAdded = false;
        if (title) {
            keysAdded = await this._updateI18n(this.manifestPath, this.manifest as Manifest, {
                title,
                subTitle
            });
        }
        await generateInboundNavigationConfig(
            this.appRootPath,
            {
                semanticObject,
                action,
                title: keysAdded ? `{{${i18nKeyTitle}}}` : title,
                subTitle: keysAdded && subTitle ? `{{${i18nKeySubTitle}}}` : subTitle
            },
            true,
            this.fs
        );
    }

    /**
     * Update the i18n file. If a i18n.properties file does not exits, it tries to create.
     *
     * @param manifestPath - path to manifest.json
     * @param manifest - parsed content of manifest.json
     * @param titles - the titles to be added to the i18n file
     * @param titles.title - the title to be added to the i18n file
     * @param titles.subTitle - the subtitle to be added to the i18n file
     * @returns true if the i18n file was updated with the key/values
     */
    private async _updateI18n(
        manifestPath: string,
        manifest: Manifest,
        { title, subTitle }: { title: string; subTitle?: string }
    ): Promise<boolean> {
        let createProps = false;
        const { 'sap.app': i18nPath } = await getI18nPropertiesPaths(manifestPath, manifest);
        try {
            const i18nEntries = [{ key: i18nKeyTitle, value: title }];
            if (subTitle) {
                i18nEntries.push({ key: i18nKeySubTitle, value: subTitle });
            }
            createProps = await createPropertiesI18nEntries(i18nPath, i18nEntries, this.appRootPath, this.fs);
        } catch (error) {
            const errorMsg = t('warning.updatei18n', { path: i18nPath });
            this.appWizard.showWarning(errorMsg, MessageType.notification);
            DeploymentGenerator.logger?.error(errorMsg);
        }
        return createProps;
    }

    public async end(): Promise<void> {
        // The app would not have been generated until after the writing phase due to the current ordering of the composeWith from Fiori generators
        if (this.abort === false && !this.existingApp) {
            this.manifestPath = join(await getWebappPath(this.appRootPath), FileName.Manifest);
            this.manifest = this.fs.readJSON(this.manifestPath) as Partial<Manifest>;
            await this._updateFiles(this.answers);
        }

        try {
            if (
                !this.options.launchFlpConfigAsSubGenerator &&
                isExtensionInstalled(this.vscode, YUI_EXTENSION_ID, YUI_MIN_VER_FILES_GENERATED_MSG)
            ) {
                this.appWizard?.showInformation(t('info.filesGenerated'), MessageType.notification);
            }
            sendTelemetry(
                EventName.GENERATION_SUCCESS,
                TelemetryHelper.createTelemetryData({
                    appType: 'flp-config',
                    ...this.options.telemetryData
                }) ?? {}
            ).catch((error) => {
                DeploymentGenerator.logger.error(t('error.telemetry', { error }));
            });
        } catch (error) {
            DeploymentGenerator.logger?.error(t('error.endPhase', { error }));
        }
    }
}

export type { FlpConfigOptions };
