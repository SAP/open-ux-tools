import { Ui5App, App } from '@sap-ux/ui5-application-writer';
import { OdataService } from '@sap-ux/odata-service-writer';

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
    mainEntity?: {
        entityName: string;
        type?: any;
    };
    filterEntityType?: string;
    navigationEntity?: {
        EntitySet: string;
        Name: string;
        Role?: string;
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
    entityConfig: EntityConfig;
}

export interface ALPSettings {
    entityConfig: EntityConfig;
    tableType?: TableType;
    selectionMode?: TableSelectionMode;
}
export interface ALPSettingsV2 extends ALPSettings {
    smartVariantManagement?: boolean;
    multiSelect?: boolean;
    qualifier?: string;
    autoHide?: boolean;
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
    service: OdataService;
    app: FioriApp;
}

// We need this for the service version
export { OdataVersion } from '@sap-ux/odata-service-writer';
