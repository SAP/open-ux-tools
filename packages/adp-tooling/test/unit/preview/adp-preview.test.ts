import { ToolsLogger } from '@sap-ux/logger';
import { AdpPreview } from '../../../src/preview/adp-preview';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ReaderCollection } from '@ui5/fs';
import nock from 'nock';
import type { SuperTest, Test } from 'supertest';
import supertest from 'supertest';
import express from 'express';

jest.mock('@sap-ux/store', () => {
    return {
        ...jest.requireActual('@sap-ux/store'),
        getService: jest.fn().mockImplementation(() =>
            Promise.resolve({
                read: jest.fn().mockReturnValue({ username: '~user', password: '~pass' })
            })
        )
    };
});

const mockProject = {
    byGlob: jest.fn().mockResolvedValue([])
};

describe('AdaptationProject', () => {
    const backend = 'https://sap.example';
    const descriptorVariant = readFileSync(
        join(__dirname, '../../fixtures/adaptation-project/webapp', 'manifest.appdescr_variant'),
        'utf-8'
    );
    const mockMergedDescriptor = {
        asyncHints: {
            libs: [
                {
                    name: 'sap.ui.core'
                },
                {
                    name: 'sap.reuse.lib',
                    url: { url: '/sap/reuse/lib' }
                }
            ]
        },
        name: 'the.original.app',
        manifest: {
            'sap.app': {
                id: 'my.adaptation'
            }
        },
        url: '/my/adaptation'
    };

    beforeAll(() => {
        nock(backend)
            .get((path) => path.startsWith('/sap/bc/lrep/dta_folder/'))
            .reply(200)
            .persist(true);
        nock(backend)
            .put('/sap/bc/lrep/appdescr_variant_preview/')
            .reply(200, {
                'my.adaptation': mockMergedDescriptor
            })
            .persist(true);
    });

    const logger = new ToolsLogger();
    describe('init', () => {
        test('default (no) config', async () => {
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    }
                },
                mockProject as unknown as ReaderCollection,
                logger
            );

            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getPath: () => '/manifest.appdescr_variant',
                    getBuffer: () => Buffer.from(descriptorVariant)
                }
            ]);
            await adp.init(JSON.parse(descriptorVariant));
            expect(adp.descriptor).toEqual(mockMergedDescriptor);
            expect(adp.resources).toEqual({
                'sap.reuse.lib': '/sap/reuse/lib',
                'the.original.app': mockMergedDescriptor.url
            });
        });

        test('error on property access before init', async () => {
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    }
                },
                mockProject as unknown as ReaderCollection,
                logger
            );

            expect(() => adp.descriptor).toThrowError();
            expect(() => adp.resources).toThrowError();
        });
    });
    describe('proxy', () => {
        let server!: SuperTest<Test>;
        const next = jest.fn().mockImplementation((_req, res) => res.status(200).send());
        beforeAll(async () => {
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    }
                },
                mockProject as unknown as ReaderCollection,
                logger
            );

            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getPath: () => '/manifest.appdescr_variant',
                    getBuffer: () => Buffer.from(descriptorVariant)
                }
            ]);
            await adp.init(JSON.parse(descriptorVariant));

            const app = express();
            app.use(adp.descriptor.url, adp.proxy.bind(adp));
            app.get(`${mockMergedDescriptor.url}/original.file`, next);
            app.use((req) => fail(`${req.path} should have been intercepted.`));

            server = await supertest(app);
        });

        test('/manifest.json', async () => {
            const response = await server.get('/my/adaptation/manifest.json').expect(200);
            expect(JSON.parse(response.text)).toEqual(mockMergedDescriptor.manifest);
        });

        test('/Component-preload.js', async () => {
            await server.get('/my/adaptation/Component-preload.js').expect(404);
        });

        test('/local.file', async () => {
            const testFileContent = '~test';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getPath: () => '/local.file',
                    getString: () => testFileContent
                }
            ]);
            const response = await server.get(`${mockMergedDescriptor.url}/local.file`).expect(200);
            expect(response.text).toEqual(testFileContent);
        });

        test('/original.file', async () => {
            await server.get(`${mockMergedDescriptor.url}/original.file`).expect(200);
            expect(next).toBeCalled();
        });
    });
});
