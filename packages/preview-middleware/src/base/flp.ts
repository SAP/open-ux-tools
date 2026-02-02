// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { ReaderCollection } from '@ui5/fs';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor as MemFsEditor } from 'mem-fs-editor';
import { render } from 'ejs';
import type http from 'node:http';
import type { Request, Response, Router, NextFunction } from 'express';
import { Router as createRouter, static as serveStatic, json } from 'express';
import type connect from 'connect';
import { dirname, join, posix } from 'node:path';
import type { Logger, ToolsLogger } from '@sap-ux/logger';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { MiddlewareUtils } from '@ui5/server';
import {
    getWebappPath,
    getProjectType,
    type ProjectType,
    findProjectRoot,
    type Manifest,
    FileName,
    type ManifestNamespace,
    createApplicationAccess,
    type UI5FlexLayer
} from '@sap-ux/project-access';
import {
    AdpPreview,
    type AdpPreviewConfig,
    type CommonChangeProperties,
    type OperationType,
    type CommonAdditionalChangeInfoProperties,
    loadAppVariant,
    readManifestFromBuildPath
} from '@sap-ux/adp-tooling';
import { isAppStudio, exposePort } from '@sap-ux/btp-utils';
import { FeatureToggleAccess } from '@sap-ux/feature-toggle';
import { deleteChange, readChanges, writeChange } from './flex';
import { generateImportList, mergeTestConfigDefaults } from './test';
import type {
    RtaEditor,
    FlpConfig,
    CompleteTestConfig,
    MiddlewareConfig,
    RtaConfig,
    TestConfig,
    CardGeneratorConfig,
    MultiCardsPayload,
    I18nEntry
} from '../types';
import {
    getFlpConfigWithDefaults,
    createFlpTemplateConfig,
    PREVIEW_URL,
    type TemplateConfig,
    isFlexConnector,
    createTestTemplateConfig,
    addApp,
    getAppName,
    sanitizeRtaConfig,
    CARD_GENERATOR_DEFAULT
} from './config';
import { generateCdm } from './cdm';
import { readFileSync } from 'node:fs';
import { getIntegrationCard } from './utils/cards';
import { createPropertiesI18nEntries } from '@sap-ux/i18n';

const DEFAULT_LIVERELOAD_PORT = 35729;

/**
 * Global registry to track FlpSandbox instances by app ID.
 * This is used for CAP projects where multiple apps share the same server.
 */
export const flpSandboxRegistry: Map<string, FlpSandbox> = new Map();

/**
 * Finds the FlpSandbox instance based on the request referer.
 *
 * @param req - The HTTP request
 * @returns The FlpSandbox instance or undefined
 */
export function findFlpSandboxFromRequest(req: Request): FlpSandbox | undefined {
    const referer = req.headers.referer || '';

    const registry = (global as any).__flpSandboxRegistry as Record<string, FlpSandbox> | undefined;
    if (!registry) {
        return undefined;
    }

    // Try to find the app ID from the referer URL
    for (const [regAppId, sandbox] of Object.entries(registry)) {
        // Check if the referer contains the app's namespace (e.g., sap.fe.cap.travel)
        const appPath = regAppId.replace(/\./g, '/');
        if (referer.includes(appPath) || referer.includes(regAppId)) {
            return sandbox;
        }
    }

    // Fallback: return the first sandbox
    const sandboxes = Object.values(registry);
    return sandboxes.length > 0 ? sandboxes[0] : undefined;
}

/**
 * Serves a static file from the webapp directory with path validation.
 *
 * @param req - The HTTP request
 * @param res - The HTTP response
 * @param next - The next middleware function
 * @param relativePath - The relative path to the file
 * @param contentType - The content type for the response
 */
export function serveStaticFileFromWebapp(
    req: Request,
    res: Response,
    next: NextFunction,
    relativePath: string,
    contentType: string
): void {
    const sandbox = findFlpSandboxFromRequest(req);
    if (!sandbox) {
        next();
        return;
    }
    const webappPath = sandbox.utils.getProject().getSourcePath();
    // Sanitize the path to prevent path traversal attacks
    const sanitizedPath = posix.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
    const filePath = join(webappPath, sanitizedPath);
    // Ensure the resolved path is within the webapp directory
    if (!filePath.startsWith(webappPath)) {
        res.status(403).send('Access denied');
        return;
    }
    try {
        const content = readFileSync(filePath, 'utf-8');
        res.setHeader('Content-Type', contentType);
        res.send(content);
    } catch {
        next();
    }
}

/**
 * Enhanced request handler that exposes a list of endpoints for the cds-plugin-ui5.
 */
export type EnhancedRouter = Router & {
    getAppPages?: () => string[];
};

/**
 * Enhanced request object that contains additional properties from cds-plugin-ui5.
 */
export type EnhancedRequest = Request & { 'ui5-patched-router'?: { baseUrl?: string } };

type OnChangeRequestHandler = (
    type: OperationType,
    change: CommonChangeProperties,
    fs: MemFsEditor,
    logger: Logger,
    extendedChange?: CommonAdditionalChangeInfoProperties
) => Promise<void>;

type Ui5Version = {
    major: number;
    minor: number;
    patch: number;
    label?: string;
    /**
     * Indicates if the UI5 version is served from CDN.
     */
    isCdn: boolean;
};

type RtaDeveloperModeTemplateConfig = {
    previewUrl: string;
    telemetry: boolean;
    appName: string | undefined;
    scenario?: string;
    livereloadPort: number;
    livereloadUrl?: string;
    features: string;
    baseUrl: string;
};

/**
 * Class handling preview of a sandbox FLP.
 */
export class FlpSandbox {
    private adp?: AdpPreview;
    private manifest: Manifest;
    protected onChangeRequest: OnChangeRequestHandler | undefined;
    protected templateConfig: TemplateConfig;
    public readonly flpConfig: FlpConfig;
    public readonly rta?: RtaConfig;
    public readonly test?: TestConfig[];
    public readonly router: EnhancedRouter;
    private readonly fs: MemFsEditor;
    private readonly logger: Logger;
    public readonly utils: MiddlewareUtils;
    private readonly project: ReaderCollection;
    private readonly cardGenerator?: CardGeneratorConfig;
    private projectType: ProjectType;

    /**
     * Constructor setting defaults and keeping reference to workspace resources.
     *
     * @param config configuration from the ui5.yaml
     * @param project reference to the project provided by the UI5 CLI
     * @param utils middleware utilities provided by the UI5 CLI
     * @param logger logger instance
     */
    constructor(config: Partial<MiddlewareConfig>, project: ReaderCollection, utils: MiddlewareUtils, logger: Logger) {
        this.fs = create(createStorage());
        this.logger = logger;
        this.project = project;
        this.utils = utils;
        this.flpConfig = getFlpConfigWithDefaults(config.flp);
        this.test = config.test;
        this.rta = config.editors?.rta ?? sanitizeRtaConfig(config.rta, logger); //NOSONAR
        logger.debug(`Config: ${JSON.stringify({ flp: this.flpConfig, rta: this.rta, test: this.test })}`);
        this.router = createRouter();
        this.cardGenerator = config.editors?.cardGenerator;
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
        const projectRoot = await findProjectRoot(process.cwd(), false, true);
        this.projectType = await getProjectType(projectRoot);
        this.createFlexHandler();
        this.flpConfig.libs ??= await this.hasLocateReuseLibsScript();
        const id = manifest['sap.app']?.id ?? '';
        this.templateConfig = createFlpTemplateConfig(this.flpConfig, manifest, resources);
        this.adp = adp;
        this.manifest = manifest;

        await addApp(
            this.templateConfig,
            manifest,
            {
                componentId,
                target: resources[componentId ?? id] ?? this.templateConfig.basePath,
                local: '.',
                intent: this.flpConfig.intent
            },
            this.logger
        );
        this.addStandardRoutes();

        if (this.cardGenerator?.path) {
            this.cardGenerator.path = this.cardGenerator.path.startsWith('/')
                ? this.cardGenerator.path
                : `/${this.cardGenerator.path}`;

            await this.addCardGeneratorMiddlewareRoute();
            await this.addStoreCardManifestRoute();
            await this.addStoreI18nKeysRoute();

            // For CAP projects, register root-level routes
            this.addRootLevelCardRoutes();
        }

        // Register this instance in the global registry for CAP projects
        flpSandboxRegistry.set(id, this);

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

        if (this.flpConfig.enhancedHomePage) {
            this.addCDMRoute();
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
                ['data-sap-ui-xx-designMode', 'true'],
                // In design mode, the controller code will not be executed by default, which is not desired in our case, so we suppress the deactivation
                ['data-sap-ui-xx-suppressDeactivationOfControllerCode', 'true'],
                // Make sure that XML preprocessing results are correctly invalidated
                ['data-sap-ui-xx-viewCache', 'false']
            ]);
        } else {
            return new Map([
                // Run application in design time mode
                // Adds bindingString to BindingInfo objects. Required to create and read PropertyBinding changes
                ['data-sap-ui-xx-design-mode', 'true'],
                // In design mode, the controller code will not be executed by default, which is not desired in our case, so we suppress the deactivation
                ['data-sap-ui-xx-suppress-deactivation-of-controller-code', 'true'],
                // Make sure that XML preprocessing results are correctly invalidated
                ['data-sap-ui-xx-view-cache', 'false']
            ]);
        }
    }

    /**
     * Deletes the Fiori Tools local connector (WorkspaceConnector) in case of a not supported UI5 versions.
     * As an alternative the Fiori Tools fake connector (FakeLrepConnector) will be used as defined in preview-middleware-client/src/flp/initConnectors.ts.
     * Also deletes the ABAP connector in case of a CAP project.
     * Deletes all connectors if UI5 version is < 1.84 and served from npmjs.
     *
     * @param ui5VersionMajor - the major version of UI5
     * @param ui5VersionMinor - the minor version of UI5
     * @param isCDN - whether the UI5 sources are served from CDN
     * @private
     */
    private checkDeleteConnectors(ui5VersionMajor: number, ui5VersionMinor: number, isCDN: boolean): void {
        if (ui5VersionMajor === 1 && ui5VersionMinor < 84) {
            this.templateConfig.ui5.flex = this.templateConfig.ui5?.flex?.filter((connector) =>
                isFlexConnector(connector)
            );
            this.logger.debug(
                `The Fiori Tools local connector (WorkspaceConnector) is not being used because the current UI5 version does not support it.${
                    isCDN ? 'The Fiori Tools fake connector (FakeLrepConnector) will be used instead.' : ''
                } `
            );
            if (!isCDN) {
                this.logger.warn(
                    `The preview with virtual endpoints does not support flex changes for the current UI5 version ${ui5VersionMajor}.${ui5VersionMinor} from npmjs. Consider using a proxy to load UI5 resources from the CDN (e.g., https://ui5.sap.com), or upgrade the UI5 version in the yaml configuration to at least 1.84.`
                );
            }
        } else {
            this.logger.debug(`The Fiori Tools local connector (WorkspaceConnector) is being used.`);
        }
        if (this.projectType === 'CAPJava' || this.projectType === 'CAPNodejs') {
            this.templateConfig.ui5.flex = this.templateConfig.ui5?.flex?.filter(
                (connector) =>
                    !isFlexConnector(connector) ||
                    (isFlexConnector(connector) && !connector.url?.startsWith('/sap/bc/lrep'))
            );
            this.logger.debug(
                `The ABAP connector is not being used because the current project type is '${this.projectType}'.`
            );
        } else {
            this.logger.debug(`The ABAP connector is being used.`);
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
    private async generateSandboxForEditor(req: EnhancedRequest, rta: RtaConfig, editor: RtaEditor): Promise<string> {
        const defaultGenerator = editor.developerMode
            ? '@sap-ux/control-property-editor'
            : '@sap-ux/preview-middleware';

        await this.setApplicationDependencies();
        this.templateConfig.baseUrl = req['ui5-patched-router']?.baseUrl ?? '';
        const ui5Version = await this.getUi5Version(req.protocol, req.headers.host, this.templateConfig.baseUrl);
        this.checkDeleteConnectors(ui5Version.major, ui5Version.minor, ui5Version.isCdn);
        if (ui5Version.major === 1 && ui5Version.minor <= 71) {
            this.removeAsyncHintsRequests();
        }

        const config = structuredClone(this.templateConfig);
        if (!config.ui5.libs.includes('sap.ui.rta')) {
            // sap.ui.rta needs to be added to the list of preload libs for variants management and adaptation projects
            config.ui5.libs += ',sap.ui.rta';
        }
        if (editor.developerMode) {
            config.ui5.bootstrapOptions = serializeUi5Configuration(this.getDeveloperModeConfig(ui5Version.major));
        }
        config.flexSettings = {
            layer: rta.layer ?? 'CUSTOMER_BASE',
            ...rta.options,
            generator: editor.generator ?? defaultGenerator,
            developerMode: editor.developerMode === true,
            pluginScript: editor.pluginScript
        };
        config.features = FeatureToggleAccess.getAllFeatureToggles();

        return render(this.getSandboxTemplate(ui5Version), config);
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
            const appName = getAppName(this.manifest, this.flpConfig.intent);
            this.templateConfig.apps[appName].applicationDependencies = this.adp.descriptor;
        }
    }

    /**
     * Handler for the GET requests to the runtime adaptation editor in developer mode.
     *
     * @param req the request
     * @param res the response
     * @param rta runtime adaptation configuration
     * @param previewUrl the url of the preview
     * @private
     */
    private async editorGetHandlerDeveloperMode(
        req: EnhancedRequest,
        res: Response,
        rta: RtaConfig,
        previewUrl: string
    ): Promise<void> {
        const scenario = rta.options?.scenario;
        let templatePreviewUrl = `${previewUrl}?sap-ui-xx-viewCache=false&fiori-tools-rta-mode=forAdaptation&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true#${this.flpConfig.intent.object}-${this.flpConfig.intent.action}`;
        if (scenario === 'ADAPTATION_PROJECT') {
            templatePreviewUrl = templatePreviewUrl.replace('?', `?sap-ui-layer=${rta.layer}&`);
        }
        const template = readFileSync(join(__dirname, '../../templates/flp/editor.ejs'), 'utf-8');
        const features = FeatureToggleAccess.getAllFeatureToggles();
        const envPort = process.env.FIORI_TOOLS_LIVERELOAD_PORT;
        let livereloadPort: number = envPort ? Number.parseInt(envPort, 10) : DEFAULT_LIVERELOAD_PORT;
        livereloadPort = Number.isNaN(livereloadPort) ? DEFAULT_LIVERELOAD_PORT : livereloadPort;
        const envLivereloadUrl = isAppStudio() ? await exposePort(livereloadPort) : undefined;
        const html = render(template, {
            previewUrl: templatePreviewUrl,
            telemetry: !!rta.options?.telemetry,
            appName: rta.options?.appName,
            scenario,
            livereloadPort,
            livereloadUrl: envLivereloadUrl,
            features: JSON.stringify(features),
            baseUrl: req['ui5-patched-router']?.baseUrl ?? ''
        } satisfies RtaDeveloperModeTemplateConfig);
        this.sendResponse(res, 'text/html', 200, html);
    }

    /**
     * Handler for the GET requests to the runtime adaptation editor.
     *
     * @param req the request
     * @param res the response
     * @param rta runtime adaptation configuration
     * @param previewUrl the url of the preview
     * @param editor editor configuration
     * @private
     */
    private async editorGetHandler(
        req: EnhancedRequest,
        res: Response,
        rta: RtaConfig,
        previewUrl: string,
        editor: RtaEditor
    ): Promise<void> {
        if (!req.query['fiori-tools-rta-mode']) {
            this.logger.debug(`Adjusting URL parameters for runtime adaptation mode. Redirecting to correct URL.`);
            const url =
                'ui5-patched-router' in req
                    ? posix.join(req['ui5-patched-router']?.baseUrl ?? '', previewUrl)
                    : previewUrl;
            const params = structuredClone(req.query);
            params['sap-ui-xx-viewCache'] = 'false';
            params['fiori-tools-rta-mode'] = 'true';
            params['sap-ui-rta-skip-flex-validation'] = 'true';
            params['sap-ui-xx-condense-changes'] = 'true';
            res.redirect(302, `${url}?${new URLSearchParams(params)}`);
            return;
        }
        const html = (await this.generateSandboxForEditor(req, rta, editor)).replace(
            '</body>',
            `</body>\n<!-- livereload disabled for editor </body>-->`
        );
        this.sendResponse(res, 'text/html', 200, html);
    }

    /**
     * Add additional routes for configured editors.
     *
     * @param rta runtime authoring configuration
     */
    private addEditorRoutes(rta: RtaConfig): void {
        const cpe = dirname(require.resolve('@sap-ux/control-property-editor-sources'));
        for (const editor of rta.endpoints) {
            let previewUrl = editor.path.startsWith('/') ? editor.path : `/${editor.path}`;
            if (editor.developerMode) {
                previewUrl = `${previewUrl}.inner.html`;
                editor.pluginScript ??= 'open/ux/preview/client/cpe/init';
                this.router.get(editor.path, async (req: EnhancedRequest, res: Response) => {
                    await this.editorGetHandlerDeveloperMode(req, res, rta, previewUrl);
                });
                let path = dirname(editor.path);
                if (!path.endsWith('/')) {
                    path = `${path}/`;
                }
                this.router.use(`${path}editor`, serveStatic(cpe));
            }

            this.router.get(previewUrl, async (req: Request, res: Response) => {
                await this.editorGetHandler(req, res, rta, previewUrl, editor);
            });
        }
    }

    /**
     * Handler for the GET requests to the FLP.
     *
     * @param req the request
     * @param res the response
     * @param next the next function
     * @private
     */
    private async flpGetHandler(
        req: EnhancedRequest | connect.IncomingMessage,
        res: Response | http.ServerResponse,
        next: NextFunction
    ): Promise<void> {
        // connect API (karma test runner) has no request query property
        if ('query' in req && 'redirect' in res && !req.query['sap-ui-xx-viewCache']) {
            this.logger.debug(`Adjusting URL parameters for preview. Redirecting to correct URL.`);
            const url =
                'ui5-patched-router' in req ? posix.join(req['ui5-patched-router']?.baseUrl ?? '', req.path) : req.path;
            const params = structuredClone(req.query);
            params['sap-ui-xx-viewCache'] = 'false';
            res.redirect(302, `${url}?${new URLSearchParams(params)}`);
            return;
        }
        await this.setApplicationDependencies();
        // get filepath from request. Use dummy url to extract it from originalUrl if needed
        const filePath = 'query' in req ? req.path : new URL('http://dummyHost' + req.originalUrl!).pathname; //NOSONAR
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const file = await this.project.byPath(filePath);
        if (file) {
            this.logger.info(`HTML file returned at ${filePath} is loaded from the file system.`);
            next();
        } else {
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            this.templateConfig.baseUrl = ('ui5-patched-router' in req && req['ui5-patched-router']?.baseUrl) || '';
            const ui5Version = await this.getUi5Version(
                //use protocol from request header referer as fallback for connect API (karma test runner)
                'protocol' in req
                    ? req.protocol
                    : (req.headers.referer?.substring(0, req.headers.referer.indexOf(':')) ?? 'http'),
                req.headers.host,
                this.templateConfig.baseUrl
            );
            this.checkDeleteConnectors(ui5Version.major, ui5Version.minor, ui5Version.isCdn);
            //for consistency reasons, we also add the baseUrl to the HTML here, although it is only used in editor mode
            const html = render(this.getSandboxTemplate(ui5Version), this.templateConfig);
            this.sendResponse(res, 'text/html', 200, html);
        }
    }

    /**
     * Add routes for html and scripts required for a local FLP.
     */
    private addStandardRoutes(): void {
        // register static client sources
        this.router.use(PREVIEW_URL.client.path, serveStatic(PREVIEW_URL.client.local));

        // add route for the sandbox html
        this.router.get(
            this.flpConfig.path,
            async (
                req: EnhancedRequest | connect.IncomingMessage,
                res: Response | http.ServerResponse,
                next: NextFunction
            ) => {
                await this.flpGetHandler(req, res, next);
            }
        );
    }

    /**
     * Adds a middleware route for the Card Generator in the FLP sandbox.
     *
     * This route dynamically updates the `templateConfig` with the Card Generator application details
     * and serves the FLP sandbox HTML using the `flpGetHandler`.
     *
     * @private
     */
    private async addCardGeneratorMiddlewareRoute(): Promise<void> {
        const previewGeneratorPath = this.cardGenerator?.path ?? CARD_GENERATOR_DEFAULT.previewGeneratorSandbox;
        this.logger.debug(`Add route for ${previewGeneratorPath}`);
        this.router.get(
            previewGeneratorPath,
            async (
                req: EnhancedRequest | connect.IncomingMessage,
                res: Response | http.ServerResponse,
                next: NextFunction
            ) => {
                this.templateConfig.enableCardGenerator = !!this.cardGenerator?.path;
                await this.flpGetHandler(req, res, next);
            }
        );
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
    ): Promise<Ui5Version> {
        let version: string | undefined;
        let isCdn = false;
        if (!host) {
            this.logger.error('Unable to fetch UI5 version: No host found in request header.');
        } else {
            try {
                const versionUrl = `${protocol}://${host}${baseUrl}/resources/sap-ui-version.json`;
                const responseJson = (await fetch(versionUrl).then((res) => res.json())) as
                    | { name: string; libraries: { name: string; version: string }[] }
                    | undefined;
                version = responseJson?.libraries?.find((lib) => lib.name === 'sap.ui.core')?.version;
                isCdn = responseJson?.name === 'SAPUI5 Distribution';
            } catch (error) {
                this.logger.debug(error);
            }
        }
        if (!version) {
            this.logger.error('Could not get UI5 version of application. Using version: 1.130.9 as fallback.');
            version = '1.130.9';
            isCdn = false;
        }
        const [major, minor, patch] = version.split('.').map((versionPart) => Number.parseInt(versionPart, 10));
        const label = version.split(/-(.*)/s)?.[1];

        if (
            this.flpConfig.enhancedHomePage &&
            ((major < 2 && minor < 123) || major >= 2 || label?.includes('legacy-free'))
        ) {
            this.flpConfig.enhancedHomePage = this.templateConfig.enhancedHomePage = false;
            this.logger.warn(`Feature enhancedHomePage disabled: UI5 version: ${version} not supported.`);
        }

        return {
            major,
            minor,
            patch,
            label,
            isCdn
        };
    }

    /**
     * Read the sandbox template file based on the given UI5 version.
     *
     * @param ui5Version - the UI5 version
     * @returns the template for the sandbox HTML file
     */
    private getSandboxTemplate(ui5Version: Ui5Version): string {
        this.logger.info(
            `Using sandbox template for UI5 version: ${ui5Version.major}.${ui5Version.minor}.${ui5Version.patch}${
                ui5Version.label ? `-${ui5Version.label}` : ''
            }.`
        );
        const filePrefix = ui5Version.major > 1 || ui5Version.label?.includes('legacy-free') ? '2' : '';
        const template = this.flpConfig.enhancedHomePage ? 'cdm' : 'sandbox';
        return readFileSync(join(__dirname, `../../templates/flp/${template}${filePrefix}.ejs`), 'utf-8');
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
        for (const app of this.flpConfig.apps) {
            let manifest: Manifest | undefined;
            if (app.local) {
                const webappPath = await getWebappPath(app.local, this.fs);
                manifest = JSON.parse(readFileSync(join(webappPath, 'manifest.json'), 'utf-8')) as Manifest | undefined;
                this.router.use(app.target, serveStatic(webappPath));
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
     * Add routes for cdm.json required by FLP during bootstrapping via cdm.
     *
     */
    private addCDMRoute(): void {
        this.router.get(
            '/cdm.json',
            async (_req: EnhancedRequest | connect.IncomingMessage, res: Response | http.ServerResponse) => {
                const json = generateCdm(this.templateConfig.apps);
                this.sendResponse(res, 'application/json', 200, JSON.stringify(json));
            }
        );
    }

    /**
     * Handler for flex changes GET requests.
     *
     * @param res the response
     * @private
     */
    private async flexGetHandler(res: Response): Promise<void> {
        const changes = await readChanges(this.project, this.logger);
        if (this.onChangeRequest) {
            for (const change of Object.values(changes)) {
                await this.onChangeRequest('read', change, this.fs, this.logger);
            }
        }
        this.sendResponse(res, 'application/json', 200, JSON.stringify(changes));
    }

    /**
     * Handler for flex changes POST requests.
     *
     * @param req the request
     * @param res the response
     * @private
     */
    private async flexPostHandler(req: Request, res: Response): Promise<void> {
        try {
            const body = req.body;
            if (this.onChangeRequest) {
                await this.onChangeRequest('write', body.change, this.fs, this.logger, body.additionalChangeInfo);
            }
            const { success, message } = writeChange(
                body.change,
                this.utils.getProject().getSourcePath(),
                this.fs,
                this.logger
            );
            if (success) {
                this.fs.commit(() => this.sendResponse(res, 'text/plain', 200, message ?? ''));
            } else {
                this.sendResponse(res, 'text/plain', 400, 'INVALID_DATA');
            }
        } catch (error) {
            this.sendResponse(res, 'text/plain', 500, error.message);
        }
    }

    /**
     * Handler for flex changes DELETE requests.
     *
     * @param req the request
     * @param res the response
     * @private
     */
    private async flexDeleteHandler(req: Request, res: Response): Promise<void> {
        try {
            const { success, message } = deleteChange(req.body, this.utils.getProject().getSourcePath(), this.logger);
            if (success) {
                this.sendResponse(res, 'text/plain', 200, message ?? '');
            } else {
                this.sendResponse(res, 'text/plain', 400, 'INVALID_DATA');
            }
        } catch (error) {
            this.sendResponse(res, 'text/plain', 500, error.message);
        }
    }

    /**
     * Create required routes for flex.
     */
    private createFlexHandler(): void {
        const api = `${PREVIEW_URL.api}/changes`;
        this.router.use(api, json());
        this.router.get(api, async (_req: Request, res: Response) => {
            await this.flexGetHandler(res);
        });
        this.router.post(api, async (req: Request, res: Response) => {
            await this.flexPostHandler(req, res);
        });
        this.router.delete(api, async (req: Request, res: Response) => {
            await this.flexDeleteHandler(req, res);
        });
    }

    /**
     * Handler for the GET requests to the HTML of the test suite.
     *
     * @param res the response
     * @param testsuite the test suite template
     * @param config the test configuration
     * @private
     */
    private async testSuiteHtmlGetHandler(
        res: Response | http.ServerResponse,
        testsuite: string,
        config: TestConfig
    ): Promise<void> {
        this.logger.debug(`Serving test route: ${config.path}`);
        const templateConfig = {
            basePath: this.templateConfig.basePath,
            initPath: config.init
        };
        const html = render(testsuite, templateConfig);
        this.sendResponse(res, 'text/html', 200, html);
    }

    /**
     * Handler for the GET requests to the JS of the test suite.
     *
     * @param res the response
     * @param next the next function
     * @param config the test configuration
     * @param initTemplate the test runner template
     * @param testPaths the paths to the test files
     * @private
     */
    private async testSuiteJsGetHandler(
        res: Response | http.ServerResponse,
        next: NextFunction,
        config: CompleteTestConfig,
        initTemplate: string,
        testPaths: string[]
    ): Promise<void> {
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
        const testsuite = readFileSync(join(__dirname, '../../templates/test/testsuite.qunit.ejs'), 'utf-8');
        const config = mergeTestConfigDefaults(testsuiteConfig);
        this.logger.debug(`Add route for ${config.path}`);
        this.router.get(
            config.path,
            async (_req: EnhancedRequest | connect.IncomingMessage, res: Response | http.ServerResponse) => {
                await this.testSuiteHtmlGetHandler(res, testsuite, config);
            }
        );

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

        const initTemplate = readFileSync(join(__dirname, '../../templates/test/testsuite.qunit.js'), 'utf-8');
        this.logger.debug(`Add route for ${config.init}`);
        this.router.get(
            config.init,
            async (
                _req: EnhancedRequest | connect.IncomingMessage,
                res: Response | http.ServerResponse,
                next: NextFunction
            ) => {
                await this.testSuiteJsGetHandler(res, next, config, initTemplate, testPaths);
            }
        );
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
     * Handler for the GET requests to the HTML of the test runner.
     *
     * @param res the response
     * @param next the next function
     * @param config test configuration
     * @param htmlTemplate the test runner template
     * @param id application id from manifest
     */
    private async testRunnerHtmlGetHandler(
        res: Response | http.ServerResponse,
        next: NextFunction,
        config: CompleteTestConfig,
        htmlTemplate: string,
        id: string
    ): Promise<void> {
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
    }

    /**
     * Handler for the GET requests to the JS of the test runner.
     *
     * @param res the response
     * @param next the next function
     * @param config test configuration
     * @param initTemplate the test runner template
     * @param ns namespace for the test files
     * @private
     */
    private async testRunnerJsGetHandler(
        res: Response | http.ServerResponse,
        next: NextFunction,
        config: CompleteTestConfig,
        initTemplate: string,
        ns: string
    ): Promise<void> {
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
    }

    /**
     * Add routes for html and scripts required for a local test FLP.
     *
     * @param configs test configurations
     * @param id application id from manifest
     */
    private addTestRoutes(configs: TestConfig[], id: string): void {
        const ns = id.replace(/\./g, '/');
        const htmlTemplate = readFileSync(join(__dirname, '../../templates/test/qunit.ejs'), 'utf-8');
        for (const testConfig of configs) {
            const config = mergeTestConfigDefaults(testConfig);
            this.logger.debug(`Add route for ${config.path}`);
            // add route for the *.qunit.html
            this.router.get(
                config.path,
                async (
                    _req: EnhancedRequest | connect.IncomingMessage,
                    res: Response | http.ServerResponse,
                    next: NextFunction
                ) => {
                    await this.testRunnerHtmlGetHandler(res, next, config, htmlTemplate, id);
                }
            );
            if (testConfig.init !== undefined) {
                this.logger.debug(`Skip serving test init script in favor of provided script: ${testConfig.init}`);
                continue;
            }
            // add route for the init file
            const initTemplate = readFileSync(join(__dirname, '../../templates/test/qunit.js'), 'utf-8');
            this.logger.debug(`Add route for ${config.init}`);
            this.router.get(
                config.init,
                async (
                    _req: EnhancedRequest | connect.IncomingMessage,
                    res: Response | http.ServerResponse,
                    next: NextFunction
                ) => {
                    await this.testRunnerJsGetHandler(res, next, config, initTemplate, ns);
                }
            );
        }
    }

    /**
     * Stores the card manifest files in the webapp folder of the project and updates the application manifest.
     *
     * @param {Request} req - The HTTP request object containing the card manifest data in the body.
     * @param {Response} res - The HTTP response object used to send the response back to the client.
     * @returns {Promise<void>} A promise that resolves when the operation is complete.
     */
    public async storeCardManifestHandler(req: Request, res: Response): Promise<void> {
        try {
            const {
                floorplan,
                localPath,
                fileName = FileName.Manifest,
                manifests
            } = req.body as {
                floorplan: string;
                localPath: string;
                fileName?: string;
                manifests: MultiCardsPayload[];
            };
            const projectSourcePath = this.utils.getProject().getSourcePath();
            this.logger.debug(`storeCardManifestHandler: projectSourcePath = ${projectSourcePath}`);
            // If projectSourcePath already ends with 'webapp', use it directly
            // Otherwise, call getWebappPath to find the webapp folder
            const webappPath = projectSourcePath.endsWith('webapp')
                ? projectSourcePath
                : await getWebappPath(projectSourcePath, this.fs);
            this.logger.debug(`storeCardManifestHandler: webappPath = ${webappPath}`);
            const fullPath = join(webappPath, localPath);
            const filePath = fileName.endsWith('.json') ? join(fullPath, fileName) : `${join(fullPath, fileName)}.json`;
            const integrationCard = getIntegrationCard(manifests);
            this.fs.write(filePath, JSON.stringify(integrationCard.manifest, null, 2));

            const entitySet = integrationCard.entitySet;
            const sapCardsAp = (this.manifest['sap.cards.ap'] ??= {});
            sapCardsAp.embeds ??= {};
            sapCardsAp.embeds[floorplan] = {
                default: entitySet,
                manifests: {
                    [entitySet]: [
                        {
                            localUri: localPath
                        }
                    ]
                }
            } satisfies ManifestNamespace.EmbedsSettings;

            // For createApplicationAccess, we need the project root (parent of webapp)
            // If projectSourcePath ends with 'webapp', use its parent directory
            const projectRoot = projectSourcePath.endsWith('webapp') ? dirname(projectSourcePath) : projectSourcePath;
            this.logger.debug(`storeCardManifestHandler: projectRoot = ${projectRoot}`);
            const appAccess = await createApplicationAccess(projectRoot, this.fs);
            await appAccess.updateManifestJSON(this.manifest, this.fs);
            this.fs.commit(() => this.sendResponse(res, 'text/plain', 201, `Files were updated/created`));
        } catch (error) {
            this.logger.error(`Files could not be created/updated. Error: ${error}`);
            this.logger.error(`Stack trace: ${error instanceof Error ? error.stack : 'N/A'}`);
            this.sendResponse(res, 'text/plain', 500, `Files could not be created/updated. Error: ${error}`);
        }
    }

    /**
     * Adds a route to store card manifest files, the files are stored in the webapp folder of the project.
     * The application manifest.json file is updated with the new card manifests information within the sap.cards.ap.embeds.
     *
     * @returns {Promise<void>} A promise that resolves when the route is added.
     */
    async addStoreCardManifestRoute(): Promise<void> {
        this.router.use(CARD_GENERATOR_DEFAULT.cardsStore, json());
        this.logger.debug(`Add route for ${CARD_GENERATOR_DEFAULT.cardsStore}`);

        this.router.post(CARD_GENERATOR_DEFAULT.cardsStore, async (req: Request, res: Response) => {
            await this.storeCardManifestHandler(req, res);
        });
    }

    /**
     * Handles the storage of i18n keys in the i18n file.
     *
     * @param {Request} req - The HTTP request object containing the i18n key-value pairs in the body.
     * @param {Response} res - The HTTP response object used to send the response back to the client.
     * @returns {Promise<void>} A promise that resolves when the operation is complete.
     */
    public async storeI18nKeysHandler(req: Request, res: Response): Promise<void> {
        try {
            const projectSourcePath = this.utils.getProject().getSourcePath();
            this.logger.debug(`storeI18nKeysHandler: projectSourcePath = ${projectSourcePath}`);
            // If projectSourcePath already ends with 'webapp', use it directly
            // Otherwise, call getWebappPath to find the webapp folder
            const webappPath = projectSourcePath.endsWith('webapp')
                ? projectSourcePath
                : await getWebappPath(projectSourcePath, this.fs);
            this.logger.debug(`storeI18nKeysHandler: webappPath = ${webappPath}`);
            const i18nConfig = this.manifest['sap.app'].i18n;
            let i18nPath = 'i18n/i18n.properties';
            let fallbackLocale: string | undefined;
            let supportedLocales: string[] = [];

            if (typeof i18nConfig === 'string') {
                i18nPath = i18nConfig;
            } else if (typeof i18nConfig === 'object' && i18nConfig !== null) {
                const config = i18nConfig as {
                    bundleUrl?: string;
                    bundleName?: string;
                    supportedLocales?: string[];
                    fallbackLocale?: string;
                };

                // bundleName takes precedence over bundleUrl (as per SAP UI5 spec)
                if (config.bundleName) {
                    // Convert bundleName (e.g., "sap.fe.cap.travel.i18n.i18n") to path
                    // Remove the app ID prefix and convert dots to slashes
                    const bundleNameParts = config.bundleName.split('.');
                    i18nPath = `${bundleNameParts.slice(-2).join('/')}.properties`;
                } else if (config.bundleUrl) {
                    i18nPath = config.bundleUrl;
                }

                supportedLocales = config.supportedLocales || [];
                fallbackLocale = config.fallbackLocale;
            }

            // ALWAYS use fallbackLocale if req.query.locale is not provided
            let requestedLocale = (req.query.locale as string) || fallbackLocale || '';

            // If still empty and we have supportedLocales, use the first one
            if (!requestedLocale && supportedLocales.length > 0) {
                requestedLocale = supportedLocales[0];
            }

            const baseFilePath = join(webappPath, i18nPath);
            const filePath = requestedLocale
                ? baseFilePath.replace('.properties', `_${requestedLocale}.properties`)
                : baseFilePath;

            if (requestedLocale && supportedLocales.length > 0 && !supportedLocales.includes(requestedLocale)) {
                this.sendResponse(
                    res,
                    'text/plain',
                    400,
                    `Locale "${requestedLocale}" is not supported. Supported: ${supportedLocales.join(', ')}`
                );
                return;
            }

            const entries = ((req.body as Array<I18nEntry>) || []).map((entry) => ({
                ...entry,
                annotation: entry.comment ?? entry.annotation
            }));
            await createPropertiesI18nEntries(filePath, entries);
            this.fs.commit(() => this.sendResponse(res, 'text/plain', 201, `i18n file updated.`));
        } catch (error) {
            this.logger.error(`File could not be updated. Error: ${error}`);
            this.logger.error(`Stack trace: ${error instanceof Error ? error.stack : 'N/A'}`);
            this.sendResponse(res, 'text/plain', 500, `File could not be updated. Error: ${error}`);
        }
    }

    /**
     * Adds a route to store i18n properties in the i18n file.
     * This function updates the i18n file with new properties provided in the request body.
     *
     * @returns {Promise<void>} A promise that resolves when the route is added.
     */
    async addStoreI18nKeysRoute(): Promise<void> {
        this.router.use(CARD_GENERATOR_DEFAULT.i18nStore, json());
        this.logger.debug(`Add route for ${CARD_GENERATOR_DEFAULT.i18nStore}`);

        this.router.post(CARD_GENERATOR_DEFAULT.i18nStore, async (req: Request, res: Response) => {
            await this.storeI18nKeysHandler(req, res);
        });
    }

    /**
     * Adds root-level card generator routes for CAP projects.
     * This method registers routes at the CDS server's root level using cds.app.
     * The card generator client makes requests to /cards/store and /editor/i18n at the root level,
     * but in CAP projects the middleware is mounted under the app's mount path.
     *
     * @private
     */
    private addRootLevelCardRoutes(): void {
        if (!this.cardGenerator?.path) {
            return;
        }

        // Only register for CAP projects
        if (this.projectType !== 'CAPJava' && this.projectType !== 'CAPNodejs') {
            return;
        }

        this.logger.debug('Adding root-level card routes for CAP project');

        // Store this FlpSandbox instance in a global registry keyed by app ID
        const appId = this.manifest['sap.app']?.id ?? '';
        const globalRegistry =
            ((global as Record<string, unknown>).__flpSandboxRegistry as Record<string, FlpSandbox>) ?? {};
        globalRegistry[appId] = this;
        (global as Record<string, unknown>).__flpSandboxRegistry = globalRegistry;

        // Try to access the CDS server's express app to register routes at the root level
        let cds: {
            app?: {
                use: (path: string, handler: unknown) => void;
                post: (path: string, handler: (req: Request, res: Response) => Promise<void>) => void;
                get: (path: string, handler: (req: Request, res: Response, next: NextFunction) => void) => void;
            };
            on: (event: string, handler: () => void) => void;
        };

        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports, sonarjs/no-implicit-dependencies
            cds = require('@sap/cds');
        } catch {
            // @sap/cds is not available (e.g., in non-CAP projects or test environments)
            this.logger.debug('@sap/cds not available, skipping root-level card routes registration');
            return;
        }

        // Only register routes once (check if already registered)
        if ((global as Record<string, unknown>).__cardRoutesRegistered) {
            this.logger.debug('Root-level card routes already registered, skipping');
            return;
        }

        // Register routes at root level when the server is served
        const registerRootRoutes = (): void => {
            if ((global as Record<string, unknown>).__cardRoutesRegistered) {
                return;
            }

            if (cds.app) {
                this.logger.debug('Registering card generator routes at root level');

                // Helper to find the correct FlpSandbox instance based on referer
                const findFlpSandbox = (req: Request): FlpSandbox | undefined => {
                    const referer = req.headers.referer || '';

                    const registry = (global as any).__flpSandboxRegistry as Record<string, FlpSandbox> | undefined;
                    if (!registry) {
                        return undefined;
                    }

                    // Try to find the app ID from the referer URL
                    for (const [regAppId, sandbox] of Object.entries(registry)) {
                        // Check if the referer contains the app's namespace (e.g., sap.fe.cap.travel)
                        const appPath = regAppId.replace(/\./g, '/');
                        if (referer.includes(appPath) || referer.includes(regAppId)) {
                            return sandbox;
                        }
                    }

                    // Fallback: return the first sandbox
                    const sandboxes = Object.values(registry);
                    return sandboxes.length > 0 ? sandboxes[0] : undefined;
                };

                // Register /cards/store route at root level
                cds.app.use(CARD_GENERATOR_DEFAULT.cardsStore, json());
                cds.app.post(CARD_GENERATOR_DEFAULT.cardsStore, async (req: Request, res: Response) => {
                    const sandbox = findFlpSandbox(req);
                    if (sandbox) {
                        await sandbox.storeCardManifestHandler(req, res);
                    } else {
                        res.status(500).send('No FlpSandbox instance found');
                    }
                });

                // Register /editor/i18n route at root level
                cds.app.use(CARD_GENERATOR_DEFAULT.i18nStore, json());
                cds.app.post(CARD_GENERATOR_DEFAULT.i18nStore, async (req: Request, res: Response) => {
                    const sandbox = findFlpSandbox(req);
                    if (sandbox) {
                        await sandbox.storeI18nKeysHandler(req, res);
                    } else {
                        res.status(500).send('No FlpSandbox instance found');
                    }
                });

                // Helper to serve static files with path validation
                const serveStaticFile = (
                    req: Request,
                    res: Response,
                    next: NextFunction,
                    relativePath: string,
                    contentType: string
                ): void => {
                    const sandbox = findFlpSandbox(req);
                    if (!sandbox) {
                        next();
                        return;
                    }
                    const webappPath = sandbox.utils.getProject().getSourcePath();
                    // Sanitize the path to prevent path traversal attacks
                    const sanitizedPath = posix.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
                    const filePath = join(webappPath, sanitizedPath);
                    // Ensure the resolved path is within the webapp directory
                    if (!filePath.startsWith(webappPath)) {
                        res.status(403).send('Access denied');
                        return;
                    }
                    try {
                        const content = readFileSync(filePath, 'utf-8');
                        res.setHeader('Content-Type', contentType);
                        res.send(content);
                    } catch {
                        next();
                    }
                };

                // Register /cards/* route at root level to serve card manifest files
                cds.app.get('/cards/*', (req: Request, res: Response, next: NextFunction) => {
                    const contentType = req.path.endsWith('.json') ? 'application/json' : 'text/plain';
                    serveStaticFile(req, res, next, req.path, contentType);
                });

                // Register /manifest.json route at root level to serve the app manifest
                cds.app.get('/manifest.json', (req: Request, res: Response, next: NextFunction) => {
                    serveStaticFile(req, res, next, 'manifest.json', 'application/json');
                });

                // Register /i18n/* route at root level to serve i18n files
                cds.app.get('/i18n/*', (req: Request, res: Response, next: NextFunction) => {
                    serveStaticFile(req, res, next, req.path, 'text/plain; charset=utf-8');
                });

                (global as any).__cardRoutesRegistered = true;
                this.logger.info('Card generator routes registered at root level');
            }
        };

        // Try to register immediately if cds.app is available
        if (cds.app) {
            registerRootRoutes();
        } else {
            // Otherwise, wait for the 'served' event
            cds.on('served', () => {
                registerRootRoutes();
            });
        }
    }

    /**
     * Initialize the preview for an adaptation project.
     *
     * @param config configuration from the ui5.yaml
     * @throws Error in case no manifest.appdescr_variant found
     */
    async initAdp(config: AdpPreviewConfig): Promise<void> {
        const variant = await loadAppVariant(this.project);
        const adp = new AdpPreview(config, this.project, this.utils, this.logger as ToolsLogger);
        const layer = await adp.init(variant);

        // CF ADP build path mode: serve built resources directly from build output
        if (config.cfBuildPath) {
            const manifest = this.setupCfBuildMode(config.cfBuildPath);
            configureRta(this.rta, layer, variant.id, false);
            await this.init(manifest, variant.reference);
            this.setupAdpCommonHandlers(adp);
            return;
        }

        configureRta(this.rta, layer, variant.id, adp.isCloudProject);
        const descriptor = adp.descriptor;
        const { name, manifest } = descriptor;
        await this.init(manifest, name, adp.resources, adp);
        this.router.use(adp.descriptor.url, adp.proxy.bind(adp));
        this.setupAdpCommonHandlers(adp);
    }

    /**
     * Setup common ADP middleware and handlers.
     *
     * @param adp AdpPreview instance
     */
    private setupAdpCommonHandlers(adp: AdpPreview): void {
        this.addOnChangeRequestHandler(adp.onChangeRequest.bind(adp));
        this.router.use(json());
        adp.addApis(this.router);
    }

    /**
     * Setup the CF build path mode for the ADP project.
     *
     * @param cfBuildPath path to the build output folder
     * @returns the manifest
     */
    private setupCfBuildMode(cfBuildPath: string): Manifest {
        const manifest = readManifestFromBuildPath(cfBuildPath);
        this.router.use('/', serveStatic(cfBuildPath));
        this.logger.info(`Initialized CF ADP with cfBuildPath, serving from ${cfBuildPath}`);
        return manifest;
    }
}

/**
 * Creates an attribute string that can be added to the UI5 bootstrap script of an HTML file.
 *
 * @param config ui5 configuration options
 * @returns attribute string
 */
function serializeUi5Configuration(config: Map<string, string>): string {
    return '\n' + [...config.entries()].map(([name, value]) => `        ${name}="${value}"`).join('\n');
}

/**
 * Configure RTA (Runtime Adaptation) for the FLP sandbox.
 *
 * @param rta RtaConfig instance
 * @param layer UI5 flex layer
 * @param variantId variant identifier
 * @param isCloud whether this is a cloud project
 */
function configureRta(rta: RtaConfig | undefined, layer: UI5FlexLayer, variantId: string, isCloud: boolean): void {
    if (!rta) {
        return;
    }

    rta.layer = layer;
    rta.options = {
        ...rta.options,
        projectId: variantId,
        scenario: 'ADAPTATION_PROJECT',
        isCloud
    };

    for (const editor of rta.endpoints) {
        editor.pluginScript ??= 'open/ux/preview/client/adp/init';
    }
}
