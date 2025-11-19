import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { TelemetryHelper } from '@sap-ux/fiori-generator-shared';
import type { FioriAppGeneratorOptions } from '../fiori-app-generator';
import { APP_GENERATOR_MODULE, FioriAppGenerator } from '../fiori-app-generator';
import { initI18nFioriAppSubGenerator, t } from '../utils/i18n';
import { transformExtState } from './transforms';

/**
 * Generator that allows the creation of a Fiori applications without prompting based on a provided app config.
 */
export class FioriAppGeneratorHeadless extends FioriAppGenerator {
    /**
     *
     * @param args
     * @param opts
     */
    public constructor(args: string | string[], opts: FioriAppGeneratorOptions) {
        super(args, opts);
        this.log(
            t('logMessages.generatingAppWithVersion', {
                generatorName: '@sap-ux/fiori-app-sub-generator:headless',
                generatorVersion: this.rootGeneratorVersion()
            })
        );

        try {
            this.state = transformExtState(this.options.appConfig);
        } catch (error) {
            this.log(t('logMessages.generatorExiting'));
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
            watchTelemetrySettingStore: false,
            resourceId:
                (this.options.appConfig.telemetryData?.resourceId as string) ||
                process.env.SAP_UX_FIORI_TOOLS_TELEMETRY_RESOURCE_ID
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
