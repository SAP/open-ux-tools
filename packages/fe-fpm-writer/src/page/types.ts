import type { CustomElement, InternalCustomElement } from '../common/types';

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
    navigation?: {
        /**
         * Source of the navigation to the custom page
         */
        sourcePage: string;

        /**
         * Source entity that is use as the base part of the route
         */
        sourceEntity: string;

        /**
         * Name of the navigation entity
         */
        navEntity: string;

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

/**
 * Additional internal configuration options that will be calculated based on the provided input as well as the target application.
 */
export type InternalCustomPage = CustomPage &
    InternalCustomElement & {
        /**
         * The FLC flag is calculated to true if the existing app is configured to use the flexible column layout
         */
        fcl: boolean;

        /**
         * Represents the name of the control aggregation to be used for the custom page.
         * This is only used if FCL is enabled and is calculated based on the optional sourcepage.
         */
        controlAggregation?: 'beginColumnPages' | 'midColumnPages' | 'endColumnPages';
    };
