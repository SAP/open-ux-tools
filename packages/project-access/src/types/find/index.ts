import type { Manifest } from '../webapp';

export type FioriArtifactTypes = 'applications' | 'adaptations' | 'extensions' | 'libraries';

/**
 * Search result when searching for apps. It is valid for all types of
 * Fiori apps, like Fiori elements, UI5 freestyle, apps that are part
 * of CAP projects.
 */
export interface AllAppResults {
    /**
     * Application root is where package.json and ui5.yaml resides.
     */
    appRoot: string;
    /**
     * Project root is different from appRoot for CAP applications only,
     * where the project root is the root of the CAP project. For all
     * other applications it is the same as appRoot.
     */
    projectRoot: string;
    /**
     * Path to the manifest.json, by default the webapp path but can be
     * configured in ui5.yaml
     */
    manifestPath: string;
    /**
     * Parsed content of the manifest.json to avoid multiple reads when working with
     * the search results.
     */
    manifest: Manifest;
}

/**
 * Search result when searching for adaptation projects.
 */
export interface AdaptationResults {
    /**
     * Root of the adapted application where package.json and ui5.yaml resides.
     */
    appRoot: string;

    /**
     * Path to manifest.appdescr_variant
     */
    manifestAppdescrVariantPath: string;
    /**
     * Project root is different from appRoot for CAP applications only,
     * where the project root is the root of the CAP project. For all
     * other applications it is the same as appRoot.
     */
    projectRoot: string;
}

/**
 * Search result when searching for extension projects.
 */
export interface ExtensionResults {
    /**
     * Root of the extended application where package.json and ui5.yaml resides.
     */
    appRoot: string;
    /**
     * Path to the manifest.json, by default the webapp path but can be
     * configured in ui5.yaml
     */
    manifestPath: string;
    /**
     * Parsed content of the manifest.json to avoid multiple reads when working with
     * the search results.
     */
    manifest: Manifest;
}

/**
 * Search result when searching for libraries.
 */
export interface LibraryResults {
    /**
     * Root of the library project, where package.json and ui5.yaml resides.
     */
    projectRoot: string;
    /**
     * Path to the manifest.json of the library.
     */
    manifestPath?: string;
    /**
     * Parsed content of the manifest.json to avoid multiple reads when working with
     * the search results.
     */
    manifest?: Manifest;
    /**
     * Path to the .library file of the library, if existing.
     */
    libraryPath?: string;
}

export interface FoundFioriArtifacts {
    applications?: AllAppResults[];
    adaptations?: AdaptationResults[];
    extensions?: ExtensionResults[];
    libraries?: LibraryResults[];
}
