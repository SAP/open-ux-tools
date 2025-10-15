import type { ReaderCollection } from '@ui5/fs';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor as MemFsEditor } from 'mem-fs-editor';
import { render } from 'ejs';
import type http from 'http';
import type { Request, Response, Router, NextFunction } from 'express';
import { Router as createRouter, static as serveStatic, json } from 'express';
import type connect from 'connect';
import path, { dirname, join, posix } from 'node:path';
import type { Logger, ToolsLogger } from '@sap-ux/logger';
import type { MiddlewareUtils } from '@ui5/server';
import {
    getWebappPath,
    getProjectType,
    type ProjectType,
    findProjectRoot,
    type Manifest,
    FileName,
    type ManifestNamespace,
    createApplicationAccess
} from '@sap-ux/project-access';
import {
    AdpPreview,
    type AdpPreviewConfig,
    type CommonChangeProperties,
    type DescriptorVariant,
    type OperationType,
    type CommonAdditionalChangeInfoProperties
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
    private fs: MemFsEditor | undefined;
    private readonly logger: Logger;
    private readonly utils: MiddlewareUtils;
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
        this.projectType = await getProjectType(await findProjectRoot(process.cwd(), true, true));
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
        }

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
        const config = { ...this.templateConfig };
        /* sap.ui.rta needs to be added to the list of preload libs for variants management and adaptation projects */
        if (!config.ui5.libs.includes('sap.ui.rta')) {
            const libs = config.ui5.libs.split(',');
            libs.push('sap.ui.rta');
            config.ui5.libs = libs.join(',');
        }
        config.flexSettings = {
            layer: rta.layer ?? 'CUSTOMER_BASE',
            ...rta.options,
            generator: editor.generator ?? defaultGenerator,
            developerMode: editor.developerMode === true,
            pluginScript: editor.pluginScript
        };
        config.features = FeatureToggleAccess.getAllFeatureToggles();

        const ui5Version = await this.getUi5Version(req.protocol, req.headers.host, req['ui5-patched-router']?.baseUrl);

        this.checkDeleteConnectors(ui5Version.major, ui5Version.minor, ui5Version.isCdn);

        if (editor.developerMode === true) {
            config.ui5.bootstrapOptions = serializeUi5Configuration(this.getDeveloperModeConfig(ui5Version.major));
        }

        if (ui5Version.major === 1 && ui5Version.minor <= 71) {
            this.removeAsyncHintsRequests();
        }
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
     * @param res the response
     * @param rta runtime adaptation configuration
     * @param previewUrl the url of the preview
     * @private
     */
    private async editorGetHandlerDeveloperMode(res: Response, rta: RtaConfig, previewUrl: string): Promise<void> {
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
            telemetry: rta.options?.telemetry ?? false,
            appName: rta.options?.appName,
            scenario,
            livereloadPort,
            livereloadUrl: envLivereloadUrl,
            features: JSON.stringify(features)
        });
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
            // Redirect to the same URL but add the necessary parameter
            const url =
                'ui5-patched-router' in req ? join(req['ui5-patched-router']?.baseUrl ?? '', previewUrl) : previewUrl;
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
                this.router.get(editor.path, async (_req: Request, res: Response) => {
                    await this.editorGetHandlerDeveloperMode(res, rta, previewUrl);
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
            const url =
                'ui5-patched-router' in req ? join(req['ui5-patched-router']?.baseUrl ?? '', req.path) : req.path;
            // Redirect to the same URL but add the necessary parameter
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
            const ui5Version = await this.getUi5Version(
                //use protocol from request header referer as fallback for connect API (karma test runner)
                'protocol' in req
                    ? req.protocol
                    : req.headers.referer?.substring(0, req.headers.referer.indexOf(':')) ?? 'http',
                req.headers.host,
                'ui5-patched-router' in req ? req['ui5-patched-router']?.baseUrl : undefined
            );
            this.checkDeleteConnectors(ui5Version.major, ui5Version.minor, ui5Version.isCdn);
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
                if (this.projectType === 'EDMXBackend') {
                    this.templateConfig.enableCardGenerator = !!this.cardGenerator?.path;
                } else {
                    this.logger.warn(`The Card Generator is not available for CAP projects.`);
                    this.templateConfig.enableCardGenerator = false;
                }
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
                this.logger.error(error);
            }
        }
        if (!version) {
            this.logger.error('Could not get UI5 version of application. Using version: 1.130.0 as fallback.');
            version = '1.130.0';
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
                this.fs = this.fs ?? create(createStorage());
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
            this.fs = this.fs ?? create(createStorage());
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
        this.fs = this.fs ?? create(createStorage());
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
    private async storeCardManifestHandler(req: Request, res: Response): Promise<void> {
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
            this.fs = this.fs ?? create(createStorage());
            const webappPath = await getWebappPath(path.resolve(), this.fs);
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

            const appAccess = await createApplicationAccess(path.resolve(), this.fs);
            await appAccess.updateManifestJSON(this.manifest, this.fs);
            this.fs.commit(() => this.sendResponse(res, 'text/plain', 201, `Files were updated/created`));
        } catch (error) {
            this.logger.error(`Files could not be created/updated. Error: ${error}`);
            this.sendResponse(res, 'text/plain', 500, 'Files could not be created/updated.');
        }
    }

    /**
     * Adds a route to store card manifest files, the files are stored in the webapp folder of the project.
     * The application manifest.json file is updated with the new card manifests information within the sap.cards.ap.embeds.
     *
     * @returns {Promise<void>} A promise that resolves when the route is added.
     */
    async addStoreCardManifestRoute(): Promise<void> {
        if (this.projectType !== 'EDMXBackend') {
            return;
        }
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
    private async storeI18nKeysHandler(req: Request, res: Response): Promise<void> {
        try {
            this.fs = this.fs ?? create(createStorage());
            const webappPath = await getWebappPath(path.resolve(), this.fs);
            const i18nPath = this.manifest['sap.app'].i18n as string;
            const filePath = i18nPath ? join(webappPath, i18nPath) : join(webappPath, 'i18n', 'i18n.properties');
            const entries = (req.body as Array<I18nEntry>) || [];
            entries.forEach((entry) => {
                if (entry.comment) {
                    entry.annotation = entry.comment;
                }
            });
            await createPropertiesI18nEntries(filePath, entries);
            this.fs.commit(() => this.sendResponse(res, 'text/plain', 201, `i18n file updated.`));
        } catch (error) {
            this.logger.error(`File could not be updated. Error: ${error}`);
            this.sendResponse(res, 'text/plain', 500, 'File could not be updated.');
        }
    }

    /**
     * Adds a route to store i18n properties in the i18n file.
     * This function updates the i18n file with new properties provided in the request body.
     *
     * @returns {Promise<void>} A promise that resolves when the route is added.
     */
    async addStoreI18nKeysRoute(): Promise<void> {
        if (this.projectType !== 'EDMXBackend') {
            return;
        }
        this.router.use(CARD_GENERATOR_DEFAULT.i18nStore, json());
        this.logger.debug(`Add route for ${CARD_GENERATOR_DEFAULT.i18nStore}`);

        this.router.post(CARD_GENERATOR_DEFAULT.i18nStore, async (req: Request, res: Response) => {
            await this.storeI18nKeysHandler(req, res);
        });
    }
}

/**
 * Creates an attribute string that can be added to an HTML element.
 *
 * @param attributes map with attributes and their values
 * @param indent indentation that's inserted before each attribute
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
                scenario: 'ADAPTATION_PROJECT',
                isCloud: adp.isCloudProject
            };
            for (const editor of flp.rta.endpoints) {
                editor.pluginScript ??= 'open/ux/preview/client/adp/init';
            }
        }

        const descriptor = adp.descriptor;
        const { name, manifest } = descriptor;
        await flp.init(manifest, name, adp.resources, adp);
        flp.router.use(adp.descriptor.url, adp.proxy.bind(adp));
        flp.addOnChangeRequestHandler(adp.onChangeRequest.bind(adp));
        flp.router.use(json());
        adp.addApis(flp.router);
    } else {
        throw new Error('ADP configured but no manifest.appdescr_variant found.');
    }
}
