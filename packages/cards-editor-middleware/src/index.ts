import type { RequestHandler, Request, Response } from 'express';
import type { MiddlewareParameters } from '@ui5/server';
import { json, Router as createRouter } from 'express';
import path, { join } from 'path';
import { promises } from 'fs';
import { getWebappPath, FileName, type Manifest } from '@sap-ux/project-access';
import { render } from 'ejs';
import * as utils from './utilities';
import os from 'os';

export const enum ApiRoutes {
    previewGeneratorSandbox = '/test/flpGeneratorSandbox.html',
    cardsStore = '/cards/store',
    i18nStore = '/editor/i18n'
}
export const DEFAULT_THEME = 'sap_horizon';

const UI5_LIBS = [
    'sap.apf',
    'sap.base',
    'sap.chart',
    'sap.collaboration',
    'sap.f',
    'sap.fe',
    'sap.fileviewer',
    'sap.gantt',
    'sap.landvisz',
    'sap.m',
    'sap.ndc',
    'sap.ovp',
    'sap.rules',
    'sap.suite',
    'sap.tnt',
    'sap.ui',
    'sap.uiext',
    'sap.ushell',
    'sap.uxap',
    'sap.viz',
    'sap.webanalytics',
    'sap.zen'
];

/**
 * Check if a file exists.
 *
 * @param path - The path to the file
 * @returns - true if the file exists, false otherwise
 */
async function pathExists(path: string) {
    try {
        await promises.access(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return false; // File does not exist
        } else {
            throw error; // Other errors
        }
    }
}

/**
 * Retrieves a comma-separated string of UI5 libraries from the provided manifest.
 * It ensures that certain essential libraries are always included.
 *
 * @param {Partial<Manifest>} manifest - The manifest object containing UI5 library dependencies.
 * @returns {string} A comma-separated string of UI5 library names.
 */
function getUI5Libs(manifest: Partial<Manifest>): string {
    const libs = manifest['sap.ui5']?.dependencies?.libs ?? {};
    // add libs that should always be preloaded
    libs['sap.m'] = {};
    libs['sap.ui.core'] = {};
    libs['sap.ushell'] = {};

    return Object.keys(libs)
        .filter((key) => {
            return UI5_LIBS.some((substring) => {
                return key === substring || key.startsWith(substring + '.');
            });
        })
        .join(',');
}

module.exports = async ({ resources }: MiddlewareParameters<any>): Promise<RequestHandler> => {
    const router = createRouter();
    router.use(json());

    const manifest = await resources.rootProject.byPath(`/${FileName.Manifest}`);
    if (!manifest) {
        throw new Error('manifest.json not found.');
    }

    /**
     * Route to serve card generator flp sandbox
     */
    router.get(ApiRoutes.previewGeneratorSandbox, async (_req, res: Response) => {
        const app = JSON.parse(await manifest.getString())['sap.app'];
        const ui5libs = getUI5Libs(JSON.parse(await manifest.getString()));
        const supportedThemes: string[] = (JSON.parse(await manifest.getString())['sap.ui5']
            ?.supportedThemes as []) ?? [DEFAULT_THEME];
        const ui5Theme = supportedThemes.includes(DEFAULT_THEME) ? DEFAULT_THEME : supportedThemes[0];
        res.status(200).send(
            render(await promises.readFile(join(__dirname, '../templates/flpSandbox.html'), 'utf-8'), {
                templateModel: {
                    appTitle: app.title || 'Card Editor Preview',
                    component: app.id,
                    ui5: {
                        libs: ui5libs,
                        theme: ui5Theme
                    }
                }
            })
        );
    });

    /**
     * Route to store card manifest files, the files are stored in the webapp folder of the project
     * and the application manifest.json file is updated with the new card manifests information within the sap.cards.ap.embeds
     */
    router.post(ApiRoutes.cardsStore, async (req: Request, res: Response) => {
        try {
            const { floorplan, localPath, fileName = FileName.Manifest, manifests } = req.body;
            const webappPath = await getWebappPath(path.resolve());
            const fullPath = path.resolve(webappPath, localPath);

            if (!fullPath.startsWith(webappPath)) {
                throw new Error('Invalid path');
            }

            const file = utils.prepareFileName(fullPath + '/' + fileName);
            if (!(await pathExists(fullPath))) {
                try {
                    await promises.mkdir(fullPath, { recursive: true });
                } catch (err) {
                    res.status(403).send(`Files could not be created/updated.`);
                }
            }

            const multipleCards = utils.prepareCardTypesForSaving(manifests);

            await promises.writeFile(join(fullPath, file), multipleCards.integration);
            await promises.writeFile(join(fullPath, 'adaptive-' + file), multipleCards.adaptive);

            const oManifest = JSON.parse(await manifest.getString());

            if (!oManifest['sap.cards.ap']) {
                oManifest['sap.cards.ap'] = {};
            }
            const integrationCard = manifests.find((card: any) => card.type === 'integration');
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
                    'localUri': localPath
                }
            ];

            const manifestPath = join(webappPath, FileName.Manifest);
            await promises.writeFile(manifestPath, JSON.stringify(oManifest, null, 2));
            res.status(201).send(`Files were updated/created`);
        } catch (err) {
            res.status(500).send(`Files could not be created/updated.`);
        }
    });

    /**
     * Route to store i18n properties
     * All the new properties are added at the end of the i18n file
     */
    router.post(ApiRoutes.i18nStore, async (req: Request, res: Response) => {
        try {
            const oManifest = JSON.parse(await manifest.getString());
            const webappPath = await getWebappPath(path.resolve());
            let filePath: string;

            if (oManifest['sap.app'].i18n) {
                filePath = join(webappPath, oManifest['sap.app'].i18n);
            } else {
                filePath = join(webappPath, 'i18n', 'i18n.properties');
            }

            const entries = req.body || [];
            const { lines, updatedEntries, output } = await utils.traverseI18nProperties(filePath, entries);

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

            await promises.writeFile(filePath, output.join(os.EOL), { encoding: 'utf8' });
            res.status(201).send(`i18n file updated.`);
        } catch (err) {
            res.status(500).send(`File could not be updated.`);
        }
    });

    return router;
};
