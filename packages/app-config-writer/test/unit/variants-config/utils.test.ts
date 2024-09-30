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
    describe('getUi5UrlParameters', () => {
        test('defaults', () => {
            expect(utils.getUi5UrlParameters()).toStrictEqual(
                'fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true'
            );
        });

        test('parameters overwrite with sap-client', () => {
            expect(utils.getUi5UrlParameters({ 'sap-client': '500' })).toStrictEqual(
                'fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true&sap-client=500'
            );
        });
    });
    describe('getPreviewUrl', () => {
        const query = 'fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true';
        const path = join(__dirname, '../../fixtures/variants-config');

        test('defaults', async () => {
            expect(await utils.getPreviewUrl(path, query)).toStrictEqual(
                'preview.html?fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true#app-preview'
            );
        });

        test('deprecated config', async () => {
            expect(await utils.getPreviewUrl(join(path, 'deprecated-config'), query)).toStrictEqual(
                'preview.html?fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true#preview-app'
            );
        });
    });
});
