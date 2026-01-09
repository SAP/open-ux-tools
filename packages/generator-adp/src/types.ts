export enum GeneratorTypes {
    ADD_ANNOTATIONS_TO_DATA = 'Add Local Annotation File',
    ADD_COMPONENT_USAGES = 'Add SAPUI5 Component Usages',
    ADD_NEW_MODEL = 'Add OData Service And SAPUI5 Model',
    CHANGE_DATA_SOURCE = 'Replace OData Service'
}

export interface Credentials {
    username: string;
    password: string;
}

/**
 * Properties that can be timed (duration measurements in milliseconds).
 */
export interface AdpTelemetryTimerProperties {
    /**
     * Application list loading time in milliseconds.
     */
    applicationListLoadingTime?: number;
}

/**
 * Regular telemetry data properties (non-timing).
 */
export interface AdpTelemetryProperties {
    /**
     * Project type: onprem, cloud, or cf.
     */
    projectType?: 'onPremise' | 'cloudReady' | 'cf';
    /**
     * Base app technical name (SAP app ID).
     */
    baseAppTechnicalName?: string;
    /**
     * UI5 version selected by the user.
     */
    ui5VersionSelected?: string;
    /**
     * System UI5 version detected.
     */
    systemUI5Version?: string;
    /**
     * Number of applications in the list.
     */
    numberOfApplications?: number;
    /**
     * Whether an extension project was generated.
     */
    wasExtProjectGenerated: boolean;
    /**
     * Whether FLP configuration was done during initial generation.
     */
    wasFlpConfigDone: boolean;
    /**
     * Whether deploy configuration was done during initial generation.
     */
    wasDeployConfigDone: boolean;
    /**
     * Whether TypeScript was chosen.
     */
    wasTypeScriptChosen: boolean;
}

/**
 * Complete telemetry data collected throughout the ADP generation process.
 */
export interface AdpTelemetryData extends AdpTelemetryProperties, AdpTelemetryTimerProperties {}
