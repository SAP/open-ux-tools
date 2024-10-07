import { join } from 'path';
import * as utils from '../../../src/variants-config/utils';

describe('utils', () => {
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
            expect(utils.getUI5UrlParameters()).toStrictEqual(
                'fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true'
            );
        });

        test('parameters overwrite with sap-client', () => {
            expect(utils.getUI5UrlParameters({ 'sap-client': '500' })).toStrictEqual(
                'fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true&sap-client=500'
            );
        });
    });

    describe('getRTAUrl', () => {
        const query = 'fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true';
        const basePath = join(__dirname, '../../fixtures/variants-config');

        test('given rta mount point in preview-middleware config', async () => {
            const url = await utils.getRTAUrl(basePath, query);

            //check for rta mount point defined in ui5.yaml
            expect(url).toContain('/my-variants.html');
            //check for flp intent defined in ui5.yaml
            expect(url).toContain('#hello-world');
            expect(url).toContain(query);
        });

        test('fiori-tools-preview defaults', async () => {
            const fioriToolsConfig = join(basePath, 'fiori-tools-config');
            const url = await utils.getRTAUrl(fioriToolsConfig, query);

            expect(url).toStrictEqual(
                '/preview.html?fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true#app-preview'
            );
        });

        test('fiori-tools-preview deprecated config', async () => {
            const deprecatedConfig = join(basePath, 'deprecated-config');
            const url = await utils.getRTAUrl(deprecatedConfig, query);

            //check for fiori-tools default mount point provided over the ux-ui5-tooling
            expect(url).toContain('/preview.html');
            //check for fiori-tools default intent provided over the ux-ui5-tooling
            expect(url).toContain('#preview-app');
            expect(url).toContain(query);
        });

        test('open-source preview-middleware config with no rta mount point', async () => {
            const openSourceConfig = join(basePath, 'open-source-config');
            const url = await utils.getRTAUrl(openSourceConfig, query);

            //check for fiori-tools default mount point provided over the ux-ui5-tooling
            expect(url).toBe(undefined);
        });
    });
});
