import { CONST, mergeUi5 } from '../src/data/defaults';
import type { UI5 } from '../src/types';

describe('Setting defaults', () => {
    it('mergeUi5', async () => {
        const testData: { input: UI5; expected: UI5 }[] = [
            {
                input: {},
                expected: {
                    framework: 'SAPUI5',
                    version: CONST.DEFAULT_UI5_VERSION,
                    localVersion: CONST.DEFAULT_LOCAL_UI5_VERSION,
                    minUI5Version: '1.60',
                    descriptorVersion: '1.12.0',
                    typesVersion: CONST.DEFAULT_LOCAL_UI5_VERSION,
                    ui5Theme: 'sap_fiori_3'
                }
            },
            {
                input: { framework: 'OpenUI5' },
                expected: {
                    framework: 'OpenUI5',
                    version: CONST.DEFAULT_UI5_VERSION,
                    localVersion: CONST.DEFAULT_LOCAL_UI5_VERSION,
                    minUI5Version: '1.60',
                    descriptorVersion: '1.12.0',
                    typesVersion: CONST.DEFAULT_LOCAL_UI5_VERSION,
                    ui5Theme: 'sap_fiori_3'
                }
            },
            {
                input: { framework: 'OpenUI5', version: '1.72.0' },
                expected: {
                    framework: 'OpenUI5',
                    version: '1.72.0',
                    localVersion: '1.72.0',
                    minUI5Version: '1.60',
                    descriptorVersion: '1.12.0',
                    typesVersion: '1.71.18',
                    ui5Theme: 'sap_fiori_3'
                }
            },
            {
                input: {
                    ui5Theme: 'sap_fiori_3_dark'
                },
                expected: {
                    framework: 'SAPUI5',
                    version: CONST.DEFAULT_UI5_VERSION,
                    localVersion: CONST.DEFAULT_LOCAL_UI5_VERSION,
                    minUI5Version: '1.60',
                    descriptorVersion: '1.12.0',
                    typesVersion: CONST.DEFAULT_LOCAL_UI5_VERSION,
                    ui5Theme: 'sap_fiori_3_dark'
                }
            }
        ];

        testData.forEach((test) => {
            expect(mergeUi5(test.input)).toEqual(test.expected);
        });
    });
});
