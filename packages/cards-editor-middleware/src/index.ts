import type { RequestHandler, Request, Response } from 'express';
import type { MiddlewareParameters } from '@ui5/server';
import { json, Router } from 'express';
import path, { join } from 'path';
import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { render } from 'ejs';
import * as utils from './utilities';
import os from 'os';

export const enum ApiRoutes {
    previewGeneratorSandbox = '/test/flpGeneratorSandbox.html',
    cardsStore = '/cards/store',
    i18nStore = '/editor/i18n'
}

module.exports = async ({ resources }: MiddlewareParameters<any>): Promise<RequestHandler> => {
    const router = Router();
    router.use(json());

    const manifest = await resources.rootProject.byPath('/manifest.json');
    if (!manifest) {
        throw new Error('No manifest.json found.');
    }

    router.get(ApiRoutes.previewGeneratorSandbox, async (_req, res: Response) => {
        const app = JSON.parse(await manifest.getString())['sap.app'];
        res.status(200).send(
            render(readFileSync(join(__dirname, '../templates/editor.html'), 'utf-8'), {
                templateModel: {
                    appTitle: app.title || 'Card Editor Preview',
                    component: app.id
                }
            })
        );
    });

    router.post(ApiRoutes.cardsStore, async (req: Request, res: Response) => {
        try {
            const floorplan = req.body.floorplan;
            const localPath = req.body.localPath;
            const fileName = req.body.fileName || 'manifest.json';
            const multipleCards = utils.prepareCardTypesForSaving(req.body.manifests);
            const BASE_PATH = '/webapp';
            const resolvedPath = path.resolve(BASE_PATH, localPath);

            if (!resolvedPath.startsWith(BASE_PATH)) {
                throw new Error('Invalid path');
            }

            const file = utils.prepareFileName(localPath + '/' + fileName);
            const fullPath = resolvedPath.startsWith('/') ? resolvedPath.slice(1) : resolvedPath;

            if (!existsSync(fullPath)) {
                try {
                    mkdirSync(fullPath, { recursive: true });
                } catch (err) {
                    res.status(403).send(`Files could not be created/updated.`);
                }
            }

            writeFileSync(join(fullPath, file), multipleCards.integration);
            writeFileSync(join(fullPath, 'adaptive-' + file), multipleCards.adaptive);

            const manifestPath = './webapp/manifest.json';
            const oManifest = JSON.parse(await manifest.getString());

            if (!oManifest['sap.cards.ap']) {
                oManifest['sap.cards.ap'] = {};
            }
            const integrationCard = req.body.manifests.find((card: any) => card.type === 'integration');
            const entitySet = integrationCard.entitySet;
            oManifest['sap.cards.ap'].embeds ??= {};
            oManifest['sap.cards.ap'].embeds[floorplan] ??= {
                default: entitySet,
                manifests: {}
            };
            oManifest['sap.cards.ap'].embeds[floorplan]['default'] ??= entitySet;
            oManifest['sap.cards.ap'].embeds[floorplan]['manifests'] ??= {};
            oManifest['sap.cards.ap'].embeds[floorplan]['manifests'][entitySet] ??= [
                {
                    'localUri': fullPath
                }
            ];
            writeFileSync(manifestPath, JSON.stringify(oManifest, null, 2));
            res.status(201).send(
                `${join(fullPath, file)} and ${join(fullPath, 'adaptive-' + file)} created or updated.`
            );
        } catch (err) {
            res.status(500).send(`Files could not be created/updated.`);
        }
    });

    router.post(ApiRoutes.i18nStore, async (req: Request, res: Response) => {
        try {
            const oManifest = JSON.parse(await manifest.getString());
            const i18nFilePath = oManifest['sap.app'].i18n || '/i18n/i18n.properties';
            const filePath = join('./webapp', i18nFilePath);
            const entries = req.body || [];
            const { lines, updatedEntries, output } = utils.traverseI18nProperties(filePath, entries);

            // Add a new line if file is not empty and last line is not empty and there are new entries
            if (lines?.length > 0 && lines[lines?.length - 1].trim() && entries?.length) {
                output.push('');
            }

            for (const index in entries) {
                const ikey = index as any;
                if (!updatedEntries[ikey]) {
                    const { comment, key, value } = entries[ikey];
                    if (comment) {
                        output.push(`#${comment}`); // Add comment only for a new entry
                    }
                    output.push(`${key}=${value}${os.EOL}`);
                }
            }

            writeFileSync(filePath, output.join(os.EOL), { encoding: 'utf8' });
            res.status(201).send(`i18n file updated.`);
        } catch (err) {
            res.status(500).send(`File could not be updated.`);
        }
    });

    return router;
};
