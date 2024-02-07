import type { i18n as i18nNext } from 'i18next';
import i18next from 'i18next';
import i18nEn from './i18n/i18n.json';

export const i18n: i18nNext = i18next.createInstance();

/**
 * Initialize i18next of @sap/ux-cds-odata-annotation-converter.
 */
export async function initI18n(): Promise<void> {
    await i18n.init({
        resources: {
            en: {
                translation: i18nEn
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        joinArrays: '\n\n'
    });
}
