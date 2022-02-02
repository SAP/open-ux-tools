import { UI5_DEFAULT, mergeUi5 } from '../src/data/defaults';
import type { UI5 } from '../src/types';

describe('Setting defaults', () => {
    const testData: { input: Partial<UI5>; expected: UI5 }[] = [
        {
            input: {},
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://ui5.sap.com',
                version: UI5_DEFAULT.DEFAULT_UI5_VERSION,
                localVersion: UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION,
                minUI5Version: '1.60',
                descriptorVersion: '1.12.0',
                typesVersion: UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION,
                ui5Theme: 'sap_fiori_3',
                ui5Libs: []
            }
        },
        {
            input: { framework: 'OpenUI5' },
            expected: {
                framework: 'OpenUI5',
                frameworkUrl: 'https://openui5.hana.ondemand.com',
                version: UI5_DEFAULT.DEFAULT_UI5_VERSION,
                localVersion: UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION,
                minUI5Version: '1.60',
                descriptorVersion: '1.12.0',
                typesVersion: UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION,
                ui5Theme: 'sap_fiori_3',
                ui5Libs: []
            }
        },
        {
            input: { framework: 'OpenUI5', version: '1.72.0' },
            expected: {
                framework: 'OpenUI5',
                frameworkUrl: 'https://openui5.hana.ondemand.com',
                version: '1.72.0',
                localVersion: '1.72.0',
                minUI5Version: '1.60',
                descriptorVersion: '1.12.0',
                typesVersion: '1.71.18',
                ui5Theme: 'sap_fiori_3',
                ui5Libs: []
            }
        },
        {
            input: {
                ui5Theme: 'sap_fiori_3_dark'
            },
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://ui5.sap.com',
                version: UI5_DEFAULT.DEFAULT_UI5_VERSION,
                localVersion: UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION,
                minUI5Version: '1.60',
                descriptorVersion: '1.12.0',
                typesVersion: UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION,
                ui5Theme: 'sap_fiori_3_dark',
                ui5Libs: []
            }
        },
        {
            input: {
                ui5Libs: ['sap.m', 'sap.fe'],
                frameworkUrl: 'https://sapui5.hana.ondemand.com/',
                descriptorVersion: '1.12.1',
                typesVersion: '1.95.5',
                minUI5Version: '1.80',
                localVersion: '1.95.6'
            },
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://sapui5.hana.ondemand.com/',
                version: UI5_DEFAULT.DEFAULT_UI5_VERSION,
                localVersion: '1.95.6',
                minUI5Version: '1.80',
                descriptorVersion: '1.12.1',
                typesVersion: '1.95.5',
                ui5Theme: 'sap_fiori_3',
                ui5Libs: ['sap.m', 'sap.fe']
            }
        },
        {
            input: {
                minUI5Version: '1.80.1'
            },
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://ui5.sap.com',
                version: UI5_DEFAULT.DEFAULT_UI5_VERSION,
                localVersion: '1.95.0',
                minUI5Version: '1.80.1',
                descriptorVersion: '1.12.0',
                typesVersion: '1.95.0',
                ui5Theme: 'sap_fiori_3',
                ui5Libs: []
            }
        },
        {
            input: {
                version: '1.80'
            },
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://ui5.sap.com',
                version: '1.80',
                localVersion: '1.80',
                minUI5Version: '1.60',
                descriptorVersion: '1.12.0',
                typesVersion: '1.80',
                ui5Theme: 'sap_fiori_3',
                ui5Libs: []
            }
        }
    ];

    test.each(testData)(`mergeUi5 testData index %#`, (test) => {
        expect(mergeUi5(test.input)).toEqual(test.expected);
    });
});
