import type { ReaderCollection } from '@ui5/fs';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor as MemFsEditor } from 'mem-fs-editor';
import { render } from 'ejs';
import type http from 'http';
import type { Request, RequestHandler, Response, Router, NextFunction } from 'express';
import { readFileSync } from 'fs';
import { dirname, join, posix } from 'path';
import { Router as createRouter, static as serveStatic, json } from 'express';
import type { Logger, ToolsLogger } from '@sap-ux/logger';
import type { MiddlewareUtils } from '@ui5/server';
import type { Manifest } from '@sap-ux/project-access';
import {
    AdpPreview,
    type AdpPreviewConfig,
    type CommonChangeProperties,
    type DescriptorVariant,
    type OperationType
} from '@sap-ux/adp-tooling';
import { isAppStudio, exposePort } from '@sap-ux/btp-utils';
import { FeatureToggleAccess } from '@sap-ux/feature-toggle';

import { deleteChange, readChanges, writeChange } from './flex';
import { generateImportList, mergeTestConfigDefaults } from './test';
import type { Editor, FlpConfig, MiddlewareConfig, RtaConfig, TestConfig } from '../types';
import {
    getFlpConfigWithDefaults,
    createFlpTemplateConfig,
    PREVIEW_URL,
    type TemplateConfig,
    createTestTemplateConfig,
    addApp,
    getAppName
} from './config';

const DEFAULT_LIVERELOAD_PORT = 35729;

/**
 * Enhanced request handler that exposes a list of endpoints for the cds-plugin-ui5.
 */
export type EnhancedRouter = Router & {
    getAppPages?: () => string[];
};

/**
 * Enhanced request object that contains additional properties from cds-plugin-ui5.
 */
type EnhancedRequest = Request & { 'ui5-patched-router'?: { baseUrl?: string } };

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
    private adp?: AdpPreview;
    private manifest: Manifest;
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
        this.config = getFlpConfigWithDefaults(config.flp);
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
     * @param adp optional reference to the ADP tooling
     */
    async init(
        manifest: Manifest,
        componentId?: string,
        resources: Record<string, string> = {},
        adp?: AdpPreview
    ): Promise<void> {
        this.createFlexHandler();
        this.config.libs ??= await this.hasLocateReuseLibsScript();
        const id = manifest['sap.app']?.id ?? '';
        this.templateConfig = createFlpTemplateConfig(this.config, manifest, resources);
        this.adp = adp;
        this.manifest = manifest;

        await addApp(
            this.templateConfig,
            manifest,
            {
                componentId,
                target: resources[componentId ?? id] ?? this.templateConfig.basePath,
                local: '.',
                intent: this.config.intent
            },
            this.logger
        );
        this.addStandardRoutes();
        if (this.rta) {
            this.rta.options ??= {};
            this.rta.options.baseId = componentId ?? id;
            this.rta.options.appName = id;
            this.addEditorRoutes(this.rta);
        }
        if (this.test) {
            this.addTestRoutes(
                this.test.filter((config) => config.framework !== 'Testsuite'),
                id
            );
            this.createTestSuite(this.test);
        }

        await this.addRoutesForAdditionalApps();
        this.logger.info(`Initialized for app ${id}`);
        this.logger.debug(`Configured apps: ${JSON.stringify(this.templateConfig.apps)}`);
    }

    /**
     * Get the configuration for the developer mode.
     *
     * @param ui5MajorVersion - the major version of UI5
     * @returns the configuration for the developer mode
     * @private
     */
    private getDeveloperModeConfig(ui5MajorVersion: number): Map<string, string> {
        if (ui5MajorVersion < 2) {
            return new Map([
                // Run application in design time mode
                // Adds bindingString to BindingInfo objects. Required to create and read PropertyBinding changes
                ['xx-designMode', 'true'],
                // In design mode, the controller code will not be executed by default, which is not desired in our case, so we suppress the deactivation
                ['xx-suppressDeactivationOfControllerCode', 'true'],
                // Make sure that XML preprocessing results are correctly invalidated
                ['xx-viewCache', 'false']
            ]);
        } else {
            return new Map([
                // Run application in design time mode
                // Adds bindingString to BindingInfo objects. Required to create and read PropertyBinding changes
                ['xx-design-mode', 'true'],
                // In design mode, the controller code will not be executed by default, which is not desired in our case, so we suppress the deactivation
                ['xx-suppress-deactivation-of-controller-code', 'true'],
                // Make sure that XML preprocessing results are correctly invalidated
                ['xx-view-cache', 'false']
            ]);
        }
    }

    /**
     * Generates the FLP sandbox for an editor.
     *
     * @param req the request
     * @param rta runtime authoring configuration
     * @param editor editor configuration
     * @returns FLP sandbox html
     */
    private async generateSandboxForEditor(req: EnhancedRequest, rta: RtaConfig, editor: Editor): Promise<string> {
        const defaultGenerator = editor.developerMode
            ? '@sap-ux/control-property-editor'
            : '@sap-ux/preview-middleware';

        await this.setApplicationDependencies();
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
        config.features = FeatureToggleAccess.getAllFeatureToggles();

        const ui5Version = await this.getUi5Version(req.protocol, req.headers.host, req['ui5-patched-router']?.baseUrl);

        if (editor.developerMode === true) {
            config.ui5.bootstrapOptions = serializeUi5Configuration(this.getDeveloperModeConfig(ui5Version.major));
        }

        if (ui5Version.major === 1 && ui5Version.minor <= 71) {
            this.removeAsyncHintsRequests();
        }
        return render(this.getSandboxTemplate(ui5Version.major), config);
    }

    /**
     * Sets application dependencies in the template configuration.
     * The descriptor is refreshed if the global flag is set.
     *
     * @returns Promise that resolves when the application dependencies are set
     */
    private async setApplicationDependencies(): Promise<void> {
        if (this.adp) {
            await this.adp.sync();
            const appName = getAppName(this.manifest, this.config.intent);
            this.templateConfig.apps[appName].applicationDependencies = this.adp.descriptor;
        }
    }

    /**
     * Add additional routes for configured editors.
     *
     * @param rta runtime authoring configuration
     */
    private addEditorRoutes(rta: RtaConfig): void {
        const cpe = dirname(require.resolve('@sap-ux/control-property-editor-sources'));
        for (const editor of rta.editors) {
            let previewUrl = editor.path.startsWith('/') ? editor.path : `/${editor.path}`;
            if (editor.developerMode) {
                previewUrl = `${previewUrl}.inner.html`;
                editor.pluginScript ??= 'open/ux/preview/client/cpe/init';
                this.router.get(editor.path, async (_req: Request, res: Response) => {
                    const scenario = rta.options?.scenario;
                    let templatePreviewUrl = `${previewUrl}?sap-ui-xx-viewCache=false&fiori-tools-rta-mode=forAdaptation&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true#${this.config.intent.object}-${this.config.intent.action}`;
                    if (scenario === 'ADAPTATION_PROJECT') {
                        templatePreviewUrl = templatePreviewUrl.replace('?', `?sap-ui-layer=${rta.layer}&`);
                    }
                    const template = readFileSync(join(__dirname, '../../templates/flp/editor.html'), 'utf-8');
                    const features = FeatureToggleAccess.getAllFeatureToggles();
                    const envPort = process.env.FIORI_TOOLS_LIVERELOAD_PORT;
                    let livereloadPort: number = envPort ? parseInt(envPort, 10) : DEFAULT_LIVERELOAD_PORT;
                    livereloadPort = isNaN(livereloadPort) ? DEFAULT_LIVERELOAD_PORT : livereloadPort;
                    const envLivereloadUrl = isAppStudio() ? await exposePort(livereloadPort) : undefined;
                    const html = render(template, {
                        previewUrl: templatePreviewUrl,
                        telemetry: rta.options?.telemetry ?? false,
                        appName: rta.options?.appName,
                        scenario,
                        livereloadPort,
                        livereloadUrl: envLivereloadUrl,
                        features: JSON.stringify(features)
                    });
                    this.sendResponse(res, 'text/html', 200, html);
                });
                let path = dirname(editor.path);
                if (!path.endsWith('/')) {
                    path = `${path}/`;
                }
                this.router.use(`${path}editor`, serveStatic(cpe));
            }

            this.router.get(previewUrl, async (req: Request, res: Response) => {
                if (!req.query['fiori-tools-rta-mode']) {
                    // Redirect to the same URL but add the necessary parameter
                    const params = JSON.parse(JSON.stringify(req.query)) as Record<string, string>;
                    params['sap-ui-xx-viewCache'] = 'false';
                    params['fiori-tools-rta-mode'] = 'true';
                    params['sap-ui-rta-skip-flex-validation'] = 'true';
                    res.redirect(302, `${previewUrl}?${new URLSearchParams(params)}`);
                    return;
                }
                const html = (await this.generateSandboxForEditor(req, rta, editor)).replace(
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
    private addStandardRoutes(): void {
        // register static client sources
        this.router.use(PREVIEW_URL.client.path, serveStatic(PREVIEW_URL.client.local));

        // add route for the sandbox html
        this.router.get(this.config.path, (async (req: EnhancedRequest, res: Response, next: NextFunction) => {
            await this.setApplicationDependencies();
            // inform the user if a html file exists on the filesystem
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const file = await this.project.byPath(this.config.path);
            if (file) {
                this.logger.info(`HTML file returned at ${this.config.path} is loaded from the file system.`);
                next();
            } else {
                const ui5Version = await this.getUi5Version(
                    req.protocol,
                    req.headers.host,
                    req['ui5-patched-router']?.baseUrl
                );
                const html = render(this.getSandboxTemplate(ui5Version.major), this.templateConfig);
                this.sendResponse(res, 'text/html', 200, html);
            }
        }) as RequestHandler);
    }

    /**
     * Read the UI5 version.
     * In case of an error, the default UI5 version '1.121.0' is returned.
     *
     * @param protocol - the protocol that should be used to request the UI5 version ('http' or 'https')
     * @param host - the host that should be used to request the UI5 version
     * @param baseUrl - the base path of the request that should be added to the host
     * @returns the template for the sandbox HTML file
     * @private
     */
    private async getUi5Version(
        protocol: Request['protocol'],
        host: Request['headers']['host'],
        baseUrl: string = ''
    ): Promise<{ major: number; minor: number }> {
        let version: string | undefined;
        if (!host) {
            this.logger.error('Unable to fetch UI5 version: No host found in request header.');
        } else {
            try {
                const versionUrl = `${protocol}://${host}${baseUrl}/resources/sap-ui-version.json`;
                const responseJson = (await fetch(versionUrl).then((res) => res.json())) as
                    | { libraries: { name: string; version: string }[] }
                    | undefined;
                version = responseJson?.libraries?.find((lib) => lib.name === 'sap.ui.core')?.version;
            } catch (error) {
                this.logger.error(error);
            }
        }
        if (!version) {
            this.logger.error('Could not get UI5 version of application. Using 1.121.0 as fallback.');
            version = '1.121.0';
        }
        const [major, minor] = version.split('.').map((versionPart) => parseInt(versionPart, 10));
        return {
            major,
            minor
        };
    }

    /**
     * Read the sandbox template file based on the given UI5 version.
     *
     * @param ui5MajorVersion - the major version of UI5
     * @returns the template for the sandbox HTML file
     */
    private getSandboxTemplate(ui5MajorVersion: number): string {
        this.logger.info(`Using sandbox template for UI5 major version ${ui5MajorVersion}.`);
        return readFileSync(
            join(__dirname, `../../templates/flp/sandbox${ui5MajorVersion === 1 ? '' : ui5MajorVersion}.html`),
            'utf-8'
        );
    }

    /**
     * For UI5 version 1.71 and below, the asyncHints.requests need to be removed from the template configuration
     * to load the changes in an Adaptation project.
     */
    private removeAsyncHintsRequests(): void {
        for (const app in this.templateConfig.apps) {
            const appDependencies = this.templateConfig.apps[app].applicationDependencies;

            if (appDependencies?.asyncHints.requests) {
                appDependencies.asyncHints.requests = [];
            }
        }
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
    private async addRoutesForAdditionalApps(): Promise<void> {
        for (const app of this.config.apps) {
            let manifest: Manifest | undefined;
            if (app.local) {
                manifest = JSON.parse(readFileSync(join(app.local, 'webapp/manifest.json'), 'utf-8')) as
                    | Manifest
                    | undefined;
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
                await addApp(this.templateConfig, manifest, app, this.logger);
                this.logger.info(`Adding additional intent: ${app.intent?.object}-${app.intent?.action}`);
            } else {
                this.logger.info(
                    `Invalid application config for route ${app.target} because neither componentId nor local folder provided.`
                );
            }
        }
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
            this.sendResponse(res, 'application/json', 200, JSON.stringify(changes));
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
                    fs.commit(() => this.sendResponse(res, 'text/plain', 200, message ?? ''));
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
     * If it is part of TestConfig, create a test suite for the test configurations.
     *
     * @param configs test configurations
     * @private
     */
    private createTestSuite(configs: TestConfig[]): void {
        const testsuiteConfig = configs.find((config) => config.framework === 'Testsuite');
        if (!testsuiteConfig) {
            //silent skip: create a testsuite only if it is explicitly part of the test configuration
            return;
        }
        if (configs.length <= 1) {
            this.logger.warn('Skip testsuite generation. No test frameworks configured.');
            return;
        }
        const testsuite = readFileSync(join(__dirname, '../../templates/test/testsuite.qunit.html'), 'utf-8');
        const initTemplate = readFileSync(join(__dirname, '../../templates/test/testsuite.qunit.js'), 'utf-8');
        const config = mergeTestConfigDefaults(testsuiteConfig);
        this.logger.debug(`Add route for ${config.path}`);
        this.router.get(config.path, (async (_req, res) => {
            this.logger.debug(`Serving test route: ${config.path}`);
            const templateConfig = {
                basePath: this.templateConfig.basePath,
                initPath: config.init
            };
            const html = render(testsuite, templateConfig);
            this.sendResponse(res, 'text/html', 200, html);
        }) as RequestHandler);

        if (testsuiteConfig.init !== undefined) {
            this.logger.debug(
                `Skip serving testsuite init script in favor of provided script: ${testsuiteConfig.init}`
            );
            return;
        }

        const testPaths: string[] = [];
        for (const testConfig of configs) {
            if (testConfig.framework === 'Testsuite') {
                continue;
            }
            const mergedConfig = mergeTestConfigDefaults(testConfig);
            testPaths.push(posix.relative(posix.dirname(config.path), mergedConfig.path));
        }

        this.logger.debug(`Add route for ${config.init}`);
        this.router.get(config.init, (async (_req, res, next) => {
            const files = await this.project.byGlob(config.init.replace('.js', '.[jt]s'));
            if (files?.length > 0) {
                this.logger.warn(`Script returned at ${config.path} is loaded from the file system.`);
                next();
            } else {
                this.logger.debug(`Serving test route: ${config.init}`);
                const templateConfig = {
                    testPaths: testPaths
                };
                const js = render(initTemplate, templateConfig);
                this.sendResponse(res, 'application/javascript', 200, js);
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
    private sendResponse(res: Response | http.ServerResponse, contentType: string, status: number, body: string): void {
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
    private addTestRoutes(configs: TestConfig[], id: string): void {
        const ns = id.replace(/\./g, '/');
        const htmlTemplate = readFileSync(join(__dirname, '../../templates/test/qunit.html'), 'utf-8');
        const initTemplate = readFileSync(join(__dirname, '../../templates/test/qunit.js'), 'utf-8');
        for (const testConfig of configs) {
            const config = mergeTestConfigDefaults(testConfig);
            this.logger.debug(`Add route for ${config.path}`);
            // add route for the *.qunit.html
            this.router.get(config.path, (async (_req, res, next) => {
                this.logger.debug(`Serving test route: ${config.path}`);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const file = await this.project.byPath(config.path);
                if (file) {
                    this.logger.warn(`HTML file returned at ${config.path} is loaded from the file system.`);
                    next();
                } else {
                    const templateConfig = createTestTemplateConfig(config, id, this.templateConfig.ui5.theme);
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

                const files = await this.project.byGlob(config.init.replace('.js', '.[jt]s'));
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
 * @throws Error in case no manifest.appdescr_variant found
 */
export async function initAdp(
    rootProject: ReaderCollection,
    config: AdpPreviewConfig,
    flp: FlpSandbox,
    util: MiddlewareUtils,
    logger: ToolsLogger
): Promise<void> {
    const appVariant = await rootProject.byPath('/manifest.appdescr_variant');
    if (appVariant) {
        const adp = new AdpPreview(config, rootProject, util, logger);
        const variant = JSON.parse(await appVariant.getString()) as DescriptorVariant;
        const layer = await adp.init(variant);
        if (flp.rta) {
            flp.rta.layer = layer;
            flp.rta.options = {
                ...flp.rta.options,
                projectId: variant.id,
                scenario: 'ADAPTATION_PROJECT'
            };
            for (const editor of flp.rta.editors) {
                editor.pluginScript ??= 'open/ux/preview/client/adp/init';
            }
        }

        const descriptor = adp.descriptor;
        const { name, manifest } = descriptor;
        await flp.init(manifest, name, adp.resources, adp);
        flp.router.use(adp.descriptor.url, adp.proxy.bind(adp) as RequestHandler);
        flp.addOnChangeRequestHandler(adp.onChangeRequest.bind(adp));
        flp.router.use(json());
        adp.addApis(flp.router);
    } else {
        throw new Error('ADP configured but no manifest.appdescr_variant found.');
    }
}
