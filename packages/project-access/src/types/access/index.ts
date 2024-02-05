import type { I18nBundles, NewI18nEntry } from '../i18n';
import type { ApplicationStructure, I18nPropertiesPaths, Project, ProjectType } from '../info';

interface BaseAccess {
    readonly project: Project;
    readonly root: string;
    readonly projectType: ProjectType;
}

export interface ApplicationAccess extends BaseAccess {
    readonly app: ApplicationStructure;
    createAnnotationI18nEntries(newEntries: NewI18nEntry[]): Promise<boolean>;
    createUI5I18nEntries(newEntries: NewI18nEntry[], modelKey?: string): Promise<boolean>;
    createManifestI18nEntries(newEntries: NewI18nEntry[]): Promise<boolean>;
    createCapI18nEntries(filePath: string, newI18nEntries: NewI18nEntry[]): Promise<boolean>;
    getAppId(): string;
    getAppRoot(): string;
    getCapI18nFolderNames(): Promise<string[]>;
    getI18nBundles(): Promise<I18nBundles>;
    getI18nPropertiesPaths(): Promise<I18nPropertiesPaths>;
}

export interface ProjectAccess extends BaseAccess {
    getApplicationIds: () => string[];
    getApplication: (appId: string) => ApplicationAccess;
}
