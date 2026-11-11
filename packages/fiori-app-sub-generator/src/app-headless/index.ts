import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { TelemetryHelper } from '@sap-ux/fiori-generator-shared';
import type { FEAppConfig, FFAppConfig } from '../types/index.js';
import type { FioriAppGeneratorOptions } from '../fiori-app-generator/index.js';
import { APP_GENERATOR_MODULE, FioriAppGenerator } from '../fiori-app-generator/index.js';
import { initI18nFioriAppSubGenerator, t } from '../utils/i18n.js';
import { transformExtState } from './transforms.js';
import { resolveExternalServices } from './resolve.js';

/**
 * Options for the headless Fiori application generator, which drives generation from a provided app config.
 */
export type FioriAppGeneratorHeadlessOptions = FioriAppGeneratorOptions & {
    appConfig: FEAppConfig | FFAppConfig;
};

/**
 * Generator that allows the creation of a Fiori applications without prompting based on a provided app config.
 */
export class FioriAppGeneratorHeadless extends FioriAppGenerator {
    declare options: FioriAppGeneratorHeadlessOptions;

    /**
     *
     * @param args
     * @param opts
     */
    public constructor(args: string[], opts: FioriAppGeneratorHeadlessOptions) {
        super(args, opts);
        this.log(
            t('logMessages.generatingAppWithVersion', {
                generatorName: '@sap-ux/fiori-app-sub-generator:headless',
                generatorVersion: this.rootGeneratorVersion()
            })
        );

        try {
            const appConfig = this.options.appConfig;
            if (appConfig.service?.externalServices) {
                appConfig.service.externalServices = resolveExternalServices(appConfig.service.externalServices);
            }
            this.state = transformExtState(appConfig);
        } catch (error) {
            this.log(t('logMessages.generatorExiting'));
            throw error;
        }
    }

    async initializing(): Promise<void> {
        // Ensure texts used in locally generated files, e.g. log messages, readme.md labels, etc. are available
        await initI18nFioriAppSubGenerator();
        await TelemetryHelper.initTelemetrySettings({
            consumerModule: {
                name: APP_GENERATOR_MODULE,
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });
        TelemetryHelper.createTelemetryData({
            AppGenLaunchSource: this.options.appConfig.telemetryData?.generationSourceName ?? 'Headless',
            AppGenLaunchSourceVersion: this.options.appConfig.telemetryData?.generationSourceVersion ?? 'Not Provided'
        });
    }

    /**
     * Defers to the base class implementation to handle the writing phase.
     *
     * @returns {Promise<void>}
     */
    async writing(): Promise<void> {
        return super.writing();
    }
    /**
     * Defers to the base class implementation to handle the install phase.
     *
     * @returns {Promise<void>}
     */
    async install(): Promise<void> {
        await super.install();
    }
    /**
     * Defers to the base class implementation to handle the end phase.
     *
     * @returns {Promise<void>}
     */
    async end(): Promise<void> {
        await super.end();
    }
}

export default FioriAppGeneratorHeadless;
