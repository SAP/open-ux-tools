import type { RequestHandler, Request, Response } from 'express';
import { Router } from 'express';
import * as utils from '../common/utils';
import * as constants from '../common/constants';
import { join, dirname } from 'path';
import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import bodyParser from 'body-parser';
import { CARD_TYPES } from '../common/constants';

import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';

import type { MiddlewareParameters } from '@ui5/server';
import { render } from 'ejs';

interface Configuration {
    storeCard?: string;
    webapp?: string;
    cardsPreviewMiddleware?: string;
}

const defaultConfig: Configuration = {
    webapp: constants.WEBAPP
};

const generatorConfig: Configuration = {
    cardsPreviewMiddleware: constants.CARDS_PREVIEW_MIDDLEWARE,
    storeCard: constants.STORE_CARD
};

module.exports = async ({ resources, options }: MiddlewareParameters<any>): Promise<RequestHandler> => {
    const _logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'sap-cards-generator' })],
        logLevel: options.configuration?.debug ? LogLevel.Debug : LogLevel.Info
    });
    const router = Router();

    const manifest = await resources.rootProject.byPath('/manifest.json');
    if (!manifest) {
        throw new Error('No manifest.json found.');
    }

    const config = {
        ...defaultConfig,
        ...options.configuration
    };

    router.get('/test/flpGeneratorSandbox.html', async (_req, res: Response) => {
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

    router.use(bodyParser.json());

    router.use(generatorConfig.storeCard as string, (req: Request, res: Response) => {
        try {
            const floorplan = req.query.floorplan;
            const localPath = req.query.localPath;
            const fileName = req.query.fileName || 'manifest.json';
            const folder = join(config.webapp || '', dirname(localPath + '/' + fileName));
            const file = utils.prepareFileName(localPath + '/' + fileName);

            if (!existsSync(folder)) {
                mkdirSync(folder, { recursive: true });
            }
            const multipleCards = utils.prepareCardTypesForSaving(req.body);
            writeFileSync(join(folder, file), multipleCards.integration);
            writeFileSync(join(folder, 'adaptive-' + file), multipleCards.adaptive);

            const manifestPath = constants.APP_MANIFEST_PATH;
            const manifestFile = readFileSync(manifestPath, 'utf8');
            const oManifest = JSON.parse(manifestFile);

            if (!oManifest['sap.cards.ap']) {
                oManifest['sap.cards.ap'] = {};
            }
            const integrationCard = req.body.find((card: any) => card.type === CARD_TYPES.INTERGATION);
            const entitySet = integrationCard.entitySet;
            if (!oManifest['sap.cards.ap'].embeds) {
                oManifest['sap.cards.ap'].embeds = {};
            }
            if (!oManifest['sap.cards.ap'].embeds[floorplan]) {
                oManifest['sap.cards.ap'].embeds[floorplan] = {
                    'default': entitySet,
                    'manifests': {}
                };
            }
            if (!oManifest['sap.cards.ap'].embeds[floorplan]['default']) {
                oManifest['sap.cards.ap'].embeds[floorplan]['default'] = entitySet;
            }
            if (!oManifest['sap.cards.ap'].embeds[floorplan]['manifests']) {
                oManifest['sap.cards.ap'].embeds[floorplan]['manifests'] = {};
            }
            if (!oManifest['sap.cards.ap'].embeds[floorplan]['manifests'][entitySet]) {
                oManifest['sap.cards.ap'].embeds[floorplan]['manifests'][entitySet] = [
                    {
                        'localUri': folder
                    }
                ];
            }
            writeFileSync(manifestPath, JSON.stringify(oManifest, null, 2));
            res.status(201).send(`${join(folder, file)} and ${join(folder, 'adaptive-' + file)} created or updated.`);
        } catch (err) {
            res.status(500).send(`Files could not be created/updated.`);
        }
    });

    router.get(generatorConfig.cardsPreviewMiddleware as string, (_req: Request, res: Response) => {
        try {
            res.status(200)
                .contentType('text/javascript')
                .send(readFileSync(join(__dirname, './generatorRenderer.js'), 'utf-8'));
        } catch (err) {
            res.status(404).send(`File not found.`);
        }
    });

    return router;
};
