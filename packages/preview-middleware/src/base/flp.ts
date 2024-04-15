import type { ReaderCollection } from '@ui5/fs';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor as MemFsEditor } from 'mem-fs-editor';
import { render } from 'ejs';
import http from 'http';
import type { Request, RequestHandler, Response, Router } from 'express';
import { readFileSync } from 'fs';
import { dirname, join, posix } from 'path';
import { Router as createRouter, static as serveStatic, json } from 'express';
import type { Logger, ToolsLogger } from '@sap-ux/logger';
import type { MiddlewareUtils } from '@ui5/server';
import type { Manifest, UI5FlexLayer } from '@sap-ux/project-access';
import {
    AdpPreview,
    type AdpPreviewConfig,
    type CommonChangeProperties,
    type OperationType
} from '@sap-ux/adp-tooling';
import { createProjectAccess } from '@sap-ux/project-access';

import { deleteChange, readChanges, writeChange } from './flex';
import { generateImportList, mergeTestConfigDefaults } from './test';
import type { App, Editor, FlpConfig, MiddlewareConfig, RtaConfig, TestConfig } from '../types';

const DEVELOPER_MODE_CONFIG = new Map([
    // Run application in design time mode
    // Adds bindingString to BindingInfo objects. Required to create and read PropertyBinding changes
    ['xx-designMode', 'true'],
    // In design mode, the controller code will not be executed by default, which is not desired in our case, so we suppress the deactivation
    ['xx-suppressDeactivationOfControllerCode', 'true'],
    // Make sure that XML preprocessing results are correctly invalidated
    ['xx-viewCache', 'false']
]);

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

const DEFAULT_LIVERELOAD_PORT = 35729;

/**
 * Enhanced request handler that exposes a list of endpoints for the cds-plugin-ui5.
 */
export type EnhancedRouter = Router & {
    getAppPages?: () => string[];
};

/**
 * Default theme
 */
const DEFAULT_THEME = 'sap_horizon';

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
 * Static settings
 */
const PREVIEW_URL = {
    client: {
        url: '/preview/client',
        local: join(__dirname, '../../dist/client'),
        ns: 'open.ux.preview.client'
    },
    api: '/preview/api'
};

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

type OnChangeRequestHandler = (
    type: OperationType,
    change: CommonChangeProperties,
    fs: MemFsEditor,
    logger: Logger
) => Promise<void>;

/**
 * Class handling preview of a sandbox FLP.
 */
export class FlpSandbox {
    protected onChangeRequest: OnChangeRequestHandler | undefined;
    protected templateConfig: TemplateConfig;
    public readonly config: FlpConfig;
    public readonly rta?: RtaConfig;
    public readonly test?: TestConfig[];
    public readonly router: EnhancedRouter;

    /**
     * Constructor setting defaults and keeping reference to workspace resources.
     *
     * @param config configuration from the ui5.yaml
     * @param project reference to the project provided by the UI5 CLI
     * @param utils middleware utilities provided by the UI5 CLI
     * @param logger logger instance
     */
    constructor(
        config: Partial<MiddlewareConfig>,
        private readonly project: ReaderCollection,
        private readonly utils: MiddlewareUtils,
        private readonly logger: Logger
    ) {
        this.config = {
            path: config.flp?.path ?? DEFAULT_PATH,
            intent: config.flp?.intent ?? DEFAULT_INTENT,
            apps: config.flp?.apps ?? [],
            libs: config.flp?.libs,
            theme: config.flp?.theme,
            init: config.flp?.init
        };
        if (!this.config.path.startsWith('/')) {
            this.config.path = `/${this.config.path}`;
        }
        this.test = config.test;
        this.rta = config.rta;
        logger.debug(`Config: ${JSON.stringify({ flp: this.config, rta: this.rta, test: this.test })}`);
        this.router = createRouter();
    }

    /**
     * Registers a handler function to be called when a change request occurs.
     *
     * @param {OnChangeRequestHandler} handler - The function to be executed when a change request occurs.
     */
    public addOnChangeRequestHandler(handler: OnChangeRequestHandler): void {
        this.onChangeRequest = handler;
    }

    /**
     * Initialize the FLP sandbox router.
     *
     * @param manifest application manifest
     * @param componentId optional componentId e.g. for adaptation projects
     * @param resources optional additional resource mappings
     */
    async init(manifest: Manifest, componentId?: string, resources: Record<string, string> = {}): Promise<void> {
        this.createFlexHandler();
        const flex = this.getFlexSettings();
        const supportedThemes: string[] = (manifest['sap.ui5']?.supportedThemes as []) ?? [DEFAULT_THEME];
        const ui5Theme =
            this.config.theme ?? (supportedThemes.includes(DEFAULT_THEME) ? DEFAULT_THEME : supportedThemes[0]);
        const id = manifest['sap.app'].id;
        const ns = id.replace(/\./g, '/');
        this.templateConfig = {
            basePath: posix.relative(posix.dirname(this.config.path), '/') ?? '.',
            apps: {},
            init: this.config.init ? ns + this.config.init : undefined,
            ui5: {
                libs: this.getUI5Libs(manifest),
                theme: ui5Theme,
                flex,
                resources: {
                    ...resources,
                    [PREVIEW_URL.client.ns]: PREVIEW_URL.client.url
                },
                bootstrapOptions: ''
            },
            locateReuseLibsScript: this.config.libs ?? (await this.hasLocateReuseLibsScript())
        };

        await this.addApp(manifest, {
            componentId,
            target: resources[componentId ?? id] ?? this.templateConfig.basePath,
            local: '.',
            intent: this.config.intent
        });
        this.addStandardRoutes();
        if (this.rta) {
            this.rta.options ??= {};
            this.rta.options.baseId = componentId ?? id;
            this.rta.options.appName = id;
            this.addEditorRoutes(this.rta);
        }
        if (this.test) {
            this.addTestRoutes(this.test, id);
        }

        await this.addRoutesForAdditionalApps();
        this.logger.info(`Initialized for app ${id}`);
        this.logger.debug(`Configured apps: ${JSON.stringify(this.templateConfig.apps)}`);
    }

    /**
     * Generates the FLP sandbox for an editor.
     *
     * @param rta runtime authoring configuration
     * @param editor editor configuration
     * @returns FLP sandbox html
     */
    private generateSandboxForEditor(rta: RtaConfig, editor: Editor): string {
        const defaultGenerator = editor.developerMode
            ? '@sap-ux/control-property-editor'
            : '@sap-ux/preview-middleware';
        const config = { ...this.templateConfig };
        /* sap.ui.rta needs to be added to the list of preload libs for variants management and adaptation projects */
        if (!config.ui5.libs.includes('sap.ui.rta')) {
            const libs = config.ui5.libs.split(',');
            libs.push('sap.ui.rta');
            config.ui5.libs = libs.join(',');
        }
        config.flex = {
            layer: rta.layer,
            ...rta.options,
            generator: editor.generator ?? defaultGenerator,
            developerMode: editor.developerMode === true,
            pluginScript: editor.pluginScript
        };
        if (editor.developerMode === true) {
            config.ui5.bootstrapOptions = serializeUi5Configuration(DEVELOPER_MODE_CONFIG);
        }
        const template = readFileSync(join(__dirname, '../../templates/flp/sandbox.html'), 'utf-8');
        return render(template, config);
    }

    /**
     * Add additional routes for configured editors.
     *
     * @param rta runtime authoring configuration
     */
    private addEditorRoutes(rta: RtaConfig) {
        const cpe = dirname(require.resolve('@sap-ux/control-property-editor-sources'));
        for (const editor of rta.editors) {
            let previewUrl = editor.path;
            if (editor.developerMode) {
                previewUrl = `${previewUrl}.inner.html`;
                editor.pluginScript ??= 'open/ux/preview/client/cpe/init';
                this.router.get(editor.path, (_req: Request, res: Response) => {
                    const scenario = rta.options?.scenario;
                    let templatePreviewUrl = `${previewUrl}?sap-ui-xx-viewCache=false&fiori-tools-rta-mode=forAdaptation&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true#${this.config.intent.object}-${this.config.intent.action}`;
                    if (scenario === 'ADAPTATION_PROJECT') {
                        templatePreviewUrl = templatePreviewUrl.replace('?', `?sap-ui-layer=${rta.layer}&`);
                    }
                    const template = readFileSync(join(__dirname, '../../templates/flp/editor.html'), 'utf-8');
                    const envPort = process.env.FIORI_TOOLS_LIVERELOAD_PORT;
                    let livereloadPort: number = envPort ? parseInt(envPort, 10) : DEFAULT_LIVERELOAD_PORT;
                    livereloadPort = isNaN(livereloadPort) ? DEFAULT_LIVERELOAD_PORT : livereloadPort;
                    const html = render(template, {
                        previewUrl: templatePreviewUrl,
                        telemetry: rta.options?.telemetry ?? false,
                        appName: rta.options?.appName,
                        scenario,
                        livereloadPort
                    });
                    this.sendResponse(res, 'text/html', 200, html);
                });
                let path = dirname(editor.path);
                if (!path.endsWith('/')) {
                    path = `${path}/`;
                }
                this.router.use(`${path}editor`, serveStatic(cpe));
            }

            this.router.get(previewUrl, (_req: Request, res: Response) => {
                const html = this.generateSandboxForEditor(rta, editor).replace(
                    '</body>',
                    `</body>\n<!-- livereload disabled for editor </body>-->`
                );
                this.sendResponse(res, 'text/html', 200, html);
            });
        }
    }

    /**
     * Add routes for html and scripts required for a local FLP.
     */
    private addStandardRoutes() {
        // register static client sources
        this.router.use(PREVIEW_URL.client.url, serveStatic(PREVIEW_URL.client.local));

        // add route for the sandbox.html
        this.router.get(this.config.path, (async (_req: Request, res: Response) => {
            // warn the user if a file with the same name exists in the filesystem
            const file = await this.project.byPath(this.config.path);
            if (file) {
                this.logger.warn(`HTML file returned at ${this.config.path} is NOT loaded from the file system.`);
            }
            const template = readFileSync(join(__dirname, '../../templates/flp/sandbox.html'), 'utf-8');
            const html = render(template, this.templateConfig);
            this.sendResponse(res, 'text/html', 200, html);
        }) as RequestHandler);
    }

    /**
     * Try finding a locate-reuse-libs script in the project.
     *
     * @returns the location of the locate-reuse-libs script or undefined.
     */
    private async hasLocateReuseLibsScript(): Promise<boolean | undefined> {
        const files = await this.project.byGlob('**/locate-reuse-libs.js');
        return files.length > 0;
    }

    /**
     * Add additional routes for apps also to be shown in the local FLP.
     */
    private async addRoutesForAdditionalApps() {
        for (const app of this.config.apps) {
            let manifest: Manifest | undefined;
            if (app.local) {
                manifest = JSON.parse(readFileSync(join(app.local, 'webapp/manifest.json'), 'utf-8'));
                this.router.use(app.target, serveStatic(join(app.local, 'webapp')));
                this.logger.info(`Serving additional application at ${app.target} from ${app.local}`);
            } else if (app.componentId) {
                manifest = {
                    'sap.app': {
                        id: app.componentId,
                        title: app.intent ? `${app.intent.object}-${app.intent.action}` : app.componentId
                    }
                } as Manifest;
            }
            if (manifest) {
                await this.addApp(manifest, app);
                this.logger.info(`Adding additional intent: ${app.intent?.object}-${app.intent?.action}`);
            } else {
                this.logger.info(
                    `Invalid application config for route ${app.target} because neither componentId nor local folder provided.`
                );
            }
        }
    }

    /**
     * Retrieves the configuration settings for UI5 flexibility services.
     *
     * @returns An array of flexibility service configurations, each specifying a connector
     *          and its options, such as the layers it applies to and its service URL, if applicable.
     */
    private getFlexSettings(): TemplateConfig['ui5']['flex'] {
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
     * Create required routes for flex.
     */
    private createFlexHandler(): void {
        const fs = create(createStorage());
        const api = `${PREVIEW_URL.api}/changes`;
        this.router.use(api, json());
        this.router.get(api, (async (_req: Request, res: Response) => {
            const changes = await readChanges(this.project, this.logger);
            if (this.onChangeRequest) {
                for (const change of Object.values(changes)) {
                    await this.onChangeRequest('read', change, fs, this.logger);
                }
            }
            res.status(200).contentType('application/json').send(changes);
        }) as RequestHandler);
        this.router.post(api, (async (req: Request, res: Response) => {
            try {
                const change = req.body as CommonChangeProperties;
                if (this.onChangeRequest) {
                    await this.onChangeRequest('write', change, fs, this.logger);
                }
                const { success, message } = writeChange(
                    change,
                    this.utils.getProject().getSourcePath(),
                    fs,
                    this.logger
                );
                if (success) {
                    fs.commit(() => res.status(200).send(message));
                } else {
                    this.sendResponse(res, 'text/plain', 400, 'INVALID_DATA');
                }
            } catch (error) {
                this.sendResponse(res, 'text/plain', 500, error.message);
            }
        }) as RequestHandler);
        this.router.delete(api, (async (req: Request, res: Response) => {
            try {
                const { success, message } = deleteChange(
                    req.body,
                    this.utils.getProject().getSourcePath(),
                    this.logger
                );
                if (success) {
                    this.sendResponse(res, 'text/plain', 200, message ?? '');
                } else {
                    this.sendResponse(res, 'text/plain', 400, 'INVALID_DATA');
                }
            } catch (error) {
                this.sendResponse(res, 'text/plain', 500, error.message);
            }
        }) as RequestHandler);
    }

    /**
     * Send a response with the given content type, status and body.
     * Ensure compliance with common APIs in express and connect.
     *
     * @param res the response object
     * @param contentType the content type
     * @param status the response status
     * @param body the response body
     * @private
     */
    private sendResponse(res: Response | http.ServerResponse, contentType: string, status: number, body: string) {
        res.writeHead(status, {
            'Content-Type': contentType
        });
        res.write(body);
        res.end();
    }

    /**
     * Add routes for html and scripts required for a local test FLP.
     *
     * @param configs test configurations
     * @param id application id from manifest
     */
    private addTestRoutes(configs: TestConfig[], id: string) {
        const ns = id.replace(/\./g, '/');
        const htmlTemplate = readFileSync(join(__dirname, '../../templates/test/qunit.html'), 'utf-8');
        const initTemplate = readFileSync(join(__dirname, '../../templates/test/qunit.js'), 'utf-8');
        for (const testConfig of configs) {
            const config = mergeTestConfigDefaults(testConfig);
            this.logger.debug(`Add route for ${config.path}`);
            // add route for the *.qunit.html
            this.router.get(config.path, (async (_req, res, next) => {
                this.logger.debug(`Serving test route: ${config.path}`);
                const file = await this.project.byPath(config.path);
                if (file) {
                    this.logger.warn(`HTML file returned at ${config.path} is loaded from the file system.`);
                    next();
                } else {
                    const templateConfig = {
                        id,
                        framework: config.framework,
                        basePath: posix.relative(posix.dirname(config.path), '/') ?? '.',
                        initPath: `${ns}${config.init.replace('.js', '')}`
                    };
                    const html = render(htmlTemplate, templateConfig);
                    this.sendResponse(res, 'text/html', 200, html);
                }
            }) as RequestHandler);
            if (testConfig.init !== undefined) {
                this.logger.debug(`Skip serving test init script in favor of provided script: ${testConfig.init}`);
                continue;
            }
            // add route for the init file
            this.logger.debug(`Add route for ${config.init}`);
            this.router.get(config.init, (async (_req, res, next) => {
                this.logger.debug(`Serving test init script: ${config.init}`);

                const files = await this.project.byGlob(config.init.replace('.js', '.*'));
                if (files?.length > 0) {
                    this.logger.warn(`Script returned at ${config.path} is loaded from the file system.`);
                    next();
                } else {
                    const testFiles = await this.project.byGlob(config.pattern);
                    const templateConfig = { tests: generateImportList(ns, testFiles) };
                    const js = render(initTemplate, templateConfig);
                    this.sendResponse(res, 'application/javascript', 200, js);
                }
            }) as RequestHandler);
        }
    }

    /**
     * Add an application to the local FLP preview.
     *
     * @param manifest manifest of the additional target app
     * @param app configuration for the preview
     */
    async addApp(manifest: Manifest, app: App) {
        const id = manifest['sap.app'].id;
        app.intent ??= {
            object: id.replace(/\./g, ''),
            action: 'preview'
        };
        let title = manifest['sap.app'].title ?? id;
        let description = manifest['sap.app'].description ?? '';
        if (app.local) {
            title = (await this.getI18nTextFromProperty(app.local, manifest['sap.app'].title)) ?? id;
            description = (await this.getI18nTextFromProperty(app.local, manifest['sap.app'].description)) ?? '';
        }
        this.templateConfig.ui5.resources[id] = app.target;
        this.templateConfig.apps[`${app.intent?.object}-${app.intent?.action}`] = {
            title: title,
            description: description,
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
     * @returns i18n text of the property
     * @private
     */
    private async getI18nTextFromProperty(projectRoot: string, propertyValue: string | undefined) {
        //i18n model format could be {{key}} or {i18n>key}
        if (!propertyValue || propertyValue.search(/{{\w+}}|{i18n>\w+}/g) === -1) {
            return propertyValue;
        }
        const propertyI18nKey = propertyValue.replace(/i18n>|[{}]/g, '');
        const projectAccess = await createProjectAccess(projectRoot);
        try {
            const bundle = (await projectAccess.getApplication('').getI18nBundles())['sap.app'];
            return bundle[propertyI18nKey]?.[0]?.value?.value ?? propertyI18nKey;
        } catch (e) {
            this.logger.warn('Failed to load i18n properties bundle');
        }
        return propertyI18nKey;
    }

    /**
     * Gets the UI5 libs dependencies from manifest.json.
     *
     * @param manifest application manifest
     * @returns UI5 libs that should preloaded
     */
    private getUI5Libs(manifest: Manifest): string {
        if (manifest['sap.ui5']?.dependencies?.libs) {
            const libNames = Object.keys(manifest['sap.ui5'].dependencies.libs);
            return libNames
                .filter((key) => {
                    return UI5_LIBS.some((substring) => {
                        return key === substring || key.startsWith(substring + '.');
                    });
                })
                .join(',');
        } else {
            return 'sap.m,sap.ui.core,sap.ushell';
        }
    }
}

/**
 * Creates an attribute string that can be added to an HTML element.
 *
 * @param attributes map with attributes and their values
 * @param indent indentation thats inserted before each attribute
 * @param prefix value that should be added at the start of to all attribute names
 * @returns attribute string
 */
function serializeDataAttributes(attributes: Map<string, string>, indent = '', prefix = 'data'): string {
    return [...attributes.entries()]
        .map(([name, value]) => {
            return `${indent}${prefix}-${name}="${value}"`;
        })
        .join('\n');
}

/**
 * Creates an attribute string that can be added to bootstrap script in a HTML file.
 *
 * @param config ui5 configuration options
 * @returns attribute string
 */
function serializeUi5Configuration(config: Map<string, string>): string {
    return '\n' + serializeDataAttributes(config, '        ', 'data-sap-ui');
}

/**
 * Initialize the preview for an adaptation project.
 *
 * @param rootProject reference to the project
 * @param config configuration from the ui5.yaml
 * @param flp FlpSandbox instance
 * @param util middleware utilities provided by the UI5 CLI
 * @param logger logger instance
 */
export async function initAdp(
    rootProject: ReaderCollection,
    config: AdpPreviewConfig,
    flp: FlpSandbox,
    util: MiddlewareUtils,
    logger: ToolsLogger
) {
    const appVariant = await rootProject.byPath('/manifest.appdescr_variant');
    if (appVariant) {
        const adp = new AdpPreview(config, rootProject, util, logger);
        const variant = JSON.parse(await appVariant.getString());
        const layer = await adp.init(variant);
        if (flp.rta) {
            flp.rta.layer = layer;
            flp.rta.options = {
                projectId: variant.id,
                scenario: 'ADAPTATION_PROJECT'
            };
            for (const editor of flp.rta.editors) {
                editor.pluginScript ??= 'open/ux/preview/client/adp/init';
            }
        }

        const descriptor = adp.descriptor;
        descriptor.asyncHints.requests = [];
        const { name, manifest } = descriptor;

        await flp.init(manifest, name, adp.resources);
        flp.router.use(adp.descriptor.url, adp.proxy.bind(adp) as RequestHandler);
        flp.addOnChangeRequestHandler(adp.onChangeRequest.bind(adp));
        flp.router.use(json());
        adp.addApis(flp.router);
    } else {
        throw new Error('ADP configured but no manifest.appdescr_variant found.');
    }
}
