import type { Manifest } from '@sap-ux/project-access';
import {
    DEFAULT_INTENT,
    DEFAULT_PATH,
    createFlpTemplateConfig,
    createTestTemplateConfig,
    generatePreviewFiles,
    generateSandboxAppConfig,
    getFlpConfigWithDefaults,
    getPreviewPaths,
    remapResourcesForPath
} from '../../../src/base/config.js';
import { mergeTestConfigDefaults } from '../../../src/base/test.js';
import type { MiddlewareConfig } from '../../../src/index.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ToolsLogger } from '@sap-ux/logger';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('config', () => {
    const manifest = {
        'sap.app': {
            id: 'my.app'
        }
    } as Manifest;
    describe('getFlpConfigWithDefaults', () => {
        test('minimum settings', () => {
            const flpConfig = getFlpConfigWithDefaults({});
            expect(flpConfig).toMatchObject({
                path: DEFAULT_PATH,
                intent: DEFAULT_INTENT
            });
        });
        test('user configured path', () => {
            const path = '/test/flpSandbox.html';
            const intent = { object: 'myapp', action: 'myaction' };
            const flpConfig = getFlpConfigWithDefaults({ path, intent });
            expect(flpConfig).toMatchObject({ path, intent });
        });
        test('useNewSandbox defaults to true when not set', () => {
            expect(getFlpConfigWithDefaults({}).useNewSandbox).toBe(true);
        });
        test('useNewSandbox:false is preserved', () => {
            expect(getFlpConfigWithDefaults({ useNewSandbox: false }).useNewSandbox).toBe(false);
        });
        test('useNewSandbox:true is preserved', () => {
            expect(getFlpConfigWithDefaults({ useNewSandbox: true }).useNewSandbox).toBe(true);
        });
    });

    describe('createFlpTemplateConfig', () => {
        test('minimum settings', () => {
            const flpConfig = getFlpConfigWithDefaults({});
            const templateConfig = createFlpTemplateConfig(flpConfig, manifest);
            expect(templateConfig).toMatchSnapshot();
        });

        test('minimum settings with one reuse lib', () => {
            const flpConfig = getFlpConfigWithDefaults({});
            const resources = { 'my.reuse.lib': '/custom/path/my.reuse.lib' };
            const templateConfig = createFlpTemplateConfig(flpConfig, manifest, resources);
            expect(templateConfig).toMatchSnapshot();
        });

        test('ADP project does not include LocalStorageConnector', () => {
            const flpConfig = getFlpConfigWithDefaults({});
            const templateConfig = createFlpTemplateConfig(flpConfig, manifest, {}, true);
            const connectorNames = templateConfig.ui5.flex
                .filter((c): c is { connector: string; layers: string[] } => 'connector' in c)
                .map((c) => c.connector);
            expect(connectorNames).not.toContain('LocalStorageConnector');
        });

        test('non-ADP project includes LocalStorageConnector', () => {
            const flpConfig = getFlpConfigWithDefaults({});
            const templateConfig = createFlpTemplateConfig(flpConfig, manifest, {});
            const connectorNames = templateConfig.ui5.flex
                .filter((c): c is { connector: string; layers: string[] } => 'connector' in c)
                .map((c) => c.connector);
            expect(connectorNames).toContain('LocalStorageConnector');
        });
    });

    describe('createTestTemplateConfig', () => {
        test('minimum settings', () => {
            const config = mergeTestConfigDefaults({ framework: 'OPA5' });
            const templateConfig = createTestTemplateConfig(config, manifest['sap.app'].id, 'sap_horizon');
            expect(templateConfig).toMatchObject({
                basePath: '..',
                framework: 'OPA5',
                id: manifest['sap.app'].id,
                initPath: 'opaTests.qunit.js',
                theme: 'sap_horizon'
            });
        });
    });

    describe('getPreviewPaths', () => {
        test('minimum settings', async () => {
            const paths = getPreviewPaths({});
            expect(paths).toHaveLength(1);
            expect(paths[0]).toMatchObject({
                path: `${DEFAULT_PATH}#${DEFAULT_INTENT.object}-${DEFAULT_INTENT.action}`,
                type: 'preview'
            });
        });

        test('tests included and a custom path', async () => {
            const consoleSpyError = jest.spyOn(ToolsLogger.prototype, 'error').mockImplementation(() => {});
            const consoleSpyWarning = jest.spyOn(ToolsLogger.prototype, 'warn').mockImplementation(() => {});
            const config = {
                flp: {
                    path: '/test/flpSandbox.html',
                    intent: { object: 'myapp', action: 'myaction' }
                },
                rta: {
                    layer: 'CUSTOMER_BASE',
                    editors: [
                        { path: '/local/editor.html', developerMode: false },
                        { path: '/local/developerEditor.html', developerMode: true }
                    ]
                },
                editors: {
                    cardGenerator: {
                        path: '/local/cardGenerator.html'
                    }
                },
                test: [{ framework: 'OPA5' }]
            } as MiddlewareConfig;
            const previews = getPreviewPaths(config);
            expect(previews).toHaveLength(5);
            expect(
                previews.find(
                    ({ path }) =>
                        path === `${config?.flp?.path}#${config?.flp?.intent?.object}-${config?.flp?.intent?.action}`
                )
            ).toBeDefined();
            expect(previews.find(({ path }) => path === config?.editors?.rta?.endpoints[0]?.path)).toBeDefined();
            expect(previews.find(({ path }) => path === config?.editors?.rta?.endpoints[1]?.path)).toBeDefined();
            expect(consoleSpyError).toHaveBeenCalledWith(
                'developerMode is ONLY supported for SAP UI5 adaptation projects.'
            );
            expect(previews.find(({ path }) => path === config?.editors?.cardGenerator?.path)).toBeDefined();
            expect(consoleSpyWarning).toHaveBeenCalledWith('developerMode for /local/developerEditor.html disabled');
            expect(previews.find(({ path }) => path === '/test/opaTests.qunit.html')).toBeDefined();
            consoleSpyError.mockRestore();
            consoleSpyWarning.mockRestore();
        });

        test('paths missing a leading slash are sanitized with a leading slash', async () => {
            const config = {
                flp: {
                    path: 'test/flpSandbox.html',
                    intent: { object: 'myapp', action: 'myaction' }
                },
                rta: {
                    layer: 'CUSTOMER_BASE',
                    editors: [{ path: 'local/editor.html', developerMode: false }]
                },
                editors: {
                    cardGenerator: {
                        path: 'local/cardGenerator.html'
                    }
                },
                test: [{ framework: 'OPA5', path: 'test/opaTests.qunit.html' }]
            } as MiddlewareConfig;
            const previews = getPreviewPaths(config);
            // FLP path is normalized by getFlpConfigWithDefaults
            expect(previews.find(({ path }) => path === '/test/flpSandbox.html#myapp-myaction')).toBeDefined();
            // editor endpoint path gets a leading slash added
            expect(previews.find(({ path }) => path === '/local/editor.html')).toBeDefined();
            // card generator path gets a leading slash added
            expect(previews.find(({ path }) => path === '/local/cardGenerator.html')).toBeDefined();
            // test path gets a leading slash added
            expect(previews.find(({ path }) => path === '/test/opaTests.qunit.html')).toBeDefined();
            // all returned paths start with /
            previews.forEach(({ path }) => {
                expect(path.startsWith('/')).toBe(true);
            });
        });
    });

    describe('sanitizeConfig', () => {
        test('developerMode is preserved and no warning logged for CPE scenario (FE_FROM_SCRATCH)', () => {
            const consoleSpyError = jest.spyOn(ToolsLogger.prototype, 'error').mockImplementation(() => {});
            const consoleSpyWarning = jest.spyOn(ToolsLogger.prototype, 'warn').mockImplementation(() => {});
            const config = {
                editors: {
                    rta: {
                        layer: 'CUSTOMER_BASE',
                        options: { scenario: 'FE_FROM_SCRATCH' },
                        endpoints: [{ path: '/editor.html', developerMode: true }]
                    }
                }
            } as unknown as MiddlewareConfig;
            getPreviewPaths(config);
            expect(consoleSpyError).not.toHaveBeenCalled();
            expect(consoleSpyWarning).not.toHaveBeenCalledWith('developerMode for /editor.html disabled');
            expect(config.editors!.rta!.endpoints[0].developerMode).toBe(true);
            consoleSpyError.mockRestore();
            consoleSpyWarning.mockRestore();
        });

        test('developerMode is preserved and no warning logged for ADAPTATION_PROJECT scenario', () => {
            const consoleSpyError = jest.spyOn(ToolsLogger.prototype, 'error').mockImplementation(() => {});
            const consoleSpyWarning = jest.spyOn(ToolsLogger.prototype, 'warn').mockImplementation(() => {});
            const config = {
                editors: {
                    rta: {
                        layer: 'CUSTOMER_BASE',
                        options: { scenario: 'ADAPTATION_PROJECT' },
                        endpoints: [{ path: '/test/adaptation-editor.html', developerMode: true }]
                    }
                }
            } as unknown as MiddlewareConfig;
            getPreviewPaths(config);
            expect(consoleSpyError).not.toHaveBeenCalled();
            expect(consoleSpyWarning).not.toHaveBeenCalledWith(
                'developerMode for /test/adaptation-editor.html disabled'
            );
            expect(config.editors!.rta!.endpoints[0].developerMode).toBe(true);
            consoleSpyError.mockRestore();
            consoleSpyWarning.mockRestore();
        });

        test('developerMode is stripped and warning logged when no recognized scenario', () => {
            const consoleSpyError = jest.spyOn(ToolsLogger.prototype, 'error').mockImplementation(() => {});
            const consoleSpyWarning = jest.spyOn(ToolsLogger.prototype, 'warn').mockImplementation(() => {});
            const config = {
                editors: {
                    rta: {
                        layer: 'CUSTOMER_BASE',
                        endpoints: [{ path: '/editor.html', developerMode: true }]
                    }
                }
            } as unknown as MiddlewareConfig;
            getPreviewPaths(config);
            expect(consoleSpyError).toHaveBeenCalledWith(
                'developerMode is ONLY supported for SAP UI5 adaptation projects.'
            );
            expect(consoleSpyWarning).toHaveBeenCalledWith('developerMode for /editor.html disabled');
            expect(config.editors!.rta!.endpoints[0].developerMode).toBe(false);
            consoleSpyError.mockRestore();
            consoleSpyWarning.mockRestore();
        });
    });

    describe('generatePreviewFiles', () => {
        test('minimum settings', async () => {
            const basePath = join(__dirname, '../../fixtures/simple-app');
            const fs = await generatePreviewFiles(basePath, {});
            const files = fs.dump(basePath);
            const paths = Object.keys(files);
            expect(paths).toHaveLength(1);
            expect(paths[0].endsWith(DEFAULT_PATH)).toBe(true);
            expect(files[paths[0]].contents).toMatchSnapshot();
        });

        test('tests included and a custom path', async () => {
            const basePath = join(__dirname, '../../fixtures/simple-app');
            const config = {
                flp: {
                    path: '/test/flpSandbox.html',
                    intent: { object: 'myapp', action: 'myaction' }
                },
                test: [{ framework: 'OPA5' }, { framework: 'Testsuite' }]
            } satisfies MiddlewareConfig;
            const fs = await generatePreviewFiles(basePath, config);
            expect(fs.dump(basePath)).toMatchSnapshot();
        });

        test('multi-app setup e.g. in CAP', async () => {
            const basePath = join(__dirname, '../../fixtures');
            const config = {
                flp: {
                    path: '/test/flpSandbox.thml',
                    apps: [
                        {
                            local: '/simple-app',
                            target: '/apps/simple-app',
                            intent: {
                                object: 'simpleApp',
                                action: 'preview'
                            }
                        },
                        {
                            local: '/multi-app',
                            target: '/apps/other-app'
                        }
                    ]
                }
            } satisfies MiddlewareConfig;
            const fs = await generatePreviewFiles(basePath, config);
            expect(fs.dump(basePath)).toMatchSnapshot();
        });
    });

    describe('remapResourcesForPath', () => {
        const appId = 'my.app';

        /**
         * Helper: build a TemplateConfig based on a given FLP path so we have a realistic
         * starting point for each remapping scenario.
         */
        function buildConfig(flpPath: string) {
            const flpConfig = getFlpConfigWithDefaults({ path: flpPath });
            return createFlpTemplateConfig(flpConfig, manifest);
        }

        test('editor at root level when FLP is one level deep (test/flp.html → editor.html)', () => {
            // FLP at test/flp.html  → basePath ".."
            // Editor at editor.html → newBasePath should be "."
            const config = buildConfig('/test/flp.html');
            // Simulate addApp: primary app resource root is set to basePath ".."
            config.ui5.resources[appId] = config.basePath;

            remapResourcesForPath(config, '/editor.html', appId);

            expect(config.basePath).toBe('.');
            expect(config.ui5.resources[appId]).toBe('.');
            // posix.join('.', 'preview', 'client') normalises to 'preview/client' (no leading './')
            expect(config.ui5.resources['open.ux.preview.client']).toBe('preview/client');
        });

        test('editor at same depth as FLP (test/flp.html → test/editor.html)', () => {
            // FLP at test/flp.html    → basePath ".."
            // Editor at test/editor.html → newBasePath should still be ".."
            const config = buildConfig('/test/flp.html');
            config.ui5.resources[appId] = config.basePath;

            remapResourcesForPath(config, '/test/editor.html', appId);

            expect(config.basePath).toBe('..');
            expect(config.ui5.resources[appId]).toBe('..');
            expect(config.ui5.resources['open.ux.preview.client']).toBe('../preview/client');
        });

        test('editor two levels deep when FLP is one level deep (test/flp.html → a/b/editor.html)', () => {
            // FLP at test/flp.html  → basePath ".."
            // Editor at a/b/editor.html → newBasePath should be "../.."
            const config = buildConfig('/test/flp.html');
            config.ui5.resources[appId] = config.basePath;

            remapResourcesForPath(config, '/a/b/editor.html', appId);

            expect(config.basePath).toBe('../..');
            expect(config.ui5.resources[appId]).toBe('../..');
            expect(config.ui5.resources['open.ux.preview.client']).toBe('../../preview/client');
        });

        test('editor at root level when FLP is two levels deep (a/b/flp.html → editor.html)', () => {
            // FLP at a/b/flp.html   → basePath "../.."
            // Editor at editor.html → newBasePath should be "."
            const config = buildConfig('/a/b/flp.html');
            config.ui5.resources[appId] = config.basePath;

            remapResourcesForPath(config, '/editor.html', appId);

            expect(config.basePath).toBe('.');
            expect(config.ui5.resources[appId]).toBe('.');
            // posix.join('.', 'preview', 'client') normalises to 'preview/client' (no leading './')
            expect(config.ui5.resources['open.ux.preview.client']).toBe('preview/client');
        });

        test('additional app targets with absolute paths are not affected', () => {
            // Additional apps always have absolute target values and must not be remapped
            const config = buildConfig('/test/flp.html');
            config.ui5.resources[appId] = config.basePath;
            const absoluteTarget = '/apps/my-other-app';
            config.ui5.resources['other.app'] = absoluteTarget;

            remapResourcesForPath(config, '/editor.html', appId);

            // The additional app's absolute target must remain unchanged
            expect(config.ui5.resources['other.app']).toBe(absoluteTarget);
        });

        test('unknown appId does not throw and leaves other resources intact', () => {
            const config = buildConfig('/test/flp.html');
            config.ui5.resources[appId] = config.basePath;

            // Use an appId that is not in resources
            expect(() => remapResourcesForPath(config, '/editor.html', 'unknown.app')).not.toThrow();
            // The known appId entry is untouched because it was not matched
            expect(config.ui5.resources[appId]).toBe('..');
            // basePath and client ns are still updated
            expect(config.basePath).toBe('.');
            // posix.join('.', 'preview', 'client') normalises to 'preview/client' (no leading './')
            expect(config.ui5.resources['open.ux.preview.client']).toBe('preview/client');
        });
    });

    describe('generateSandboxAppConfig', () => {
        const workspaceConnector = 'open/ux/preview/client/flp/WorkspaceConnector';

        test('generates config with single app', () => {
            const flpConfig = getFlpConfigWithDefaults({ intent: { object: 'app', action: 'preview' } });
            const templateConfig = createFlpTemplateConfig(flpConfig, manifest);
            templateConfig.apps['app-preview'] = {
                title: 'My App',
                description: '',
                additionalInformation: 'SAPUI5.Component=my.app',
                applicationType: 'URL',
                url: '..'
            };
            const result = generateSandboxAppConfig(templateConfig, flpConfig);
            expect(result.beforeFlpStart).toBe('module:open/ux/preview/client/flp/sandbox2BeforeInit');
            expect(result.afterFlpStart).toBe('module:open/ux/preview/client/flp/sandbox2AfterInit');
            expect(result.restricted.flexibilityServices).toHaveLength(3);
            expect(result.restricted.flexibilityServices[0]).toEqual({
                connector: 'LrepConnector',
                layers: [],
                url: '/sap/bc/lrep'
            });
            expect(result.restricted.flexibilityServices[1]).toEqual({
                applyConnector: workspaceConnector,
                writeConnector: workspaceConnector,
                custom: true
            });
            expect(result.tiles).toHaveLength(1);
            expect(result.tiles[0].rootPath).toBe('../');
        });

        test('generates config with multiple apps', () => {
            const flpConfig = getFlpConfigWithDefaults({ intent: { object: 'myApp', action: 'start' } });
            const templateConfig = createFlpTemplateConfig(flpConfig, manifest);
            templateConfig.apps['myApp-start'] = {
                title: 'App One',
                description: '',
                additionalInformation: '',
                applicationType: 'URL',
                url: '/app1'
            };
            templateConfig.apps['otherApp-display'] = {
                title: 'App Two',
                description: '',
                additionalInformation: '',
                applicationType: 'URL',
                url: '/app2'
            };
            const result = generateSandboxAppConfig(templateConfig, flpConfig);
            expect(result.tiles).toHaveLength(2);
            const tile1 = result.tiles.find((t) => t.semanticObject === 'myApp');
            const tile2 = result.tiles.find((t) => t.semanticObject === 'otherApp');
            expect(tile1).toEqual({ semanticObject: 'myApp', action: 'start', rootPath: '/app1/' });
            expect(tile2).toEqual({ semanticObject: 'otherApp', action: 'display', rootPath: '/app2/' });
        });

        test('matches snapshot', () => {
            const flpConfig = getFlpConfigWithDefaults({ intent: { object: 'app', action: 'preview' } });
            const templateConfig = createFlpTemplateConfig(flpConfig, manifest);
            templateConfig.apps['app-preview'] = {
                title: 'My App',
                description: '',
                additionalInformation: 'SAPUI5.Component=my.app',
                applicationType: 'URL',
                url: '..'
            };
            expect(generateSandboxAppConfig(templateConfig, flpConfig)).toMatchSnapshot();
        });
    });
});
