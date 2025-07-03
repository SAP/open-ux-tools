import { join } from 'path';
import * as utils from '../../../src/variants-config/utils';

describe('utils', () => {
    const basePath = join(__dirname, '../../fixtures/variants-config');

    describe('getUI5UrlParameters', () => {
        test('parameters for ux-ui5-tooling 1.15.3', () => {
            const packageJson = { devDependencies: { '@sap/ux-ui5-tooling': '1.15.3' } };
            expect(utils.getRTAUrlParameters(packageJson)).toStrictEqual(
                'fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true&sap-ui-xx-viewCache=false'
            );
        });

        test('parameters for ux-ui5-tooling 1.15.3', () => {
            const packageJson = { devDependencies: { '@sap/ux-ui5-tooling': '1.15.4' } };
            expect(utils.getRTAUrlParameters(packageJson)).toStrictEqual('');
        });

        test('parameters for preview-middleware 0.16.88', () => {
            const packageJson = { devDependencies: { '@sap-ux/preview-middleware': '0.16.88' } };
            expect(utils.getRTAUrlParameters(packageJson)).toStrictEqual(
                'fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true&sap-ui-xx-viewCache=false'
            );
        });

        test('parameters for preview-middleware 0.16.90', () => {
            const packageJson = { devDependencies: { '@sap-ux/preview-middleware': '0.16.90' } };
            expect(utils.getRTAUrlParameters(packageJson)).toStrictEqual('');
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
            await expect(utils.getRTAUrl('path/to/chicken', '', 'chicken.yaml')).rejects.toThrow(
                `No chicken.yaml file found. Error: File 'chicken.yaml' not found in project 'path/to/chicken'`
            );
        });
    });
});
