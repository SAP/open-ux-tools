import Generator from 'yeoman-generator';
import ReferenceLibGenLogger from '../utils/logger';
import { workspace } from 'vscode';
import { AppWizard, MessageType } from '@sap-devx/yeoman-ui-types';
import { generate } from '@sap-ux/ui5-library-reference-writer';
import {
    isExtensionInstalled,
    sendTelemetry,
    TelemetryHelper,
    YUI_EXTENSION_ID,
    YUI_MIN_VER_FILES_GENERATED_MSG
} from '@sap-ux/fiori-generator-shared';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { prompt } from '@sap-ux/ui5-library-reference-inquirer';
import { t } from '../utils/i18n';
import { EventName } from '../telemetryEvents';
import type { UI5ReferenceLibGenerator } from './types';
import type { Prompts } from '@sap-devx/yeoman-ui-types';
import type { ReuseLibConfig } from '@sap-ux/ui5-library-reference-writer';
import type { YeomanEnvironment } from '@sap-ux/fiori-generator-shared';
import type { InquirerAdapter, UI5LibraryReferenceAnswers } from '@sap-ux/ui5-library-reference-inquirer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let vscode: any | undefined;
// Dynamically load vscode if available
try {
    vscode = require('vscode');
} catch (e) {
    // Vscode not available
}

/**
 * Generator for adding a UI5 library reference to a Fiori application.
 */
export default class extends Generator implements UI5ReferenceLibGenerator {
    answers: UI5LibraryReferenceAnswers = {};
    prompts: Prompts;
    appWizard: AppWizard;
    basePath: string;

    /**
     * Constructor for the generator.
     *
     * @param args - arguments passed to the generator
     * @param opts - options passed to the generator
     */
    constructor(args: string | string[], opts: Generator.GeneratorOptions) {
        super(args, opts, {
            unique: 'namespace'
        });
        this.appWizard = opts.appWizard || AppWizard.create(opts);
        ReferenceLibGenLogger.configureLogging(
            this.options.logger,
            this.rootGeneratorName(),
            this.log,
            this.options.vscode,
            this.options.logLevel
        );

        if ((this.env as unknown as YeomanEnvironment).conflicter) {
            (this.env as unknown as YeomanEnvironment).conflicter.force = true;
        }
    }

    async default(): Promise<void> {
        await TelemetryHelper.initTelemetrySettings({
            consumerModule: {
                name: '@sap-ux/ui5-library-reference-sub-generator',
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });
    }

    public async prompting(): Promise<void> {
        let inquirerAdaptor;

        if ((this.env as unknown as YeomanEnvironment)?.adapter?.actualAdapter) {
            inquirerAdaptor = (this.env as unknown as YeomanEnvironment).adapter.actualAdapter;
        } else {
            inquirerAdaptor = this.env?.adapter;
        }
        const answers = await prompt(workspace.workspaceFolders, inquirerAdaptor as InquirerAdapter);
        Object.assign(this.answers, answers);
    }

    public async writing(): Promise<void> {
        const reuseLibConfigs: ReuseLibConfig[] = [];
        if (this.answers.referenceLibraries) {
            for (const lib of this.answers.referenceLibraries) {
                reuseLibConfigs.push({
                    name: lib.name,
                    path: lib.path,
                    type: lib.type,
                    uri: lib.uri
                });
            }
        }

        try {
            if (this.answers.targetProjectFolder) {
                await generate(this.answers.targetProjectFolder, reuseLibConfigs, this.fs);
            }
        } catch (e) {
            ReferenceLibGenLogger.logger.error(e);
            throw new Error(t('error.updatingApp'));
        }
    }

    end(): void {
        try {
            if (isExtensionInstalled(vscode, YUI_EXTENSION_ID, YUI_MIN_VER_FILES_GENERATED_MSG)) {
                this.appWizard?.showInformation(t('info.filesGenerated'), MessageType.notification);
            }
            const telemetryData = TelemetryHelper.createTelemetryData();
            if (telemetryData) {
                sendTelemetry(EventName.LIB_REFERENCE_ADDED, telemetryData, this.answers.targetProjectFolder).catch(
                    (error) => {
                        ReferenceLibGenLogger.logger.error(t('error.telemetry', { error }));
                    }
                );
            }
        } catch (error) {
            ReferenceLibGenLogger.logger.error(t('error.endPhase'));
        }
    }
}
