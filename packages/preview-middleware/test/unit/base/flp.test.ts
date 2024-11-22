import type { ReaderCollection } from '@ui5/fs';
import type { TemplateConfig } from '../../../src/base/config';
import { FlpSandbox as FlpSandboxUnderTest, initAdp } from '../../../src';
import type { FlpConfig, MiddlewareConfig } from '../../../src/types';
import type { MiddlewareUtils } from '@ui5/server';
import type { Logger, ToolsLogger } from '@sap-ux/logger';
import type { ProjectAccess, I18nBundles, Manifest } from '@sap-ux/project-access';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { SuperTest, Test } from 'supertest';
import supertest from 'supertest';
import express from 'express';
import { tmpdir } from 'os';
import { type AdpPreviewConfig } from '@sap-ux/adp-tooling';
import * as adpTooling from '@sap-ux/adp-tooling';
import * as projectAccess from '@sap-ux/project-access';
import type { I18nEntry } from '@sap-ux/i18n/src/types';

jest.mock('@sap-ux/adp-tooling', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/adp-tooling')
    };
});

class FlpSandbox extends FlpSandboxUnderTest {
    public declare templateConfig: TemplateConfig;
    public declare readonly config: FlpConfig;
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
        info: jest.Mock;
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

        test('i18n manifest w/o bundle', async () => {
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            const manifest = {
                'sap.app': {
                    id: 'my.id',
                    title: '{i18n>myDifferentTitle}',
                    description: '{{i18n>myDifferentDescription}}'
                }
            } as Manifest;
            await flp.init(manifest);
            expect(flp.templateConfig).toMatchSnapshot();
        });

        test('i18n manifest', async () => {
            const projectAccessMock = jest.spyOn(projectAccess, 'createProjectAccess').mockImplementation(() => {
                return Promise.resolve({
                    getApplicationIds: () => {
                        return Promise.resolve(['my.id']);
                    },
                    getApplication: () => {
                        return {
                            getI18nBundles: () => {
                                return Promise.resolve({
                                    'sap.app': {
                                        'myTitle': [{ value: { value: 'My App' } } as I18nEntry],
                                        'myDescription': [{ value: { value: 'My App Description' } } as I18nEntry]
                                    } as I18nBundles['sap.app']
                                }) as unknown as I18nBundles;
                            }
                        };
                    }
                }) as unknown as Promise<ProjectAccess>;
            });
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            const manifest = {
                'sap.app': { id: 'my.id', title: '{i18n>myTitle}', description: '{{i18n>myDescription}}' }
            } as Manifest;
            await flp.init(manifest);
            expect(projectAccessMock).toBeCalled();
            expect(flp.templateConfig).toMatchSnapshot();
        });

        test('i18n manifest with unknown propertyI18nKey', async () => {
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            const manifest = {
                'sap.app': { id: 'my.id', title: '{i18n>myOtherTitle}', description: '{{i18n>myOtherDescription}}' }
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
                            },
                            {
                                target: '/a/remote/app',
                                componentId: 'myRemoteComponent',
                                intent: {
                                    object: 'myRemoteObject',
                                    action: 'action'
                                }
                            },
                            {
                                target: '/an/invalid/app/config',
                                intent: {
                                    object: 'INVALID',
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

        test('reuse libs not part of data-sap-ui-libs', async () => {
            const manifest = {
                'sap.app': { id: 'my.id' },
                'sap.ui5': {
                    'dependencies': {
                        libs: {
                            'sap.ui.core': {},
                            'sap.reuse1': {},
                            'sap.m': {},
                            'sap.reuse2': {},
                            'sap.reuse3': {}
                        }
                    }
                }
            } as unknown as Manifest;
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            await flp.init(manifest);
            expect(flp.templateConfig.ui5.libs).toMatchSnapshot();
        });

        test('add default libs if no libs in manifest.json', async () => {
            const manifest = {
                'sap.app': { id: 'my.id' }
            } as Manifest;
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            await flp.init(manifest);
            expect(flp.templateConfig.ui5.libs).toMatchSnapshot();
        });
    });

    describe('router', () => {
        let server!: SuperTest<Test>;
        const mockConfig = {
            flp: {
                apps: [
                    {
                        target: '/yet/another/app',
                        local: join(fixtures, 'multi-app')
                    }
                ]
            },
            test: [
                {
                    framework: 'QUnit'
                },
                {
                    framework: 'OPA5',
                    path: '/test/integration/opaTests.qunit.html',
                    init: '/test/integration/opaTests.qunit.js'
                }
            ],
            rta: {
                layer: 'CUSTOMER_BASE',
                editors: [
                    {
                        path: '/my/rta.html'
                    },
                    {
                        path: 'without/slash/rta.html'
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
        };

        beforeAll(async () => {
            const flp = new FlpSandbox(
                mockConfig as unknown as Partial<MiddlewareConfig>,
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

        test('test/flp.html UI5 2.x', async () => {
            const globalFetch = global.fetch;
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    json: () => Promise.resolve({ libraries: [{ name: 'sap.ui.core', version: '2.0.0' }] })
                })
            ) as jest.Mock;
            const response = await server.get('/test/flp.html').expect(200);
            expect(response.text).toMatchSnapshot();
            global.fetch = globalFetch;
        });

        test('test/flp.html', async () => {
            const response = await server.get('/test/flp.html').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('rta', async () => {
            const response = await server.get('/my/rta.html').expect(302);
            expect(response.text).toMatchSnapshot();
        });

        test('rta with url parameters', async () => {
            const response = await server.get('/my/rta.html?fiori-tools-rta-mode=true').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('rta with editors path without leading "/"', async () => {
            const response = await server.get('/without/slash/rta.html').expect(302);
            expect(response.text).toMatchSnapshot();
        });

        test('rta with developerMode=true', async () => {
            let response = await server.get('/my/editor.html').expect(200);
            expect(response.text).toMatchSnapshot();
            expect(response.text.includes('livereloadPort: 35729')).toBe(true);
            response = await server.get('/my/editor.html.inner.html').expect(302);
            expect(response.text).toMatchSnapshot();
        });

        test('rta with adp instance', async () => {
            const flp = new FlpSandbox(
                mockConfig as unknown as Partial<MiddlewareConfig>,
                mockProject,
                mockUtils,
                logger
            );
            const manifest = {
                'sap.app': { id: 'my.id' }
            } as Manifest;
            const componendId = 'myComponent';
            const resources = {
                'myResources1': 'myResourcesUrl1',
                'myResources2': 'myResourcesUrl2'
            };
            const url = 'http://sap.example';
            const syncSpy = jest.fn().mockResolvedValueOnce({});
            const adpToolingMock = {
                init: () => {
                    return 'CUSTOMER_BASE';
                },
                descriptor: {
                    manifest: {},
                    name: 'descriptorName',
                    url,
                    asyncHints: {
                        requests: []
                    }
                },
                resources: [],
                proxy: jest.fn(),
                sync: syncSpy,
                onChangeRequest: jest.fn(),
                addApis: jest.fn()
            } as unknown as adpTooling.AdpPreview;

            await flp.init(manifest, componendId, resources, adpToolingMock as unknown as adpTooling.AdpPreview);
            const app = express();
            app.use(flp.router);
            const server = await supertest(app);

            expect(flp.templateConfig).toMatchSnapshot();
            const response = await server
                .get(
                    '/my/editor.html.inner.html?fiori-tools-rta-mode=forAdaptation&sap-ui-rta-skip-flex-validation=true'
                )
                .expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('livereload port from environment', async () => {
            process.env.FIORI_TOOLS_LIVERELOAD_PORT = '8080';
            let response = await server.get('/my/editor.html').expect(200);
            expect(response.text.includes('livereloadPort: 8080')).toBe(true);
            process.env.FIORI_TOOLS_LIVERELOAD_PORT = 'wrongPort';
            response = await server.get('/my/editor.html').expect(200);
            expect(response.text.includes('livereloadPort: 35729')).toBe(true);
        });

        test('rta with developerMode=true and plugin', async () => {
            await server.get('/with/plugin.html').expect(200);
            const response = await server
                .get(
                    '/with/plugin.html.inner.html?fiori-tools-rta-mode=forAdaptation&sap-ui-rta-skip-flex-validation=true'
                )
                .expect(200);
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

        test('default Qunit path test/unitTests.qunit.html', async () => {
            const response = await server.get('/test/unitTests.qunit.html').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('default Qunit init test/unitTests.qunit.js', async () => {
            const response = await server.get('/test/unitTests.qunit.js').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('custom opa5 path test/integration/opaTests.qunit.html', async () => {
            const response = await server.get('/test/integration/opaTests.qunit.html').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('no route for custom init', async () => {
            await server.get('/test/integration/opaTests.qunit.js').expect(404);
        });

        test('default without testsuite', async () => {
            await server.get('/test/testsuite.qunit.html').expect(404);
            await server.get('/test/testsuite.qunit.js').expect(404);
        });
    });

    describe('router with test suite', () => {
        let server!: SuperTest<Test>;

        beforeAll(async () => {
            const flp = new FlpSandbox(
                {
                    flp: {
                        apps: [
                            {
                                target: '/yet/another/app'
                            }
                        ]
                    },
                    test: [
                        {
                            framework: 'QUnit'
                        },
                        {
                            framework: 'OPA5'
                        },
                        {
                            framework: 'Testsuite'
                        }
                    ]
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

        test('default with testsuite', async () => {
            const response = await server.get('/test/testsuite.qunit.html').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('default with testsuite and init testsuite.qunit.js', async () => {
            const response = await server.get('/test/testsuite.qunit.js').expect(200);
            expect(response.text).toMatchSnapshot();
        });
    });

    describe('router with test suite (negative)', () => {
        let server!: SuperTest<Test>;

        beforeAll(async () => {
            const flp = new FlpSandbox(
                {
                    flp: {
                        apps: [
                            {
                                target: '/yet/another/app'
                            }
                        ]
                    },
                    test: [
                        {
                            framework: 'Testsuite'
                        }
                    ]
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

        test('no testsuite w/o test frameworks', async () => {
            await server.get('/test/testsuite.qunit.html').expect(404);
            await server.get('/test/testsuite.qunit.js').expect(404);
        });
    });

    describe('router - existing FlpSandbox', () => {
        let server!: SuperTest<Test>;

        beforeAll(async () => {
            const flp = new FlpSandbox(
                {
                    flp: {
                        path: '/test/existingFlp.html'
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

        test('test/existingFlp.html', async () => {
            logger.info.mockReset();
            mockProject.byPath.mockResolvedValueOnce({});
            await server.get('/test/existingFlp.html');
            expect(logger.info).toBeCalledWith(
                'HTML file returned at /test/existingFlp.html is loaded from the file system.'
            );
        });
    });
});

describe('initAdp', () => {
    const url = 'http://sap.example';
    const syncSpy = jest.fn();
    const adpToolingMock = jest.spyOn(adpTooling, 'AdpPreview').mockImplementation((): adpTooling.AdpPreview => {
        return {
            init: () => {
                return 'CUSTOMER_BASE';
            },
            descriptor: {
                manifest: {},
                name: 'descriptorName',
                url,
                asyncHints: {
                    requests: []
                }
            },
            resources: [],
            proxy: jest.fn(),
            sync: syncSpy,
            onChangeRequest: jest.fn(),
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
