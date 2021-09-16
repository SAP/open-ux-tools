import i18next, { TOptions } from 'i18next';
import commonTranslations from './translations/common.i18n.json';

const COMMON_NS = 'common';

export async function initI18n(): Promise<void> {
    await i18next.init({
        resources: {
            en: {
                [COMMON_NS]: commonTranslations
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: COMMON_NS,
        ns: [COMMON_NS]
    });
}

export function addTranslations(translations: object, ns: string): void {
    i18next.addResources('en', ns, translations);
}

export function t(key: string, options?: TOptions ): string {
    return i18next.t(key, options);
}

initI18n();
