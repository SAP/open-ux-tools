import type { I18nBundles, NewI18nEntry } from '../i18n';
import type { I18nPropertiesPaths } from '../info';

export interface ApplicationAccess {
    createAnnotationI18nEntries: (newEntries: NewI18nEntry[]) => Promise<boolean>;
    createUI5I18nEntries(newEntries: NewI18nEntry[], modelKey?: string): Promise<boolean>;
    createManifestI18nEntries: (newEntries: NewI18nEntry[]) => Promise<boolean>;
    createCapI18nEntries: (filePath: string, newI18nEntries: NewI18nEntry[]) => Promise<boolean>;
    getCapI18nFolderNames: () => Promise<string[]>;
    getI18nBundles: () => Promise<I18nBundles>;
    getI18nPropertiesPaths: () => Promise<I18nPropertiesPaths>;
}

export interface ProjectAccess {
    getApplicationIds: () => string[];
    getApplication: (appId: string) => ApplicationAccess;
}
