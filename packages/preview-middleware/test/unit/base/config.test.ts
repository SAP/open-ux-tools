import type { Manifest } from '@sap-ux/project-access';
import {
    DEFAULT_INTENT,
    DEFAULT_PATH,
    createFlpTemplateConfig,
    createTestTemplateConfig,
    getPreviewFiles,
    getFlpConfigWithDefaults
} from '../../../src/base/config';
import { mergeTestConfigDefaults } from '../../../src/base/test';
import type { MiddlewareConfig } from '../../../src/types';

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
    });

    describe('createTestTemplateConfig', () => {
        test('minimum settings', () => {
            const config = mergeTestConfigDefaults({ framework: 'OPA5' });
            const templateConfig = createTestTemplateConfig(config, manifest['sap.app'].id);
            expect(templateConfig).toMatchObject({
                basePath: '..',
                framework: 'OPA5',
                id: manifest['sap.app'].id,
                initPath: 'my/app/test/opaTests.qunit'
            });
        });
    });

    describe('getPreviewFiles', () => {
        test('minimum settings', async () => {
            const previewFiles = await getPreviewFiles({}, manifest);
            const paths = Object.keys(previewFiles);
            expect(paths).toHaveLength(1);
            expect(paths[0]).toBe(DEFAULT_PATH);
            expect(await previewFiles[paths[0]]()).toMatchSnapshot();
        });

        test('tests included and a custom path', async () => {
            const config = {
                flp: {
                    path: '/test/flpSandbox.html'
                },
                test: [{ framework: 'OPA5' }]
            } satisfies MiddlewareConfig;
            const previewFiles = await getPreviewFiles(config, manifest);
            const files = Object.values(previewFiles);
            expect(files).toHaveLength(2);
            expect(previewFiles[config.flp.path]).toBeDefined();
            expect(await files[1]()).toMatchSnapshot();
        });
    });
});
