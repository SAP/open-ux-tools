import type { AdpPreviewConfig } from '@sap-ux/adp-tooling';
import type { UI5FlexLayer } from '@sap-ux/project-access';

/**
 * Configuration for additional applications
 */
export interface App {
    target: string;
    local: string;
    /**
     * Optional component id if it differs from the manifest (e.g. for adaptation projects)
     */
    componentId?: string;
    intent?: {
        object: string;
        action: string;
    };
}

/**
 * FLP preview configuration.
 */
export interface FlpConfig {
    path: string;
    rta?: {
        layer?: UI5FlexLayer;
    };
    apps: App[];
}

/**
 * Middleware configuration.
 */
export interface Config {
    flp?: Partial<FlpConfig>;
    adp?: AdpPreviewConfig;
    debug?: boolean;
}
