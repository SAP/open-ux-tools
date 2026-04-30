import { join } from 'node:path';
import * as utils from '../../../src/common/utils';
import { create as createFS } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';

describe('utils', () => {
    const basePath = join(__dirname, '../../fixtures/variants-config');

    describe('getPreviewMiddleware', () => {
        test('exception handling - parameters not provided', async () => {
            await expect(utils.getPreviewMiddleware()).rejects.toThrow(
                'Either base path or yaml config must be provided'
            );
        });

        test('exception handling - file not found', async () => {
            const basePath = join(__dirname, '../../fixtures/a-folder-that-does-not-exist');
            await expect(utils.getPreviewMiddleware(undefined, basePath, 'chicken.html')).rejects.toThrow(
                `File 'chicken.html' not found in project '${basePath}'`
            );
        });
    });

    describe('getCLIForPreview', () => {
        let fs: Editor;

        beforeEach(() => {
            jest.clearAllMocks();
            fs = createFS(createStorage());
        });
        test('RTA serve for preview middleware', async () => {
            const openSourceConfig = join(basePath, 'open-source-config');
            expect(await utils.getCLIForPreview(openSourceConfig, 'ui5.yaml', fs)).toStrictEqual('ui5 serve');
        });

        test('RTA serve for fiori-tools-preview middleware', async () => {
            const fioriToolsConfig = join(basePath, 'fiori-tools-config');
            expect(await utils.getCLIForPreview(fioriToolsConfig, 'ui5.yaml', fs)).toStrictEqual('fiori run');
        });
    });

    describe('getIntentFromPreviewConfig', () => {
        test('returns undefined for deprecated fiori-tools config', () => {
            const config = { component: 'my.component', libs: true };
            expect(utils.getIntentFromPreviewConfig(config)).toBeUndefined();
        });

        test('returns undefined when no flp config', () => {
            expect(utils.getIntentFromPreviewConfig({})).toBeUndefined();
        });

        test('returns undefined when no intent', () => {
            expect(utils.getIntentFromPreviewConfig({ flp: {} })).toBeUndefined();
        });

        test('returns hash from structured intent object', () => {
            const config = { flp: { intent: { object: 'Order', action: 'manage' } } };
            expect(utils.getIntentFromPreviewConfig(config)).toBe('#Order-manage');
        });

        test('returns hash from string intent without leading hash', () => {
            const config = { flp: { intent: 'Order-manage?year=2024&/display' } };
            expect(utils.getIntentFromPreviewConfig(config as any)).toBe('#Order-manage?year=2024&/display');
        });

        test('returns string intent as-is when it already has leading hash', () => {
            const config = { flp: { intent: '#Order-manage' } };
            expect(utils.getIntentFromPreviewConfig(config as any)).toBe('#Order-manage');
        });
    });
});
