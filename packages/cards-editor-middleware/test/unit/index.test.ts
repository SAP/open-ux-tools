import supertest from 'supertest';
import express from 'express';
import type { Router } from 'express';
import { promises } from 'fs';
import { join } from 'path';
import { getWebappPath } from '@sap-ux/project-access';
import type { SuperTest, Test } from 'supertest';
import * as sapCardsGenerator from '../../src';
import * as utils from '../../src/utilities';
import path from 'path';
import os from 'os';

jest.mock('fs', () => ({
    promises: {
        ...jest.requireActual('fs').promises,
        writeFile: jest.fn(),
        access: jest.fn(),
        mkdir: jest.fn()
    }
}));

jest.spyOn(utils, 'traverseI18nProperties').mockResolvedValue({
    lines: ['appTitle=Sales Order'],
    updatedEntries: [],
    output: ['appTitle=Sales Order']
});

async function getRouter(fixture?: string, configuration = {}): Promise<Router> {
    return await (sapCardsGenerator as any).default({
        options: { configuration },
        resources: {
            rootProject: {
                byPath: (path: string) => {
                    if (path === '/manifest.json' && fixture) {
                        return {
                            getString: async () =>
                                Promise.resolve(
                                    await promises.readFile(
                                        join(__dirname, `../fixtures/${fixture}/webapp/manifest.json`),
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

describe('sap-cards-generator', () => {
    describe('Middleware for serving static files', () => {
        test('GET /test/flpGeneratorSandbox.html', async () => {
            const server = await getTestServer('lrop-v4');
            const response = await server.get(sapCardsGenerator.ApiRoutes.previewGeneratorSandbox);
            expect(response.status).toBe(200);
            expect(response.type).toBe('text/html');
        });
    });

    describe('Middleware for saving cards', () => {
        let mockFsPromisesWriteFile: jest.Mock;

        beforeAll(() => {
            mockFsPromisesWriteFile = promises.writeFile as jest.Mock;
        });
        afterEach(() => {
            mockFsPromisesWriteFile.mockClear();
        });
        test('POST /cards/store', async () => {
            const payload = {
                floorplan: 'ObjectPage',
                localPath: 'cards/op/op1',
                fileName: 'manifest.json',
                manifests: [
                    {
                        type: 'integration',
                        manifest: {
                            '_version': '1.15.0',
                            'sap.card': {
                                'type': 'Object',
                                'header': {
                                    'type': 'Numeric',
                                    'title': 'Card title'
                                }
                            },
                            'sap.insights': {
                                'versions': {
                                    'ui5': '1.120.1-202403281300'
                                },
                                'templateName': 'ObjectPage',
                                'parentAppId': 'sales.order.wd20',
                                'cardType': 'DT'
                            }
                        },
                        default: true,
                        entitySet: 'op1'
                    },
                    {
                        type: 'adaptive',
                        manifest: {
                            'type': 'AdaptiveCard',
                            'body': [
                                {
                                    'type': 'TextBlock',
                                    'wrap': true,
                                    'weight': 'Bolder',
                                    'text': 'Card Title'
                                }
                            ]
                        },
                        default: true,
                        entitySet: 'op1'
                    }
                ]
            };

            const server = await getTestServer('lrop-v4');
            const response = await server.post(sapCardsGenerator.ApiRoutes.cardsStore).send(payload);
            expect(response.status).toBe(201);
            expect(mockFsPromisesWriteFile).toHaveBeenCalledTimes(3);
        });
    });

    describe('Middleware for updating i18n file', () => {
        let mockFsPromisesWriteFile: jest.Mock;

        beforeAll(() => {
            mockFsPromisesWriteFile = promises.writeFile as jest.Mock;
        });
        afterEach(() => {
            mockFsPromisesWriteFile.mockClear();
        });

        test('POST /i18n/store', async () => {
            const server = await getTestServer('lrop-v4');
            const response = await server.post(sapCardsGenerator.ApiRoutes.i18nStore).send([
                {
                    'key': 'CardGeneratorGroupPropertyLabel_Groups_0_Items_0',
                    'value': 'new Entry'
                }
            ]);
            const webappPath = await getWebappPath(path.resolve());
            const filePath = join(webappPath, 'i18n', 'i18n.properties');
            const text1 = `appTitle=Sales Order${os.EOL}`;
            const text2 = `CardGeneratorGroupPropertyLabel_Groups_0_Items_0=new Entry${os.EOL}`;
            const lines = [text1, text2];

            expect(response.status).toBe(201);
            expect(mockFsPromisesWriteFile).toHaveBeenCalledTimes(1);
            expect(mockFsPromisesWriteFile.mock.calls[0][0]).toBe(filePath);
            expect(mockFsPromisesWriteFile.mock.calls[0][1]).toBe(lines.join(os.EOL));
        });
    });
});
