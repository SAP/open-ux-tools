import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';

export const DotFileExtension = {
    JS: '.js',
    TS: '.ts'
} as const;

export type DotFileExtension = (typeof DotFileExtension)[keyof typeof DotFileExtension];

/**
 * Options accepted by the public OPA test generation entry point.
 */
export type OPAGenerationOptions = {
    /** The name of the OPA journey file. If not specified, 'FirstJourney' will be used. */
    scriptName?: string;
    /** The appID. If not specified, will be read from the manifest in sap.app/id. */
    appID?: string;
    /** The name of the html that will be used in OPA journey file. If not specified, 'index.html' will be used. */
    htmlTarget?: string;
    /** When true, OPA harness files are served virtually; skip writing them to disk. */
    useVirtualPreviewEndpoints?: boolean;
    /** If true, generate TypeScript files instead of JavaScript. */
    enableTypeScript?: boolean;
};

export const SupportedPageTypes: { [id: string]: string } = {
    'sap.fe.templates.ListReport': 'ListReport',
    'sap.fe.templates.ObjectPage': 'ObjectPage',
    'sap.fe.core.fpm': 'FPM'
};

export type FEV4OPAPageConfig = {
    appID: string;
    appPath: string;
    template: string;
    componentID: string;
    entitySet?: string;
    contextPath?: string;
    targetKey: string;
    isStartup: boolean;
    fileName?: string;
    fileExtension?: string;
};

export type FEV4OPAConfig = {
    appID: string;
    appPath: string;
    pages: FEV4OPAPageConfig[];
    opaJourneyFileName: string;
    htmlTarget: string;
    hideFilterBar: boolean;
    filterBarItems?: string[];
    useVirtualPreviewEndpoints: boolean;
};

export type JourneyParams = {
    startPages: string[];
    startLR: string | undefined;
    navigatedOP: string | undefined;
    hideFilterBar: boolean;
};

export type FEV4ManifestTarget = {
    type?: string;
    name?: string;
    id?: string;
    options?: {
        settings?: {
            entitySet?: string;
            contextPath?: string;
            hideFilterBar?: boolean;
            navigation?: {
                [id: string]: {
                    detail?: {
                        route?: string;
                    };
                };
            };
            views?: {
                paths?: Array<{
                    primary?: unknown[];
                    secondary?: unknown[];
                    defaultPath?: string;
                }>;
            };
        };
    };
};

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
 * Configuration interface for generating freestyle OPA test files
 */
export interface FFOPAConfig {
    appId: string;
    applicationTitle?: string;
    applicationDescription?: string;
    enableTypeScript?: boolean;
    viewName?: string;
    ui5Version?: string;
    ui5Theme?: string;
    useVirtualPreviewEndpoints?: boolean;
}

export type ObjectPageNavigationParent = {
    name: string;
    navigationProperty: string;
};

export type ObjectPageNavigationParents = {
    parentLRName?: string;
    parentLRTableIdentifier?: string;
    parentOPs: ObjectPageNavigationParent[];
};

export type SectionFormField = {
    property: string;
    connectedFields?: string;
    fieldGroup?: string;
    targetAnnotation?: string;
};

export type TableColumn = {
    header?: string;
};

export type TableColumnFeatureData = Record<string, TableColumn>;

export type ContactCardField = {
    property: string;
};

export type BodySubSectionFeatureData = {
    id: string;
    navigationProperty?: string;
    isTable: boolean;
    custom: boolean;
    order: number;
    fields: SectionFormField[];
    contactCardFields: ContactCardField[];
    tableColumns: TableColumnFeatureData;
    contactCardColumns: ContactCardField[];
};

export type BodySectionFeatureData = {
    id: string;
    navigationProperty?: string;
    isTable: boolean;
    custom: boolean;
    order: number;
    fields: SectionFormField[];
    contactCardFields: ContactCardField[];
    tableColumns: TableColumnFeatureData;
    contactCardColumns: ContactCardField[];
    subSections: BodySubSectionFeatureData[];
    actions?: ActionButtonState[];
    createButton?: ButtonState;
    deleteButton?: ButtonState;
};

export type ObjectPageFeatures = {
    name?: string;
    navigationParents?: ObjectPageNavigationParents;
    headerTitle?: string;
    headerDescription?: string;
    headerSections?: HeaderSectionFeatureData[];
    bodySections?: BodySectionFeatureData[];
    headerActions?: ActionButtonState[];
    editButton?: ButtonState;
};

/**
 * Filter bar item consumed by the List Report journey template. Custom filter fields fall
 * back to their (translatable) label, so `custom` selects the label vs. `{ property }` form.
 */
export type FilterBarItem = {
    property: string;
    description: string;
    custom: boolean;
};

export type ListReportFeatures = {
    name?: string;
    createButton?: {
        enabled?: boolean | string;
        visible?: boolean;
        dynamicPath?: string;
    };
    deleteButton?: {
        enabled?: boolean | string;
        visible?: boolean;
        dynamicPath?: string;
    };
    filterBarItems?: FilterBarItem[];
    tableColumns?: Record<string, Record<string, string | number | boolean>>;
    contactCardColumns: ContactCardField[];
    toolBarActions?: ActionButtonState[];
    isALP?: boolean;
    /**
     * Non-custom tab keys (`views.paths[].key`) for multi-tab List Reports; empty for
     * single-table LRs. Used to target a specific tab via `onTable("<key>")`.
     */
    tableIdentifiers?: string[];
    semanticKey?: {
        semanticKeyProperties?: string[];
        missingFromFilterBar?: string[];
    };
};

export interface ActionButtonState {
    label: string;
    /**
     * Action method name only (e.g. `"SetToBooked"`). Used as the `action` field of
     * `ActionIdentifier` in `iCheckAction({ service, action, unbound })`.
     */
    action: string;
    visible: boolean;
    /**
     * Indicates whether the action button is enabled.
     * - true: Button is enabled and can be invoked
     * - false: Button is disabled
     * - 'dynamic': The state is controlled by a dynamic path annotation (e.g., Core.OperationAvailable)
     */
    enabled: boolean | 'dynamic';
    /**
     * If the enabled state is dynamic, this contains the path to the control property.
     * For example: "_it/__OperationControl/deductDiscount"
     */
    dynamicPath?: string;
    /**
     * The invocation grouping type if specified (e.g., "Isolated", "ChangeSet").
     */
    invocationGrouping?: string;
    /**
     * OData schema namespace used as the `service` parameter in iCheckAction({ service, action, unbound }).
     * Populated for both List Report and Object Page actions extracted via metadata.
     */
    service?: string;
    /**
     * Whether the action is unbound (not bound to a specific entity instance).
     * Populated for both List Report and Object Page actions extracted via metadata.
     */
    unbound?: boolean;
}

export type FPMFeatures = {
    name?: string;
    filterBarItems?: string[];
    tableColumns?: Record<string, Record<string, string | number | boolean>>;
};

export type AppFeatures = {
    listReport?: ListReportFeatures;
    objectPages?: ObjectPageFeatures[];
    fpm?: FPMFeatures;
};

export type WriteContext = {
    config: FEV4OPAConfig;
    basePath: string;
    rootCommonTemplateDirPath: string;
    rootV4TemplateDirPath: string;
    testOutDirPath: string;
    editor: Editor;
    log?: Logger;
    journeyParams: JourneyParams;
    hasPreexistingTests?: boolean;
    incompatibleTestSetup?: boolean;
    dotFileExtension: DotFileExtension;
    modifiedFiles: string[];
};

export type FormField = {
    fieldGroupQualifier?: string;
    field?: string;
    targetAnnotation?: string;
};

export type HeaderSectionFeatureData = {
    facetId?: string;
    title?: string;
    custom?: boolean;
    collection?: boolean;
    microChart?: boolean;
    form?: boolean;
    stashed?: boolean | string;
    fields?: FormField[];
    contactCardFields: ContactCardField[];
};

export interface ButtonState {
    visible: boolean;
    /**
     * - true: Button is enabled and can be clicked
     * - false: Button is disabled
     * - 'dynamic': The state is controlled by a dynamic path annotation (e.g., Path="__EntityControl/Deletable")
     */
    enabled: boolean | 'dynamic';
    dynamicPath?: string;
}

export interface ButtonVisibilityResult {
    /**
     * State of the Create button based on Capabilities.InsertRestrictions annotation.
     */
    create: ButtonState;
    /**
     * State of the Delete button based on Capabilities.DeleteRestrictions annotation.
     */
    delete: ButtonState;
}

/**
 * Result interface for action button checks.
 */
export interface ActionButtonsResult {
    /**
     * List of action buttons found in the UI.LineItem annotation.
     */
    actions: ActionButtonState[];
    /**
     * The entity type name that these actions belong to.
     */
    entityType: string;
}
