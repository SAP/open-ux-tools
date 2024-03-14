import type { RequestHandler, Request, Response } from 'express';
import type { MiddlewareParameters } from '@ui5/server';
import { json, Router } from 'express';
import { join, dirname } from 'path';
import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { render } from 'ejs';
import * as utils from '../common/utils';
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
            render(readFileSync(join(__dirname, '../../templates/editor.html'), 'utf-8'), {
                templateModel: {
                    appTitle: app.title || 'Card Editor Preview',
                    component: app.id
                }
            })
        );
    });

    router.post(ApiRoutes.cardsStore, async (req: Request, res: Response) => {
        try {
            const floorplan = req.query.floorplan;
            const localPath = req.query.localPath;
            const fileName = req.query.fileName || 'manifest.json';
            const folder = join('./webapp', dirname(localPath + '/' + fileName));
            const file = utils.prepareFileName(localPath + '/' + fileName);

            if (!existsSync(folder)) {
                mkdirSync(folder, { recursive: true });
            }
            const multipleCards = utils.prepareCardTypesForSaving(req.body);
            writeFileSync(join(folder, file), multipleCards.integration);
            writeFileSync(join(folder, 'adaptive-' + file), multipleCards.adaptive);

            const manifestPath = './webapp/manifest.json';
            const oManifest = JSON.parse(await manifest.getString());

            if (!oManifest['sap.cards.ap']) {
                oManifest['sap.cards.ap'] = {};
            }
            const integrationCard = req.body.find((card: any) => card.type === 'integration');
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
                    'localUri': folder
                }
            ];
            writeFileSync(manifestPath, JSON.stringify(oManifest, null, 2));
            res.status(201).send(`${join(folder, file)} and ${join(folder, 'adaptive-' + file)} created or updated.`);
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
            // Add new line if file is not empty and last line is not empty and there are new entries
            const { lines, updatedEntries, output } = utils.traverseI18nProperties(filePath, entries);
            // check if file does not end with new line
            if (lines?.length > 0 && lines[lines?.length - 1].trim() && entries?.length) {
                // If there no end line - add new gap line before new content
                output.push('');
            }
            for (const index in entries) {
                const ikey = index as any;
                if (!updatedEntries[ikey]) {
                    const { comment, key, value } = entries[ikey];
                    // New i18n entry - add it at the end of file
                    if (comment) {
                        // Add comment only for new entry
                        output.push(`#${comment}`);
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
