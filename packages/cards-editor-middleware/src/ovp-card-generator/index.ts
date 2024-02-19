import type { RequestHandler, Request, Response } from 'express';
import { Router } from 'express';
import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { MiddlewareParameters } from '@ui5/server';
import * as utils from '../common/utils';
import * as constants from '../common/constants';
import { join, dirname } from 'path';
import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import bodyParser from 'body-parser';
import os from 'os';

export interface Configuration {
    target: string;
    path: string;
    webapp?: string;
}

const defaultConfig: Configuration = {
    webapp: constants.WEBAPP,
    target: constants.WEBAPP_CARDS_TARGET,
    path: constants.EDITOR_CARD
};
const i18nConfig: Configuration = {
    target: constants.WEBAPP_I18N_TARGET,
    path: constants.EDITOR_I18N
};

module.exports = ({ options }: MiddlewareParameters<any>): RequestHandler => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'ovp-cards-generator' })],
        logLevel: options.configuration?.debug ? LogLevel.Debug : LogLevel.Info
    });
    const router = Router();
    const config = {
        ...defaultConfig,
        ...options.configuration
    };
    router.use(bodyParser.json());
    router.use(config.path, (req: Request, res: Response) => {
        try {
            const folder = join(config.target, dirname(req.path));
            const file = utils.prepareFileName(req.path);
            if (!existsSync(folder)) {
                mkdirSync(folder, { recursive: true });
            }
            const card = utils.prepareCardForSaving(req.body); // TODO: remove once done in OVP
            writeFileSync(join(folder, file), card);
            // edit manifest to update embeds property
            const manifestPath = constants.APP_MANIFEST_PATH;
            const manifestFile = readFileSync(manifestPath, 'utf8');
            const oManifest = JSON.parse(manifestFile);
            if (!oManifest['sap.app'].embeds) {
                oManifest['sap.app'].embeds = [];
            }
            const embedEntry = join('cards', dirname(req.path));
            if (!oManifest['sap.app'].embeds.includes(embedEntry)) {
                oManifest['sap.app'].embeds.push(embedEntry);
                writeFileSync(manifestPath, JSON.stringify(oManifest, null, 2));
            }
            res.status(201).send(`${join(folder, file)} created or updated.`);
        } catch (err) {
            res.status(500).send(`File could not be created/updated.`);
        }
    });

    router.use(i18nConfig.path, (req: Request, res: Response) => {
        try {
            // read manifest to get the i18n file path
            const manifestPath = constants.APP_MANIFEST_PATH;
            const manifestFile = readFileSync(manifestPath, 'utf8');
            const oManifest = JSON.parse(manifestFile);
            const i18nFilePath = oManifest['sap.app'].i18n || '/i18n/i18n.properties';
            const filePath = join('./webapp', i18nFilePath);
            const entries = req.body || [];
            const updatedEntries: { [key: number]: boolean } = {};
            const output: string[] = [];
            const lines = utils.traverseI18nProperties(
                filePath,
                (line: string, index: number, keyTemp?: string, valueTemp?: string) => {
                    const existingIndex: number =
                        valueTemp !== undefined ? entries.findIndex((entry: any) => entry.key === keyTemp) : -1;
                    if (existingIndex !== -1) {
                        const { key, value } = entries[existingIndex];
                        line = `${key}=${value}`;
                        updatedEntries[existingIndex] = true;
                    }
                    output.push(line);
                }
            );
            // check if file does not end with new line
            if (lines.length > 0 && lines[lines.length - 1].trim() && entries.length) {
                // If there no end line - add new gap line before new content
                output.push('');
            }
            for (const index in entries) {
                if (!updatedEntries[index as any]) {
                    const { comment, key, value } = entries[index];
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
            console.log(err);
            res.status(500).send(`File could not be updated.`);
        }
    });

    router.get('/editor/listCards', (req: Request, res: Response) => {
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
        `Listening for POST requests matching ${config.path}/<card_name> that will create files at ${config.target}/<card_name>.json.`
    );
    return router;
};
