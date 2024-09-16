type UI5FlexLayer = 'VENDOR' | 'CUSTOMER_BASE';
interface RtaConfig {
    layer: UI5FlexLayer;
    options?: {
        [key: string]: unknown;
        baseId?: string;
        projectId?: string;
        scenario?: string;
        appName?: string;
    };
    editors: any[];
}
interface Intent {
    object: string;
    action: string;
}
interface App {
    target: string;
    local?: string;
    componentId?: string;
    intent?: Intent;
}
interface FlpConfig {
    path: string;
    intent: Intent;
    libs?: boolean;
    apps: App[];
    theme?: string;
    init?: string;
}
interface OptionalTestConfig {
    path: string;
    init: string;
    pattern: string;
}
interface TestConfig extends Partial<OptionalTestConfig> {
    framework: 'OPA5' | 'QUnit' | 'Testsuite';
}
interface AdpPreviewConfig {
    target: any;
    ignoreCertErrors?: boolean;
}
export interface MiddlewareConfig {
    flp?: Partial<FlpConfig>;
    test?: TestConfig[];
    rta?: RtaConfig;
    adp?: AdpPreviewConfig;
    debug?: boolean;
}
export interface DeprecatedConfig {
    component: string;
    libs?: boolean;
    ui5Theme?: string;
}

export type PreviewConfigOptions = DeprecatedConfig | MiddlewareConfig;
