interface CSNServices {
    runtimeName: string;
    csnServiceName: string;
}

/**
 * ABAP CSN properties and services.
 */
export interface AbapCSN {
    packageUri: string;
    csnName: string;
    services: CSNServices[];
}

/**
 * Interface representing external parameters for the .appGenInfo.json file.
 */
export type ExternalParameters = {
    [key: string]: string | object | object[];
};

/**
 * Interface representing the configuration for entity-related information in AppGen.
 */
interface EntityRelatedConfig {
    type: string; // e.g "Main Entity", "Navigation Entity", "Filter Entity Type"
    value: string; // value of the entity
}

/**
 * Interface representing the configuration for generating info files for AppGen i.e. README.md & .appGenInfo.json.
 * Extendable with externalParameters - which will be used for writing to the .appGenInfo.json file.
 */
export interface AppGenInfo {
    /** The name of the application. */
    appName: string;
    /** The title of the application. */
    appTitle: string;
    /** The namespace of the application. */
    appNamespace: string;
    /** The description of the application. */
    appDescription: string;
    /** The name of generator used. */
    generatorName: string;
    /** The version of the generator used. */
    generatorVersion: string;
    /** The floorplan template name used to generate the application. */
    template: string;
    /** The ui5 version used in the application. */
    ui5Version?: string;
    /** The UI5 theme used in the application. */
    ui5Theme?: string;
    /** The date when the generator was run. */
    generationDate?: string;
    /** The ID of the service used in the application */
    serviceId?: string;
    /** The service URL of the application */
    serviceUrl?: string;
    /** The service type for the application. */
    serviceType?: string;
    /** The platform on which the generator was run.  */
    generatorPlatform?: string;
    /** The filename of the metadata file */
    metadataFilename?: string;
    /** Flag indicating whether code assistance is enabled. */
    enableCodeAssist?: boolean;
    /** Flag indicating whether TypeScript is enabled. */
    enableTypeScript?: boolean;
    /** Flag indicating whether ESLint is enabled. */
    enableEslint?: boolean;
    /** Flag indicating whether to show mock data info. */
    showMockDataInfo?: boolean;
    /** Text used to launch the application */
    launchText?: string;
    /**
     * An array used to store information on the various entities, e.g main, navigation entity, and filter entity type.
     */
    entityRelatedConfig?: EntityRelatedConfig[];
    /**
     * Additional external parameters.
     * N.B. these will be added to the .appGenInfo.json file only
     */
    externalParameters?: ExternalParameters;
}
