import { ToolsLogger, type Logger } from '@sap-ux/logger';
import type {
    App,
    DefaultFlpPath,
    DefaultIntent,
    FlpConfig,
    Intent,
    CompleteTestConfig,
    MiddlewareConfig,
    RtaConfig,
    TestConfig,
    CardGeneratorConfig
} from '../types';
import { render } from 'ejs';
import { resolve, join, posix } from 'node:path';
import {
    createProjectAccess,
    getWebappPath,
    getWebappTestPath,
    type Manifest,
    type UI5FlexLayer
} from '@sap-ux/project-access';
import { extractDoubleCurlyBracketsKey } from '@sap-ux/i18n';
import { readFileSync } from 'node:fs';
import { mergeTestConfigDefaults } from './test';
import { getTestResourcesPathPrefix, adjustPathForSandbox, getResourcesPathPrefix } from './utils/project';
import { type Editor, create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { MergedAppDescriptor } from '@sap-ux/axios-extension';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { MiddlewareUtils } from '@ui5/server';

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

type TestTemplateConfig = {
    id: string;
    framework: TestConfig['framework'];
    basePath: string;
    initPath: string;
    theme: string;
};

export type PreviewUrls = {
    path: string;
    type: 'preview' | 'editor' | 'test';
};

/**
 * Internal structure used to fill the sandbox.html template
 */
export interface TemplateConfig {
    /**
     * Base path to the app root
     * Example:
     * - UI5 project type 'application': relative '..' (depending on the nesting level of the HTML file)
     * - UI5 project type 'component': absolute '/resources/the/app/id'
     * todo 1: check if we can use absolute paths for both project types
     */
    appBasePath: string;
    /**
     * Base path to the server root. Path is relative depending on the nesting level of the HTML file when the project is served.
     * Example:
     * - http://localhost:8080/test/flp.html -> '..'
     * - http://localhost:8080/test-resources/my/app/id/flp.html -> '../../../../..'
     */
    rootBasePath: string;
    apps: Record<
        string,
        {
            title: string;
            description: string;
            additionalInformation: string;
            applicationType: 'URL';
            url: string;
            applicationDependencies?: MergedAppDescriptor;
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
    flexSettings?: {
        [key: string]: unknown;
        layer: UI5FlexLayer;
        developerMode: boolean;
        pluginScript?: string;
    };
    features?: { feature: string; isEnabled: boolean }[];
    locateReuseLibsScript?: boolean;
    enhancedHomePage?: boolean;
    enableCardGenerator?: boolean;
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

export const CARD_GENERATOR_DEFAULT = {
    previewGeneratorSandbox: '/test/flpCardGeneratorSandbox.html',
    cardsStore: '/cards/store',
    i18nStore: '/editor/i18n'
} as const;

/**
 * Default theme
 */
export const DEFAULT_THEME = 'sap_horizon';

/**
 * Default path for mounting the local FLP.
 */
export const DEFAULT_PATH: DefaultFlpPath = '/test/flp.html';

/**
 * Default intent
 */
export const DEFAULT_INTENT = {
    object: 'app',
    action: 'preview'
} as Readonly<DefaultIntent>;

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
 * Type guard for FlexConnector.
 *
 * @param connector - the connector to check
 * @returns true if the connector is a FlexConnector, false otherwise
 */
export function isFlexConnector(connector: FlexConnector | CustomConnector): connector is FlexConnector {
    return 'connector' in connector;
}

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
 * @param utils middleware utils
 * @returns a full configuration with default values
 */
export function getFlpConfigWithDefaults(config: Partial<FlpConfig> = {}, utils?: MiddlewareUtils): FlpConfig {
    const sandboxPathPrefix = getTestResourcesPathPrefix(utils);
    const defaultPath = adjustPathForSandbox(DEFAULT_PATH, sandboxPathPrefix);

    return {
        path: posix.join(sandboxPathPrefix ?? '/', config.path ?? defaultPath),
        intent: config.intent ?? DEFAULT_INTENT,
        apps: config.apps ?? [],
        libs: config.libs,
        theme: config.theme,
        init: config.init ? posix.join(sandboxPathPrefix ?? '/', config.init) : undefined,
        enhancedHomePage: config.enhancedHomePage === true
    } satisfies FlpConfig;
}

/**
 * Adjust RTA editor paths for component projects.
 *
 * @param rta RTA configuration
 * @param utils middleware utils
 * @returns RTA configuration with adjusted paths
 */
export function adjustRtaConfigPaths(rta: RtaConfig | undefined, utils?: MiddlewareUtils): RtaConfig | undefined {
    if (!rta) {
        return undefined;
    }
    return structuredClone({
        ...rta,
        endpoints: rta.endpoints.map((endpoint) => {
            return {
                ...endpoint,
                path: posix.join(getTestResourcesPathPrefix(utils) ?? '/', endpoint.path)
            };
        })
    });
}

/**
 * Adjust card generator path for component projects and set default if needed.
 *
 * @param cardGenerator card generator configuration
 * @param utils middleware utils
 * @returns card generator configuration with adjusted path
 */
export function adjustCardGeneratorPath(
    cardGenerator: CardGeneratorConfig | undefined,
    utils?: MiddlewareUtils
): { path: string } | undefined {
    const sandboxPathPrefix = getTestResourcesPathPrefix(utils);
    const defaultPath = CARD_GENERATOR_DEFAULT.previewGeneratorSandbox;
    if (!cardGenerator) {
        if (!sandboxPathPrefix) {
            return { path: defaultPath };
        }
        const adjustedPath = adjustPathForSandbox(defaultPath, sandboxPathPrefix);
        return { path: posix.join(sandboxPathPrefix, adjustedPath) };
    }

    const basePath = cardGenerator.path ?? defaultPath;

    return {
        path: sandboxPathPrefix
            ? posix.join(sandboxPathPrefix, adjustPathForSandbox(basePath, sandboxPathPrefix))
            : posix.join('/', basePath)
    };
}

/**
 * The developer mode is only supported for adaptation projects, therefore, notify the user if it is wrongly configured and then disable it.
 *
 * @param config configurations from the ui5.yaml
 * @param logger logger instance
 */
export function sanitizeConfig(config: MiddlewareConfig, logger: ToolsLogger): void {
    //prettier-ignore
    if (config.rta) { //NOSONAR
        config.editors ??= {};
        config.editors.rta = sanitizeRtaConfig(config.rta, logger); //NOSONAR
        delete config.rta; //NOSONAR
    }
    if (config.editors?.rta && config.adp === undefined) {
        config.editors.rta.endpoints = config.editors.rta.endpoints.map((editor) => {
            if (editor.developerMode) {
                logger.error('developerMode is ONLY supported for SAP UI5 adaptation projects.');
                logger.warn(`developerMode for ${editor.path} disabled`);
                editor.developerMode = false;
            }
            return editor;
        });
    }
}

/**
 * Sanitize the deprecated RTA configuration.
 *
 * @param deprecatedRtaConfig deprecated RTA configuration
 * @param logger logger instance
 * @returns sanitized RTA configuration
 */
//prettier-ignore
export function sanitizeRtaConfig(deprecatedRtaConfig: MiddlewareConfig['rta'], logger?: Logger): RtaConfig | undefined { //NOSONAR
    let rtaConfig: RtaConfig | undefined;
    if (deprecatedRtaConfig) {
        const { editors, ...rta } = deprecatedRtaConfig;
        rtaConfig = { ...rta, endpoints: [...editors] };
        logger?.warn(`The configuration option 'rta' is deprecated. Please use 'editors.rta' instead.`);
    }
    return rtaConfig;
}

/**
 * Retrieves the configuration settings for UI5 flexibility services.
 *
 * @returns An array of flexibility service configurations, each specifying a connector
 *          and its options, such as the layers it applies to and its service URL, if applicable.
 */
function getFlexSettings(): TemplateConfig['ui5']['flex'] {
    const localConnectorPath = 'open/ux/preview/client/flp/WorkspaceConnector';

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
export async function addApp(
    templateConfig: TemplateConfig,
    manifest: Partial<Manifest>,
    app: App,
    logger: Logger
): Promise<void> {
    const id = manifest['sap.app']?.id ?? '';

    if (manifest['sap.app']?.type === 'component') {
        logger.debug(`No application added for id '${id}' because its type is 'component'`);
        templateConfig.apps = templateConfig.apps ?? {};
        return;
    }

    const appName = getAppName(manifest, app.intent);
    templateConfig.ui5.resources[id] = app.target;
    templateConfig.apps[appName] = {
        title:
            (await getI18nTextFromProperty(app.local, manifest['sap.app']?.title, manifest['sap.app']?.id, logger)) ??
            id,
        description:
            (await getI18nTextFromProperty(
                app.local,
                manifest['sap.app']?.description,
                manifest['sap.app']?.id,
                logger
            )) ?? '',
        additionalInformation: `SAPUI5.Component=${app.componentId ?? id}`,
        applicationType: 'URL',
        url: app.target
    };
}

/**
 * Get the application name based on the manifest and app configuration.
 *
 * @param manifest - The application manifest.
 * @param intent - The app configuration.
 * @returns The application name.
 */
export function getAppName(manifest: Partial<Manifest>, intent?: Intent): string {
    const id = manifest['sap.app']?.id ?? '';

    intent ??= {
        object: id.replace(/\./g, ''),
        action: 'preview'
    };

    return `${intent?.object}-${intent?.action}`;
}

/**
 * Get the i18n text of the given property.
 *
 * @param projectRoot absolute path to the project root
 * @param propertyValue value of the property
 * @param appId application id
 * @param logger logger instance
 * @returns i18n text of the property
 */
async function getI18nTextFromProperty(
    projectRoot: string | undefined,
    propertyValue: string | undefined,
    appId: string | undefined,
    logger: Logger
): Promise<string | undefined> {
    const propertyI18nKey = extractDoubleCurlyBracketsKey(propertyValue ?? '');
    if (!projectRoot || !propertyI18nKey) {
        return propertyValue;
    }
    const absolutePath = resolve(process.cwd(), projectRoot);
    try {
        const projectAccess = await createProjectAccess(absolutePath);
        const appPath = await projectAccess.getApplicationIdByManifestAppId(appId ?? '');
        const applicationAccess = projectAccess.getApplication(appPath ?? '');
        const bundle = (await applicationAccess.getI18nBundles())['sap.app'];
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
 * @param utils middleware utils
 * @returns configuration object for the sandbox.html template
 */
export function createFlpTemplateConfig(
    config: FlpConfig,
    manifest: Partial<Manifest>,
    resources: Record<string, string> = {},
    utils?: MiddlewareUtils | undefined
): TemplateConfig {
    const flex = getFlexSettings();
    const supportedThemes: string[] = (manifest['sap.ui5']?.supportedThemes as []) ?? [DEFAULT_THEME];
    const ui5Theme = config.theme ?? (supportedThemes.includes(DEFAULT_THEME) ? DEFAULT_THEME : supportedThemes[0]);
    const rootBasePath = posix.relative(posix.dirname(config.path), '/') ?? '.';
    const appBasePath = getResourcesPathPrefix(utils) ?? rootBasePath;
    return {
        appBasePath: appBasePath,
        rootBasePath: rootBasePath,
        apps: {},
        init: config.init,
        ui5: {
            libs: getUI5Libs(manifest),
            theme: ui5Theme,
            flex,
            resources: {
                ...resources,
                [PREVIEW_URL.client.ns]: PREVIEW_URL.client.getUrl(getResourcesPathPrefix(utils) ?? appBasePath)
            },
            bootstrapOptions: ''
        },
        locateReuseLibsScript: config.libs,
        enhancedHomePage: config.enhancedHomePage,
        enableCardGenerator: false
    } satisfies TemplateConfig;
}

/**
 * Creates the configuration object for the test template.
 *
 * @param config test configuration
 * @param id application id
 * @param theme theme to be used
 * @returns configuration object for the test template
 */
export function createTestTemplateConfig(config: CompleteTestConfig, id: string, theme: string): TestTemplateConfig {
    return {
        id,
        framework: config.framework,
        basePath: posix.relative(posix.dirname(config.path), '/') ?? '.',
        initPath: posix.relative(posix.dirname(config.path), config.init),
        theme
    } satisfies TestTemplateConfig;
}

/**
 * Returns the preview paths.
 *
 * @param config configuration from the ui5.yaml
 * @param utils middleware utils
 * @param logger logger instance
 * @returns an array of preview paths
 */
export function getPreviewPaths(
    config: MiddlewareConfig,
    utils: MiddlewareUtils,
    logger: ToolsLogger = new ToolsLogger()
): PreviewUrls[] {
    const urls: PreviewUrls[] = [];
    // remove incorrect configurations
    sanitizeConfig(config, logger);
    // add flp preview url
    const flpConfig = getFlpConfigWithDefaults(config.flp, utils);
    urls.push({ path: `${flpConfig.path}#${flpConfig.intent.object}-${flpConfig.intent.action}`, type: 'preview' });
    // add editor urls
    if (config.editors?.rta) {
        config.editors.rta.endpoints.forEach((endpoint) => {
            urls.push({ path: endpoint.path, type: 'editor' });
        });
    }
    // add test urls if configured
    if (config.test) {
        config.test.forEach((test) => {
            const testConfig = mergeTestConfigDefaults(test, utils);
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
 * @param webappTestPath webapp test path
 * @param flpTemplConfig FLP configuration
 */
function generateTestRunners(
    configs: TestConfig[] | undefined,
    manifest: Manifest,
    fs: Editor,
    webappTestPath: string,
    flpTemplConfig: TemplateConfig
): void {
    // Strip trailing 'test' or '/test' from webappTestPath to avoid duplication
    // since testConfig.path typically starts with '/test/'
    const basePath = webappTestPath.replace(/[/\\]test$/, '');

    for (const test of configs ?? []) {
        const testConfig = mergeTestConfigDefaults(test);
        if (['QUnit', 'OPA5'].includes(test.framework)) {
            const testTemplate = readFileSync(join(TEMPLATE_PATH, 'test/qunit.ejs'), 'utf-8');
            const testTemplateConfig = createTestTemplateConfig(
                testConfig,
                manifest['sap.app'].id,
                flpTemplConfig.ui5.theme
            );
            fs.write(join(basePath, testConfig.path), render(testTemplate, testTemplateConfig));
        } else if (test.framework === 'Testsuite') {
            const testTemplate = readFileSync(join(TEMPLATE_PATH, 'test/testsuite.qunit.ejs'), 'utf-8');
            const testTemplateConfig = {
                basePath: flpTemplConfig.appBasePath,
                initPath: testConfig.init
            };
            fs.write(join(basePath, testConfig.path), render(testTemplate, testTemplateConfig));
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
): Promise<Editor> {
    // remove incorrect configurations
    sanitizeConfig(config, logger);

    // create file system if not provided
    fs ??= create(createStorage());

    // generate FLP configuration
    const flpTemplate = readFileSync(join(TEMPLATE_PATH, 'flp/sandbox.ejs'), 'utf-8');
    const flpConfig = getFlpConfigWithDefaults(config.flp);

    const webappPath = await getWebappPath(basePath, fs);
    const webappTestPath = await getWebappTestPath(basePath, fs);
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
                target: flpTemplConfig.appBasePath,
                local: '.',
                intent: flpConfig.intent
            },
            logger
        );
        generateTestRunners(config.test, manifest, fs, webappTestPath, flpTemplConfig);
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
