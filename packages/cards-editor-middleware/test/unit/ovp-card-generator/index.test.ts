import { readFileSync, writeFileSync } from 'fs';
import supertest from 'supertest';
import express, { Router } from 'express';
import type { SuperTest, Test } from 'supertest';
import { join } from 'path';
import * as ovpCardGenerator from '../../../src/ovp-card-generator';
import * as utils from '../../../src/common/utils';
import os from 'os';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn()
}));

jest.spyOn(utils, "traverseI18nProperties").mockReturnValue({
    lines: ['appTitle=Sales Order'],
    updatedEntries: [],
    output: ['appTitle=Sales Order']
});

async function getRouter(fixture?: string, configuration = {}): Promise<Router> {
    return await (ovpCardGenerator as any).default({
        options: { configuration },
        resources: {
            rootProject: {
                byPath: (path: string) => {
                    if (path === '/manifest.json' && fixture) {
                        return {
                            getString: () =>
                                Promise.resolve(
                                    readFileSync(
                                        join(__dirname, `../../fixtures/${fixture}/webapp/manifest.json`),
                                        'utf-8'
                                    )
                                )
                        };
                    } else {
                        return undefined;
                    }
                },
                byGlob: (_glob: string) => {
                    return [];
                }
            }
        },
        middlewareUtil: {}
    });
}

async function getTestServer(fixture?: string, configuration: Partial<any> = {}): Promise<SuperTest<Test>> {
    const router = await getRouter(fixture, configuration);
    const app = express();
    app.use(router);
    return supertest(app);
}

describe("Middleware for updating i18n file", () => {
    let mockWriteFileSync: jest.Mock;

    beforeAll(() => {
        mockWriteFileSync = writeFileSync as jest.Mock;
    });
    afterEach(() => {
        mockWriteFileSync.mockClear();
    });

    test("Middleware for /editor/card", async () => {
        const server = await getTestServer("ovp-app");
        const response = await server.post(ovpCardGenerator.ApiRoutes.cardsEditor).send({ "id": "cardId", "title": "cardTitle" });
        const manifest = JSON.parse(readFileSync(
            join(__dirname, `../../fixtures/ovp-app/webapp/manifest.json`),
            'utf-8').toString());
        manifest['sap.app'].embeds = ['cards/editor'];
        expect(response.status).toBe(201);
        expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
        expect(mockWriteFileSync).toHaveBeenNthCalledWith(1, "webapp/cards/editor/card.json", JSON.stringify({ "id": "cardId", "title": "cardTitle" }, null, 2));
        expect(mockWriteFileSync).toHaveBeenNthCalledWith(2, './webapp/manifest.json', JSON.stringify(manifest, null, 2));
    });

    test("POST /i18n/store", async () => {
        const server = await getTestServer("ovp-app");
        const response = await server.post(ovpCardGenerator.ApiRoutes.i18nStore).send([{"key":"CardGeneratorGroupPropertyLabel_Groups_0_Items_0","value":"new Entry"}]);
        expect(response.status).toBe(201);
        expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
        expect(mockWriteFileSync).toHaveBeenCalledWith(
            join('./webapp/i18n/i18n.properties'), 
            ['appTitle=Sales Order', '', 'CardGeneratorGroupPropertyLabel_Groups_0_Items_0=new Entry\n'].join(os.EOL),
            { encoding: 'utf8' }
        );
    });
});