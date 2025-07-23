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

// Union types to expose a single interface property for Floorplan
// This provides a layer of abstraction to isolate internal changes from external headless API consumers
// Since these keys are used as an external API definiton they need to be meaningful
// Note that ordering here determines rendering order
/**
 * Due to ts(18033) we cannot use the type values directly here:
 * FF_SIMPLE = FFTemplateType.Basic // Once https://github.com/microsoft/TypeScript/pull/59475 is merged we can remove the hardcoded values and directly use the template values
 */
export enum FloorplanFF {
    FF_SIMPLE = 'basic'
}
/**
 * Due to ts(18033) we cannot use the type values directly here:
 * Once https://github.com/microsoft/TypeScript/pull/59475 is merged we can remove hardcoded values and directly use the template values
 * FE_FPM = FETemplateType.FlexibleProgrammingModel,
 * FE_LROP = FETemplateType.ListReportObjectPage,
 * FE_OVP = FETemplateType.OverviewPage,
 * FE_ALP = FETemplateType.AnalyticalListPage,
 * FE_FEOP = FETemplateType.FormEntryObjectPage,
 * FE_WORKLIST = FETemplateType.Worklist
 */
export enum FloorplanFE {
    FE_FPM = 'fpm',
    FE_LROP = 'lrop',
    FE_OVP = 'ovp',
    FE_ALP = 'alp',
    FE_FEOP = 'feop',
    FE_WORKLIST = 'worklist'
}

// Used internally to join Floorplan types from multiple generators (until we have a merged type)
export type Floorplan = FloorplanFE | FloorplanFF;

// Used in external interfaces to define floorplans using a simple meaningful string key
export type FloorplanKey = keyof typeof FloorplanFE | keyof typeof FloorplanFF;
