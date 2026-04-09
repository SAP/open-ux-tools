import { initIcons } from '@sap-ux/ui-components';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import i18nEn from '../src/i18n/i18n.json';

// Initialize i18n synchronously for tests (initImmediate: false prevents async init)
i18n.use(initReactI18next).init({
    resources: {
        en: {
            translation: i18nEn
        }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false
    },
    showSupportNotice: false,
    initImmediate: false
});
initIcons();

// structuredClone is not available in jsdom
global.structuredClone = (v) => JSON.parse(JSON.stringify(v));
