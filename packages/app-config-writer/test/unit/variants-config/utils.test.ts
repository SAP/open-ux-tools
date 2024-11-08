import { join } from 'path';
import * as utils from '../../../src/variants-config/utils';
import { create as createFS } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';

describe('utils', () => {
    const basePath = join(__dirname, '../../fixtures/variants-config');

    describe('getSapClientFromPackageJson', () => {
        test('scripts with no sap client', () => {
            expect(utils.getSapClientFromPackageJson({ start: 'fiori run --open preview.html' })).toStrictEqual(
                undefined
            );
        });

        test('scripts with sap client', () => {
            expect(
                utils.getSapClientFromPackageJson({ start: 'fiori run --open preview.html?sap-client=000' })
            ).toStrictEqual('000');
        });
    });

    describe('getUI5UrlParameters', () => {
        test('defaults', () => {
            const packageJson = { devDependencies: { '@sap/ux-ui5-tooling': '1.15.3' } };
            expect(utils.enhanceUrlParametersWithRta(packageJson)).toStrictEqual(
                'fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true'
            );
        });

        test('parameters overwrite with sap-client', () => {
            const packageJson = { devDependencies: { '@sap-ux/preview-middleware': '0.16.88' } };
            expect(utils.enhanceUrlParametersWithRta(packageJson, { 'sap-client': '500' })).toStrictEqual(
                'fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true&sap-client=500'
            );
        });
    });

    describe('getRTAUrl', () => {
        const query = 'fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true';

        test('given rta mount point in preview-middleware config', async () => {
            const url = await utils.getRTAUrl(basePath, query, 'ui5.yaml');

            //check for rta mount point defined in ui5.yaml
            expect(url).toContain('/my-variants.html');
            //check for flp intent defined in ui5.yaml
            expect(url).toContain('#hello-world');
            expect(url).toContain(query);
        });

        test('fiori-tools-preview defaults', async () => {
            const fioriToolsConfig = join(basePath, 'fiori-tools-config');
            const url = await utils.getRTAUrl(fioriToolsConfig, query, 'ui5.yaml');

            expect(url).toStrictEqual(
                '/preview.html?fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true#app-preview'
            );
        });

        test('fiori-tools-preview deprecated config', async () => {
            const deprecatedConfig = join(basePath, 'deprecated-config');
            const url = await utils.getRTAUrl(deprecatedConfig, query, 'ui5.yaml');

            //check for fiori-tools default mount point provided over the ux-ui5-tooling
            expect(url).toContain('/preview.html');
            //check for fiori-tools default intent provided over the ux-ui5-tooling
            expect(url).toContain('#preview-app');
            expect(url).toContain(query);
        });

        test('open-source preview-middleware config with no rta mount point', async () => {
            const openSourceConfig = join(basePath, 'open-source-config');
            //check for fiori-tools default mount point provided over the ux-ui5-tooling
            expect(await utils.getRTAUrl(openSourceConfig, query, 'ui5.yaml')).toBe(undefined);
        });

        test('exception handling - file not found', async () => {
            await expect(utils.getRTAUrl('path/to/chicken', '', 'chicken.yaml')).rejects.toThrowError(
                `No chicken.yaml file found. Error: File 'chicken.yaml' not found in project 'path/to/chicken'`
            );
        });
    });

    describe('getPreviewMiddleware', () => {
        test('exception handling - parameters not provided', async () => {
            await expect(utils.getPreviewMiddleware()).rejects.toThrowError(
                'Either base path or yaml config must be provided'
            );
        });

        test('exception handling - file not found', async () => {
            const basePath = join(__dirname, '../../fixtures/a-folder-that-does-not-exist');
            await expect(utils.getPreviewMiddleware(undefined, basePath, 'chicken.html')).rejects.toThrowError(
                `File 'chicken.html' not found in project '${basePath}'`
            );
        });
    });

    describe('getRTAServe', () => {
        let fs: Editor;

        beforeEach(() => {
            jest.clearAllMocks();
            fs = createFS(createStorage());
        });
        test('RTA serve for preview middleware', async () => {
            const openSourceConfig = join(basePath, 'open-source-config');
            expect(await utils.getRTAServe(openSourceConfig, 'ui5.yaml', fs)).toStrictEqual('ui5 serve');
        });

        test('RTA serve for fiori-tools-preview middleware', async () => {
            const fioriToolsConfig = join(basePath, 'fiori-tools-config');
            expect(await utils.getRTAServe(fioriToolsConfig, 'ui5.yaml', fs)).toStrictEqual('fiori run');
        });
    });
});
