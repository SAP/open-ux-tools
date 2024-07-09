import type { CapProjectType } from '../cap';
import type { ManifestNamespace } from '../webapp';

export interface Project {
    /**
     * Absolute path to the project root.
     */
    root: string;

    /**
     * Project type like 'EDMXBackend' | 'CAPJava' | 'CAPNodejs', see ProjectType.
     */
    projectType: ProjectType;

    /**
     * Applications in the project. For CAP projects the index is relative
     * path to the app, like apps/myapp. For single app projects the index
     * is an empty string ''.
     */
    apps: { [index: string]: ApplicationStructure };
}

export interface ApplicationStructure {
    /**
     * Absolute path to the application root.
     */
    appRoot: string;

    /**
     * Absolute path to the manifest.json.
     */
    manifest: string;

    /**
     * Absolute path to the folder containing changes.
     */
    changes: string;

    /**
     * Absolute paths to i18n files.
     */
    i18n: I18nPropertiesPaths;

    /**
     * Main service of the application.
     */
    mainService?: string;

    /**
     * Service information with annotation references and local annotation files.
     */
    services: { [index: string]: ServiceSpecification };

    /**
     * Application type.
     */
    appType: AppType;
}

export interface I18nPropertiesPaths {
    /**
     * Absolute path to the i18n.properties file from sap.app namespace.
     */
    'sap.app': string;
    models: {
        [modelKey: string]: {
            /**
             * Absolute path to the i18n.properties files.
             */
            path: string;
        };
    };
}

export type ODataVersion = NonNullable<ManifestNamespace.Setting['odataVersion']>;
export interface ServiceSpecification {
    uri?: string;
    local?: string;
    odataVersion?: ODataVersion;
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
