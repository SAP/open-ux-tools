import type { ReaderCollection } from '@ui5/fs';
import type { TemplateConfig } from '../../../src/base/flp';
import { FlpSandbox as FlpSandboxUnderTest, initAdp } from '../../../src';
import type { FlpConfig } from '../../../src/types';
import type { MiddlewareUtils } from '@ui5/server';
import type { Logger, ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { SuperTest, Test } from 'supertest';
import supertest from 'supertest';
import express from 'express';
import { tmpdir } from 'os';
import { type AdpPreviewConfig } from '@sap-ux/adp-tooling';
import * as adpTooling from '@sap-ux/adp-tooling';

jest.mock('@sap-ux/adp-tooling', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/adp-tooling')
    };
});

class FlpSandbox extends FlpSandboxUnderTest {
    public templateConfig: TemplateConfig;
    public readonly config: FlpConfig;
}

describe('FlpSandbox', () => {
    const mockProject = {
        byPath: jest.fn().mockResolvedValue(undefined),
        byGlob: jest.fn().mockImplementation((glob) =>
            Promise.resolve(
                glob.includes('changes')
                    ? [
                          {
                              getPath: () => 'test/changes/myid.change',
                              getName: () => 'myid.change',
                              getString: () => Promise.resolve(JSON.stringify({ id: 'myId' }))
                          }
                      ]
                    : []
            )
        )
    } as unknown as ReaderCollection & { byPath: jest.Mock; byGlob: jest.Mock };
    const mockUtils = {
        getProject() {
            return {
                getSourcePath: () => tmpdir()
            };
        }
    } as unknown as MiddlewareUtils;
    const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() } as unknown as Logger & {
        warn: jest.Mock;
    };
    const fixtures = join(__dirname, '../../fixtures');

    describe('constructor', () => {
        test('default (no) config', () => {
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            expect(flp.config.path).toBe('/test/flp.html');
            expect(flp.config.apps).toBeDefined();
            expect(flp.config.apps).toHaveLength(0);
            expect(flp.config.intent).toStrictEqual({ object: 'app', action: 'preview' });
            expect(flp.router).toBeDefined();
        });

        test('advanced config', () => {
            const flpConfig: FlpConfig = {
                path: 'my/custom/path',
                intent: { object: 'movie', action: 'start' },
                theme: 'sap_fiori_3',
                apps: [
                    {
                        target: '/other/app',
                        local: './local/path'
                    }
                ]
            };
            const flp = new FlpSandbox({ flp: flpConfig }, mockProject, mockUtils, logger);
            expect(flp.config.path).toBe(`/${flpConfig.path}`);
            expect(flp.config.apps).toEqual(flpConfig.apps);
            expect(flp.config.intent).toStrictEqual({ object: 'movie', action: 'start' });
            expect(flp.router).toBeDefined();
            expect(flp.config.theme).toEqual(flpConfig.theme);
        });
    });

    describe('init', () => {
        test('minimal manifest', async () => {
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            const manifest = {
                'sap.app': { id: 'my.id' }
            } as Manifest;
            await flp.init(manifest);
            expect(flp.templateConfig).toMatchSnapshot();
        });

        test('optional configurations', async () => {
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            await flp.init(manifest);
            expect(flp.templateConfig).toMatchSnapshot();
        });

        test('ui5Theme', async () => {
            const flp = new FlpSandbox({ flp: { theme: 'sap_fiori_3' } }, mockProject, mockUtils, logger);
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            await flp.init(manifest);
            expect(flp.templateConfig).toMatchSnapshot();
        });

        test('additional apps', async () => {
            const flp = new FlpSandbox(
                {
                    flp: {
                        apps: [
                            {
                                target: '/simple/app',
                                local: join(fixtures, 'simple-app')
                            },
                            {
                                target: '/yet/another/app',
                                local: join(fixtures, 'multi-app'),
                                intent: {
                                    object: 'myObject',
                                    action: 'action'
                                }
                            }
                        ]
                    }
                },
                mockProject,
                mockUtils,
                logger
            );
            const manifest = {
                'sap.app': { id: 'my.id' }
            } as Manifest;
            await flp.init(manifest);
            expect(flp.templateConfig).toMatchSnapshot();
        });
    });

    describe('router', () => {
        let server!: SuperTest<Test>;

        beforeAll(async () => {
            const flp = new FlpSandbox(
                {
                    flp: {
                        apps: [
                            {
                                target: '/yet/another/app',
                                local: join(fixtures, 'multi-app')
                            }
                        ]
                    },
                    rta: {
                        layer: 'CUSTOMER_BASE',
                        editors: [
                            {
                                path: '/my/rta.html'
                            },
                            {
                                path: '/my/editor.html',
                                developerMode: true
                            },
                            {
                                path: '/with/plugin.html',
                                developerMode: true,
                                pluginScript: 'open/ux/tools/plugin'
                            },
                            {
                                path: '/my/editorWithConfig.html',
                                generator: 'test-generator'
                            }
                        ]
                    }
                },
                mockProject,
                mockUtils,
                logger
            );
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            await flp.init(manifest);

            const app = express();
            app.use(flp.router);

            server = await supertest(app);
        });

        test('test/flp.html', async () => {
            const response = await server.get('/test/flp.html').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('test/flp.html - warn if a file at the same location exists', async () => {
            logger.warn.mockReset();
            mockProject.byPath.mockResolvedValueOnce({});
            await server.get('/test/flp.html').expect(200);
            expect(logger.warn).toBeCalled();
        });

        test('rta', async () => {
            const response = await server.get('/my/rta.html').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('rta with developerMode=true', async () => {
            let response = await server.get('/my/editor.html').expect(200);
            expect(response.text).toMatchSnapshot();
            response = await server.get('/my/editor.html.inner.html').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('rta with developerMode=true and plugin', async () => {
            await server.get('/with/plugin.html').expect(200);
            const response = await server.get('/with/plugin.html.inner.html').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('WorkspaceConnector.js', async () => {
            await server.get('/preview/client/flp/WorkspaceConnector.js').expect(200);
        });

        test('GET /preview/api/changes', async () => {
            const response = await server.get('/preview/api/changes').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('POST /preview/api/changes', async () => {
            const response = await server
                .post('/preview/api/changes')
                .set('Content-Type', 'application/json')
                .send({ fileName: 'id', fileType: 'ctrl_variant' })
                .expect(200);
            expect(response.text).toMatchInlineSnapshot(`"FILE_CREATED id.ctrl_variant"`);

            await server
                .post('/preview/api/changes')
                .set('Content-Type', 'application/json')
                .send({ hello: 'world' })
                .expect(400);
        });

        test('DELETE /preview/api/changes', async () => {
            const response = await server
                .delete('/preview/api/changes')
                .set('Content-Type', 'application/json')
                .send({ fileName: 'id' })
                .expect(200);
            expect(response.text).toMatchInlineSnapshot(`"FILE_DELETED id.ctrl_variant"`);

            await server
                .delete('/preview/api/changes')
                .set('Content-Type', 'application/json')
                .send({ hello: 'world' })
                .expect(400);
        });

        test('editor with config', async () => {
            const response = await server.get('/test/flp.html').expect(200);
            expect(response.text).toMatchSnapshot();
        });
    });
});

describe('initAdp', () => {
    const url = 'http://sap.example';
    const adpToolingMock = jest.spyOn(adpTooling, 'AdpPreview').mockImplementation((): adpTooling.AdpPreview => {
        return {
            init: () => {
                return 'CUSTOMER_BASE';
            },
            descriptor: {
                manifest: {},
                name: 'descriptorName',
                url
            },
            resources: [],
            proxy: jest.fn(),
            addApis: jest.fn()
        } as unknown as adpTooling.AdpPreview;
    });
    const mockAdpProject = {
        byPath: () => {
            return {
                getString: () =>
                    Promise.resolve(
                        readFileSync(join(__dirname, `../../fixtures/adp/webapp/manifest.appdescr_variant`), 'utf-8')
                    )
            };
        },
        byGlob: (_glob: string) => {
            return [];
        }
    } as unknown as ReaderCollection;
    const mockNonAdpProject = {
        byPath: () => {
            return {
                getString: () =>
                    Promise.resolve(
                        readFileSync(
                            join(__dirname, `../../fixtures/simple-app/webapp/manifest.appdescr_variant`),
                            'utf-8'
                        )
                    )
            };
        },
        byGlob: (_glob: string) => {
            return [];
        }
    } as unknown as ReaderCollection;
    const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() } as unknown as ToolsLogger;

    test('initAdp: throw an error if no adp project', async () => {
        const flp = new FlpSandbox({}, mockNonAdpProject, {} as MiddlewareUtils, logger);
        try {
            await initAdp(mockNonAdpProject, {} as AdpPreviewConfig, flp, {} as MiddlewareUtils, logger);
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    test('initAdp', async () => {
        const config = { adp: { target: { url } } };
        const flp = new FlpSandbox({ adp: { target: { url } } }, mockAdpProject, {} as MiddlewareUtils, logger);
        const flpInitMock = jest.spyOn(flp, 'init').mockImplementation(async (): Promise<void> => {
            jest.fn();
        });
        await initAdp(mockAdpProject, config.adp, flp, {} as MiddlewareUtils, logger);
        expect(adpToolingMock).toBeCalled();
        expect(flpInitMock).toBeCalled();
    });
});
