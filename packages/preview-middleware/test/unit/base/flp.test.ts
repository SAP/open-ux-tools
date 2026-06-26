import { jest } from '@jest/globals';
import path, { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { ReaderCollection } from '@ui5/fs';
import type { FlpConfig, MiddlewareConfig } from '../../../src/index.js';
import type { Logger, ToolsLogger } from '@sap-ux/logger';
import type { ProjectAccess, I18nBundles, Manifest, ApplicationAccess } from '@sap-ux/project-access';
import { readFileSync, promises } from 'node:fs';
import supertest from 'supertest';
import express, { type Response, type NextFunction } from 'express';
import type { EnhancedRequest } from '../../../src/base/flp.js';
import { tmpdir } from 'node:os';
import type { AdpPreviewConfig, AdpPreview } from '@sap-ux/adp-tooling';
import type { TemplateConfig } from '../../../src/base/config.js';
import type { I18nEntry } from '@sap-ux/i18n';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { MiddlewareUtils } from '@ui5/server';
import { fetchMock } from '../../__mock__/global.js';
import { AdaptationProjectType } from '@sap-ux/axios-extension';
import { createRequire } from 'node:module';
import type connectLib from 'connect';
import type { Server as ConnectServer } from 'connect';
const require = createRequire(import.meta.url);
const connect = require('connect') as typeof connectLib;

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock node:module to intercept createRequire so that require.resolve works for
// @sap-ux/control-property-editor-sources (its dist/app.js is not built in test env)
const actualNodeModule = await import('node:module');
jest.unstable_mockModule('node:module', () => ({
    ...actualNodeModule,
    createRequire: (url: string | URL) => {
        const originalRequire = actualNodeModule.createRequire(url);
        const wrappedRequire = Object.assign((id: string) => originalRequire(id), originalRequire);
        const originalResolve = originalRequire.resolve.bind(originalRequire);
        wrappedRequire.resolve = Object.assign(
            (id: string, options?: { paths?: string[] }) => {
                if (id === '@sap-ux/control-property-editor-sources') {
                    // Return a dummy path; dirname() of this gives a usable directory for serveStatic
                    return join(__dirname, '..', '..', 'fixtures', 'dummy-cpe', 'index.js');
                }
                return originalResolve(id, options);
            },
            { paths: originalRequire.resolve.paths }
        ) as NodeJS.RequireResolve;
        return wrappedRequire;
    }
}));

// Pre-import actual modules (before mocking) to use as spread base
const actualProjectAccess = await import('@sap-ux/project-access');
const actualAdpTooling = await import('@sap-ux/adp-tooling');
const actualI18n = await import('@sap-ux/i18n');

// Mock functions for @sap-ux/project-access
const mockFindProjectRoot = jest.fn<() => Promise<string>>().mockResolvedValue(process.cwd());
const mockFindCapProjectRoot = jest.fn<typeof actualProjectAccess.findCapProjectRoot>().mockResolvedValue(null);
const mockGetProjectType = jest.fn<() => Promise<string>>().mockResolvedValue('EDMXBackend');
const mockCreateProjectAccess = jest.fn() as jest.Mock;
const mockCreateApplicationAccess = jest.fn<typeof actualProjectAccess.createApplicationAccess>();

// Mock @sap-ux/project-access
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    findProjectRoot: mockFindProjectRoot,
    findCapProjectRoot: mockFindCapProjectRoot,
    getProjectType: mockGetProjectType,
    createProjectAccess: mockCreateProjectAccess,
    createApplicationAccess: mockCreateApplicationAccess
}));

// Mock @sap-ux/adp-tooling
const mockAdpPreviewConstructor = jest.fn() as jest.Mock;
const mockReadManifestFromBuildPath = jest.fn<typeof actualAdpTooling.readManifestFromBuildPath>();

jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ...actualAdpTooling,
    AdpPreview: mockAdpPreviewConstructor,
    readManifestFromBuildPath: mockReadManifestFromBuildPath
}));

// Mock @sap-ux/i18n
const mockCreatePropertiesI18nEntries = jest.fn<typeof actualI18n.createPropertiesI18nEntries>();

jest.unstable_mockModule('@sap-ux/i18n', () => ({
    ...actualI18n,
    createPropertiesI18nEntries: mockCreatePropertiesI18nEntries
}));

// Import after mocking
const { FlpSandbox: FlpSandboxUnderTest } = await import('../../../src/index.js');
const { CARD_GENERATOR_DEFAULT } = await import('../../../src/base/config.js');
const adpTooling = await import('@sap-ux/adp-tooling');

class FlpSandbox extends FlpSandboxUnderTest {
    declare public templateConfig: TemplateConfig;
    declare public readonly flpConfig: FlpConfig;
}

const mockUtils = {
    getProject() {
        return {
            getSourcePath: () => tmpdir(),
            getType: () => 'application',
            getNamespace: () => undefined
        };
    }
} as unknown as MiddlewareUtils;

describe('FlpSandbox', () => {
    const mockProject = {
        byPath: jest.fn<() => Promise<any>>().mockResolvedValue(undefined),
        byGlob: jest.fn<(glob: string) => Promise<any>>().mockImplementation((glob) =>
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
    } as unknown as ReaderCollection & { byPath: ReturnType<typeof jest.fn>; byGlob: ReturnType<typeof jest.fn> };
    const mockUtils = {
        getProject() {
            return {
                getSourcePath: () => tmpdir(),
                getType: () => 'application',
                getNamespace: () => undefined
            };
        }
    } as unknown as MiddlewareUtils;
    const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() } as unknown as Logger & {
        warn: ReturnType<typeof jest.fn>;
        info: ReturnType<typeof jest.fn>;
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
            mockCreateProjectAccess.mockImplementation(() => {
                return Promise.resolve({
                    getApplicationIdByManifestAppId: () => {
                        return Promise.resolve(['my\\id']);
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
            expect(mockCreateProjectAccess).toHaveBeenCalled();
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
                                local: join(fixtures, 'simple-app') //test with absolute path
                            },
                            {
                                target: '/yet/another/app',
                                local: './test/fixtures/multi-app', //test with relative path
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

        test('locate-reuse-libs found for application type uses unscoped glob', async () => {
            const byGlobMock = jest.fn<(glob: string) => Promise<any[]>>().mockImplementation((glob) =>
                Promise.resolve(glob.includes('locate-reuse-libs') ? [{}] : [])
            );
            const projectWithLocateReuse = {
                byPath: jest.fn().mockResolvedValue(undefined),
                byGlob: byGlobMock
            } as unknown as ReaderCollection;
            const manifest = { 'sap.app': { id: 'my.id' } } as Manifest;
            const flp = new FlpSandbox({}, projectWithLocateReuse, mockUtils, logger);
            await flp.init(manifest);
            expect(flp.flpConfig.libs).toBe(true);
            const locateCall = byGlobMock.mock.calls.find(([g]) => g.includes('locate-reuse-libs'));
            expect(locateCall?.[0]).toBe('/**/locate-reuse-libs.js');
        });

        test('locate-reuse-libs found for component type uses namespace-scoped glob', async () => {
            const byGlobMock = jest.fn<(glob: string) => Promise<any[]>>().mockImplementation((glob) =>
                Promise.resolve(glob.includes('locate-reuse-libs') ? [{}] : [])
            );
            const projectWithLocateReuse = {
                byPath: jest.fn().mockResolvedValue(undefined),
                byGlob: byGlobMock
            } as unknown as ReaderCollection;
            const mockUtilsComponent = {
                getProject() {
                    return {
                        getType: () => 'component',
                        getNamespace: () => 'my/app/ns',
                        getSourcePath: () => tmpdir()
                    };
                }
            } as unknown as MiddlewareUtils;
            const manifest = { 'sap.app': { id: 'my.app.ns' } } as Manifest;
            const flp = new FlpSandbox({}, projectWithLocateReuse, mockUtilsComponent, logger);
            await flp.init(manifest);
            expect(flp.flpConfig.libs).toBe(true);
            const locateCall = byGlobMock.mock.calls.find(([g]) => g.includes('locate-reuse-libs'));
            expect(locateCall?.[0]).toBe('/resources/my/app/ns/**/locate-reuse-libs.js');
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
        let server!: supertest.Agent;
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
            const componentId = 'myComponent';
            const resources = {
                'myResources1': 'myResourcesUrl1',
                'myResources2': 'myResourcesUrl2'
            };
            const url = 'http://sap.example';
            const syncSpy = jest.fn<() => Promise<void>>().mockResolvedValueOnce(undefined);
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
            } as unknown as AdpPreview;

            await flp.init(manifest, componentId, resources, adpToolingMock);
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
            const componentId = 'myComponent';
            const resources = {
                'myResources1': 'myResourcesUrl1',
                'myResources2': 'myResourcesUrl2'
            };
            const url = 'http://sap.example';
            const syncSpy = jest.fn<() => Promise<void>>().mockResolvedValueOnce(undefined);
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
            } as unknown as AdpPreview;

            await flp.init(manifest, componentId, resources, adpToolingMock);
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

        test('resource roots are remapped to editor path depth (editor at root, flp one level deep)', async () => {
            // FLP is at /test/flp.html (one level deep) → basePath ".."
            // Editor is at /rta.html (root level)        → newBasePath should be "."
            const flp = new FlpSandbox(
                {
                    ...mockConfig,
                    rta: {
                        layer: 'CUSTOMER_BASE',
                        editors: [{ path: '/rta.html' }]
                    }
                } as unknown as Partial<MiddlewareConfig>,
                mockProject,
                mockUtils,
                logger
            );
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            await flp.init(manifest);

            const app = express();
            app.use(flp.router);
            const localServer = supertest(app);

            const flpResponse = await localServer.get('/test/flp.html?sap-ui-xx-viewCache=false').expect(200);
            // The FLP at test/flp.html should still use "../" resource roots
            expect(flpResponse.text).toContain('"open.ux.preview.client":"../preview/client"');

            const editorResponse = await localServer.get('/rta.html?fiori-tools-rta-mode=true').expect(200);
            // The editor at /rta.html should use "./" resource roots, not "../"
            expect(editorResponse.text).toContain('"open.ux.preview.client":"preview/client"');
            // posix.join('.', 'preview', 'client') normalises to 'preview/client' (no leading './')
            expect(editorResponse.text).not.toContain('"open.ux.preview.client":"../preview/client"');
            // App resource root must also be remapped to "."
            expect(editorResponse.text).toContain('"test.fe.v2.app":"."');
            expect(editorResponse.text).not.toContain('"test.fe.v2.app":".."');
        });

        test('resource roots are unchanged when editor is at same depth as FLP', async () => {
            // FLP is at /test/flp.html (one level deep)    → basePath ".."
            // Editor is at /test/rta.html (same depth)     → newBasePath should still be ".."
            const flp = new FlpSandbox(
                {
                    ...mockConfig,
                    rta: {
                        layer: 'CUSTOMER_BASE',
                        editors: [{ path: '/test/rta.html' }]
                    }
                } as unknown as Partial<MiddlewareConfig>,
                mockProject,
                mockUtils,
                logger
            );
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            await flp.init(manifest);

            const app = express();
            app.use(flp.router);
            const localServer = supertest(app);

            const editorResponse = await localServer.get('/test/rta.html?fiori-tools-rta-mode=true').expect(200);
            expect(editorResponse.text).toContain('"open.ux.preview.client":"../preview/client"');
            expect(editorResponse.text).toContain('"test.fe.v2.app":".."');
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
            const componentId = 'myComponent';
            const resources = {
                'myResources1': 'myResourcesUrl1',
                'myResources2': 'myResourcesUrl2'
            };
            const url = 'http://sap.example';
            const syncSpy = jest.fn<() => Promise<void>>().mockResolvedValueOnce(undefined);
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
            } as unknown as AdpPreview;

            await flp.init(manifest, componentId, resources, adpToolingMock);
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

        test('test/flp.html UI5 1.108 removes flexExtensionPointEnabled from applicationDependencies', async () => {
            const jsonSpy = () =>
                Promise.resolve({
                    name: 'SAPUI5 Distribution',
                    libraries: [{ name: 'sap.ui.core', version: '1.108.51' }]
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
            const componentId = 'myComponent';
            const resources = {
                'myResources1': 'myResourcesUrl1'
            };
            const url = 'http://sap.example';
            const syncSpy = jest.fn<() => Promise<void>>().mockResolvedValueOnce(undefined);
            const adpToolingMock = {
                init: () => {
                    return 'CUSTOMER_BASE';
                },
                descriptor: {
                    manifest: { 'sap.ui5': { flexExtensionPointEnabled: true, dependencies: { libs: {} } } },
                    name: 'descriptorName',
                    url,
                    asyncHints: { requests: [] }
                },
                resources: [],
                proxy: jest.fn(),
                sync: syncSpy,
                onChangeRequest: jest.fn(),
                addApis: jest.fn()
            } as unknown as AdpPreview;

            await flp.init(manifest, componentId, resources, adpToolingMock);
            const app = express();
            app.use(flp.router);
            const server = await supertest(app);

            await server
                .get(
                    '/my/editor.html.inner.html?fiori-tools-rta-mode=forAdaptation&sap-ui-rta-skip-flex-validation=true'
                )
                .expect(200);

            const appDeps = flp.templateConfig.apps['app-preview'].applicationDependencies;
            expect(appDeps?.manifest?.['sap.ui5']?.flexExtensionPointEnabled).toBeUndefined();
        });

        test('test/flp.html UI5 1.142 preserves flexExtensionPointEnabled in applicationDependencies', async () => {
            const jsonSpy = () =>
                Promise.resolve({
                    name: 'SAPUI5 Distribution',
                    libraries: [{ name: 'sap.ui.core', version: '1.142.9' }]
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
            const componentId = 'myComponent';
            const resources = { 'myResources1': 'myResourcesUrl1' };
            const url = 'http://sap.example';
            const syncSpy = jest.fn<() => Promise<void>>().mockResolvedValueOnce(undefined);
            const adpToolingMock = {
                init: () => {
                    return 'CUSTOMER_BASE';
                },
                descriptor: {
                    manifest: { 'sap.ui5': { flexExtensionPointEnabled: true, dependencies: { libs: {} } } },
                    name: 'descriptorName',
                    url,
                    asyncHints: { requests: [] }
                },
                resources: [],
                proxy: jest.fn(),
                sync: syncSpy,
                onChangeRequest: jest.fn(),
                addApis: jest.fn()
            } as unknown as AdpPreview;

            await flp.init(manifest, componentId, resources, adpToolingMock);
            const app = express();
            app.use(flp.router);
            const server = await supertest(app);

            await server
                .get(
                    '/my/editor.html.inner.html?fiori-tools-rta-mode=forAdaptation&sap-ui-rta-skip-flex-validation=true'
                )
                .expect(200);

            const appDeps = flp.templateConfig.apps['app-preview'].applicationDependencies;
            expect(appDeps?.manifest?.['sap.ui5']?.flexExtensionPointEnabled).toBe(true);
        });

        test('CF ADP skips applicationDependencies assignment (no descriptor merge available)', async () => {
            const jsonSpy = () =>
                Promise.resolve({
                    name: 'SAPUI5 Distribution',
                    libraries: [{ name: 'sap.ui.core', version: '1.142.0' }]
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
            const componentId = 'myComponent';
            const resources = {
                'myResources1': 'myResourcesUrl1'
            };
            const syncSpy = jest.fn<() => Promise<void>>().mockResolvedValueOnce(undefined);
            // CF mode: descriptor must NOT be read; throw if anyone tries.
            const cfAdpToolingMock = {
                init: () => 'CUSTOMER_BASE',
                get descriptor(): never {
                    throw new Error('Not initialized');
                },
                resources: [],
                proxy: jest.fn(),
                sync: syncSpy,
                onChangeRequest: jest.fn(),
                addApis: jest.fn(),
                isCloudFoundry: true
            } as unknown as AdpPreview;

            await flp.init(manifest, componentId, resources, cfAdpToolingMock);
            const app = express();
            app.use(flp.router);
            const server = await supertest(app);

            await server
                .get(
                    '/my/editor.html.inner.html?fiori-tools-rta-mode=forAdaptation&sap-ui-rta-skip-flex-validation=true'
                )
                .expect(200);

            // sync() must not be called and descriptor must not be assigned
            expect(syncSpy).not.toHaveBeenCalled();
            const appDeps = flp.templateConfig.apps['app-preview'].applicationDependencies;
            expect(appDeps).toBeUndefined();
        });
    });

    describe('router with enableCardGenerator', () => {
        let server!: supertest.Agent;
        const mockConfig = {
            editors: { cardGenerator: { path: 'test/flpCardGeneratorSandbox.html' } }
        };

        let mockFsPromisesWriteFile: ReturnType<typeof jest.fn>;

        beforeEach(() => {
            mockFsPromisesWriteFile = jest.fn();
            promises.writeFile = mockFsPromisesWriteFile as typeof promises.writeFile;
        });

        afterEach(() => {
            fetchMock.mockRestore();
        });
        let flp: FlpSandbox;
        const setupMiddleware = async (mockConfig: Partial<MiddlewareConfig>) => {
            flp = new FlpSandbox(mockConfig, mockProject, mockUtils, logger);
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
            mockCreateApplicationAccess.mockImplementation((() => {
                return Promise.resolve({
                    updateManifestJSON: () => {
                        return Promise.resolve({});
                    }
                }) as unknown as Promise<ApplicationAccess>;
            }) as unknown as typeof actualProjectAccess.createApplicationAccess);
            const payload = {
                floorplan: 'ObjectPage',
                localPath: 'cards/op/op1',
                fileName: 'manifest.json',
                manifests: [
                    {
                        type: 'integration',
                        manifest: {
                            '_version': '1.15.0',
                            'sap.card': { 'type': 'Object', 'header': { 'type': 'Numeric', 'title': 'Card title' } },
                            'sap.insights': {
                                'versions': { 'ui5': '1.120.1-202403281300' },
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
                            'body': [{ 'type': 'TextBlock', 'wrap': true, 'weight': 'Bolder', 'text': 'Card Title' }]
                        },
                        default: true,
                        entitySet: 'op1'
                    }
                ]
            };
            const response = await server.post(CARD_GENERATOR_DEFAULT.cardsStore).send(payload);
            expect(mockCreateApplicationAccess).toHaveBeenCalled();
            expect(response.status).toBe(201);
            expect(response.text).toBe('Files were updated/created');
        });

        test('POST /cards/store without payload', async () => {
            const response = await server.post(CARD_GENERATOR_DEFAULT.cardsStore).send();
            expect(response.status).toBe(500);
            expect(response.text).toBe('Files could not be created/updated.');
        });

        test('POST /editor/i18n with payload', async () => {
            const newI18nEntry = [{ 'key': 'CardGeneratorGroupPropertyLabel_Groups_0_Items_0', 'value': 'new Entry' }];
            const response = await server.post(CARD_GENERATOR_DEFAULT.i18nStore).send(newI18nEntry);
            const expectedFilePath = join(tmpdir(), 'i18n', 'i18n.properties');

            expect(response.status).toBe(201);
            expect(response.text).toBe('i18n file updated.');
            expect(mockCreatePropertiesI18nEntries).toHaveBeenCalledWith(
                expectedFilePath,
                expect.arrayContaining([
                    expect.objectContaining({
                        key: 'CardGeneratorGroupPropertyLabel_Groups_0_Items_0',
                        value: 'new Entry'
                    })
                ])
            );
        });
        test('should handle string i18n path', async () => {
            const newI18nEntry = [{ key: 'HELLO', value: 'Hello World' }];
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            manifest['sap.app'].i18n = 'i18n/custom.properties';
            await flp.init(manifest);
            const response = await server.post(`${CARD_GENERATOR_DEFAULT.i18nStore}?locale=de`).send(newI18nEntry);
            const expectedPath = join(tmpdir(), 'i18n', 'custom_de.properties');

            expect(response.status).toBe(201);
            expect(response.text).toBe('i18n file updated.');
            expect(mockCreatePropertiesI18nEntries).toHaveBeenCalledWith(
                expectedPath,
                expect.arrayContaining([expect.objectContaining({ key: 'HELLO', value: 'Hello World' })])
            );
        });

        test('should handle bundleUrl with supported and fallback locales', async () => {
            const newI18nEntry = [{ key: 'GREETING', value: 'Hallo Welt' }];
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            manifest['sap.app'].i18n = {
                bundleUrl: 'i18n/i18n.properties',
                supportedLocales: ['de', 'es'],
                fallbackLocale: 'de'
            };
            await flp.init(manifest);
            const response = await server.post(`${CARD_GENERATOR_DEFAULT.i18nStore}?locale=de`).send(newI18nEntry);
            const expectedPath = join(tmpdir(), 'i18n', 'i18n_de.properties');

            expect(response.status).toBe(201);
            expect(response.text).toBe('i18n file updated.');
            expect(mockCreatePropertiesI18nEntries).toHaveBeenCalledWith(
                expectedPath,
                expect.arrayContaining([expect.objectContaining({ key: 'GREETING', value: 'Hallo Welt' })])
            );
        });

        test('should reject unsupported locale', async () => {
            const newI18nEntry = [{ key: 'GREETING', value: 'Bonjour' }];
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            manifest['sap.app'].i18n = { bundleUrl: 'i18n/i18n.properties', supportedLocales: ['de', 'es'] };
            await flp.init(manifest);
            const response = await server.post(`${CARD_GENERATOR_DEFAULT.i18nStore}?locale=fr`).send(newI18nEntry);
            expect(response.status).toBe(400);
            expect(response.text).toContain('Locale "fr" is not supported');
        });

        test('should fallback to default i18n/i18n.properties if no i18n defined', async () => {
            const newI18nEntry = [{ key: 'HELLO', value: 'Hello World' }];
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            delete manifest['sap.app'].i18n;
            await flp.init(manifest);
            const response = await server.post(`${CARD_GENERATOR_DEFAULT.i18nStore}`).send(newI18nEntry);
            const expectedPath = join(tmpdir(), 'i18n', 'i18n.properties');

            expect(response.status).toBe(201);
            expect(response.text).toBe('i18n file updated.');
            expect(mockCreatePropertiesI18nEntries).toHaveBeenCalledWith(
                expectedPath,
                expect.arrayContaining([expect.objectContaining({ key: 'HELLO', value: 'Hello World' })])
            );
        });

        test('should handle bundleName (CAP project style) i18n config', async () => {
            mockCreatePropertiesI18nEntries.mockClear();
            const newI18nEntry = [{ key: 'CAP_KEY', value: 'CAP Value' }];
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            manifest['sap.app'].i18n = {
                bundleName: 'test.fe.v2.app.i18n.i18n',
                supportedLocales: ['en', 'de'],
                fallbackLocale: 'en'
            };
            await flp.init(manifest);
            const response = await server.post(`${CARD_GENERATOR_DEFAULT.i18nStore}?locale=de`).send(newI18nEntry);
            const expectedPath = join(tmpdir(), 'i18n', 'i18n_de.properties');

            expect(response.status).toBe(201);
            expect(response.text).toBe('i18n file updated.');
            expect(mockCreatePropertiesI18nEntries).toHaveBeenCalledWith(
                expectedPath,
                expect.arrayContaining([expect.objectContaining({ key: 'CAP_KEY', value: 'CAP Value' })])
            );
        });

        test('should use fallbackLocale when no locale provided', async () => {
            mockCreatePropertiesI18nEntries.mockClear();
            const newI18nEntry = [{ key: 'FALLBACK_KEY', value: 'Fallback Value' }];
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            manifest['sap.app'].i18n = {
                bundleUrl: 'i18n/i18n.properties',
                supportedLocales: ['en', 'de'],
                fallbackLocale: 'en'
            };
            await flp.init(manifest);
            const response = await server.post(`${CARD_GENERATOR_DEFAULT.i18nStore}`).send(newI18nEntry);
            const expectedPath = join(tmpdir(), 'i18n', 'i18n_en.properties');

            expect(response.status).toBe(201);
            expect(response.text).toBe('i18n file updated.');
            expect(mockCreatePropertiesI18nEntries).toHaveBeenCalledWith(
                expectedPath,
                expect.arrayContaining([expect.objectContaining({ key: 'FALLBACK_KEY', value: 'Fallback Value' })])
            );
        });

        test('should use first supportedLocale when no locale and no fallbackLocale', async () => {
            mockCreatePropertiesI18nEntries.mockClear();
            const newI18nEntry = [{ key: 'FIRST_LOCALE_KEY', value: 'First Locale Value' }];
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            manifest['sap.app'].i18n = { bundleUrl: 'i18n/i18n.properties', supportedLocales: ['fr', 'de'] };
            await flp.init(manifest);
            const response = await server.post(`${CARD_GENERATOR_DEFAULT.i18nStore}`).send(newI18nEntry);
            const expectedPath = join(tmpdir(), 'i18n', 'i18n_fr.properties');

            expect(response.status).toBe(201);
            expect(response.text).toBe('i18n file updated.');
            expect(mockCreatePropertiesI18nEntries).toHaveBeenCalledWith(
                expectedPath,
                expect.arrayContaining([
                    expect.objectContaining({ key: 'FIRST_LOCALE_KEY', value: 'First Locale Value' })
                ])
            );
        });
    });

    describe('router with enableCardGenerator for CAP projects', () => {
        let server!: supertest.Agent;
        const webappPath = join(tmpdir(), 'webapp');
        const mockCAPUtils = {
            getProject() {
                return { getSourcePath: () => webappPath };
            }
        } as unknown as MiddlewareUtils;
        const mockConfig = { editors: { cardGenerator: { path: '/test/flpCardGeneratorSandbox.html' } } };

        let mockFsPromisesWriteFile: ReturnType<typeof jest.fn>;
        let flp: FlpSandbox;

        const setupMiddleware = async (mockConfig: Partial<MiddlewareConfig>) => {
            mockGetProjectType.mockImplementation(() => Promise.resolve('CAPNodejs'));
            flp = new FlpSandbox(mockConfig, mockProject, mockCAPUtils, logger);
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            await flp.init(manifest);
            const app = express();
            app.use(flp.router);
            server = supertest(app);
        };

        beforeEach(() => {
            mockFsPromisesWriteFile = jest.fn();
            promises.writeFile = mockFsPromisesWriteFile as typeof promises.writeFile;
            mockCreatePropertiesI18nEntries.mockClear();
        });

        afterEach(() => {
            fetchMock.mockRestore();
            mockGetProjectType.mockImplementation(() => Promise.resolve('EDMXBackend'));
        });

        test('POST /cards/store with payload for CAP project (CAPNodejs)', async () => {
            await setupMiddleware(mockConfig as MiddlewareConfig);
            mockCreateApplicationAccess.mockImplementation((() => {
                return Promise.resolve({
                    updateManifestJSON: () => {
                        return Promise.resolve({});
                    }
                }) as unknown as Promise<ApplicationAccess>;
            }) as unknown as typeof actualProjectAccess.createApplicationAccess);
            const payload = {
                floorplan: 'ObjectPage',
                localPath: 'cards/op/op1',
                fileName: 'manifest.json',
                manifests: [
                    {
                        type: 'integration',
                        manifest: {
                            '_version': '1.15.0',
                            'sap.card': { 'type': 'Object', 'header': { 'type': 'Numeric', 'title': 'Card title' } },
                            'sap.insights': {
                                'versions': { 'ui5': '1.120.1-202403281300' },
                                'templateName': 'ObjectPage',
                                'parentAppId': 'sales.order.wd20',
                                'cardType': 'DT'
                            }
                        },
                        default: true,
                        entitySet: 'op1'
                    }
                ]
            };
            const response = await server.post(CARD_GENERATOR_DEFAULT.cardsStore).send(payload);
            expect(mockCreateApplicationAccess).toHaveBeenCalled();
            expect(mockCreateApplicationAccess).toHaveBeenCalledWith(path.dirname(webappPath), expect.anything());
            expect(response.status).toBe(201);
            expect(response.text).toBe('Files were updated/created');
        });

        test('POST /editor/i18n with payload for CAP project (CAPNodejs)', async () => {
            await setupMiddleware(mockConfig as MiddlewareConfig);
            const newI18nEntry = [{ 'key': 'CardGeneratorGroupPropertyLabel_Groups_0_Items_0', 'value': 'new Entry' }];
            const response = await server.post(CARD_GENERATOR_DEFAULT.i18nStore).send(newI18nEntry);
            const expectedFilePath = join(webappPath, 'i18n', 'i18n.properties');

            expect(response.status).toBe(201);
            expect(response.text).toBe('i18n file updated.');
            expect(mockCreatePropertiesI18nEntries).toHaveBeenCalledWith(
                expectedFilePath,
                expect.arrayContaining([
                    expect.objectContaining({
                        key: 'CardGeneratorGroupPropertyLabel_Groups_0_Items_0',
                        value: 'new Entry'
                    })
                ])
            );
        });
    });

    describe('router with enableCardGenerator - version gating', () => {
        const mockConfig = { editors: { cardGenerator: { path: '/test/flpCardGeneratorSandbox.html' } } };

        const setupMiddleware = async (projectType: string) => {
            mockGetProjectType.mockResolvedValue(projectType);
            const flp = new FlpSandbox(mockConfig as MiddlewareConfig, mockProject, mockUtils, logger);
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            await flp.init(manifest);
            const app = express();
            app.use(flp.router);
            return { server: supertest(app), flp };
        };

        const mockUi5Version = (version: string, name = 'SAPUI5 Distribution') => {
            const jsonSpy = () => Promise.resolve({ name, libraries: [{ name: 'sap.ui.core', version }] });
            fetchMock.mockResolvedValue({ json: jsonSpy, text: jest.fn(), ok: true } as unknown as Response);
        };

        beforeEach(() => {
            (logger.warn as ReturnType<typeof jest.fn>).mockClear();
        });

        afterEach(() => {
            fetchMock.mockRestore();
            mockGetProjectType.mockResolvedValue('EDMXBackend');
            mockFindCapProjectRoot.mockResolvedValue(null);
        });

        test('EDMXBackend below 1.121 - disables card generator and warns', async () => {
            const { server, flp } = await setupMiddleware('EDMXBackend');
            mockUi5Version('1.120.0');
            const response = await server.get(`/test/flpCardGeneratorSandbox.html?sap-ui-xx-viewCache=false`);
            expect(response.status).toBe(200);
            expect(flp.templateConfig.enableCardGenerator).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining(
                    "does not meet the minimum required version 1.121.0 for project type 'EDMXBackend'"
                )
            );
        });

        test('EDMXBackend at 1.121 - enables card generator and does not warn', async () => {
            const { server, flp } = await setupMiddleware('EDMXBackend');
            mockUi5Version('1.121.0');
            await server.get(`/test/flpCardGeneratorSandbox.html?sap-ui-xx-viewCache=false`);
            expect(flp.templateConfig.enableCardGenerator).toBe(true);
            expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('cardGenerator'));
        });

        test('CAPNodejs below 1.149 - disables card generator and warns', async () => {
            const { server, flp } = await setupMiddleware('CAPNodejs');
            mockUi5Version('1.148.0');
            await server.get(`/test/flpCardGeneratorSandbox.html?sap-ui-xx-viewCache=false`);
            expect(flp.templateConfig.enableCardGenerator).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining(
                    "does not meet the minimum required version 1.149.0 for project type 'CAPNodejs'"
                )
            );
        });

        test('CAPNodejs at 1.149 - enables card generator and does not warn', async () => {
            const { server, flp } = await setupMiddleware('CAPNodejs');
            mockUi5Version('1.149.0');
            await server.get(`/test/flpCardGeneratorSandbox.html?sap-ui-xx-viewCache=false`);
            expect(flp.templateConfig.enableCardGenerator).toBe(true);
            expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('cardGenerator'));
        });

        test('CAPJava below 1.149 - disables card generator and warns', async () => {
            const { server, flp } = await setupMiddleware('CAPJava');
            mockUi5Version('1.148.0');
            await server.get(`/test/flpCardGeneratorSandbox.html?sap-ui-xx-viewCache=false`);
            expect(flp.templateConfig.enableCardGenerator).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining("does not meet the minimum required version 1.149.0 for project type 'CAPJava'")
            );
        });

        test('uses CAP root found by findCapProjectRoot for project type detection', async () => {
            const capRoot = '/cap-project-root';
            mockFindCapProjectRoot.mockResolvedValue(capRoot);
            await setupMiddleware('CAPNodejs');
            expect(mockFindCapProjectRoot).toHaveBeenCalledWith(process.cwd(), false);
            expect(mockGetProjectType).toHaveBeenCalledWith(capRoot);
        });

        test('falls back to findProjectRoot when findCapProjectRoot returns null', async () => {
            mockFindCapProjectRoot.mockResolvedValue(null);
            await setupMiddleware('EDMXBackend');
            expect(mockFindCapProjectRoot).toHaveBeenCalledWith(process.cwd(), false);
            expect(mockFindProjectRoot).toHaveBeenCalledWith(process.cwd(), false, true);
        });

        test('legacy-free label - disables card generator regardless of minor version', async () => {
            const { server, flp } = await setupMiddleware('EDMXBackend');
            mockUi5Version('1.121.0-legacy-free');
            await server.get(`/test/flpCardGeneratorSandbox.html?sap-ui-xx-viewCache=false`);
            expect(flp.templateConfig.enableCardGenerator).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cardGenerator'));
        });

        test('warns on every request to the card generator endpoint', async () => {
            const { server } = await setupMiddleware('EDMXBackend');
            mockUi5Version('1.120.0');
            await server.get(`/test/flpCardGeneratorSandbox.html?sap-ui-xx-viewCache=false`);
            await server.get(`/test/flpCardGeneratorSandbox.html?sap-ui-xx-viewCache=false`);
            expect(
                (logger.warn as ReturnType<typeof jest.fn>).mock.calls.filter((call) =>
                    (call[0] as string).includes('cardGenerator')
                )
            ).toHaveLength(2);
        });
    });

    describe('router with test suite', () => {
        let server!: supertest.Agent;

        beforeAll(async () => {
            const flp = new FlpSandbox(
                {
                    flp: { apps: [{ target: '/yet/another/app' }] },
                    test: [{ framework: 'QUnit' }, { framework: 'OPA5' }, { framework: 'Testsuite' }]
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
        let server!: supertest.Agent;

        beforeAll(async () => {
            const flp = new FlpSandbox(
                { flp: { apps: [{ target: '/yet/another/app' }] }, test: [{ framework: 'Testsuite' }] },
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
        let server!: supertest.Agent;

        beforeAll(async () => {
            const flp = new FlpSandbox({ flp: { path: '/test/existingFlp.html' } }, mockProject, mockUtils, logger);
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            await flp.init(manifest);
            const app = express();
            app.use(flp.router);
            server = supertest(app);
        });

        test('test/existingFlp.html', async () => {
            (logger.info as ReturnType<typeof jest.fn>).mockReset();
            mockProject.byPath.mockResolvedValueOnce({});
            await server.get('/test/existingFlp.html?sap-ui-xx-viewCache=false');
            expect(logger.info).toHaveBeenCalledWith(
                'HTML file returned at /test/existingFlp.html is loaded from the file system.'
            );
            await server.get('/cdm.json').expect(404);
        });
    });

    describe('router - connect API', () => {
        let server!: supertest.Agent;
        const mockConfig = {
            flp: {
                enhancedHomePage: false,
                apps: [{ target: '/yet/another/app', local: join(fixtures, 'multi-app') }]
            },
            test: [
                { framework: 'QUnit' },
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
            app.use(flp.router as unknown as ConnectServer);
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
            app.use(flp.router as unknown as ConnectServer);
            server = await supertest(app);
            let response = await server.get('/test/flp.html').expect(200);
            expect(response.text).toMatchSnapshot();
            response = await server.get('/cdm.json').expect(200);
            expect(response.text).toMatchSnapshot();
        });
    });

    describe('rta with new config', () => {
        let server!: supertest.Agent;
        const mockConfig = {
            flp: { apps: [{ target: '/yet/another/app', local: join(fixtures, 'multi-app') }] },
            test: [
                { framework: 'QUnit' },
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
                        { path: '/my/rta.html' },
                        { path: 'without/slash/rta.html' },
                        { path: '/my/editor.html', developerMode: true },
                        { path: '/with/plugin.html', developerMode: true, pluginScript: 'open/ux/tools/plugin' },
                        { path: '/my/editorWithConfig.html', generator: 'test-generator' }
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

    describe('router with ui5 yaml type component', () => {
        let server!: supertest.Agent;
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
                    path: '/custom/integration/opaTests.qunit.html',
                    init: '/custom/integration/opaTests.qunit.js'
                }
            ],
            editors: {
                cardGenerator: {
                    path: 'custom/flpCardGeneratorSandbox.html'
                },
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
        } satisfies MiddlewareConfig;

        afterEach(() => {
            fetchMock.mockRestore();
        });

        const setupMiddleware = async (mockConfig: Partial<MiddlewareConfig>) => {
            const mockUtilsWithComponentType = {
                getProject() {
                    return {
                        getType: () => 'component',
                        getNamespace: () => 'test/fe/v2/app',
                        getSourcePath: () => tmpdir()
                    };
                }
            } as unknown as MiddlewareUtils;
            const flp = new FlpSandbox(mockConfig, mockProject, mockUtilsWithComponentType, logger);
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-component/src/manifest.json'), 'utf-8'));
            await flp.init(manifest);

            const app = express();
            app.use(flp.router);

            server = supertest(app);
        };

        beforeAll(() => setupMiddleware(mockConfig as MiddlewareConfig));

        test('GET FLP sandbox path', async () => {
            const response = await server.get(`/test-resources/test/fe/v2/app/flp.html?sap-ui-xx-viewCache=false`);
            expect(response.status).toBe(200);
            expect(response.type).toBe('text/html');
        });

        test('GET OPA5 paths', async () => {
            let response = await server.get(`/test-resources/test/fe/v2/app/custom/integration/opaTests.qunit.html`);
            expect(response.status).toBe(200);
            expect(response.type).toBe('text/html');
            response = await server.get(`/test-resources/test/fe/v2/app/custom/integration/opaTests.qunit.js`);
            expect(response.status).toBe(404);
        });

        test('GET QUnit paths', async () => {
            let response = await server.get(`/test-resources/test/fe/v2/app/unitTests.qunit.html`);
            expect(response.status).toBe(200);
            expect(response.type).toBe('text/html');
            response = await server.get(`/test-resources/test/fe/v2/app/unitTests.qunit.js`);
            expect(response.status).toBe(200);
            expect(response.type).toBe('application/javascript');
        });

        test('GET rta editor paths', async () => {
            let response = await server.get(`/test-resources/test/fe/v2/app/my/rta.html`);
            expect(response.status).toBe(302);
            response = await server.get(`/test-resources/test/fe/v2/app/without/slash/rta.html`);
            expect(response.status).toBe(302);
            response = await server.get(`/test-resources/test/fe/v2/app/my/editorWithConfig.html`);
            expect(response.status).toBe(302);
            response = await server.get(`/test-resources/test/fe/v2/app/my/editor.html`);
            expect(response.status).toBe(200);
            response = await server.get(`/test-resources/test/fe/v2/app/with/plugin.html`);
            expect(response.status).toBe(200);
        });

        test('GET cards generator paths', async () => {
            const response = await server.get(
                `/test-resources/test/fe/v2/app/custom/flpCardGeneratorSandbox.html?sap-ui-xx-viewCache=false`
            );
            expect(response.status).toBe(200);
            expect(response.type).toBe('text/html');
        });

        test('GET /resources/test/fe/v2/app/preview/api/changes', async () => {
            const response = await server.get('/resources/test/fe/v2/app/preview/api/changes').expect(200);
            expect(response.text).toBeTruthy();
            // bare path must NOT be registered for type:component
            await server.get('/preview/api/changes').expect(404);
        });

        test('POST /resources/test/fe/v2/app/preview/api/changes', async () => {
            const response = await server
                .post('/resources/test/fe/v2/app/preview/api/changes')
                .set('Content-Type', 'application/json')
                .send({ change: { fileName: 'componentChange', fileType: 'ctrl_variant' } })
                .expect(200);
            expect(response.text).toMatchInlineSnapshot(`"FILE_CREATED componentChange.ctrl_variant"`);
            // bare path must NOT respond
            await server
                .post('/preview/api/changes')
                .set('Content-Type', 'application/json')
                .send({ change: { fileName: 'x', fileType: 'ctrl_variant' } })
                .expect(404);
        });

        test('POST /resources/test/fe/v2/app/cards/store', async () => {
            mockCreateApplicationAccess.mockResolvedValueOnce({
                updateManifestJSON: () => Promise.resolve({})
            } as unknown as ApplicationAccess);
            const payload = {
                floorplan: 'ObjectPage',
                localPath: 'cards/op/op1',
                fileName: 'manifest.json',
                manifests: []
            };
            const response = await server
                .post(`/resources/test/fe/v2/app${CARD_GENERATOR_DEFAULT.cardsStore}`)
                .send(payload)
                .expect(201);
            expect(response.text).toBe('Files were updated/created');
            // bare path must NOT be registered for type:component
            await server.post(CARD_GENERATOR_DEFAULT.cardsStore).send(payload).expect(404);
        });

        test('POST /resources/test/fe/v2/app/editor/i18n', async () => {
            mockCreatePropertiesI18nEntries.mockResolvedValueOnce(true);
            const newI18nEntry = [{ key: 'KEY', value: 'Value' }];
            const response = await server
                .post(`/resources/test/fe/v2/app${CARD_GENERATOR_DEFAULT.i18nStore}`)
                .send(newI18nEntry)
                .expect(201);
            expect(response.text).toBe('i18n file updated.');
            // bare path must NOT be registered for type:component
            await server.post(CARD_GENERATOR_DEFAULT.i18nStore).send(newI18nEntry).expect(404);
        });
    });

    describe('cds-plugin-ui5', () => {
        let server!: supertest.Agent;
        const baseUrl = '/ui5.patched.router.base';
        const mockConfig = {
            flp: { apps: [{ target: '/yet/another/app', local: join(fixtures, 'multi-app') }] },
            test: [
                { framework: 'QUnit' },
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
                        { path: '/my/rta.html' },
                        { path: 'without/slash/rta.html' },
                        { path: '/my/editor.html', developerMode: true },
                        { path: '/with/plugin.html', developerMode: true, pluginScript: 'open/ux/tools/plugin' },
                        { path: '/my/editorWithConfig.html', generator: 'test-generator' }
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
            app.use((req: EnhancedRequest, _res: Response, next: NextFunction) => {
                req['ui5-patched-router'] = { baseUrl };
                next();
            });
            app.use(baseUrl, flp.router);
            server = await supertest(app);
        });

        test('rta', async () => {
            await server.get(`${baseUrl}/my/rta.html`).expect(302);
            const response = await server
                .get(
                    `${baseUrl}/my/rta.html?sap-ui-xx-viewCache=false&fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true`
                )
                .expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('cpe', async () => {
            const response = await server.get(`${baseUrl}/my/editor.html`).expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('test/flp.html', async () => {
            await server.get(`${baseUrl}/test/flp.html`).expect(302);
            const response = await server.get(`${baseUrl}/test/flp.html?sap-ui-xx-viewCache=false`).expect(200);
            expect(response.text).toMatchSnapshot();
        });
    });
});

describe('initAdp', () => {
    const url = 'http://sap.example';
    const syncSpy = jest.fn<() => Promise<void>>();

    beforeEach(() => {
        mockAdpPreviewConstructor.mockImplementation((): AdpPreview => {
            return {
                init: () => {
                    return 'CUSTOMER_BASE';
                },
                descriptor: { manifest: {}, name: 'descriptorName', url, asyncHints: { requests: [] } },
                resources: [],
                proxy: jest.fn(),
                sync: syncSpy,
                onChangeRequest: jest.fn(),
                addApis: jest.fn()
            } as unknown as AdpPreview;
        });
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
        const flp = new FlpSandbox({}, mockNonAdpProject, mockUtils, logger);
        try {
            await flp.initAdp({} as AdpPreviewConfig, mockUtils);
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    test('initAdp', async () => {
        const config = { adp: { target: { url } } };
        const flp = new FlpSandbox({ adp: { target: { url } } }, mockAdpProject, mockUtils, logger);
        const flpInitMock = jest.spyOn(flp, 'init').mockImplementation(async (): Promise<void> => {
            jest.fn();
        });
        await flp.initAdp(config.adp, mockUtils);
        expect(mockAdpPreviewConstructor).toHaveBeenCalled();
        expect(flpInitMock).toHaveBeenCalled();
    });

    test('initAdp - cloud scenario', async () => {
        mockAdpPreviewConstructor.mockImplementation((): AdpPreview => {
            return {
                init: () => {
                    return 'CUSTOMER_BASE';
                },
                descriptor: { manifest: {}, name: 'descriptorName', url, asyncHints: { requests: [] } },
                resources: [],
                proxy: jest.fn(),
                sync: syncSpy,
                onChangeRequest: jest.fn(),
                addApis: jest.fn(),
                projectType: AdaptationProjectType.CLOUD_READY
            } as unknown as AdpPreview;
        });
        const config = {
            adp: { target: { url } },
            rta: { options: {}, editors: [] }
        } as unknown as Partial<MiddlewareConfig>;
        const flp = new FlpSandbox(config, mockAdpProject, mockUtils, logger);
        const flpInitMock = jest.spyOn(flp, 'init').mockImplementation(async (): Promise<void> => {
            jest.fn();
        });
        await flp.initAdp(config.adp as AdpPreviewConfig, mockUtils);
        expect(mockAdpPreviewConstructor).toHaveBeenCalled();
        expect(flpInitMock).toHaveBeenCalled();
        expect(flp.rta?.options?.isCloud).toBe(true);
    });

    test('initAdp with cfBuildPath mode', async () => {
        const mockManifest = {
            'sap.app': {
                id: 'test.app',
                title: 'Test App',
                type: 'application',
                applicationVersion: { version: '1.0.0' }
            }
        } as Manifest;
        const cfBuildPath = 'dist';
        mockReadManifestFromBuildPath.mockReturnValue(mockManifest);
        mockAdpPreviewConstructor.mockImplementation((): AdpPreview => {
            return {
                init: jest.fn<() => Promise<string>>().mockResolvedValue('CUSTOMER_BASE'),
                descriptor: { manifest: {}, name: 'descriptorName', url, asyncHints: { requests: [] } },
                resources: [],
                proxy: jest.fn(),
                sync: syncSpy,
                onChangeRequest: jest.fn(),
                addApis: jest.fn(),
                projectType: AdaptationProjectType.ON_PREMISE
            } as unknown as AdpPreview;
        });

        const config: AdpPreviewConfig = {
            target: { url },
            cfBuildPath
        };
        const flpConfig = {
            adp: config,
            rta: { options: {}, editors: [] }
        } as unknown as Partial<MiddlewareConfig>;
        const flp = new FlpSandbox(flpConfig, mockAdpProject, mockUtils, logger);
        const flpInitMock = jest.spyOn(flp, 'init').mockImplementation(async (): Promise<void> => {
            jest.fn();
        });

        await flp.initAdp(config, mockUtils);

        expect(mockReadManifestFromBuildPath).toHaveBeenCalledWith(cfBuildPath);
        expect(mockAdpPreviewConstructor).toHaveBeenCalled();
        expect(flpInitMock).toHaveBeenCalledWith(mockManifest, expect.any(String), {}, expect.any(Object));
        expect(flp.rta?.options?.isCloud).toBe(false);
        expect(flp.rta?.options?.isCloudFoundry).toBe(true);
    });

    test('initAdp registers lrep flex data filter when serviceProvider is available', async () => {
        const lrepResponseBody = JSON.stringify({
            changes: [
                { fileName: 'localChange', changeType: 'addXML' },
                { fileName: 'deployedOnly', changeType: 'propertyChange' }
            ],
            modules: {
                'ns/app/changes/fragments/Local.fragment.xml': '<deployed/>',
                'ns/app/Component.js': 'base-component'
            }
        });
        const mockProvider = {
            get: jest.fn<() => Promise<any>>().mockResolvedValue({ data: lrepResponseBody })
        };
        jest.spyOn(adpTooling, 'AdpPreview').mockImplementation((): AdpPreview => {
            return {
                init: () => 'CUSTOMER_BASE',
                descriptor: {
                    manifest: {},
                    name: 'descriptorName',
                    url,
                    asyncHints: { requests: [] }
                },
                resources: [],
                proxy: jest.fn(),
                sync: syncSpy,
                onChangeRequest: jest.fn(),
                addApis: jest.fn(),
                serviceProvider: mockProvider
            } as unknown as AdpPreview;
        });

        const mockProjectWithLocalChanges = {
            byPath: () => ({
                getString: () =>
                    Promise.resolve(
                        readFileSync(join(__dirname, `../../fixtures/adp/webapp/manifest.appdescr_variant`), 'utf-8')
                    )
            }),
            byGlob: jest.fn<(glob: string) => Promise<any>>().mockImplementation((glob) => {
                if (glob.includes('.{change,')) {
                    return Promise.resolve([
                        {
                            getPath: () => '/webapp/changes/id_addXML.change',
                            getName: () => 'id_addXML.change',
                            getString: () =>
                                Promise.resolve(
                                    JSON.stringify({
                                        changeType: 'addXML',
                                        content: { fragmentPath: 'fragments/Local.fragment.xml' }
                                    })
                                )
                        }
                    ]);
                }
                return Promise.resolve([]);
            })
        } as unknown as ReaderCollection;

        const flp = new FlpSandbox(
            { adp: { target: { url } } },
            mockProjectWithLocalChanges,
            {} as MiddlewareUtils,
            logger
        );
        jest.spyOn(flp, 'init').mockImplementation(async (): Promise<void> => {
            jest.fn();
        });

        await flp.initAdp({ target: { url } }, mockUtils);

        const app = express();
        app.use(flp.router);

        const response = await supertest(app).get('/sap/bc/lrep/flex/data/my.app.Component');
        expect(response.status).toBe(200);
        expect(response.body.changes).toEqual([
            { fileName: 'localChange', changeType: 'addXML' },
            { fileName: 'deployedOnly', changeType: 'propertyChange' }
        ]);
        expect(response.body.modules).toEqual({ 'ns/app/Component.js': 'base-component' });
        expect(mockProvider.get).toHaveBeenCalledWith('/sap/bc/lrep/flex/data/my.app.Component');
    });

    test('initAdp lrep filter handles pre-parsed response data (Axios auto-parse)', async () => {
        const lrepResponseData = {
            changes: [
                { fileName: 'localChange', changeType: 'addXML' },
                { fileName: 'deployedOnly', changeType: 'propertyChange' }
            ],
            modules: {
                'ns/app/changes/fragments/Local.fragment.xml': '<deployed/>',
                'ns/app/Component.js': 'base-component'
            }
        };
        const mockProvider = {
            get: jest.fn<() => Promise<any>>().mockResolvedValue({ data: lrepResponseData })
        };
        jest.spyOn(adpTooling, 'AdpPreview').mockImplementation((): AdpPreview => {
            return {
                init: () => 'CUSTOMER_BASE',
                descriptor: {
                    manifest: {},
                    name: 'descriptorName',
                    url,
                    asyncHints: { requests: [] }
                },
                resources: [],
                proxy: jest.fn(),
                sync: syncSpy,
                onChangeRequest: jest.fn(),
                addApis: jest.fn(),
                serviceProvider: mockProvider
            } as unknown as AdpPreview;
        });

        const mockProjectWithLocalChanges = {
            byPath: () => ({
                getString: () =>
                    Promise.resolve(
                        readFileSync(join(__dirname, `../../fixtures/adp/webapp/manifest.appdescr_variant`), 'utf-8')
                    )
            }),
            byGlob: jest.fn<(glob: string) => Promise<any>>().mockImplementation((glob) => {
                if (glob.includes('.{change,')) {
                    return Promise.resolve([
                        {
                            getPath: () => '/webapp/changes/id_addXML.change',
                            getName: () => 'id_addXML.change',
                            getString: () =>
                                Promise.resolve(
                                    JSON.stringify({
                                        changeType: 'addXML',
                                        content: { fragmentPath: 'fragments/Local.fragment.xml' }
                                    })
                                )
                        }
                    ]);
                }
                return Promise.resolve([]);
            })
        } as unknown as ReaderCollection;

        const flp = new FlpSandbox(
            { adp: { target: { url } } },
            mockProjectWithLocalChanges,
            {} as MiddlewareUtils,
            logger
        );
        jest.spyOn(flp, 'init').mockImplementation(async (): Promise<void> => {
            jest.fn();
        });

        await flp.initAdp({ target: { url } }, mockUtils);

        const app = express();
        app.use(flp.router);

        const response = await supertest(app).get('/sap/bc/lrep/flex/data/my.app.Component');
        expect(response.status).toBe(200);
        expect(response.body.modules).toEqual({ 'ns/app/Component.js': 'base-component' });
    });

    test('initAdp does not register lrep filter when no local module files exist', async () => {
        const mockProvider = { get: jest.fn() };
        jest.spyOn(adpTooling, 'AdpPreview').mockImplementation((): AdpPreview => {
            return {
                init: () => 'CUSTOMER_BASE',
                descriptor: { manifest: {}, name: 'descriptorName', url, asyncHints: { requests: [] } },
                resources: [],
                proxy: jest.fn(),
                sync: syncSpy,
                onChangeRequest: jest.fn(),
                addApis: jest.fn(),
                serviceProvider: mockProvider
            } as unknown as AdpPreview;
        });

        const byGlobMock = jest.fn<() => Promise<any[]>>().mockResolvedValue([]);
        const projectNoModules = {
            byPath: () => ({
                getString: () =>
                    Promise.resolve(
                        readFileSync(join(__dirname, `../../fixtures/adp/webapp/manifest.appdescr_variant`), 'utf-8')
                    )
            }),
            byGlob: byGlobMock
        } as unknown as ReaderCollection;

        const flp = new FlpSandbox({ adp: { target: { url } } }, projectNoModules, {} as MiddlewareUtils, logger);
        jest.spyOn(flp, 'init').mockImplementation(async (): Promise<void> => {
            jest.fn();
        });

        await flp.initAdp({ target: { url } }, mockUtils);

        const app = express();
        app.use(flp.router);
        app.get('/sap/bc/lrep/flex/data/*', (_req, res) => res.status(200).json({ from: 'next' }));

        const response = await supertest(app).get('/sap/bc/lrep/flex/data/my.app.Component');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ from: 'next' });
        expect(mockProvider.get).not.toHaveBeenCalled();
    });

    test('initAdp lrep filter falls back to next() and logs error when provider.get() fails', async () => {
        const providerError = new Error('Network error');
        const mockProvider = { get: jest.fn<() => Promise<any>>().mockRejectedValue(providerError) };
        jest.spyOn(adpTooling, 'AdpPreview').mockImplementation((): AdpPreview => {
            return {
                init: () => 'CUSTOMER_BASE',
                descriptor: { manifest: {}, name: 'descriptorName', url, asyncHints: { requests: [] } },
                resources: [],
                proxy: jest.fn(),
                sync: syncSpy,
                onChangeRequest: jest.fn(),
                addApis: jest.fn(),
                serviceProvider: mockProvider
            } as unknown as AdpPreview;
        });

        const projectWithModules = {
            byPath: () => ({
                getString: () =>
                    Promise.resolve(
                        readFileSync(join(__dirname, `../../fixtures/adp/webapp/manifest.appdescr_variant`), 'utf-8')
                    )
            }),
            byGlob: jest.fn<(glob: string) => Promise<any>>().mockImplementation((glob) => {
                if (glob.includes('.{change,')) {
                    return Promise.resolve([
                        {
                            getPath: () => '/webapp/changes/id_addXML.change',
                            getName: () => 'id_addXML.change',
                            getString: () =>
                                Promise.resolve(
                                    JSON.stringify({
                                        changeType: 'addXML',
                                        content: { fragmentPath: 'fragments/Local.fragment.xml' }
                                    })
                                )
                        }
                    ]);
                }
                return Promise.resolve([]);
            })
        } as unknown as ReaderCollection;

        const flp = new FlpSandbox({ adp: { target: { url } } }, projectWithModules, {} as MiddlewareUtils, logger);
        jest.spyOn(flp, 'init').mockImplementation(async (): Promise<void> => {
            jest.fn();
        });

        await flp.initAdp({ target: { url } }, mockUtils);

        const app = express();
        app.use(flp.router);
        app.get('/sap/bc/lrep/flex/data/*', (_req, res) => res.status(200).json({ from: 'next' }));

        const response = await supertest(app).get('/sap/bc/lrep/flex/data/my.app.Component');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ from: 'next' });
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('LREP flex data filter failed'));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('/sap/bc/lrep/flex/data/my.app.Component'));
    });

    test('initAdp scans local modules once at startup, not on every request', async () => {
        const lrepResponseData = { changes: [], modules: {} };
        const mockProvider = { get: jest.fn<() => Promise<any>>().mockResolvedValue({ data: lrepResponseData }) };
        jest.spyOn(adpTooling, 'AdpPreview').mockImplementation((): AdpPreview => {
            return {
                init: () => 'CUSTOMER_BASE',
                descriptor: { manifest: {}, name: 'descriptorName', url, asyncHints: { requests: [] } },
                resources: [],
                proxy: jest.fn(),
                sync: syncSpy,
                onChangeRequest: jest.fn(),
                addApis: jest.fn(),
                serviceProvider: mockProvider
            } as unknown as AdpPreview;
        });

        const byGlobMock = jest.fn<(glob: string) => any>().mockImplementation((glob) => {
            if (glob.includes('.{change,')) {
                return [
                    {
                        getPath: () => '/webapp/changes/id_addXML.change',
                        getName: () => 'id_addXML.change',
                        getString: () =>
                            Promise.resolve(
                                JSON.stringify({
                                    changeType: 'addXML',
                                    content: { fragmentPath: 'fragments/Local.fragment.xml' }
                                })
                            )
                    }
                ];
            }
            return [];
        });
        const projectWithModules = {
            byPath: () => ({
                getString: () =>
                    Promise.resolve(
                        readFileSync(join(__dirname, `../../fixtures/adp/webapp/manifest.appdescr_variant`), 'utf-8')
                    )
            }),
            byGlob: byGlobMock
        } as unknown as ReaderCollection;

        const flp = new FlpSandbox({ adp: { target: { url } } }, projectWithModules, {} as MiddlewareUtils, logger);
        jest.spyOn(flp, 'init').mockImplementation(async (): Promise<void> => {
            jest.fn();
        });

        await flp.initAdp({ target: { url } }, mockUtils);

        const callsAfterInit = byGlobMock.mock.calls.length;

        const app = express();
        app.use(flp.router);
        await supertest(app).get('/sap/bc/lrep/flex/data/my.app.Component');
        await supertest(app).get('/sap/bc/lrep/flex/data/my.app.Component');

        expect(byGlobMock.mock.calls).toHaveLength(callsAfterInit);
    });
});
