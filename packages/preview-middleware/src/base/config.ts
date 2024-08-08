import { ToolsLogger, type Logger } from '@sap-ux/logger';
import type { App, FlpConfig, Intent, InternalTestConfig, MiddlewareConfig, TestConfig } from '../types';
import { render } from 'ejs';
import { join, posix } from 'path';
import { createProjectAccess, getWebappPath, type Manifest, type UI5FlexLayer } from '@sap-ux/project-access';
import { readFileSync } from 'fs';
import { mergeTestConfigDefaults } from './test';
import { type Editor, create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

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
 * Static settings
 */
export const PREVIEW_URL = {
    client: {
        path: '/preview/client',
        getUrl: (basePath: string) => posix.join(basePath, 'preview', 'client'),
        local: join(__dirname, '../../dist/client'),
        ns: 'open.ux.preview.client'
    },
    api: '/preview/api'
} as const;

/**
 * Default theme
 */
export const DEFAULT_THEME = 'sap_horizon';

/**
 * Default path for mounting the local FLP.
 */
export const DEFAULT_PATH = '/test/flp.html';

/**
 * Default intent
 */
export const DEFAULT_INTENT = {
    object: 'app',
    action: 'preview'
} as Readonly<Intent>;

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
] as const;

/**
 * Gets the UI5 libs dependencies from manifest.json.
 *
 * @param manifest application manifest
 * @returns UI5 libs that should preloaded
 */
function getUI5Libs(manifest: Partial<Manifest>): string {
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
 * Add an application to the local FLP preview.
 *
 * @param templateConfig configuration for the preview
 * @param manifest manifest of the additional target app
 * @param app configuration for the preview
 * @param logger logger instance
 */
export async function addApp(templateConfig: TemplateConfig, manifest: Partial<Manifest>, app: App, logger: Logger) {
    const id = manifest['sap.app']?.id ?? '';
    app.intent ??= {
        object: id.replace(/\./g, ''),
        action: 'preview'
    };
    templateConfig.ui5.resources[id] = app.target;
    templateConfig.apps[`${app.intent?.object}-${app.intent?.action}`] = {
        title: (await getI18nTextFromProperty(app.local, manifest['sap.app']?.title, logger)) ?? id,
        description: (await getI18nTextFromProperty(app.local, manifest['sap.app']?.description, logger)) ?? '',
        additionalInformation: `SAPUI5.Component=${app.componentId ?? id}`,
        applicationType: 'URL',
        url: app.target,
        applicationDependencies: { manifest: true }
    };
}

/**
 * Get the i18n text of the given property.
 *
 * @param projectRoot absolute path to the project root
 * @param propertyValue value of the property
 * @param logger logger instance
 * @returns i18n text of the property
 */
async function getI18nTextFromProperty(
    projectRoot: string | undefined,
    propertyValue: string | undefined,
    logger: Logger
) {
    //i18n model format could be {{key}} or {i18n>key}
    if (!projectRoot || !propertyValue || propertyValue.search(/{{\w+}}|{i18n>\w+}/g) === -1) {
        return propertyValue;
    }
    const propertyI18nKey = propertyValue.replace(/i18n>|[{}]/g, '');
    const projectAccess = await createProjectAccess(projectRoot);
    const applicationIds = projectAccess.getApplicationIds();
    try {
        const bundle = (await projectAccess.getApplication(applicationIds[0]).getI18nBundles())['sap.app'];
        return bundle[propertyI18nKey]?.[0]?.value?.value ?? propertyI18nKey;
    } catch (e) {
        logger.warn('Failed to load i18n properties bundle');
    }
    return propertyI18nKey;
}

/**
 * Creates the configuration object for the sandbox.html template.
 *
 * @param config FLP configuration
 * @param manifest application manifest
 * @param resources additional resources
 * @returns configuration object for the sandbox.html template
 */
export function createFlpTemplateConfig(
    config: FlpConfig,
    manifest: Partial<Manifest>,
    resources: Record<string, string> = {}
): TemplateConfig {
    const flex = getFlexSettings();
    const supportedThemes: string[] = (manifest['sap.ui5']?.supportedThemes as []) ?? [DEFAULT_THEME];
    const ui5Theme = config.theme ?? (supportedThemes.includes(DEFAULT_THEME) ? DEFAULT_THEME : supportedThemes[0]);
    const id = manifest['sap.app']?.id ?? '';
    const ns = id.replace(/\./g, '/');
    const basePath = posix.relative(posix.dirname(config.path), '/') ?? '.';
    return {
        basePath: basePath,
        apps: {},
        init: config.init ? ns + config.init : undefined,
        ui5: {
            libs: getUI5Libs(manifest),
            theme: ui5Theme,
            flex,
            resources: {
                ...resources,
                [PREVIEW_URL.client.ns]: PREVIEW_URL.client.getUrl(basePath)
            },
            bootstrapOptions: ''
        },
        locateReuseLibsScript: config.libs
    };
}

/**
 * Creates the configuration object for the test template.
 *
 * @param config test configuration
 * @param id application id
 * @param theme theme to be used
 * @returns configuration object for the test template
 */
export function createTestTemplateConfig(config: InternalTestConfig, id: string, theme: string) {
    return {
        id,
        framework: config.framework,
        basePath: posix.relative(posix.dirname(config.path), '/') ?? '.',
        initPath: posix.relative(posix.dirname(config.path), config.init),
        theme
    };
}

export type PreviewUrls = {
    path: string;
    type: 'preview' | 'editor' | 'test';
};

/**
 * Returns the preview paths.
 *
 * @param config configuration from the ui5.yaml
 * @param logger logger instance
 * @returns an array of preview paths
 */
export function getPreviewPaths(config: MiddlewareConfig, logger: ToolsLogger = new ToolsLogger()): PreviewUrls[] {
    const urls: PreviewUrls[] = [];
    // remove incorrect configurations
    sanitizeConfig(config, logger);
    // add flp preview url
    const flpConfig = getFlpConfigWithDefaults(config.flp);
    urls.push({ path: `${flpConfig.path}#${flpConfig.intent.object}-${flpConfig.intent.action}`, type: 'preview' });
    // add editor urls
    if (config.rta?.editors) {
        config.rta.editors.forEach((editor) => {
            urls.push({ path: editor.path, type: 'editor' });
        });
    }
    // add test urls if configured
    if (config.test) {
        config.test.forEach((test) => {
            const testConfig = mergeTestConfigDefaults(test);
            urls.push({ path: testConfig.path, type: 'test' });
        });
    }
    return urls;
}

const TEMPLATE_PATH = join(__dirname, '../../templates');

/**
 * Generate test runners.
 *
 * @param configs array of test configurations
 * @param manifest application manifest
 * @param fs mem fs editor instance
 * @param webappPath webapp path
 * @param flpTemplConfig FLP configuration
 */
function generateTestRunners(
    configs: TestConfig[] | undefined,
    manifest: Manifest,
    fs: Editor,
    webappPath: string,
    flpTemplConfig: TemplateConfig
) {
    for (const test of configs ?? []) {
        const testConfig = mergeTestConfigDefaults(test);
        if (['QUnit', 'OPA5'].includes(test.framework)) {
            const testTemlpate = readFileSync(join(TEMPLATE_PATH, 'test/qunit.html'), 'utf-8');
            const testTemplateConfig = createTestTemplateConfig(
                testConfig,
                manifest['sap.app'].id,
                flpTemplConfig.ui5.theme
            );
            fs.write(join(webappPath, testConfig.path), render(testTemlpate, testTemplateConfig));
        } else if (test.framework === 'Testsuite') {
            const testTemlpate = readFileSync(join(TEMPLATE_PATH, 'test/testsuite.qunit.html'), 'utf-8');
            const testTemplateConfig = {
                basePath: flpTemplConfig.basePath,
                initPath: testConfig.init
            };
            fs.write(join(webappPath, testConfig.path), render(testTemlpate, testTemplateConfig));
        }
    }
}

/**
 * Generates the preview files.
 *
 * @param basePath path to the application root
 * @param config configuration from the ui5.yaml
 * @param fs file system editor
 * @param logger logger instance
 * @returns a mem-fs editor with the preview files
 */
export async function generatePreviewFiles(
    basePath: string,
    config: MiddlewareConfig,
    fs?: Editor,
    logger: ToolsLogger = new ToolsLogger()
) {
    // remove incorrect configurations
    sanitizeConfig(config, logger);

    // create file system if not provided
    if (!fs) {
        fs = create(createStorage());
    }

    // generate FLP configuration
    const flpTemplate = readFileSync(join(TEMPLATE_PATH, 'flp/sandbox.html'), 'utf-8');
    const flpConfig = getFlpConfigWithDefaults(config.flp);

    const webappPath = await getWebappPath(basePath, fs);
    let manifest: Manifest | undefined;
    if (fs.exists(join(webappPath, 'manifest.json'))) {
        manifest = (await fs.readJSON(join(webappPath, 'manifest.json'))) as unknown as Manifest;
    }
    let flpTemplConfig: TemplateConfig;
    let flpPath: string;

    if (manifest) {
        flpTemplConfig = createFlpTemplateConfig(flpConfig, manifest);
        flpPath = join(webappPath, flpConfig.path);
        await addApp(
            flpTemplConfig,
            manifest,
            {
                target: flpTemplConfig.basePath,
                local: '.',
                intent: flpConfig.intent
            },
            logger
        );
        generateTestRunners(config.test, manifest, fs, webappPath, flpTemplConfig);
    } else {
        flpTemplConfig = createFlpTemplateConfig(flpConfig, {});
        flpPath = join(basePath, flpConfig.path);
    }

    if (flpConfig.apps.length > 0) {
        for (const app of flpConfig.apps) {
            if (app.local) {
                const appPath = await getWebappPath(join(basePath, app.local), fs);
                if (fs.exists(join(appPath, 'manifest.json'))) {
                    const appManifest = (await fs.readJSON(join(appPath, 'manifest.json'))) as unknown as Manifest;
                    await addApp(flpTemplConfig, appManifest, app, logger);
                } else {
                    logger.warn(`Could not add route for ${app}`);
                }
            }
        }
    }
    fs.write(flpPath, render(flpTemplate, flpTemplConfig));

    return fs;
}
