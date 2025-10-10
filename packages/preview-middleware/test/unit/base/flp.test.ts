import type { ReaderCollection } from '@ui5/fs';
import { CARD_GENERATOR_DEFAULT, type TemplateConfig } from '../../../src/base/config';
import { FlpSandbox as FlpSandboxUnderTest, initAdp } from '../../../src';
import type { FlpConfig, MiddlewareConfig } from '../../../src';
import type { MiddlewareUtils } from '@ui5/server';
import type { Logger, ToolsLogger } from '@sap-ux/logger';
import type { ProjectAccess, I18nBundles, Manifest, ApplicationAccess } from '@sap-ux/project-access';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SuperTest, Test } from 'supertest';
import supertest from 'supertest';
import express, { type Response, type NextFunction } from 'express';
import type { EnhancedRequest } from '../../../src/base/flp';
import { tmpdir } from 'node:os';
import { type AdpPreviewConfig } from '@sap-ux/adp-tooling';
import * as adpTooling from '@sap-ux/adp-tooling';
import * as projectAccess from '@sap-ux/project-access';
import type { I18nEntry } from '@sap-ux/i18n/src/types';
import { fetchMock } from '../../__mock__/global';
import { promises } from 'node:fs';
import { getWebappPath } from '@sap-ux/project-access';
import path from 'node:path';
import { createPropertiesI18nEntries } from '@sap-ux/i18n';
//@ts-expect-error: this import is not relevant for the 'erasableSyntaxOnly' check
import connect = require('connect');

jest.spyOn(projectAccess, 'findProjectRoot').mockImplementation(() => Promise.resolve(''));
jest.spyOn(projectAccess, 'getProjectType').mockImplementation(() => Promise.resolve('EDMXBackend'));

jest.mock('@sap-ux/adp-tooling', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/adp-tooling')
    };
});

jest.mock('@sap-ux/i18n', () => {
    return {
        ...jest.requireActual('@sap-ux/i18n'),
        createPropertiesI18nEntries: jest.fn()
    };
});
const createPropertiesI18nEntriesMock = createPropertiesI18nEntries as jest.Mock;

class FlpSandbox extends FlpSandboxUnderTest {
    public declare templateConfig: TemplateConfig;
    public declare readonly flpConfig: FlpConfig;
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
            expect(flp.flpConfig.enhancedHomePage).toBeFalsy();
            expect(flp.flpConfig.path).toBe('/test/flp.html');
            expect(flp.flpConfig.apps).toBeDefined();
            expect(flp.flpConfig.apps).toHaveLength(0);
            expect(flp.flpConfig.intent).toStrictEqual({ object: 'app', action: 'preview' });
            expect(flp.router).toBeDefined();
        });

        test('advanced config', () => {
            const flpConfig: FlpConfig = {
                enhancedHomePage: true,
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
            expect(flp.flpConfig.enhancedHomePage).toBeTruthy();
            expect(flp.flpConfig.path).toBe(`/${flpConfig.path}`);
            expect(flp.flpConfig.apps).toEqual(flpConfig.apps);
            expect(flp.flpConfig.intent).toStrictEqual({ object: 'movie', action: 'start' });
            expect(flp.router).toBeDefined();
            expect(flp.flpConfig.theme).toEqual(flpConfig.theme);
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

        test('Card generator is enabled for the application', async () => {
            const flp = new FlpSandbox(
                {
                    editors: {
                        cardGenerator: {
                            path: '/test/flpCardGeneratorSandbox.html'
                        }
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

        test('i18n manifest w/o bundle', async () => {
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            const manifest = {
                'sap.app': {
                    id: 'my.id',
                    title: '{{myDifferentTitle}}',
                    description: '{{myDifferentDescription}}'
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
                'sap.app': { id: 'my.id', title: '{{myTitle}}', description: '{{myDescription}}' }
            } as Manifest;
            await flp.init(manifest);
            expect(projectAccessMock).toHaveBeenCalled();
            expect(flp.templateConfig).toMatchSnapshot();
        });

        test('i18n manifest with unknown propertyI18nKey', async () => {
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            const manifest = {
                'sap.app': { id: 'my.id', title: '{{myOtherTitle}}', description: '{{myOtherDescription}}' }
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

        test('i18n key more that a word', async () => {
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            const manifest = JSON.parse(
                readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8')
            ) as Manifest;
            manifest['sap.app'].description = '{{my.custom.key.Description}}';
            await flp.init(manifest);
            expect(flp.templateConfig).toMatchSnapshot();
            expect(logger.warn).toHaveBeenCalledWith('Failed to load i18n properties bundle');
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

        test('do not add component to applications single', async () => {
            const manifest = {
                'sap.app': { id: 'my.id', type: 'component' }
            } as Manifest;
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            await flp.init(manifest);
            expect(flp.templateConfig.apps).toMatchSnapshot();
        });

        test('do not add component to applications multi', async () => {
            const manifest = {
                'sap.app': { id: 'my.id', type: 'component' }
            } as Manifest;
            const flp = new FlpSandbox(
                { flp: { apps: [{ target: '/yet/another/app', local: join(fixtures, 'multi-app') }] } },
                mockProject,
                mockUtils,
                logger
            );
            await flp.init(manifest);
            expect(flp.templateConfig.apps).toMatchSnapshot();
        });
    });

    describe('router', () => {
        let server!: SuperTest<Test>;
        const mockConfig = {
            flp: {
                enhancedHomePage: false,
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

        afterEach(() => {
            fetchMock.mockRestore();
        });

        const setupMiddleware = async (mockConfig: Partial<MiddlewareConfig>) => {
            const flp = new FlpSandbox(mockConfig, mockProject, mockUtils, logger);
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            await flp.init(manifest);

            const app = express();
            app.use(flp.router);

            server = supertest(app);
        };

        beforeAll(() => setupMiddleware(mockConfig as MiddlewareConfig));

        const runTestsWithHomepageToggle = (enableEnhancedHomePage: boolean = false) => {
            describe(`enhanced homepage ${enableEnhancedHomePage ? 'enabled' : 'disabled'}`, () => {
                afterEach(() => {
                    fetchMock.mockRestore();
                });

                beforeEach(() =>
                    setupMiddleware({
                        ...mockConfig,
                        flp: { ...mockConfig.flp, enhancedHomePage: enableEnhancedHomePage }
                    } as MiddlewareConfig)
                );

                test('test/flp.html UI5 2.x', async () => {
                    const jsonSpy = () =>
                        Promise.resolve({
                            name: 'SAPUI5 Distribution',
                            libraries: [{ name: 'sap.ui.core', version: '2.0.0' }]
                        });
                    fetchMock.mockResolvedValue({
                        json: jsonSpy,
                        text: jest.fn(),
                        ok: true
                    });
                    const response = await server.get('/test/flp.html?sap-ui-xx-viewCache=false').expect(200);
                    expect(response.text).toMatchSnapshot();
                });

                test('test/flp.html UI5 legacy-free', async () => {
                    const jsonSpy = () =>
                        Promise.resolve({
                            name: 'SAPUI5 Distribution',
                            libraries: [{ name: 'sap.ui.core', version: '1.136.0-legacy-free' }]
                        });
                    fetchMock.mockResolvedValue({
                        json: jsonSpy,
                        text: jest.fn(),
                        ok: true
                    });
                    const response = await server.get('/test/flp.html?sap-ui-xx-viewCache=false').expect(200);
                    expect(response.text).toMatchSnapshot();
                });

                test('test/flp.html UI5 1.76.0 from npmjs', async () => {
                    const jsonSpy = () =>
                        Promise.resolve({
                            name: 'myApp',
                            libraries: [{ name: 'sap.ui.core', version: '1.76.0' }]
                        });
                    fetchMock.mockResolvedValue({
                        json: jsonSpy,
                        text: jest.fn(),
                        ok: true
                    });
                    const response = await server.get('/test/flp.html?sap-ui-xx-viewCache=false').expect(200);
                    expect(response.text).toMatchSnapshot();
                });

                test('test/flp.html UI5 snapshot', async () => {
                    const jsonSpy = () =>
                        Promise.resolve({
                            name: 'SAPUI5 Distribution',
                            libraries: [{ name: 'sap.ui.core', version: '1.136.0-SNAPSHOT' }]
                        });
                    fetchMock.mockResolvedValue({
                        json: jsonSpy,
                        text: jest.fn(),
                        ok: true
                    });
                    const response = await server.get('/test/flp.html?sap-ui-xx-viewCache=false').expect(200);
                    expect(response.text).toMatchSnapshot();
                });

                test('test/flp.html', async () => {
                    const response = await server
                        .get('/test/flp.html?sap-ui-xx-viewCache=false#app-preview')
                        .expect(200);
                    expect(response.text).toMatchSnapshot();
                });

                test('test/flp.html sap-ui-xx-viewCache set to true', async () => {
                    const response = await server.get('/test/flp.html?sap-ui-xx-viewCache=true').expect(200);
                    expect(response.text).toMatchSnapshot();
                });

                test('test/flp.html missing sap-ui-xx-viewCache set to false', async () => {
                    const response = await server.get('/test/flp.html').expect(302);
                    expect(response.text).toMatchSnapshot();
                });

                test('editor with config', async () => {
                    const response = await server.get('/test/flp.html?sap-ui-xx-viewCache=false').expect(200);
                    expect(response.text).toMatchSnapshot();
                });

                test(`test/cdm.json should ${enableEnhancedHomePage ? 'return cdm' : 'fail'} when homepage is ${
                    enableEnhancedHomePage ? 'enabled' : 'disabled'
                }`, async () => {
                    const response = await server.get('/cdm.json').expect(enableEnhancedHomePage ? 200 : 404);
                    if (enableEnhancedHomePage) {
                        expect(response.text).toMatchSnapshot();
                    }
                });

                // enhanced homepage related tests
                if (enableEnhancedHomePage) {
                    test('test/flp.html should fallback to old homepage if ui5 version is less than 1.123.0', async () => {
                        const jsonSpy = () =>
                            Promise.resolve({
                                name: 'SAPUI5 Distribution',
                                libraries: [{ name: 'sap.ui.core', version: '1.120.0' }]
                            });
                        fetchMock.mockResolvedValue({
                            json: jsonSpy,
                            text: jest.fn(),
                            ok: true
                        });
                        const response = await server.get('/test/flp.html?sap-ui-xx-viewCache=false').expect(200);
                        expect(response.text).toMatchSnapshot();
                    });
                }
            });
        };

        // run tests with enhanced homepage enabled
        runTestsWithHomepageToggle(true);

        // run tests with homepage disabled
        runTestsWithHomepageToggle(false);

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

        test('rta with developerMode=true UI5 version 2.x', async () => {
            const jsonSpy = () =>
                Promise.resolve({
                    name: 'SAPUI5 Distribution',
                    libraries: [{ name: 'sap.ui.core', version: '2.0.0' }]
                });
            fetchMock.mockResolvedValue({
                json: jsonSpy,
                text: jest.fn(),
                ok: true
            });
            let response = await server.get('/my/editor.html').expect(200);
            expect(response.text).toMatchSnapshot();
            expect(response.text.includes('livereloadPort: 35729')).toBe(true);
            response = await server
                .get(
                    '/my/editor.html.inner.html?fiori-tools-rta-mode=forAdaptation&sap-ui-rta-skip-flex-validation=true'
                )
                .expect(200);
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

        test('rta with adp instance - preview', async () => {
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
            const response = await server.get('/test/flp.html?sap-ui-xx-viewCache=false').expect(200);
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
                .send({ change: { fileName: 'id', fileType: 'ctrl_variant' } })
                .expect(200);
            expect(response.text).toMatchInlineSnapshot(`"FILE_CREATED id.ctrl_variant"`);

            await server
                .post('/preview/api/changes')
                .set('Content-Type', 'application/json')
                .send({ change: { hello: 'world' } })
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

        test('test/flp.html UI5 1.71 with asyncHints.requests', async () => {
            const jsonSpy = () =>
                Promise.resolve({
                    name: 'SAPUI5 Distribution',
                    libraries: [{ name: 'sap.ui.core', version: '1.71.0' }]
                });
            fetchMock.mockResolvedValue({
                json: jsonSpy,
                text: jest.fn(),
                ok: true
            });
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
                        requests: [
                            {
                                name: 'myRequest',
                                url: 'http://sap.example'
                            }
                        ]
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
    });

    describe('router with enableCardGenerator', () => {
        let server!: SuperTest<Test>;
        const mockConfig = {
            editors: {
                cardGenerator: {
                    path: 'test/flpCardGeneratorSandbox.html'
                }
            }
        };

        let mockFsPromisesWriteFile: jest.Mock;

        beforeEach(() => {
            mockFsPromisesWriteFile = jest.fn();
            promises.writeFile = mockFsPromisesWriteFile;
        });

        afterEach(() => {
            fetchMock.mockRestore();
        });

        const setupMiddleware = async (mockConfig: Partial<MiddlewareConfig>) => {
            const flp = new FlpSandbox(mockConfig, mockProject, mockUtils, logger);
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            await flp.init(manifest);

            const app = express();
            app.use(flp.router);

            server = supertest(app);
        };

        beforeAll(async () => {
            await setupMiddleware(mockConfig as MiddlewareConfig);
        });

        test('GET /test/flpCardGeneratorSandbox.html', async () => {
            const response = await server.get(
                `${CARD_GENERATOR_DEFAULT.previewGeneratorSandbox}?sap-ui-xx-viewCache=false`
            );
            expect(response.status).toBe(200);
            expect(response.type).toBe('text/html');
        });

        test('POST /cards/store with payload', async () => {
            const projectAccessMock = jest.spyOn(projectAccess, 'createApplicationAccess').mockImplementation(() => {
                return Promise.resolve({
                    updateManifestJSON: () => {
                        return Promise.resolve({});
                    }
                }) as unknown as Promise<ApplicationAccess>;
            });
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
            const response = await server.post(CARD_GENERATOR_DEFAULT.cardsStore).send(payload);
            expect(projectAccessMock).toHaveBeenCalled();
            expect(response.status).toBe(201);
            expect(response.text).toBe('Files were updated/created');
        });

        test('POST /cards/store without payload', async () => {
            const response = await server.post(CARD_GENERATOR_DEFAULT.cardsStore).send();
            expect(response.status).toBe(500);
            expect(response.text).toBe('Files could not be created/updated.');
        });

        test('POST /editor/i18n with payload', async () => {
            const newI18nEntry = [
                {
                    'key': 'CardGeneratorGroupPropertyLabel_Groups_0_Items_0',
                    'value': 'new Entry'
                }
            ];
            const response = await server.post(CARD_GENERATOR_DEFAULT.i18nStore).send(newI18nEntry);
            const webappPath = await getWebappPath(path.resolve());
            const filePath = join(webappPath, 'i18n', 'i18n.properties');

            expect(response.status).toBe(201);
            expect(response.text).toBe('i18n file updated.');
            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledTimes(1);
            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledWith(filePath, newI18nEntry);
        });
    });

    describe('router with enableCardGenerator in CAP project', () => {
        let server!: SuperTest<Test>;
        const mockConfig = {
            editors: {
                cardGenerator: {
                    path: 'test/flpCardGeneratorSandbox.html'
                }
            }
        };

        let mockFsPromisesWriteFile: jest.Mock;

        beforeEach(() => {
            mockFsPromisesWriteFile = jest.fn();
            promises.writeFile = mockFsPromisesWriteFile;
        });

        afterEach(() => {
            fetchMock.mockRestore();
        });

        const setupMiddleware = async (mockConfig: Partial<MiddlewareConfig>) => {
            const flp = new FlpSandbox(mockConfig, mockProject, mockUtils, logger);
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            jest.spyOn(projectAccess, 'getProjectType').mockImplementationOnce(() => Promise.resolve('CAPNodejs'));
            await flp.init(manifest);

            const app = express();
            app.use(flp.router);

            server = supertest(app);
        };

        beforeAll(async () => {
            await setupMiddleware(mockConfig as MiddlewareConfig);
        });

        test('GET /test/flpCardGeneratorSandbox.html', async () => {
            const response = await server.get(
                `${CARD_GENERATOR_DEFAULT.previewGeneratorSandbox}?sap-ui-xx-viewCache=false`
            );
            expect(response.status).toBe(200);
            expect(response.type).toBe('text/html');
            expect(logger.warn).toHaveBeenCalledWith('The Card Generator is not available for CAP projects.');
        });

        test('POST /cards/store with payload', async () => {
            const response = await server.post(CARD_GENERATOR_DEFAULT.cardsStore).send('hello');
            expect(response.status).toBe(404);
        });

        test('POST /editor/i18n with payload', async () => {
            const response = await server.post(CARD_GENERATOR_DEFAULT.i18nStore).send('hello');
            expect(response.status).toBe(404);
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

            server = supertest(app);
        });

        test('test/existingFlp.html', async () => {
            logger.info.mockReset();
            mockProject.byPath.mockResolvedValueOnce({});
            await server.get('/test/existingFlp.html?sap-ui-xx-viewCache=false');
            expect(logger.info).toHaveBeenCalledWith(
                'HTML file returned at /test/existingFlp.html is loaded from the file system.'
            );
            await server.get('/cdm.json').expect(404);
        });
    });

    describe('router - connect API', () => {
        let server!: SuperTest<Test>;
        const mockConfig = {
            flp: {
                enhancedHomePage: false,
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
            ]
        };
        const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));

        test('GET default routes with connect API (used by karma test runner)', async () => {
            const flp = new FlpSandbox(
                mockConfig as unknown as Partial<MiddlewareConfig>,
                mockProject,
                mockUtils,
                logger
            );
            await flp.init(manifest);

            const app = connect();
            app.use(flp.router as unknown as connect.Server);

            server = await supertest(app);
            let response = await server.get('/test/flp.html').expect(200);
            expect(response.text).toMatchSnapshot();
            response = await server.get('/test/unitTests.qunit.html').expect(200);
            expect(response.text).toMatchSnapshot();
            response = await server.get('/test/unitTests.qunit.js').expect(200);
            expect(response.text).toMatchSnapshot();
            response = await server.get('/test/integration/opaTests.qunit.html').expect(200);
            expect(response.text).toMatchSnapshot();
            await server.get('/cdm.json').expect(404);
            response = await server.get('/test/flp.html?sap-ui-xx-viewCache=false').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('GET default routes with connect API when enhancedHomePage is enabled', async () => {
            mockConfig.flp.enhancedHomePage = true;
            const flp = new FlpSandbox(
                mockConfig as unknown as Partial<MiddlewareConfig>,
                mockProject,
                mockUtils,
                logger
            );
            await flp.init(manifest);

            const app = connect();
            app.use(flp.router as unknown as connect.Server);

            server = await supertest(app);
            let response = await server.get('/test/flp.html').expect(200);
            expect(response.text).toMatchSnapshot();
            response = await server.get('/cdm.json').expect(200);
            expect(response.text).toMatchSnapshot();
        });
    });

    describe('rta with new config', () => {
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
            editors: {
                rta: {
                    layer: 'CUSTOMER_BASE',
                    endpoints: [
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
            }
        };

        afterEach(() => {
            fetchMock.mockRestore();
        });

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

        test('rta', async () => {
            const response = await server.get('/my/rta.html').expect(302);
            expect(response.text).toMatchSnapshot();
        });

        test('rta with url parameters', async () => {
            const response = await server.get('/my/rta.html?fiori-tools-rta-mode=true').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('rta with developerMode=true', async () => {
            let response = await server.get('/my/editor.html').expect(200);
            expect(response.text).toMatchSnapshot();
            expect(response.text.includes('livereloadPort: 35729')).toBe(true);
            response = await server.get('/my/editor.html.inner.html').expect(302);
            expect(response.text).toMatchSnapshot();
        });

        test('rta w/o layer', async () => {
            const mockConfigAdjusted = { ...mockConfig };
            //@ts-expect-error: we use undefined here on purpose to simulate a missing value from ui5 yaml
            mockConfigAdjusted.editors.rta.layer = undefined;
            const flp = new FlpSandbox(
                mockConfigAdjusted as unknown as Partial<MiddlewareConfig>,
                mockProject,
                mockUtils,
                logger
            );
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            await flp.init(manifest);

            const app = express();
            app.use(flp.router);

            server = await supertest(app);
            const response = await server.get('/my/rta.html?fiori-tools-rta-mode=true').expect(200);
            expect(response.text).toMatchSnapshot();
        });
    });

    describe('cds-plugin-ui5', () => {
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
            editors: {
                rta: {
                    layer: 'CUSTOMER_BASE',
                    endpoints: [
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
            }
        };

        afterEach(() => {
            fetchMock.mockRestore();
        });

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
            app.use([
                function (req: EnhancedRequest, _res: Response, next: NextFunction) {
                    req['ui5-patched-router'] = { baseUrl: '/ui5-patched-router-base' };
                    next();
                },
                flp.router
            ]);

            server = await supertest(app);
        });

        test('rta', async () => {
            const response = await server.get('/my/rta.html').expect(302);
            expect(response.header.location).toContain('ui5-patched-router-base');
        });

        test('test/flp.html', async () => {
            const response = await server.get(`/test/flp.html#app-preview`).expect(302);
            expect(response.header.location).toContain('ui5-patched-router-base');
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
        expect(adpToolingMock).toHaveBeenCalled();
        expect(flpInitMock).toHaveBeenCalled();
    });

    test('initAdp - cloud scenario', async () => {
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
                addApis: jest.fn(),
                isCloudProject: true
            } as unknown as adpTooling.AdpPreview;
        });
        const config = {
            adp: { target: { url } },
            rta: { options: {}, editors: [] }
        } as unknown as Partial<MiddlewareConfig>;
        const flp = new FlpSandbox(config, mockAdpProject, {} as MiddlewareUtils, logger);
        const flpInitMock = jest.spyOn(flp, 'init').mockImplementation(async (): Promise<void> => {
            jest.fn();
        });
        await initAdp(mockAdpProject, config.adp as AdpPreviewConfig, flp, {} as MiddlewareUtils, logger);
        expect(adpToolingMock).toHaveBeenCalled();
        expect(flpInitMock).toHaveBeenCalled();
        expect(flp.rta?.options?.isCloud).toBe(true);
    });
});
