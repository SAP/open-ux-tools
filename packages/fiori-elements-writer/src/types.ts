import type { Ui5App, App, AppOptions } from '@sap-ux/ui5-application-writer';
import type { OdataService } from '@sap-ux/odata-service-writer';
import type { CapServiceCdsInfo } from '@sap-ux/cap-config-writer';

export const TemplateType = {
    Worklist: 'worklist',
    ListReportObjectPage: 'lrop',
    AnalyticalListPage: 'alp',
    OverviewPage: 'ovp',
    FormEntryObjectPage: 'feop',
    FlexibleProgrammingModel: 'fpm'
} as const;

export type TemplateType = (typeof TemplateType)[keyof typeof TemplateType];

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

export const TableType = {
    GRID: 'GridTable',
    ANALYTICAL: 'AnalyticalTable',
    RESPONSIVE: 'ResponsiveTable',
    TREE: 'TreeTable'
} as const;

export type TableType = (typeof TableType)[keyof typeof TableType];

export const TableSelectionMode = {
    NONE: 'None',
    AUTO: 'Auto',
    MULTI: 'Multi',
    SINGLE: 'Single'
} as const;
export type TableSelectionMode = (typeof TableSelectionMode)[keyof typeof TableSelectionMode];

export interface TableSettings {
    tableType?: TableType;
    qualifier?: string;
    hierarchyQualifier?: string;
}
export interface LROPSettings extends TableSettings {
    entityConfig: EntityConfig;
}

export interface FPMSettings {
    entityConfig: EntityConfig;
    pageName: string;
}

export interface WorklistSettings extends TableSettings {
    entityConfig: EntityConfig;
}

export interface FEOPSettings {
    entityConfig: EntityConfig;
}

export interface OVPSettings {
    filterEntityType: string; // Filters the `globalFilterModel` data displayed in OVP cards
}

export interface ALPSettings extends TableSettings {
    entityConfig: EntityConfig;
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

/**
 * Additional configuration for Fiori Apps
 */
export interface FioriApp extends App {
    /**
     * Use the specified app id when generating the test Fiori launch pad config
     */
    flpAppId?: string;
}

export interface FioriElementsApp<T> extends Ui5App {
    template: Template<T>;
    service: Omit<OdataService, 'model'> & {
        capService?: CapServiceCdsInfo;
    };
    app: FioriApp;
    appOptions: Partial<AppOptions> & {
        /**
         * Generate OPA based tests, if applicable to the specified template.
         * This will eventually move up to {@link Ui5App.appOptions}
         */
        addTests?: boolean;
        /**
         * Enables NPM workspaces for single top-level, root CAP package.
         * This is applicable when the service is of type `capService`. For more details, refer to the
         * `applyCAPUpdates` function at {@link ../../cap-config-writer/src/cap-writer/updates.ts}.
         * When set to true and the CDS UI5 plugin is enabled, the application will be served using the `appId`.
         */
        enableNPMWorkspaces?: boolean;
    };
}

// We need this for the service version
export { OdataVersion } from '@sap-ux/odata-service-writer';
