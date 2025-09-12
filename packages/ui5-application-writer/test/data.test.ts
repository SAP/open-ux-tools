import { UI5_DEFAULT } from '@sap-ux/ui5-config';
import { mergeUi5, defaultUI5Libs, mergeApp } from '../src/data/defaults';
import { mergeWithDefaults } from '../src/data/index';
import type { App, UI5, Ui5App } from '../src/types';

const mockSpecVersions = JSON.stringify({ latest: '1.102.3', 'UI5-1.71': '1.71.64', 'UI5-1.92': '1.92.1' });
jest.mock('child_process', () => ({
    spawn: () => ({
        stdout: {
            on: (_event: string, fn: Function) => fn(mockSpecVersions)
        },
        stderr: {
            on: (_event: string, fn: Function) => fn('test')
        },
        on: (_event: string, fn: Function) => fn(0)
    })
}));

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
                minUI5Version: UI5_DEFAULT.MIN_UI5_VERSION,
                descriptorVersion: '1.12.0',
                typesVersion: `~${UI5_DEFAULT.TYPES_VERSION_SINCE}`,
                typesPackage: UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME,
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs
            }
        },
        // 1
        {
            input: { framework: 'OpenUI5' },
            expected: {
                framework: 'OpenUI5',
                frameworkUrl: 'https://sdk.openui5.org',
                version: UI5_DEFAULT.DEFAULT_UI5_VERSION,
                localVersion: UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION,
                minUI5Version: UI5_DEFAULT.MIN_UI5_VERSION,
                descriptorVersion: '1.12.0',
                typesVersion: `~${UI5_DEFAULT.TYPES_VERSION_SINCE}`,
                typesPackage: UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME,
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs
            }
        },
        // 2
        {
            input: { framework: 'OpenUI5', version: '1.72.0' },
            expected: {
                framework: 'OpenUI5',
                frameworkUrl: 'https://sdk.openui5.org',
                version: '1.72.0',
                localVersion: '1.72.0',
                minUI5Version: '1.72.0',
                descriptorVersion: '1.17.0',
                typesVersion: `~${UI5_DEFAULT.TYPES_VERSION_SINCE}`,
                typesPackage: UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME,
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
                minUI5Version: UI5_DEFAULT.MIN_UI5_VERSION,
                descriptorVersion: '1.12.0',
                typesVersion: `~${UI5_DEFAULT.TYPES_VERSION_SINCE}`,
                typesPackage: UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME,
                ui5Theme: 'sap_fiori_3_dark',
                ui5Libs: defaultUI5Libs
            }
        },
        // 4 - types version passed in, this validates the values being passed in rather than being determined programmatically
        {
            input: {
                ui5Libs: ['sap.m', 'sap.fe'],
                frameworkUrl: 'https://ui5.sap.com/',
                descriptorVersion: '1.12.1',
                typesVersion: '1.95.0',
                minUI5Version: '1.80.0',
                localVersion: '1.95.6'
            },
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://ui5.sap.com/',
                version: UI5_DEFAULT.DEFAULT_UI5_VERSION,
                localVersion: '1.95.6',
                minUI5Version: '1.80.0',
                descriptorVersion: '1.12.1',
                typesVersion: '1.95.0',
                typesPackage: UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME,
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
                typesVersion: '~1.80.0',
                typesPackage: UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME,
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
                localVersion: '1.84.54',
                minUI5Version: '1.80.0',
                descriptorVersion: '1.24.0',
                typesVersion: '~1.80.0',
                typesPackage: UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME,
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
                localVersion: '1.84.54',
                minUI5Version: 'snapshot-1.80',
                descriptorVersion: '1.24.0',
                typesVersion: '~1.80.0',
                typesPackage: UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME,
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
                typesVersion: '~1.78.0',
                typesPackage: UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME,
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs
            }
        },
        // 9 - Test that ui5 versions >= 1.100 resolve to the correct manifest version
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
                descriptorVersion: '1.76.0',
                typesVersion: `~1.199.0`,
                typesPackage: UI5_DEFAULT.TYPES_PACKAGE_NAME,
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs
            }
        },
        // 10 - Test that non-matching ui5 versions return the closest manifest version
        {
            input: {
                version: '1.97.2'
            },
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://ui5.sap.com',
                version: '1.97.2',
                localVersion: '1.97.2',
                minUI5Version: '1.97.2',
                descriptorVersion: '1.37.0',
                typesVersion: '~1.97.0',
                typesPackage: UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME,
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs
            }
        },
        // 11 - Test that non-matching ui5 versions return the default manifest version if outside range
        {
            input: {
                version: '1.28.0'
            },
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://ui5.sap.com',
                version: '1.28.0',
                localVersion: '1.84.54',
                minUI5Version: '1.28.0',
                descriptorVersion: '1.12.0',
                typesVersion: `~${UI5_DEFAULT.TYPES_VERSION_SINCE}`,
                typesPackage: UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME,
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs
            }
        },
        // 12 - Testing with manifestLibs type
        {
            input: {
                manifestLibs: ['sap.m', 'sap.fe', 'sap.fe.templates']
            },
            expected: {
                framework: 'SAPUI5',
                frameworkUrl: 'https://ui5.sap.com',
                version: UI5_DEFAULT.DEFAULT_UI5_VERSION,
                localVersion: UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION,
                minUI5Version: UI5_DEFAULT.MIN_UI5_VERSION,
                descriptorVersion: '1.12.0',
                typesVersion: `~${UI5_DEFAULT.TYPES_VERSION_SINCE}`,
                typesPackage: UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME,
                ui5Theme: 'sap_fiori_3',
                ui5Libs: defaultUI5Libs,
                manifestLibs: defaultUI5Libs.concat('sap.fe', 'sap.fe.templates')
            }
        }
    ];

    test.each(testData)('mergeUi5 testData index: $#', async (test) => {
        expect(mergeUi5(test.input)).toEqual(test.expected);
    });

    it('merge Ui5App.package settings with defaults', async () => {
        const input: Ui5App = {
            app: {
                id: 'test_appId',
                description: 'Should be default package description',
                projectType: 'EDMXBackend'
            },
            'package': {
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
                sapuxLayer: 'CUSTOMER_BASE',
                scripts: {
                    doTaskA: 'echo "Doing task A"',
                    doTaskB: 'echo "Doing task B"'
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
            sapuxLayer: 'CUSTOMER_BASE',
            scripts: {
                start: 'ui5 serve --config=ui5.yaml --open index.html',
                'start-local': 'ui5 serve --config=ui5-local.yaml --open index.html',
                build: 'ui5 build --config=ui5.yaml --clean-dest --dest dist',
                doTaskA: 'echo "Doing task A"',
                doTaskB: 'echo "Doing task B"'
            },
            version: '0.0.1'
        };

        expect(mergeWithDefaults(input).package).toEqual(expectedPackage);
    });

    it('merge Ui5App.package settings with defaults for cap projects', async () => {
        const input: Ui5App = {
            app: {
                id: 'test_appId_cap',
                description: 'Should be default package description',
                projectType: 'CAPJava'
            },
            'package': {
                name: 'test-package-name',
                dependencies: {
                    depA: '1.2.3',
                    depB: '3.4.5'
                },
                devDependencies: {
                    '@ui5/cli': '3.0.0'
                },
                scripts: {
                    doTaskA: 'echo "Doing task A"',
                    doTaskB: 'echo "Doing task B"'
                },
                sapuxLayer: 'CUSTOMER_BASE' // expect sapuxLayer to be undefined for cap projects
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
                '@sap/ux-ui5-tooling': '1'
            },
            name: 'test-package-name',
            scripts: {
                doTaskA: 'echo "Doing task A"',
                doTaskB: 'echo "Doing task B"'
            },
            version: '0.0.1'
        };
        expect(mergeWithDefaults(input).package).toEqual(expectedPackage);
    });

    // Test function `mergeApp` sets the correct defaults
    describe('mergeApp', () => {
        const baseInput: App = {
            id: 'test_appId',
            description: 'Should be default package description',
            projectType: 'EDMXBackend'
        };

        const expectedApp = {
            baseComponent: 'sap/ui/core/UIComponent',
            description: 'Should be default package description',
            id: 'test_appId',
            sourceTemplate: {
                id: '',
                version: ''
            },
            title: 'Title of test_appId',
            version: '0.0.1',
            projectType: 'EDMXBackend'
        } as App;

        test('minimal input', async () => {
            expect(mergeApp(baseInput)).toEqual(expectedApp);
        });

        test('toolsId provided but not id/version of source template', async () => {
            const toolsId = 'guid:abcd1234';
            const merged = mergeApp({
                ...baseInput,
                sourceTemplate: {
                    toolsId
                }
            });
            expect(merged.sourceTemplate).toEqual({ ...expectedApp.sourceTemplate, toolsId });
        });

        test('source template provided', async () => {
            const sourceTemplate = {
                id: 'test-source-template-id',
                version: '9.9.9',
                toolsId: 'guid:abcd1234'
            };
            const merged = mergeApp({
                ...baseInput,
                sourceTemplate
            });
            expect(merged.sourceTemplate).toEqual(sourceTemplate);
        });
    });
});
