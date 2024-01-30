import type { CapProjectType } from '../cap';
import type { ManifestNamespace } from '../webapp';

export interface Project {
    /**
     * Path to the project root
     */
    root: string;

    /**
     * Applications in the project
     */
    apps: { [index: string]: ApplicationStructure };

    /**
     * Project type like 'EDMXBackend' | 'CAPJava' | 'CAPNodejs', see ProjectType
     */
    projectType: ProjectType;
}
export interface ApplicationStructure {
    /**
     * Path to the app root
     */
    appRoot: string;

    /**
     * Path to the manifest.json relative from project root
     */
    manifest: string;

    /**
     * Path to the folder containing changes, relative from project root
     */
    changes: string;

    /**
     * Path to i18n files, relative from project root
     */
    i18n: I18nPropertiesPaths;

    /**
     * Main service of the application
     */
    mainService?: string;

    /**
     * Service information with annotation references
     */
    services: { [index: string]: ServiceSpecification };
}

export interface I18nPropertiesPaths {
    'sap.app': string;
    'sap.ui5.i18n'?: string;
    'sap.ui5.@i18n'?: string;
}

export interface ServiceSpecification {
    uri?: string;
    local?: string;
    odataVersion?: ManifestNamespace.Setting['odataVersion'];
    annotations?: {
        uri?: string;
        local?: string;
    }[];
}

export type AppProgrammingLanguage = 'JavaScript' | 'TypeScript' | '';

export type ProjectType = 'EDMXBackend' | CapProjectType;

export type AppType =
    | 'SAP Fiori elements'
    | 'SAPUI5 freestyle'
    | 'SAPUI5 Extension'
    | 'Fiori Reuse'
    | 'Fiori Adaptation';
