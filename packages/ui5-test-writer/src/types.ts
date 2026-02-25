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
};

export type FEV4OPAConfig = {
    appID: string;
    appPath: string;
    pages: FEV4OPAPageConfig[];
    opaJourneyFileName: string;
    htmlTarget: string;
    hideFilterBar: boolean;
    filterBarItems?: string[];
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
}

export type AppFeatures = {
    listReport?: ListReportFeatures;
    objectPages?: ObjectPageFeatures[];
    fpm?: ListReportFeatures;
};

export type ListReportFeatures = {
    createButton?: {
        enabled?: boolean | string;
        visible?: boolean;
        dynamicPath?: string;
    };
    deleteButton?: {
        enabled?: boolean | string;
        visible: boolean;
        dynamicPath?: string;
    };
    filterBarItems?: string[];
    tableColumns?: Record<string, Record<string, string | number | boolean>>;
    toolBarActions?: ActionButtonState[];
};

/**
 * Represents the state of an action button.
 */
export interface ActionButtonState {
    /**
     * The label text of the action button.
     */
    label: string;
    /**
     * The fully qualified action name.
     */
    action: string;
    /**
     * Indicates whether the action button is visible.
     */
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
}

export type ObjectPageFeatures = {
    tableColumns?: Record<string, Record<string, string | number | boolean>>;
};

/**
 * Represents the button state information for create/delete actions.
 */
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

/**
 * Result interface for button visibility checks.
 */
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
