import type { I18nBundle } from '@sap-ux/i18n';

export type {
    CdsI18nConfiguration,
    CdsI18nEnv,
    I18nAnnotation,
    I18nBundle,
    I18nEntry,
    NewI18nEntry,
    SapTextType,
    ValueNode
} from '@sap-ux/i18n';

export { SapShortTextType, SapLongTextType } from '@sap-ux/i18n';

export interface I18nBundles {
    /**
     * i18n bundle for `i18n` of `"sap.app"` namespace in `manifest.json` file
     */
    'sap.app': I18nBundle;
    /**
     * i18n bundle for `models` entry of `sap.ui5` namespace in `manifest.json` file with type `sap.ui.model.resource.ResourceModel`
     */
    models: {
        [modelKey: string]: I18nBundle;
    };
    /**
     * i18n bundle for cap services
     */
    service: I18nBundle;
}
