import type { ReaderCollection } from '@ui5/fs';
import { render } from 'ejs';
import type { Request, Response } from 'express';
import { readFileSync } from 'fs';
import { basename, join } from 'path';
import type { App, FlpConfig } from '../types';
import { Router as createRouter, static as serveStatic } from 'express';
import type { Logger } from '@sap-ux/logger';
import type { ManifestNamespace } from '@sap-ux/project-access';

type Manifest = ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile & { [key: string]: unknown };

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
}

/**
 * Class handling preview of a sandbox FLP.
 */
export class FlpSandbox {
    protected templateConfig: TemplateConfig;
    protected readonly config: FlpConfig;
    public readonly router: any;

    /**
     *
     * @param config
     * @param project
     * @param logger
     */
    constructor(
        config: Partial<FlpConfig>,
        private readonly project: ReaderCollection,
        private readonly logger: Logger
    ) {
        this.config = {
            path: config.path ?? '/test/flpSandbox.html',
            apps: config.apps ?? []
        };
        this.router = createRouter();
    }

    /**
     *
     * @param manifest
     * @param resources
     */
    init(manifest: Manifest, resources: Record<string, string> = {}): void {
        const flex = this.createFlexHandler();
        this.templateConfig = {
            apps: {},
            ui5: {
                libs: Object.keys(manifest['sap.ui5']?.dependencies?.libs ?? []).join(','),
                theme: (manifest['sap.ui5']?.theme as string) ?? 'sap_horizon',
                flex,
                resources: { ...resources }
            }
        };
        this.addApp(manifest, {
            target: resources[manifest['sap.app'].id] ?? '../',
            intent: {
                object: 'app',
                action: 'preview'
            }
        });

        // add route for the sandbox.html
        this.router.get(this.config!.path, (_req: Request, res: Response) => {
            const template = readFileSync(join(__dirname, '../../templates/flp/sandbox.html'), 'utf-8');
            res.status(200);
            res.send(render(template, this.templateConfig));
        });
        this.addRoutesForAdditionalApps();
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
        this.router.get(api, async (_req: Request, res: Response) => {
            res.status(200).send(await this.getChanges());
        });
        this.router.post(api, async (_req: Request, res: Response) => {
            // TBD
            res.status(500);
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
     *
     * @param manifest
     * @param app
     */
    addApp(manifest: any, app: App) {
        const id = manifest['sap.app'].id as string;
        app.intent ??= {
            object: id.replace(/\./g, ''),
            action: 'preview'
        };
        this.templateConfig.ui5.resources[id] = '../';
        this.templateConfig.apps[`${app.intent?.object}-${app.intent?.action}`] = {
            title: manifest['sap.app'].title,
            description: manifest['sap.app'].description,
            additionalInformation: `SAPUI5.Component=${id}`,
            applicationType: 'URL',
            url: app.target
        };
    }

    /**
     * Read changes from the file system and return them.
     *
     * @returns object with the file name as key and the file content as value
     */
    private async getChanges(): Promise<Record<string, unknown>> {
        const changes: Record<string, unknown> = {};
        const files = await this.project.byGlob('/**/*.change');
        for (const file of files) {
            changes[`sap.ui.fl.${basename(file.getPath(), '.change')}`] = JSON.parse(await file.getString());
        }
        return changes;
    }
}
