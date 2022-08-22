import type { CustomElement, InternalCustomElement } from '../common/types';

/**
 * Incoming navigation configuration.
 */
export interface Navigation {
    /**
     * Source of the navigation to the custom page
     */
    sourcePage?: string;

    /**
     * Name of the navigation entity
     */
    navEntity?: string;

    /**
     * If set to true, then the generated route will point to a specific entity, otherwise, it will point to a list of the entities.
     */
    navKey?: boolean;
}

export interface StandardPageSettings {
    enhanceI18n?: string | true;
    variantManagement?: 'Page' | 'None';
}

/**
 * Support list of settings for a ListReport page
 */
export interface ListReportSettings extends StandardPageSettings {
    tableSettings?: {
        type?: 'ResponsiveTable' | 'GridTable';
        selectionMode?: 'None' | 'Single' | 'Multi' | 'Auto';
        condensedTableLayout?: boolean;
    };
}

/**
 * Configuration options for adding a list report page.
 */
export interface ListReport {
    /**
     * Name of the entity used for the custom page.
     */
    entity: string;

    /**
     * Optional settings for the ListReport page
     */
    settings?: ListReportSettings;
}

/**
 * Configuration options for adding an object page.
 */
export interface ObjectPage {
    /**
     * Name of the entity used for the custom page.
     */
    entity: string;

    /**
     * Optional settings for the object page
     */
    settings?: StandardPageSettings;

    /**
     * Optional incoming navigation configuration. If provided then a navigation configuration is added to an existing page navigating to this custom page.
     */
    navigation?: Navigation;
}

/**
 * Configuration options for adding a custom page.
 */
export interface CustomPage extends CustomElement {
    /**
     * Name of the entity used for the custom page.
     */
    entity: string;

    /**
     * Optional incoming navigation configuration. If provided then a navigation configuration is added to an existing page navigating to this custom page.
     */
    navigation?: Navigation & {
        /**
         * If set to true, then the generated route will point to a specific entity, otherwise, it will point to a list of the entities.
         */
        navKey?: boolean;
    };

    /**
     * Optional custom configuration for the generated view of the page.
     */
    view?: {
        /**
         * Optional page title for the new page.
         */
        title?: string;
    };
}

export interface FCL {
    /**
     * The FCL flag is calculated to true if the existing app is configured to use the flexible column layout
     */
    fcl?: boolean;

    /**
     * Represents the name of the control aggregation to be used for the custom page.
     * This is only used if FCL is enabled and is calculated based on the optional sourcepage.
     */
    controlAggregation?: 'beginColumnPages' | 'midColumnPages' | 'endColumnPages';
}

/**
 * Additional internal configuration options that will be calculated based on the provided input as well as the target application.
 */
export type InternalCustomPage = CustomPage & InternalCustomElement & FCL;

export type InternalListReport = ListReport & FCL & { name: 'ListReport'; navigation?: Navigation; settings: any };

export type InternalObjectPage = ObjectPage & FCL & { name: 'ObjectPage'; settings: any };
