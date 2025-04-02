import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { TelemetryHelper } from '@sap-ux/fiori-generator-shared';
import type { FioriAppGeneratorOptions } from '../fiori-app-generator';
import { APP_GENERATOR_MODULE, FioriAppGenerator } from '../fiori-app-generator';
import { initI18nFioriAppSubGenerator, t } from '../utils/i18n';
import { transformExtState } from './transforms';

/**
 *
 */
export default class extends FioriAppGenerator {
    /**
     *
     * @param args
     * @param opts
     */
    public constructor(args: string | string[], opts: FioriAppGeneratorOptions) {
        super(args, opts);
        this.log(
            t('INFO_GENERATOR_NAME_VERSION', {
                generatorName: 'Combined FE/FF generator', //todo: replace with the actual generator name
                generatorVersion: this.rootGeneratorVersion()
            })
        );

        try {
            this.state = transformExtState(this.options.appConfig);
        } catch (error) {
            this.log(t('ERROR_GENERATION_EXITING'));
            this.env.error(error);
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
