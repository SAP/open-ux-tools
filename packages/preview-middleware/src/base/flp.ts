import type { ReaderCollection } from '@ui5/fs';
import { render } from 'ejs';
import type { Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { App, FlpConfig } from '../types';
import { Router as createRouter, static as serveStatic } from 'express';
import type { Logger } from '@sap-ux/logger';
import { deleteChange, readChanges, writeChange } from './flex';
import type { MiddlewareUtils } from '@ui5/server';
import type { Manifest, UI5FlexLayer } from '@sap-ux/project-access';
import { json } from 'express';
/**
 * Default theme
 */
const DEFAULT_THEME = 'sap_horizon';

/**
 * Default path for mounting the local FLP.
 */
const DEFAULT_PATH = '/test/flp.html';

/**
 * Internal structure used to fill the sandbox.html template
 */
export interface TemplateConfig {
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
        layer: UI5FlexLayer;
        developerMode: boolean;
    };
}

/**
 * Class handling preview of a sandbox FLP.
 */
export class FlpSandbox {
    protected templateConfig: TemplateConfig;
    protected readonly config: FlpConfig;
    public readonly router: any;

    /**
     * Constructor setting defaults and keeping reference to workspace resources.
     *
     * @param config configuration from the ui5.yaml
     * @param project reference to the project provided by the UI5 CLI
     * @param utils middleware utilities provided by the UI5 CLI
     * @param logger logger instance
     */
    constructor(
        config: Partial<FlpConfig>,
        private readonly project: ReaderCollection,
        private readonly utils: MiddlewareUtils,
        private readonly logger: Logger
    ) {
        this.config = {
            path: config.path ?? DEFAULT_PATH,
            apps: config.apps ?? [],
            rta: config.rta
        };
        logger.debug(`Config: ${JSON.stringify(this.config)}`);
        this.router = createRouter();
    }

    /**
     * Initialize the FLP sandbox router.
     *
     * @param manifest application manifest
     */
    init(manifest: Manifest): void {
        const flex = this.createFlexHandler();
        const supportedThemes: string[] = (manifest['sap.ui5']?.supportedThemes as []) ?? [DEFAULT_THEME];
        this.templateConfig = {
            apps: {},
            ui5: {
                libs: Object.keys(manifest['sap.ui5']?.dependencies?.libs ?? {}).join(','),
                theme: supportedThemes.includes(DEFAULT_THEME) ? DEFAULT_THEME : supportedThemes[0],
                flex,
                resources: {}
            }
        };
        this.addApp(manifest, {
            target: '/',
            local: '.',
            intent: {
                object: 'app',
                action: 'preview'
            }
        });

        // add route for the sandbox.html
        this.router.get(this.config.path, (req: Request, res: Response & { _livereload?: boolean }) => {
            const config = { ...this.templateConfig };
            if (req.query['fiori-tools-rta-mode']) {
                config.flex = {
                    layer: this.config.rta?.layer ?? 'CUSTOMER_BASE',
                    developerMode: false
                };
            }
            const template = readFileSync(join(__dirname, '../../templates/flp/sandbox.html'), 'utf-8');
            const html = render(template, config);
            // if livereload is enabled, don't send it but let other middleware modify the content
            if (res._livereload) {
                res.write(html);
                res.end();
            } else {
                res.status(200).contentType('html').send(html);
            }
        });
        this.addRoutesForAdditionalApps();
        this.logger.info(`Initialized for app ${manifest['sap.app'].id}`);
        this.logger.debug(`Configured apps: ${JSON.stringify(this.templateConfig.apps)}`);
    }

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
        const api = '/preview/api/changes';
        this.router.use(api, json());
        this.router.get(api, async (_req: Request, res: Response) => {
            res.status(200)
                .contentType('application/json')
                .send(await readChanges(this.project, this.logger));
        });
        this.router.post(api, async (req: Request, res: Response) => {
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
        });
        this.router.delete(api, async (req: Request, res: Response) => {
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
        });

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
        const id = manifest['sap.app'].id as string;
        app.intent ??= {
            object: id.replace(/\./g, ''),
            action: 'preview'
        };
        this.templateConfig.ui5.resources[id] = app.target;
        this.templateConfig.apps[`${app.intent?.object}-${app.intent?.action}`] = {
            title: manifest['sap.app'].title ?? id,
            description: manifest['sap.app'].description ?? '',
            additionalInformation: `SAPUI5.Component=${id}`,
            applicationType: 'URL',
            url: app.target
        };
    }
}
