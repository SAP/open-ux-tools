import type { UI5FlexLayer } from "@sap-ux/project-access";

/**
 * Configuration for additional applications
 */
export interface App {
    target: string;
    local: string;
    intent?: {
        object: string;
        action: string;
    };
}

export type RTAMode = 'variant' | 'adaptation';

/**
 * FLP preview configuration.
 */
export interface FlpConfig {
    path: string;
    rta?: {
        layer?: UI5FlexLayer;
        mode?: RTAMode;
    };
    apps: App[];
}

/**
 * Middleware configuration.
 */
export interface Config {
    flp?: Partial<FlpConfig>;
    debug?: boolean;
}
