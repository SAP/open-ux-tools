import { Content } from '../types';

/**
 * Returns a model enhancement change configuration.
 *
 * @returns {Content} The model change configuration.
 */
export function getNewModelEnhanceWithChange(): Content {
    return {
        changeType: 'appdescr_ui5_addNewModelEnhanceWith',
        content: {
            modelId: 'i18n',
            bundleUrl: 'i18n/i18n.properties',
            supportedLocales: [''],
            fallbackLocale: ''
        }
    };
}
