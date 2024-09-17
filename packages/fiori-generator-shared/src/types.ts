/**
 * Interface representing additional entries for the README file.
 */
interface AdditionalEntries {
    /** The label for the additional entry. */
    label: string;
    /** The value corresponding to the label of the additional entry. */
    value: string;
}

/**
 * Interface representing the configuration for generating a README file.
 * Extends OptionalEntries to include dynamic properties along with the core properties.
 */
export interface ReadMe {
    /** The name of the application. */
    appName: string;
    /** The title of the application. */
    appTitle: string;
    /** The namespace of the application. */
    appNamespace: string;
    /** The description of the application. */
    appDescription: string;
    /** The UI5 theme used in the application. */
    ui5Theme: string;
    /** The name of generator used. */
    generatorName: string;
    /** The version of the generator used. */
    generatorVersion: string;
    /** The ui5 version used in the application. */
    ui5Version: string;
    /** The floorplan template name used to generate the application. */
    template: string;
    /** The date when the generator was run. */
    generationDate?: string;
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
    /** Additional custom entries for the application. */
    additionalEntries?: AdditionalEntries[];
}
