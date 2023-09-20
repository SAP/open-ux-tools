import type { ReaderCollection } from '@ui5/fs';
import { render } from 'ejs';
import type { Request, RequestHandler, Response, Router } from 'express';
import { readFileSync } from 'fs';
import { dirname, join, relative } from 'path';
import type { App, FlpConfig, MiddlewareConfig, RtaConfig } from '../types';
import { Router as createRouter, static as serveStatic, json } from 'express';
import type { Logger } from '@sap-ux/logger';
import { deleteChange, readChanges, writeChange } from './flex';
import type { MiddlewareUtils } from '@ui5/server';
import type { Manifest, UI5FlexLayer } from '@sap-ux/project-access';

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
        }
    >;
    ui5: {
        libs: string;
        theme: string;
        flex: {
            applyConnector: string;
            writeConnector: string;
            custom: boolean;
        }[];
        resources: Record<string, string>;
    };
    flex?: {
        [key: string]: unknown;
        layer: UI5FlexLayer;
        developerMode: boolean;
        pluginScript?: string;
    };
    locateReuseLibsScript?: boolean;
}

/**
 * Class handling preview of a sandbox FLP.
 */
export class FlpSandbox {
    protected templateConfig: TemplateConfig;
    public readonly config: FlpConfig;
    public readonly rta?: RtaConfig;
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
            ui5Theme: config.flp?.ui5Theme
        };
        if (!this.config.path.startsWith('/')) {
            this.config.path = `/${this.config.path}`;
        }
        this.rta = config.rta;
        logger.debug(`Config: ${JSON.stringify({ flp: this.config, rta: this.rta })}`);
        this.router = createRouter();
    }

    /**
     * Initialize the FLP sandbox router.
     *
     * @param manifest application manifest
     * @param componentId optional componentId e.g. for adaptation projects
     * @param resources optional additional resource mappings
     */
    async init(manifest: Manifest, componentId?: string, resources: Record<string, string> = {}): Promise<void> {
        const flex = this.createFlexHandler();
        const supportedThemes: string[] = (manifest['sap.ui5']?.supportedThemes as []) ?? [DEFAULT_THEME];
        const ui5Theme =
            this.config.ui5Theme ?? supportedThemes.includes(DEFAULT_THEME) ? DEFAULT_THEME : supportedThemes[0];
        this.templateConfig = {
            basePath: relative(dirname(this.config.path), '/') ?? '.',
            apps: {},
            ui5: {
                libs: Object.keys(manifest['sap.ui5']?.dependencies?.libs ?? {}).join(','),
                theme: ui5Theme,
                flex,
                resources: {
                    ...resources,
                    [PREVIEW_URL.client.ns]: PREVIEW_URL.client.url
                }
            },
            locateReuseLibsScript: this.config.libs ?? (await this.hasLocateReuseLibsScript())
        };
        this.addApp(manifest, {
            componentId,
            target: resources[componentId ?? manifest['sap.app'].id] ?? this.templateConfig.basePath,
            local: '.',
            intent: this.config.intent
        });
        this.addStandardRoutes();
        if (this.rta) {
            this.rta.options ??= {};
            this.rta.options.baseId = componentId ?? manifest['sap.app'].id;
            this.addEditorRoutes(this.rta);
        }
        this.addRoutesForAdditionalApps();
        this.logger.info(`Initialized for app ${manifest['sap.app'].id}`);
        this.logger.debug(`Configured apps: ${JSON.stringify(this.templateConfig.apps)}`);
    }

    /**
     * Add additional routes for configured editors.
     *
     * @param rta runtime authoring configuration
     */
    private addEditorRoutes(rta: RtaConfig) {
        for (const editor of rta.editors) {
            let previewUrl = editor.path;
            if (editor.developerMode) {
                previewUrl = `${previewUrl}.inner.html`;
                editor.pluginScript ??= 'open/ux/preview/client/cpe/init';
                this.router.get(editor.path, (async (_req: Request, res: Response) => {
                    const template = readFileSync(join(__dirname, '../../templates/flp/editor.html'), 'utf-8');
                    const html = render(template, {
                        previewUrl: `${previewUrl}?sap-ui-xx-viewCache=false&fiori-tools-rta-mode=forAdaptation&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true#${this.config.intent.object}-${this.config.intent.action}`
                    });
                    res.status(200).contentType('html').send(html);
                }) as RequestHandler);
            }
            this.router.get(previewUrl, (async (_req: Request, res: Response) => {
                const config = { ...this.templateConfig };
                config.flex = {
                    layer: rta.layer,
                    ...rta.options,
                    developerMode: editor.developerMode === true,
                    pluginScript: editor.pluginScript
                };
                const template = readFileSync(join(__dirname, '../../templates/flp/sandbox.html'), 'utf-8');
                const html = render(template, config);
                res.status(200).contentType('html').send(html);
            }) as RequestHandler);
        }
    }

    /**
     * Add routes for html and scripts required for a local FLP.
     */
    private addStandardRoutes() {
        // register static client sources
        this.router.use(PREVIEW_URL.client.url, serveStatic(PREVIEW_URL.client.local));

        // add route for the sandbox.html
        this.router.get(this.config.path, (async (req: Request, res: Response & { _livereload?: boolean }) => {
            // warn the user if a file with the same name exists in the filesystem
            const file = await this.project.byPath(this.config.path);
            if (file) {
                this.logger.warn(`HTML file returned at ${this.config.path} is NOT loaded from the file system.`);
            }

            const template = readFileSync(join(__dirname, '../../templates/flp/sandbox.html'), 'utf-8');
            const html = render(template, this.templateConfig);
            // if livereload is enabled, don't send it but let other middleware modify the content
            if (res._livereload) {
                res.write(html);
                res.end();
            } else {
                res.status(200).contentType('html').send(html);
            }
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
    private addRoutesForAdditionalApps() {
        for (const app of this.config.apps) {
            if (app.local) {
                const manifest = JSON.parse(readFileSync(join(app.local, 'webapp/manifest.json'), 'utf-8'));
                this.addApp(manifest, app);
                this.router.use(app.target, serveStatic(join(app.local, 'webapp')));
                this.logger.info(`Serving additional application at ${app.target} from ${app.local}`);
            }
        }
    }

    /**
     * Create required routes for flex.
     *
     * @returns template configuration for flex.
     */
    private createFlexHandler(): TemplateConfig['ui5']['flex'] {
        const workspaceConnectorPath = '/preview/WorkspaceConnector';
        this.router.get(`/resources${workspaceConnectorPath}.js`, (_req: Request, res: Response) => {
            res.status(200)
                .contentType('text/javascript')
                .send(readFileSync(join(__dirname, '../../templates/flp/workspaceConnector.js'), 'utf-8'));
        });
        const api = `${PREVIEW_URL.api}/changes`;
        this.router.use(api, json());
        this.router.get(api, (async (_req: Request, res: Response) => {
            res.status(200)
                .contentType('application/json')
                .send(await readChanges(this.project, this.logger));
        }) as RequestHandler);
        this.router.post(api, (async (req: Request, res: Response) => {
            try {
                const { success, message } = writeChange(
                    req.body,
                    this.utils.getProject().getSourcePath(),
                    this.logger
                );
                if (success) {
                    res.status(200).send(message);
                } else {
                    res.status(400).send('INVALID_DATA');
                }
            } catch (error) {
                res.status(500).send(error.message);
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
                    res.status(200).send(message);
                } else {
                    res.status(400).send('INVALID_DATA');
                }
            } catch (error) {
                res.status(500).send(error.message);
            }
        }) as RequestHandler);

        return [
            {
                applyConnector: workspaceConnectorPath,
                writeConnector: workspaceConnectorPath,
                custom: true
            }
        ];
    }

    /**
     * Add an application to the local FLP preview.
     *
     * @param manifest manifest of the additional target app
     * @param app configuration for the preview
     */
    addApp(manifest: Manifest, app: App) {
        const id = manifest['sap.app'].id;
        app.intent ??= {
            object: id.replace(/\./g, ''),
            action: 'preview'
        };
        this.templateConfig.ui5.resources[id] = app.target;
        this.templateConfig.apps[`${app.intent?.object}-${app.intent?.action}`] = {
            title: manifest['sap.app'].title ?? id,
            description: manifest['sap.app'].description ?? '',
            additionalInformation: `SAPUI5.Component=${app.componentId ?? id}`,
            applicationType: 'URL',
            url: app.target
        };
    }
}
