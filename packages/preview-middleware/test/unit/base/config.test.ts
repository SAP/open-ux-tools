import type { Manifest } from '@sap-ux/project-access';
import {
    DEFAULT_INTENT,
    DEFAULT_PATH,
    createFlpTemplateConfig,
    createTestTemplateConfig,
    generatePreviewFiles,
    getFlpConfigWithDefaults,
    getPreviewPaths,
    remapResourcesForPath
} from '../../../src/base/config';
import { mergeTestConfigDefaults } from '../../../src/base/test';
import type { MiddlewareConfig } from '../../../src';
import { join } from 'node:path';
import { ToolsLogger } from '@sap-ux/logger';
import { tmpdir } from 'node:os';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { MiddlewareUtils } from '@ui5/server';

describe('config', () => {
    const manifest = {
        'sap.app': {
            id: 'my.app'
        }
    } as Manifest;
    const mockUtils = {
        getProject() {
            return {
                getSourcePath: () => tmpdir(),
                getType: () => 'application'
            };
        }
    } as unknown as MiddlewareUtils;
    describe('getFlpConfigWithDefaults', () => {
        test('minimum settings', () => {
            const flpConfig = getFlpConfigWithDefaults({}, mockUtils);
            expect(flpConfig).toMatchObject({
                path: DEFAULT_PATH,
                intent: DEFAULT_INTENT
            });
        });
        test('user configured path', () => {
            const path = '/test/flpSandbox.html';
            const intent = { object: 'myapp', action: 'myaction' };
            const flpConfig = getFlpConfigWithDefaults({ path, intent }, mockUtils);
            expect(flpConfig).toMatchObject({ path, intent });
        });
    });

    describe('createFlpTemplateConfig', () => {
        test('minimum settings', () => {
            const flpConfig = getFlpConfigWithDefaults({}, mockUtils);
            const templateConfig = createFlpTemplateConfig(flpConfig, manifest);
            expect(templateConfig).toMatchSnapshot();
        });

        test('minimum settings with one reuse lib', () => {
            const flpConfig = getFlpConfigWithDefaults({}, mockUtils);
            const resources = { 'my.reuse.lib': '/custom/path/my.reuse.lib' };
            const templateConfig = createFlpTemplateConfig(flpConfig, manifest, resources);
            expect(templateConfig).toMatchSnapshot();
        });
    });

    describe('createTestTemplateConfig', () => {
        test('minimum settings', () => {
            const config = mergeTestConfigDefaults({ framework: 'OPA5' }, mockUtils);
            const templateConfig = createTestTemplateConfig(config, manifest['sap.app'].id, 'sap_horizon');
            expect(templateConfig).toMatchObject({
                basePath: '..',
                rootBasePath: '..',
                framework: 'OPA5',
                id: manifest['sap.app'].id,
                initPath: 'opaTests.qunit.js',
                theme: 'sap_horizon'
            });
        });

        test('component type uses absolute basePath for resourceroots', () => {
            const mockComponentUtils = {
                getProject() {
                    return {
                        getType: () => 'component',
                        getNamespace: () => 'test/fe/v2/app'
                    };
                }
            } as unknown as MiddlewareUtils;
            const config = mergeTestConfigDefaults({ framework: 'QUnit' }, mockComponentUtils);
            const templateConfig = createTestTemplateConfig(
                config,
                'test.fe.v2.app',
                'sap_horizon',
                mockComponentUtils
            );
            expect(templateConfig).toMatchObject({
                basePath: '/resources/test/fe/v2/app',
                rootBasePath: '../../../../..',
                framework: 'QUnit',
                id: 'test.fe.v2.app',
                theme: 'sap_horizon'
            });
        });
    });

    describe('getPreviewPaths', () => {
        test('minimum settings', async () => {
            const paths = getPreviewPaths({}, mockUtils);
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
            const previews = getPreviewPaths(config, mockUtils);
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
            const previews = getPreviewPaths(config, mockUtils);
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
            getPreviewPaths(config, mockUtils);
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
            getPreviewPaths(config, mockUtils);
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
            getPreviewPaths(config, mockUtils);
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

        test('test runners with custom test paths', async () => {
            const basePath = join(__dirname, '../../fixtures/simple-app');
            const config = {
                test: [
                    { framework: 'QUnit', path: '/test/unit/unitTests.html' },
                    { framework: 'OPA5', path: '/test/integration/opaTests.html' }
                ]
            } satisfies MiddlewareConfig;
            const fs = await generatePreviewFiles(basePath, config);
            expect(fs.dump(basePath)).toMatchSnapshot();
        });

        test('test runners with paths not starting with /test/', async () => {
            const basePath = join(__dirname, '../../fixtures/simple-app');
            const config = {
                test: [{ framework: 'QUnit', path: '/custom/path/unitTests.html' }]
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
            config.ui5.resources[appId] = config.appBasePath;

            remapResourcesForPath(config, '/editor.html', appId);

            expect(config.appBasePath).toBe('.');
            expect(config.ui5.resources[appId]).toBe('.');
            // posix.join('.', 'preview', 'client') normalises to 'preview/client' (no leading './')
            expect(config.ui5.resources['open.ux.preview.client']).toBe('preview/client');
        });

        test('editor at same depth as FLP (test/flp.html → test/editor.html)', () => {
            // FLP at test/flp.html    → basePath ".."
            // Editor at test/editor.html → newBasePath should still be ".."
            const config = buildConfig('/test/flp.html');
            config.ui5.resources[appId] = config.appBasePath;

            remapResourcesForPath(config, '/test/editor.html', appId);

            expect(config.appBasePath).toBe('..');
            expect(config.ui5.resources[appId]).toBe('..');
            expect(config.ui5.resources['open.ux.preview.client']).toBe('../preview/client');
        });

        test('editor two levels deep when FLP is one level deep (test/flp.html → a/b/editor.html)', () => {
            // FLP at test/flp.html  → basePath ".."
            // Editor at a/b/editor.html → newBasePath should be "../.."
            const config = buildConfig('/test/flp.html');
            config.ui5.resources[appId] = config.appBasePath;

            remapResourcesForPath(config, '/a/b/editor.html', appId);

            expect(config.appBasePath).toBe('../..');
            expect(config.ui5.resources[appId]).toBe('../..');
            expect(config.ui5.resources['open.ux.preview.client']).toBe('../../preview/client');
        });

        test('editor at root level when FLP is two levels deep (a/b/flp.html → editor.html)', () => {
            // FLP at a/b/flp.html   → basePath "../.."
            // Editor at editor.html → newBasePath should be "."
            const config = buildConfig('/a/b/flp.html');
            config.ui5.resources[appId] = config.appBasePath;

            remapResourcesForPath(config, '/editor.html', appId);

            expect(config.appBasePath).toBe('.');
            expect(config.ui5.resources[appId]).toBe('.');
            // posix.join('.', 'preview', 'client') normalises to 'preview/client' (no leading './')
            expect(config.ui5.resources['open.ux.preview.client']).toBe('preview/client');
        });

        test('additional app targets with absolute paths are not affected', () => {
            // Additional apps always have absolute target values and must not be remapped
            const config = buildConfig('/test/flp.html');
            config.ui5.resources[appId] = config.appBasePath;
            const absoluteTarget = '/apps/my-other-app';
            config.ui5.resources['other.app'] = absoluteTarget;

            remapResourcesForPath(config, '/editor.html', appId);

            // The additional app's absolute target must remain unchanged
            expect(config.ui5.resources['other.app']).toBe(absoluteTarget);
        });

        test('unknown appId does not throw and leaves other resources intact', () => {
            const config = buildConfig('/test/flp.html');
            config.ui5.resources[appId] = config.appBasePath;

            // Use an appId that is not in resources
            expect(() => remapResourcesForPath(config, '/editor.html', 'unknown.app')).not.toThrow();
            // The known appId entry is untouched because it was not matched
            expect(config.ui5.resources[appId]).toBe('..');
            // basePath and client ns are still updated
            expect(config.appBasePath).toBe('.');
            // posix.join('.', 'preview', 'client') normalises to 'preview/client' (no leading './')
            expect(config.ui5.resources['open.ux.preview.client']).toBe('preview/client');
        });
    });
});
