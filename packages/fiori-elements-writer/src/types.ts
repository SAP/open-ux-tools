import type { Ui5App } from '@sap-ux/ui5-application-writer';
import type { OdataService } from '@sap-ux/odata-service-writer';

/**
 * Enumaration of all supported templates.
 */
export enum TemplateType {
    Worklist = 'worklist',
    ListReportObjectPage = 'lrop',
    AnalyticalListPage = 'alp',
    OverviewPage = 'ovp',
    FormEntryObjectPage = 'feop',
    FlexibleProgrammingModel = 'fpm'
}

/**
 * General validation error thrown if app config options contain invalid combinations
 */
export class ValidationError extends Error {
    /**
     * ValidationError constructor.
     *
     * @param message - the error message
     */
    constructor(message: string) {
        super(`Validation error: ${message}`);
        this.name = this.constructor.name;
    }
}

/**
 * Configuration of entities used in a Fiori elements application
 */
export interface EntityConfig {
    /**
     * The main entity that is used in the list report as well as the first object page.
     */
    mainEntityName: string; // Defines the main list page entity

    /**
     * Optional entitity used for the first nested object page
     */
    navigationEntity?: {
        EntitySet: string; // Defines the entity set for object page navigation
        Name: string; // Defines the entity name for object page navigation
    };
}

/**
 * Type of table that is rendered in list report or object page.
 * https://sapui5.hana.ondemand.com/sdk/#/topic/7f844f1021cd4791b8f7408eac7c1cec.html
 */
export enum TableType {
    GRID = 'GridTable',
    ANALYTICAL = 'AnalyticalTable',
    RESPONSIVE = 'ResponsiveTable'
}

/**
 * Support selection modes for tables in Fiori elements for OData v4
 * https://sapui5.hana.ondemand.com/sdk/#/topic/116b5d82e8c545e2a56e1b51b8b0a9bd.html
 */
export enum TableSelectionModeV4 {
    NONE = 'None',
    AUTO = 'Auto',
    MULTI = 'Multi',
    SINGLE = 'Single'
}

/**
 * Settings for the List report object page template in Fiori elements
 */
export interface LROPSettings {
    entityConfig: EntityConfig;
}

/**
 * Settings for the FPM template in Fiori elements for odata v4
 */
export interface FPMSettings {
    entityConfig: EntityConfig;
    pageName: string;
}

/**
 * Settings for the worklist template in Fiori elements
 */
export interface WorklistSettings {
    entityConfig: EntityConfig;
}

/**
 * Settings for the form template in Fiori elements for odata v4
 */
export interface FEOPSettings {
    entityConfig: EntityConfig;
}

/**
 * Settings for the overview page template in Fiori elements
 */
export interface OVPSettings {
    /**
     * Entity used for `globalFilterModel` used by the filter bar.
     */
    filterEntityType: string;
}

/**
 * Base settings for the analytical list page template in Fiori elements
 */
export interface ALPSettings {
    entityConfig: EntityConfig;
    /**
     * Optional configuration of the table type. If no value is provided then TableType.ANALYTICAL is used
     */
    tableType?: TableType;
}

/**
 * Settings for the analytical list page template in Fiori elements for odata v2
 */
export interface ALPSettingsV2 extends ALPSettings {
    smartVariantManagement?: boolean; // Not set by default
    multiSelect?: boolean; // Not set by default
    qualifier?: string; // Not set by default
    autoHide?: boolean; // Not set by default
}

/**
 * Settings for the analytical list page template in Fiori elements for odata v4
 */
export interface ALPSettingsV4 extends ALPSettings {
    /**
     * Optional parameter to configure the table selection mode. If it is not provided, then TableSelectionModeV4.None is used.
     */
    selectionMode?: TableSelectionModeV4;
}

/**
 * Generic template configuration.
 */
export interface Template<T = {}> {
    /**
     * Template identifier.
     */
    type: TemplateType;

    /**
     * Template specific settings object.
     */
    settings: T;
}

export interface FioriElementsApp<T> extends Ui5App {
    /**
     * Template specific configuration
     */
    template: Template<T>;

    /**
     * Standad service configuration, however, the model is not configurable because a fixed values is required by Fiori elements.
     */
    service: Omit<OdataService, 'model'>;

    /**
     * Extended app options with Fiori elements specific setting
     */
    appOptions: Ui5App['appOptions'] & {
        /**
         * Generate OPA based tests, if applicable to the specified template.
         * This will eventually move up to {@link Ui5App.appOptions}
         */
        addTests?: boolean;
    };
}

/**
 * Internal extension of the configuration object.
 * It extends the object with properties that are calculated based on other input and cannot be directly set by the caller.
 */
export interface InternalFioriElementsApp<T> extends FioriElementsApp<T> {
    app: FioriElementsApp<T>['app'] & {
        /**
         * Calculated value of the intent that is being used for previewing in an FLP sandbox.
         */
        previewIntent: string;
    };
}

// We need this for the service version
export { OdataVersion } from '@sap-ux/odata-service-writer';
