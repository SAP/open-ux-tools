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

export interface RtaEditor {
    path: string;
    developerMode?: boolean;
    pluginScript?: string;
    generator?: string;
}

export type RtaConfig = Omit<InternalRtaConfig, 'editors'> & { endpoints: RtaEditor[] };

interface InternalRtaConfig {
    layer: UI5FlexLayer;
    options?: {
        [key: string]: unknown;
        baseId?: string;
        projectId?: string;
        scenario?: string;
        appName?: string;
    };
    editors: RtaEditor[];
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
    /**
     * Optional: if set to true then the new FLP homepage will be enabled
     */
    enhancedHomePage?: boolean;
}

/**
 * Configration for the virtual test pages endpoints.
 */
export interface TestConfig {
    framework: 'OPA5' | 'QUnit' | 'Testsuite';
    /**
     * Path hosting the main test page
     */
    path?: string;

    /**
     * Path to the init script
     */
    init?: string;

    /**
     * Pattern to match the test files
     */
    pattern?: string;
}

/**
 * Test configuration that has been enriched with the defaults in case of missing values.
 */
export type CompleteTestConfig = Required<TestConfig>;

/**
 * Test configuration defaults.
 */
export type TestConfigDefaults = {
    qunit: {
        path: '/test/unitTests.qunit.html';
        init: '/test/unitTests.qunit.js';
        pattern: '/test/**/*Test.{js,ts}';
        framework: 'QUnit';
    };
    opa5: {
        path: '/test/opaTests.qunit.html';
        init: '/test/opaTests.qunit.js';
        pattern: '/test/**/*Journey.{js,ts}';
        framework: 'OPA5';
    };
    testsuite: {
        path: '/test/testsuite.qunit.html';
        init: '/test/testsuite.qunit.js';
        pattern: '';
        framework: 'Testsuite';
    };
};

export type CardGeneratorConfig = {
    path?: string;
};

/**
 * Middleware configuration.
 */
export interface MiddlewareConfig {
    flp?: Partial<FlpConfig>;
    test?: TestConfig[];
    /**
     * @deprecated use editors.rta instead.
     */
    rta?: InternalRtaConfig;
    editors?: {
        rta?: RtaConfig;
        cardGenerator?: CardGeneratorConfig;
    };
    adp?: AdpPreviewConfig;
    debug?: boolean;
}

export type DefaultFlpPath = '/test/flp.html';

export type DefaultIntent = {
    object: 'app';
    action: 'preview';
};

type FLPAppsCatalog = {
    identification: {
        id: string;
        title: string;
    };
    payload: {
        viz: string[];
    };
};

type FLPAppVisualization = {
    vizType: string;
    businessApp: string;
    vizConfig: {
        'sap.app': {
            title: string;
            subTitle: string;
        };
        'sap.flp': {
            target: {
                appId: string;
                inboundId: string;
                parameters: {
                    name: string;
                    value: string;
                }[];
            };
        };
    };
};

type FLPApp = {
    'sap.app': {
        id: string;
        title: string;
        crossNavigation: {
            inbounds: {
                [key: string]: {
                    semanticObject: string;
                    action: string;
                    title: string;
                    subTitle: string;
                    signature: {
                        additionalParameters: string;
                    };
                };
            };
        };
    };
    'sap.ui5': {
        componentName: string;
    };
    'sap.ui': {
        technology: string;
    };
    'sap.platform.runtime': {
        componentProperties: {
            url: string;
            asyncHints: Record<string, unknown>;
        };
    };
};

type FLPSectionVizConfig = {
    id: string;
    vizId: string;
};

type FLPSection = {
    id: string;
    title: string;
    default: boolean;
    layout: {
        vizOrder: FLPSectionVizConfig['id'][];
    };
    viz: Record<FLPSectionVizConfig['id'], FLPSectionVizConfig>;
};

type FLPPage = {
    identification: {
        id: string;
        title: string;
    };
    payload: {
        layout: {
            sectionOrder: FLPSection['id'][];
        };
        sections: Record<FLPSection['id'], FLPSection>;
    };
};

/**
 * FLP CDM configuration.
 */
export type FLPCdmConfig = {
    _version: string;
    catalogs: Record<FLPAppsCatalog['identification']['id'], FLPAppsCatalog>;
    visualizations: Record<string, FLPAppVisualization>;
    applications: Record<FLPApp['sap.app']['id'], FLPApp>;
    pages: Record<FLPPage['identification']['id'], FLPPage>;
};

/**
 * Default FLP homepage configuration.
 */
export const FLPHomePageDefaults = {
    pageName: 'SAP_BASIS_PG_UI_MYHOME',
    catalogId: 'homeCatalog',
    sectionId: 'homeAppsSection'
};

export interface MultiCardsPayload {
    type: string;
    manifest: CardManifest;
    entitySet: string;
}

export interface I18nEntry {
    key: string;
    value: string;
    comment?: string;
    annotation?: string;
}

export interface CardManifest {
    'sap.insights': {
        versions?: {
            dtpMiddleware?: string;
        };
    };
}
