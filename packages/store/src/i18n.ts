import type { TOptions, TOptionsBase, i18n } from 'i18next';
import i18next from 'i18next';
import FilesystemBackend from 'i18next-fs-backend';
import path from 'path';

const i18nInstance: i18n = i18next.createInstance();
export async function initI18n(): Promise<void> {
    await i18nInstance.use(FilesystemBackend).init({
        initImmediate: false,
        fallbackLng: 'en',
        fallbackNS: 'default',
        interpolation: { escapeValue: false },
        ns: 'ux-store',
        defaultNS: 'ux-store',
        backend: {
            loadPath: path.join(__dirname, './translations/{{lng}}.{{ns}}.json')
        }
    });
}

type StringMap = { [key: string]: unknown };
export function text(key: string, options?: string | TOptions<StringMap & TOptionsBase>): string {
    return i18nInstance.t(key, options);
}
