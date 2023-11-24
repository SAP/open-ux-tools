import nock from 'nock';
import { join } from 'path';
import express from 'express';
import supertest from 'supertest';
import { ToolsLogger } from '@sap-ux/logger';
import type { ReaderCollection } from '@ui5/fs';
import type { SuperTest, Test } from 'supertest';
import { readFileSync, existsSync, writeFileSync } from 'fs';

import { AdpPreview } from '../../../src/preview/adp-preview';

interface GetFragmentsResponse {
    fragments: { fragmentName: string }[];
    message: string;
}

interface GetControllersResponse {
    controllers: { controllerName: string }[];
    message: string;
}

interface CodeExtResponse {
    controllerExists: boolean;
    controllerPath: string;
    controllerPathFromRoot: string;
}

jest.mock('os', () => ({
    ...jest.requireActual('os'),
    platform: jest.fn().mockImplementation(() => 'win32')
}));

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

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    copyFileSync: jest.fn()
}));

const mockWriteFileSync = writeFileSync as jest.Mock;
const mockExistsSync = existsSync as jest.Mock;

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

    const middlewareUtil = {
        getProject() {
            return {
                getRootPath() {
                    return '/projects/adp.project';
                },
                getSourcePath() {
                    return '/adp.project/webapp';
                },
                getName() {
                    return 'adp.project';
                }
            };
        }
    };

    beforeAll(() => {
        nock(backend)
            .get((path) => path.startsWith('/sap/bc/lrep/actions/getcsrftoken/'))
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
                middlewareUtil,
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
                middlewareUtil,
                logger
            );

            expect(() => adp.descriptor).toThrowError();
            expect(() => adp.resources).toThrowError();
        });
    });
    describe('proxy', () => {
        let server: SuperTest<Test>;
        const next = jest.fn().mockImplementation((_req, res) => res.status(200).send());
        beforeAll(async () => {
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    }
                },
                mockProject as unknown as ReaderCollection,
                middlewareUtil,
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

            server = supertest(app);
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
    describe('addApis', () => {
        let server: SuperTest<Test>;
        beforeAll(async () => {
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    }
                },
                mockProject as unknown as ReaderCollection,
                middlewareUtil,
                logger
            );

            const app = express();
            adp.addApis(app);
            server = supertest(app);
        });

        afterEach(() => {
            mockExistsSync.mockRestore();
        });

        test('GET /adp/api/fragment', async () => {
            const expectedNames = [{ fragmentName: 'my.fragment.xml' }, { fragmentName: 'other.fragment.xml' }];
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getName: () => expectedNames[0].fragmentName
                },
                {
                    getName: () => expectedNames[1].fragmentName
                }
            ]);
            const response = await server.get('/adp/api/fragment').expect(200);
            const data: GetFragmentsResponse = JSON.parse(response.text);
            expect(data.fragments).toEqual(expectedNames);
            expect(data.message).toEqual(`${expectedNames.length} fragments found in the project workspace.`);
        });

        test('GET /adp/api/fragment - returns empty array of fragment', async () => {
            const response = await server.get('/adp/api/fragment').expect(200);
            const data: GetFragmentsResponse = JSON.parse(response.text);
            expect(data.fragments.length).toEqual(0);
            expect(data.message).toEqual(`0 fragments found in the project workspace.`);
        });

        test('GET /adp/api/fragment - throws error', async () => {
            const errorMsg = 'Could not get fragment name';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getName: () => {
                        throw new Error(errorMsg);
                    }
                }
            ]);
            const response = await server.get('/adp/api/fragment').expect(500);
            const data: GetFragmentsResponse = JSON.parse(response.text);
            expect(data.message).toEqual(errorMsg);
        });

        test('POST /adp/api/fragment - creates fragment', async () => {
            mockExistsSync.mockReturnValue(false);
            const fragmentName = 'Share';
            const response = await server.post('/adp/api/fragment').send({ fragmentName }).expect(201);

            const message = response.text;
            expect(message).toBe('XML Fragment created');
        });

        test('POST /adp/api/fragment - fragment already exists', async () => {
            mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);
            const fragmentName = 'Share';
            const response = await server.post('/adp/api/fragment').send({ fragmentName }).expect(409);

            const message = response.text;
            expect(message).toBe(`Fragment with name "${fragmentName}" already exists`);
        });

        test('POST /adp/api/fragment - fragmentName was not provided', async () => {
            const response = await server.post('/adp/api/fragment').send({ fragmentName: '' }).expect(400);

            const message = response.text;
            expect(message).toBe('Fragment name was not provided!');
        });

        test('POST /adp/api/fragment - throws error when fragment name is undefined', async () => {
            const response = await server.post('/adp/api/fragment').send({ fragmentName: undefined }).expect(500);

            const message = response.text;
            expect(message).toBe('Input must be string');
        });

        test('GET /adp/api/controller', async () => {
            const expectedNames = [{ controllerName: 'my.js' }, { controllerName: 'other.js' }];
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getName: () => expectedNames[0].controllerName
                },
                {
                    getName: () => expectedNames[1].controllerName
                }
            ]);
            const response = await server.get('/adp/api/controller').expect(200);
            const data: GetControllersResponse = JSON.parse(response.text);
            expect(data.controllers).toEqual(expectedNames);
            expect(data.message).toEqual(`${expectedNames.length} controllers found in the project workspace.`);
        });

        test('GET /adp/api/controller - returns empty array of controllers', async () => {
            const response = await server.get('/adp/api/controller').expect(200);
            const data: GetControllersResponse = JSON.parse(response.text);
            expect(data.controllers.length).toEqual(0);
            expect(data.message).toEqual(`0 controllers found in the project workspace.`);
        });

        test('GET /adp/api/controller - throws error', async () => {
            const errorMsg = 'Could not get controller name';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getName: () => {
                        throw new Error(errorMsg);
                    }
                }
            ]);
            const response = await server.get('/adp/api/controller').expect(500);
            const data: GetControllersResponse = JSON.parse(response.text);
            expect(data.message).toEqual(errorMsg);
        });

        test('POST /adp/api/controller - creates controller', async () => {
            mockExistsSync.mockReturnValue(false);
            const controllerName = 'Share';
            const response = await server.post('/adp/api/controller').send({ controllerName }).expect(201);

            const message = response.text;
            expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
            expect(message).toBe('Controller extension created!');
        });

        test('POST /adp/api/controller - controller already exists', async () => {
            mockExistsSync.mockReturnValueOnce(false).mockResolvedValueOnce(true);

            const controllerName = 'Share';
            const response = await server.post('/adp/api/controller').send({ controllerName }).expect(409);

            const message = response.text;
            expect(message).toBe(`Controller extension with name "${controllerName}" already exists`);
        });

        test('POST /adp/api/controller - controller name was not provided', async () => {
            const response = await server.post('/adp/api/controller').send({ controllerName: '' }).expect(400);

            const message = response.text;
            expect(message).toBe('Controller extension name was not provided!');
        });

        test('POST /adp/api/controller - throws error when controller name is undefined', async () => {
            const response = await server.post('/adp/api/controller').send({ controllerName: undefined }).expect(500);

            const message = response.text;
            expect(message).toBe('Input must be string');
        });

        test('GET /adp/api/code_ext/:controllerName - returns existing controller data', async () => {
            mockExistsSync.mockReturnValue(true);
            const changeFileStr =
                '{"selector":{"controllerName":"sap.suite.ui.generic.template.ListReport.view.ListReport"},"content":{"codeRef":"coding/share.js"}}';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getString: () => changeFileStr,
                    getName: () => 'id_124_codeExt.change'
                }
            ]);
            const response = await server
                .get('/adp/api/code_ext/sap.suite.ui.generic.template.ListReport.view.ListReport')
                .expect(200);
            const data: CodeExtResponse = JSON.parse(response.text);
            expect(data.controllerExists).toEqual(true);
        });

        test('GET /adp/api/code_ext/:controllerName - returns empty existing controller data (no control found)', async () => {
            mockExistsSync.mockReturnValue(true);
            const changeFileStr =
                '{"selector":{"controllerName":"sap.suite.ui.generic.template.ListReport.view.ListReport"},"content":{"codeRef":"coding/share.js"}}';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getString: () => changeFileStr
                }
            ]);
            const response = await server.get('/adp/api/code_ext/sap.suite.ui.generic.template.Dummy').expect(200);
            const data: CodeExtResponse = JSON.parse(response.text);
            expect(data.controllerExists).toEqual(false);
        });

        test('GET /adp/api/code_ext/:controllerName - returns not found if no controller extension file was found locally', async () => {
            mockExistsSync.mockReturnValue(false);
            const changeFileStr =
                '{"selector":{"controllerName":"sap.suite.ui.generic.template.ListReport.view.ListReport"},"content":{"codeRef":"coding/share.js"}}';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getString: () => changeFileStr,
                    getName: () => 'id_124_codeExt.change'
                }
            ]);
            await server.get('/adp/api/code_ext/sap.suite.ui.generic.template.ListReport.view.ListReport').expect(404);
        });

        test('GET /adp/api/code_ext/:controllerName - throws error', async () => {
            const errorMsg = 'Could not retrieve existing controller data!';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getString: () => {
                        throw new Error(errorMsg);
                    }
                }
            ]);

            try {
                await server.get('/adp/api/code_ext/sap.suite.ui.generic.template.ListReport.view.ListReport');
            } catch (e) {
                expect(e.message).toEqual(errorMsg);
            }
        });
    });
});
