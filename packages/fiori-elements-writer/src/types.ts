import type { Ui5App, App } from '@sap-ux/ui5-application-writer';
import type { OdataService } from '@sap-ux/odata-service-writer';

export enum TemplateType {
    Worklist = 'worklist',
    ListReportObjectPage = 'lrop',
    AnalyticalListPage = 'alp',
    OverviewPage = 'ovp',
    FormEntryObjectPage = 'feop'
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

export interface EntityConfig {
    mainEntityName: string; // Defines the main list page entity
    navigationEntity?: {
        EntitySet: string; // Defines the entity set for object page navigation
        Name: string; // Defines the entity name for object page navigation
    };
}

export enum TableType {
    GRID = 'GridTable',
    ANALYTICAL = 'AnalyticalTable',
    RESPONSIVE = 'ResponsiveTable'
}

export enum TableSelectionMode {
    NONE = 'None',
    AUTO = 'Auto',
    MULTI = 'Multi',
    SINGLE = 'Single'
}

export interface LROPSettings {
    entityConfig: EntityConfig;
}

export interface WorklistSettings {
    entityConfig: EntityConfig;
}

export interface FEOPSettings {
    entityConfig: EntityConfig;
}

export interface OVPSettings {
    filterEntityType: string; // Filters the `globalFilterModel` data displayed in OVP cards
}

export interface ALPSettings {
    entityConfig: EntityConfig;
    tableType?: TableType; // Defaults to 'Analytical'
}
export interface ALPSettingsV2 extends ALPSettings {
    smartVariantManagement?: boolean; // Not set by default
    multiSelect?: boolean; // Not set by default
    qualifier?: string; // Not set by default
    autoHide?: boolean; // Not set by default
}

export interface ALPSettingsV4 extends ALPSettings {
    selectionMode?: TableSelectionMode; // Defaults to 'None'
}

export interface Template<T = {}> {
    type: TemplateType;
    settings: T;
}

export interface FioriApp extends App {
    flpAppId?: string;
}
export interface FioriElementsApp<T> extends Ui5App {
    template: Template<T>;
    service: Omit<OdataService, 'model'>; // Model name will use defaults
    app: FioriApp;
}

// We need this for the service version
export { OdataVersion } from '@sap-ux/odata-service-writer';
