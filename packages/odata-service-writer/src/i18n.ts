import i18next, { TOptions } from 'i18next';
import translations from './translations/odata-service-writer.i18n.json';

const NS = 'odata-service-writer';

export async function initI18n(): Promise<void> {
    await i18next.init({
        resources: {
            en: {
                [NS]: translations
            }
        },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: NS,
        ns: [NS]
    });
}

export function t(key: string, options?: TOptions): string {
    return i18next.t(key, options);
}

initI18n();
