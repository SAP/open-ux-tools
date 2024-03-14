import type { RequestHandler, Request, Response } from 'express';
import { json, Router } from 'express';
import { LogLevel, ToolsLogger } from '@sap-ux/logger';
import type { MiddlewareParameters } from '@ui5/server';
import * as utils from '../common/utils';
import { join, dirname } from 'path';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import os from 'os';

export const enum ApiRoutes {
    cardsEditor = '/editor/card',
    i18nStore = '/editor/i18n',
    listCards = '/editor/listCards'
}

const defaultConfig = {
    target: './webapp/cards',
    manifest: './webapp/manifest.json'
};

module.exports = async ({ resources, options }: MiddlewareParameters<any>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        logLevel: options.configuration?.debug ? LogLevel.Debug : LogLevel.Info
    });
    const router = Router();
    router.use(json());

    const config = {
        ...defaultConfig,
        ...options.configuration
    };

    const manifest = await resources.rootProject.byPath('/manifest.json');
    if (!manifest) {
        throw new Error('No manifest.json found.');
    }

    router.post(ApiRoutes.cardsEditor, async (req: Request, res: Response) => {
        try {
            const folder = join(config.target, dirname(req.path));
            const file = utils.prepareFileName(req.path);
            if (!existsSync(folder)) {
                mkdirSync(folder, { recursive: true });
            }
            const card = JSON.stringify(req.body, null, 2);
            writeFileSync(join(folder, file), card);

            const oManifest = JSON.parse(await manifest.getString());
            oManifest['sap.app'].embeds ??= [];
            const embedEntry = join('cards', dirname(req.path));
            if (!oManifest['sap.app'].embeds.includes(embedEntry)) {
                oManifest['sap.app'].embeds.push(embedEntry);
                writeFileSync(config.manifest, JSON.stringify(oManifest, null, 2));
            }
            res.status(201).send(`${join(folder, file)} created or updated.`);
        } catch (err) {
            res.status(500).send(`File could not be created/updated.`);
        }
    });

    router.post(ApiRoutes.i18nStore, async (req: Request, res: Response) => {
        try {
            const oManifest = JSON.parse(await manifest.getString());
            const i18nFilePath = oManifest['sap.app'].i18n || '/i18n/i18n.properties';
            const filePath = join('./webapp', i18nFilePath);
            const entries = req.body || [];
            const { lines, updatedEntries, output } = utils.traverseI18nProperties(filePath, entries);
            // Add new line if file is not empty and last line is not empty and there are new entries
            if (lines.length > 0 && lines[lines.length - 1].trim() && entries.length) {
                output.push('');
            }
            for (const index in entries) {
                if (!updatedEntries[index as any]) {
                    const { comment, key, value } = entries[index];
                    if (comment) {
                        output.push(`#${comment}`); // Add comment for new entry
                    }
                    output.push(`${key}=${value}${os.EOL}`); // Add new i18n key-value pair at the end of file
                }
            }
            writeFileSync(filePath, output.join(os.EOL), { encoding: 'utf8' });
            res.status(201).send(`i18n file updated.`);
        } catch (error) {
            logger.error(`${(error as Error).message}`);
            res.status(500).send(`File could not be updated.`);
        }
    });

    router.get(ApiRoutes.listCards, (req: Request, res: Response) => {
        const directory = join(config.target);
        let aManifests: any = [];
        utils.getDirectoriesRecursive(directory).forEach((subdir) => {
            if (!existsSync(subdir)) {
                return;
            } else {
                aManifests = [...aManifests, ...utils.getAllManifests(subdir)];
            }
        });
        res.json(aManifests);
    });

    logger.info(
        `Listening for POST requests matching "editor/card/<card_name>" that will create files at "webapp/cards/<card_name>.json."`
    );

    return router;
};
