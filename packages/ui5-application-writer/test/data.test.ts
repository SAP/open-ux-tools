import { UI5_DEFAULT, mergeUi5, defaultUI5Libs } from '../src/data/defaults';
import { mergeWithDefaults } from '../src/data/index';
import type { UI5, Ui5App } from '../src/types';

describe('Setting defaults', () => {
    const testData: { input: Partial<UI5>; expected: UI5 }[] = [
        // 0
       {
            input: {},
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://ui5.sap.com',
                version: UI5_DEFAULT.DEFAULT_UI5_VERSION,
                localVersion: UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION,
                minUI5Version: '1.60.0',
                descriptorVersion: '1.12.0',
                typesVersion: UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION,
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs
            }
        },
        // 1
        {
            input: { framework: 'OpenUI5' },
            expected: {
                framework: 'OpenUI5',
                frameworkUrl: 'https://openui5.hana.ondemand.com',
                version: UI5_DEFAULT.DEFAULT_UI5_VERSION,
                localVersion: UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION,
                minUI5Version: '1.60.0',
                descriptorVersion: '1.12.0',
                typesVersion: UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION,
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs
            }
        },
        // 2
        {
            input: { framework: 'OpenUI5', version: '1.72.0' },
            expected: {
                framework: 'OpenUI5',
                frameworkUrl: 'https://openui5.hana.ondemand.com',
                version: '1.72.0',
                localVersion: '1.72.0',
                minUI5Version: '1.72.0',
                descriptorVersion: '1.17.0',
                typesVersion: '1.71.18',
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs
            }
        },
        // 3
        {
            input: {
                ui5Theme: 'sap_fiori_3_dark'
            },
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://ui5.sap.com',
                version: UI5_DEFAULT.DEFAULT_UI5_VERSION,
                localVersion: UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION,
                minUI5Version: '1.60.0',
                descriptorVersion: '1.12.0',
                typesVersion: UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION,
                ui5Theme: 'sap_fiori_3_dark',
                ui5Libs: defaultUI5Libs
            }
        },
        // 4
        {
            input: {
                ui5Libs: ['sap.m', 'sap.fe'],
                frameworkUrl: 'https://sapui5.hana.ondemand.com/',
                descriptorVersion: '1.12.1',
                typesVersion: '1.95.5',
                minUI5Version: '1.80.0',
                localVersion: '1.95.6'
            },
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://sapui5.hana.ondemand.com/',
                version: UI5_DEFAULT.DEFAULT_UI5_VERSION,
                localVersion: '1.95.6',
                minUI5Version: '1.80.0',
                descriptorVersion: '1.12.1',
                typesVersion: '1.95.5',
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs.concat('sap.fe')
            }
        },
        // 5
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
                descriptorVersion: '1.24.0',
                typesVersion: '1.95.0',
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs
            }
        },
        // 6
        {
            input: {
                version: '1.80.0'
            },
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://ui5.sap.com',
                version: '1.80.0',
                localVersion: '1.80.0',
                minUI5Version: '1.80.0',
                descriptorVersion: '1.24.0',
                typesVersion: '1.80.0',
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs
            }
        },
        // 7 - Test defaults are set from specified `version` and correctly coerced for local version
        {
            input: {
                version: 'snapshot-1.80',
                frameworkUrl: 'https://ui5.unreleased.sap.com'
            },
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://ui5.unreleased.sap.com',
                version: 'snapshot-1.80',
                localVersion: '1.80.0',
                minUI5Version: 'snapshot-1.80',
                descriptorVersion: '1.24.0',
                typesVersion: '1.80.0',
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs
            }
        },
        // 8 - Test that inputs are taken as is and not coerced to valid semvers
        {
            input: {
                version: 'snapshot-1.80',
                localVersion: 'snapshot-1.98',
                minUI5Version: 'snapshot-1.78.6',
                frameworkUrl: 'https://ui5.unreleased.sap.com'
            },
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://ui5.unreleased.sap.com',
                version: 'snapshot-1.80',
                localVersion: 'snapshot-1.98',
                minUI5Version: 'snapshot-1.78.6',
                descriptorVersion: '1.22.0',
                typesVersion: '1.98.0',
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs
            }
        },
        // 9 - Test that ui5 versions > 1.98 are handled correctly
        {
            input: {
                version: '1.199.0'
            },
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://ui5.sap.com',
                version: '1.199.0',
                localVersion: '1.199.0',
                minUI5Version: '1.199.0',
                descriptorVersion: '1.40.0',
                typesVersion: '1.199.0',
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs
            }
        }
    ];

    test.each(testData)(`mergeUi5 testData index: $#`, (test) => {
        expect(mergeUi5(test.input)).toEqual(test.expected);
    });

    it('merge Ui5App.package settings with defaults', async () => {
        const input: Ui5App = {
            app: {
                id: 'test_appId',
                description: 'Should be default package description'
            },
            package: {
                name: 'test-package-name',
                dependencies: {
                    depA: '1.2.3',
                    depB: '3.4.5'
                },
                devDependencies: {
                    devDepA: '6.7.8',
                    devDepB: '9.10.11',
                    '@ui5/cli': '3.0.0'
                },
                scripts: {
                    doTaskA: 'echo "Doing task A"',
                    doTaskB: 'echo "Doing task B"'
                },
                ui5: {
                    dependencies: ['@some/other-dep', '@sap/ux-ui5-tooling']
                }
            }
        };

        const expectedPackage = {
            dependencies: {
                depA: '1.2.3',
                depB: '3.4.5'
            },
            description: 'Should be default package description',
            devDependencies: {
                '@ui5/cli': '3.0.0',
                '@sap/ux-ui5-tooling': '1',
                devDepA: '6.7.8',
                devDepB: '9.10.11'
            },
            name: 'test-package-name',
            scripts: {
                start: 'ui5 serve --config=ui5.yaml --open index.html',
                'start-local': 'ui5 serve --config=ui5-local.yaml --open index.html',
                build: 'ui5 build --config=ui5.yaml --clean-dest --dest dist',
                doTaskA: 'echo "Doing task A"',
                doTaskB: 'echo "Doing task B"'
            },
            ui5: {
                dependencies: ['@sap/ux-ui5-tooling', '@some/other-dep']
            },
            version: '0.0.1'
        };

        expect(mergeWithDefaults(input).package).toEqual(expectedPackage);
    });
});
