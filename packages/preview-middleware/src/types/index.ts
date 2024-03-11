import type { AdpPreviewConfig } from '@sap-ux/adp-tooling';
import type { UI5FlexLayer } from '@sap-ux/project-access';

/**
 * Intent object consisting of an object and an action.
 */
interface Intent {
    object: string;
    action: string;
}

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
    intent?: Intent;
}

export interface Editor {
    path: string;
    developerMode?: boolean;
    pluginScript?: string;
    generator?: string;
}

export interface RtaConfig {
    layer: UI5FlexLayer;
    options?: {
        [key: string]: unknown;
        baseId?: string;
        projectId?: string;
        scenario?: string;
        appName?: string;
    };
    editors: Editor[];
}

/**
 * FLP preview configuration.
 */
export interface FlpConfig {
    path: string;
    intent: Intent;
    /**
     * Optional: if set to true then a locate-reuse-libs script will be attached to the html
     */
    libs?: boolean;
    apps: App[];
    theme?: string;
    /**
     * Optional: allows to specify a custom init script
     */
    customInit?: string;
}

export interface TestConfig {
    framework: 'OPA' | 'QUnit';
    /**
     * Optional: path hosting the main test page
     */
    path?: string;
}

/**
 * Middleware configuration.
 */
export interface MiddlewareConfig {
    flp?: Partial<FlpConfig>;
    test?: TestConfig[];
    rta?: RtaConfig;
    adp?: AdpPreviewConfig;
    debug?: boolean;
}
