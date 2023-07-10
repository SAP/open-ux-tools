import { ReaderCollection } from '@ui5/fs';
import { render } from 'ejs';
import { NextFunction, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { basename, join } from 'path';
import { App, Config } from '../types';

interface FlpConfig {
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

export class FlpSandbox {
    private flpConfig: FlpConfig;

    constructor(private readonly config: Config['flp'], private readonly project: ReaderCollection) {}

    init(manifest: any, resources: Record<string, string> = {}): void {
        const workspaceConnectorPath = `${manifest['sap.app'].id.replace(/\./g, '/')}/WorkspaceConnector`;
        const flex = [
            {
                applyConnector: workspaceConnectorPath,
                writeConnector: workspaceConnectorPath,
                custom: true
            }
        ];
        this.flpConfig = {
            apps: {},
            ui5: {
                libs: Object.keys(manifest['sap.ui5'].dependencies.libs).join(','),
                theme: manifest['sap.ui5'].theme ?? 'sap_horizon',
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
    }

    addApp(manifest: any, app: App) {
        const id = manifest['sap.app'].id as string;
        app.intent ??= {
            object: id.replace(/\./g, ''),
            action: 'preview'
        };
        this.flpConfig.ui5.resources[id] = '../';
        this.flpConfig.apps[`${app.intent?.object}-${app.intent?.action}`] = {
            title: manifest['sap.app'].title,
            description: manifest['sap.app'].description,
            additionalInformation: `SAPUI5.Component=${id}`,
            applicationType: 'URL',
            url: app.target
        };
    }

    private async getChanges() {
        const changes: Record<string, unknown> = {};
        const files = await this.project.byGlob('/**/*.change');
        for (const file of files) {
            changes[`sap.ui.fl.${basename(file.getPath(), '.change')}`] = JSON.parse(await file.getString());
        }
        return changes;
    }

    public async proxy(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (req.path === this.config!.path) {
            const template = readFileSync(join(__dirname, '../../templates/flp/sandbox.html'), 'utf-8');
            res.status(200);
            res.send(render(template, this.flpConfig));
        } else if (req.path.endsWith('/WorkspaceConnector.js')) {
            res.status(200)
                .contentType('text/javascript')
                .send(readFileSync(join(__dirname, '../../templates/flp/workspaceConnector.js'), 'utf-8'));
        } else if (req.path === '/FioriTools/api/getChanges') {
            res.status(200).send(await this.getChanges());
        } else {
            next();
        }
    }
}
