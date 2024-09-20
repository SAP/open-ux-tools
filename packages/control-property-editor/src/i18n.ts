import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as i18nEn from './i18n/i18n.json';

/**
 *
 * @param language default to 'en'
 */
export function initI18n(language = 'en'): void {
    i18n.use(initReactI18next)
        .init({
            resources: {
                en: {
                    translation: i18nEn
                }
            },
            lng: language,
            fallbackLng: 'en',
            interpolation: {
                escapeValue: false
            }
        })
        .catch((error) => console.error(error));
}
