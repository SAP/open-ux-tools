import { ToolsLogger } from '@sap-ux/logger';
import type { FlpConfig, MiddlewareConfig } from '../types';
import { render } from 'ejs';
import { join, posix } from 'path';
import type { Manifest, UI5FlexLayer } from '@sap-ux/project-access';
import { readFileSync } from 'fs';

export interface CustomConnector {
    applyConnector: string;
    writeConnector: string;
    custom: boolean;
}

export interface FlexConnector {
    connector: string;
    layers: string[];
    url?: string;
}

/**
 * Internal structure used to fill the sandbox.html template
 */
export interface TemplateConfig {
    basePath: string;
    apps: Record<
        string,
        {
            title: string;
            description: string;
            additionalInformation: string;
            applicationType: 'URL';
            url: string;
            applicationDependencies?: { manifest: boolean };
        }
    >;
    ui5: {
        libs: string;
        theme: string;
        flex: (CustomConnector | FlexConnector)[];
        bootstrapOptions: string;
        resources: Record<string, string>;
    };
    init?: string;
    flex?: {
        [key: string]: unknown;
        layer: UI5FlexLayer;
        developerMode: boolean;
        pluginScript?: string;
    };
    locateReuseLibsScript?: boolean;
}

/**
 * SAPUI5 delivered namespaces from https://ui5.sap.com/#/api/sap
 */
const UI5_LIBS = [
    'sap.apf',
    'sap.base',
    'sap.chart',
    'sap.collaboration',
    'sap.f',
    'sap.fe',
    'sap.fileviewer',
    'sap.gantt',
    'sap.landvisz',
    'sap.m',
    'sap.ndc',
    'sap.ovp',
    'sap.rules',
    'sap.suite',
    'sap.tnt',
    'sap.ui',
    'sap.uiext',
    'sap.ushell',
    'sap.uxap',
    'sap.viz',
    'sap.webanalytics',
    'sap.zen'
];

/**
 * Static settings
 */
export const PREVIEW_URL = {
    client: {
        url: '/preview/client',
        local: join(__dirname, '../../dist/client'),
        ns: 'open.ux.preview.client'
    },
    api: '/preview/api'
};

/**
 * Default theme
 */
export const DEFAULT_THEME = 'sap_horizon';

/**
 * Default path for mounting the local FLP.
 */
const DEFAULT_PATH = '/test/flp.html';

/**
 * Default intent
 */
const DEFAULT_INTENT = {
    object: 'app',
    action: 'preview'
};

/**
 * Default configuration for the FLP.
 *
 * @param config partial configuration
 * @returns a full configuration with default values
 */
export function getFlpConfigWithDefaults(config: Partial<FlpConfig> = {}) {
    const flpConfig = {
        path: config.path ?? DEFAULT_PATH,
        intent: config.intent ?? DEFAULT_INTENT,
        apps: config.apps ?? [],
        libs: config.libs,
        theme: config.theme,
        init: config.init
    };
    if (!flpConfig.path.startsWith('/')) {
        flpConfig.path = `/${flpConfig.path}`;
    }
    return flpConfig;
}

/**
 * The developer mode is only supported for adaptation projects, therefore, notify the user if it is wrongly configured and then disable it.
 *
 * @param config configurations from the ui5.yaml
 * @param logger logger instance
 */
export function sanitizeConfig(config: MiddlewareConfig, logger: ToolsLogger): void {
    if (config.rta && config.adp === undefined) {
        config.rta.editors = config.rta.editors.filter((editor) => {
            if (editor.developerMode) {
                logger.error('developerMode is ONLY supported for SAP UI5 adaptation projects.');
                logger.warn(`developerMode for ${editor.path} disabled`);
            }
            return !editor.developerMode;
        });
    }
}

/**
 * Retrieves the configuration settings for UI5 flexibility services.
 *
 * @returns An array of flexibility service configurations, each specifying a connector
 *          and its options, such as the layers it applies to and its service URL, if applicable.
 */
function getFlexSettings(): TemplateConfig['ui5']['flex'] {
    const localConnectorPath = 'custom.connectors.WorkspaceConnector';

    return [
        { connector: 'LrepConnector', layers: [], url: '/sap/bc/lrep' },
        {
            applyConnector: localConnectorPath,
            writeConnector: localConnectorPath,
            custom: true
        },
        {
            connector: 'LocalStorageConnector',
            layers: ['CUSTOMER', 'USER']
        }
    ];
}

/**
 * Gets the UI5 libs dependencies from manifest.json.
 *
 * @param manifest application manifest
 * @returns UI5 libs that should preloaded
 */
function getUI5Libs(manifest: Manifest): string {
    const libs = manifest['sap.ui5']?.dependencies?.libs ?? {};
    // add libs that should always be preloaded
    libs['sap.m'] = {};
    libs['sap.ui.core'] = {};
    libs['sap.ushell'] = {};

    return Object.keys(libs)
        .filter((key) => {
            return UI5_LIBS.some((substring) => {
                return key === substring || key.startsWith(substring + '.');
            });
        })
        .join(',');
}

/**
 * Creates the configuration object for the sandbox.html template.
 *
 * @param config FLP configuration
 * @param manifest application manifest
 * @returns configuration object for the sandbox.html template
 */
export function createTemplateConfig(config: FlpConfig, manifest: Manifest) {
    const flex = getFlexSettings();
    const supportedThemes: string[] = (manifest['sap.ui5']?.supportedThemes as []) ?? [DEFAULT_THEME];
    const ui5Theme = config.theme ?? (supportedThemes.includes(DEFAULT_THEME) ? DEFAULT_THEME : supportedThemes[0]);
    const id = manifest['sap.app'].id;
    const ns = id.replace(/\./g, '/');
    return {
        basePath: posix.relative(posix.dirname(config.path), '/') ?? '.',
        apps: {},
        init: config.init ? ns + config.init : undefined,
        ui5: {
            libs: getUI5Libs(manifest),
            theme: ui5Theme,
            flex,
            resources: {
                [PREVIEW_URL.client.ns]: PREVIEW_URL.client.url
            },
            bootstrapOptions: ''
        },
        locateReuseLibsScript: config.libs
    };
}
/**
 * Generates the preview files.
 *
 * @param config configuration from the ui5.yaml
 * @param manifest application manifest
 * @param logger logger instance
 * @returns a record with the preview files
 */
export function generatePreviewFiles(
    config: MiddlewareConfig = {},
    manifest: Manifest,
    logger: ToolsLogger = new ToolsLogger()
): Record<string, string> {
    // remove incorrect configurations
    sanitizeConfig(config, logger);

    const flpConfig = getFlpConfigWithDefaults(config.flp);
    const templateConfig = createTemplateConfig(flpConfig, manifest);
    const templatePath = join(__dirname, '../../templates');
    return {
        [flpConfig.path]: render(readFileSync(join(templatePath, 'sandbox.html'), 'utf-8'), templateConfig)
    };
}
