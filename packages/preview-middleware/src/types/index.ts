import type { AdpPreviewConfig } from '@sap-ux/adp-tooling';
import type { UI5FlexLayer } from '@sap-ux/project-access';

/**
 * Intent object consisting of an object and an action.
 */
export interface Intent {
    object: string;
    action: string;
}

/**
 * Configuration for additional applications
 */
export interface App {
    target: string;
    local?: string;
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
     * Optional: allows to specify a custom init script executed in addition to the default one
     */
    init?: string;
}

interface OptionalTestConfig {
    /**
     * Optional: path hosting the main test page
     */
    path: string;

    /**
     * Optional: path to the init script
     */
    init: string;

    /**
     * Optional: pattern to match the test files
     */
    pattern: string;
}

export interface TestConfig extends Partial<OptionalTestConfig> {
    framework: 'OPA5' | 'QUnit' | 'Testsuite';
}

export type InternalTestConfig = TestConfig & OptionalTestConfig;

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

export type DefaultFlpPath = '/test/flp.html';

export type DefaultIntent = {
    object: 'app';
    action: 'preview';
};
