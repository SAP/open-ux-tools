import type { ManifestNamespace } from '@sap-ux/ui5-config';

export type Manifest = ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile & { [key: string]: unknown };

/**
 * Common properties for any custom element of the flexible programming model.
 */
export interface CustomElement {
    /**
     * Name of the custom element that is to be added to the application.
     */
    name: string;
    /**
     * Target folder relative to the manifest that is used to generate the custom extension content (e.g. view, fragment, controller).
     * If undefined then `ext/${id}` is used.
     */
    folder?: string;
    /**
     * Optional property to define the minimum UI5 version that the generated code must support.
     * If undefined then the latest version of the template is used.
     * If nothing can be generated for the given version then an exception is thrown.
     */
    ui5Version?: number;
}

export interface InternalCustomElement extends CustomElement {
    ns: string;
    path: string;
}

/**
 * Enumeration with all values possible as position placement attribute
 */
export enum Placement {
    After = 'After',
    Before = 'Before',
    End = 'End'
}

/**
 * Position of a custom element relative to an anchor element.
 */
export type Position = {
    /**
     * The key of another element to be used as placement anchor.
     */
    anchor?: string;
    /**
     * Define the placement, either before or after the anchor element or at the end.
     */
    placement: Placement;
};

export interface Ui5RoutingTarget<T> extends ManifestNamespace.Target {
    options?: T;
}

export interface ViewVariant {
    /**
     * The key entry is used for initializing the corresponding IconTabBar item.
     */
    key: string;
    /**
     * The annotationPath of a specific variant.
     */
    annotationPath: string;
    /**
     * View title, is shown in the tab item.
     */
    label?: string;
    /**
     * If you switch from an app with only a single table to an app with multiple tables, you can keep the previously defined variant on one tab.
     */
    keepPreviousPersonalization?: boolean;
    /**
     * The template being used for the custom view.
     */
    template?: string;
}

export interface Views {
    /**
     * The paths section contains a set of entries that point to the variants defined in the annotations.
     */
    paths?: Array<ViewVariant>;
    /**
     * Determines whether the count is displayed in the tabs (default setting: false).
     */
    showCounts?: boolean;
}

export interface Ui5TargetSettings {
    settings?: {
        /**
         * Represents the entity set that defines either the aggregation or the root object of the component.
         */
        entitySet?: string;
        /**
         * By default, the list report displays only one table. You can define multiple views of a table, and add a chart, if required.
         */
        views?: Views;
    };
}

/**
 * Represents a line and character position in file.
 */
export interface FileContentPosition {
    /**
     * Zero based line index.
     */
    line: number;
    /**
     * Zero based character value.
     */
    character: number;
}
