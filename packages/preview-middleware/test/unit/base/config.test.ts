import type { Manifest } from '@sap-ux/project-access';
import {
    DEFAULT_INTENT,
    DEFAULT_PATH,
    createFlpTemplateConfig,
    createTestTemplateConfig,
    generatePreviewFiles,
    getFlpConfigWithDefaults,
    getPreviewPaths
} from '../../../src/base/config';
import { mergeTestConfigDefaults } from '../../../src/base/test';
import type { MiddlewareConfig } from '../../../src/types';
import { join } from 'path';

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
            const config = {
                flp: {
                    path: '/test/flpSandbox.html',
                    intent: { object: 'myapp', action: 'myaction' }
                },
                rta: {
                    layer: 'CUSTOMER_BASE',
                    editors: [{ path: '/local/editor.html', developerMode: false }]
                },
                test: [{ framework: 'OPA5' }]
            } satisfies MiddlewareConfig;
            const previews = getPreviewPaths(config);
            expect(previews).toHaveLength(3);
            expect(
                previews.find(
                    ({ path }) => path === `${config.flp.path}#${config.flp.intent.object}-${config.flp.intent.action}`
                )
            ).toBeDefined();
            expect(previews.find(({ path }) => path === config.rta.editors[0].path)).toBeDefined();
            expect(previews.find(({ path }) => path === '/test/opaTests.qunit.html')).toBeDefined();
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
});
