import type { CapProjectType } from '../cap';
import type { ManifestNamespace } from '../webapp';

export interface Project {
    /**
     * Absolute path to the project root
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
     * Absolute path to the app root
     */
    appRoot: string;

    /**
     * Absolute path to the manifest.json
     */
    manifest: string;

    /**
     * Absolute path to the folder containing changes
     */
    changes: string;

    /**
     * Absolute path to i18n files
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
    models: {
        [modelKey: string]: {
            /**
             * Absolute path to the i18m.properties file
             */
            path: string;
        };
    };
}

export interface ServiceSpecification {
    uri?: string;
    local?: string;
    odataVersion?: ManifestNamespace.Setting['odataVersion'];
    annotations?: {
        uri?: string;
        /**
         * Absolute path to the local annotation file
         */
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
