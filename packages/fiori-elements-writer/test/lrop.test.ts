import type { FioriElementsApp, LROPSettings } from '../src';
import { generate, TableType, TemplateType } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import {
    testOutputDir,
    debug,
    feBaseConfig,
    v4TemplateSettings,
    v4Service,
    v2TemplateSettings,
    v2Service,
    projectChecks,
    updatePackageJSONDependencyToUseLocalPath,
    v4TemplateSettingsTreeTable
} from './common';
import { ServiceType } from '@sap-ux/odata-service-writer';
import { t, initI18n } from '../src/i18n';
import { getPackageJsonTasks } from '../src/packageConfig';

const TEST_NAME = 'lropTemplates';
if (debug?.enabled) {
    jest.setTimeout(360000);
}

// Mocking the i18n dependency
jest.mock('../src/i18n', () => ({
    initI18n: jest.fn().mockResolvedValue(undefined),
    t: jest.fn()
}));

// Mock getPackageJsonTasks
jest.mock('../src/packageConfig', () => {
    const originalModule = jest.requireActual('../src/packageConfig');
    return {
        ...jest.requireActual('../src/packageConfig'),
        // Mock getPackageJsonTasks to return original implementation
        getPackageJsonTasks: jest.fn((options) => originalModule.getPackageJsonTasks(options))
    };
});

jest.mock('read-pkg-up', () => ({
    sync: jest.fn().mockReturnValue({
        packageJson: {
            name: 'mocked-package-name',
            version: '9.9.9-mocked'
        }
    })
}));

describe(`Fiori Elements template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    const lropConfigs: Array<{ name: string; config: FioriElementsApp<LROPSettings> }> = [
        {
            name: 'lrop_v4',
            config: {
                ...Object.assign(feBaseConfig('felrop1'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v4TemplateSettings
                    }
                }),
                service: v4Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lrop_v4_1.94',
            config: {
                ...Object.assign(feBaseConfig('felrop194'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v4TemplateSettings
                    },
                    ui5: {
                        ...feBaseConfig('felrop194'),
                        version: '1.94.0' // Testing 1.94 specific changes
                    }
                }),
                service: v4Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lrop_v4_no_ui5_version',
            config: {
                ...Object.assign(feBaseConfig('felropui5', false), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v4TemplateSettings
                    }
                }),
                service: v4Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lrop_v4_no_ui5_version_tree_table',
            config: {
                ...Object.assign(feBaseConfig('felropui5', false), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v4TemplateSettingsTreeTable
                    }
                }),
                service: v4Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lrop_v4_addtests',
            config: {
                ...Object.assign(feBaseConfig('lrop_v4_addtests'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v4TemplateSettings
                    },
                    appOptions: {
                        ...feBaseConfig('lrop_v4_addtests').appOptions,
                        generateIndex: true,
                        addTests: true
                    }
                }),
                service: v4Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lrop_v4_addtests_cds',
            config: {
                ...Object.assign(feBaseConfig('lrop_v4_addtests_cds'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v4TemplateSettings
                    },
                    appOptions: {
                        ...feBaseConfig('lrop_v4_addtests_cds').appOptions,
                        generateIndex: true,
                        addTests: true
                    }
                }),
                service: {
                    ...v4Service,
                    metadata: undefined,
                    type: ServiceType.CDS
                }
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lrop_v2',
            config: {
                ...Object.assign(feBaseConfig('felrop2'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v2TemplateSettings
                    }
                }),
                service: v2Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lrop_v2_table_type',
            config: {
                ...Object.assign(feBaseConfig('felrop2'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: Object.assign(v2TemplateSettings, { tableType: TableType.TREE })
                    }
                }),
                service: v2Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lropV2_flex_changes',
            config: {
                ...Object.assign(feBaseConfig('felrop3'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v2TemplateSettings
                    },
                    ui5: {
                        ...feBaseConfig('felrop3'),
                        version: '1.77.2' // flex changes preview should be included with this version
                    }
                }),
                service: v2Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lropV2_omit_reuse_libs',
            config: {
                ...Object.assign(feBaseConfig('felrop4'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v2TemplateSettings
                    },
                    ui5: {
                        ...feBaseConfig('felrop4'),
                        version: '1.77.2' // flex changes preview should be included with this version
                    },
                    appOptions: {
                        loadReuseLibs: false
                    }
                }),
                service: v2Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lropV2_set_toolsId',
            config: {
                ...Object.assign(feBaseConfig('lropV2_set_toolsId'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v2TemplateSettings
                    },
                    app: {
                        ...feBaseConfig('lropV2_set_toolsId').app,
                        sourceTemplate: {
                            version: '1.2.3-test',
                            id: 'test-fe-template',
                            toolsId: 'toolsId:1234abcd'
                        }
                    }
                }),
                service: v2Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lropV2_set_toolsId_only',
            config: {
                ...Object.assign(feBaseConfig('lropV2_set_toolsId_only'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v2TemplateSettings
                    },
                    app: {
                        ...feBaseConfig('lropV2_set_toolsId_only').app,
                        sourceTemplate: {
                            toolsId: 'toolsId:1234abcd'
                        }
                    }
                }),
                service: v2Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lrop_v2_ts',
            config: {
                ...Object.assign(feBaseConfig('lrop_v2_ts'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v2TemplateSettings
                    },
                    ui5: {
                        version: '1.77.2'
                    },
                    appOptions: {
                        typescript: true
                    }
                }),
                service: v2Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lropV2_ts_ui5_1_108',
            config: {
                ...Object.assign(feBaseConfig('lropV2_ts_ui5_1_108'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v2TemplateSettings
                    },
                    ui5: {
                        version: '1.108.0'
                    },
                    appOptions: {
                        typescript: true
                    }
                }),
                service: v2Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lropV2_ts_ui5_1_111',
            config: {
                ...Object.assign(feBaseConfig('lropV2_ts_ui5_1_111'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v2TemplateSettings
                    },
                    ui5: {
                        version: '1.111.0'
                    },
                    appOptions: {
                        typescript: true
                    }
                }),
                service: v2Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lropV2_ts_ui5_1_113',
            config: {
                ...Object.assign(feBaseConfig('lropV2_ts_ui5_1_113'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v2TemplateSettings
                    },
                    ui5: {
                        version: '1.113.0'
                    },
                    appOptions: {
                        typescript: true
                    }
                }),
                service: v2Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lropV2_without_start-noflp',
            config: {
                ...Object.assign(feBaseConfig('lrop_v2_ts'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v2TemplateSettings
                    },
                    ui5: {
                        version: '1.77.2'
                    },
                    appOptions: { generateIndex: false }
                }),
                service: v2Service
            } as FioriElementsApp<LROPSettings>
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks(); // Clear all mocks before each test
    });

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(lropConfigs)('Generate files for template: $name', async ({ name, config }) => {
        const testPath = join(curTestOutPath, name);
        const fs = await generate(testPath, config);
        expect(fs.dump(testPath)).toMatchSnapshot();

        return new Promise(async (resolve) => {
            // write out the files for debugging
            if (debug?.enabled) {
                await updatePackageJSONDependencyToUseLocalPath(testPath, fs);
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        }).then(async () => {
            await projectChecks(testPath, config, debug?.debugFull);
        });
    });

    test('Generate files for template with corrent i18n translations when localOnly is set to true', async () => {
        // Select the last configuration from lropConfigs array with name 'lrop_v4' to test i18n translations
        // Testing with a single configuration to verify consistent translations across all configurations
        const lropv4Config = lropConfigs.filter((config) => config.name === 'lrop_v4')[0];
        const testPath = join(curTestOutPath, lropv4Config.name);
        await generate(testPath, lropv4Config.config);
        // Ensure initI18n function is called during generation
        expect(initI18n).toHaveBeenCalledTimes(1);
        // Get the scripts generated by getPackageJsonTasks function
        const scripts = getPackageJsonTasks({
            // set localOnly and generateIndex to true to test the i18n translations
            localOnly: true,
            addMock: true,
            addTest: false,
            sapClient: '',
            flpAppId: '',
            startFile: '',
            localStartFile: '',
            generateIndex: true
        });
        // Get start and start-noflp scripts from generated scripts
        const startScript = scripts['start'];
        const noflpScript = scripts['start-noflp'];
        // Assert that startScript and noflpScript contain the expected echo commands with mockOnlyWarning translation
        expect(startScript).toBe(`echo \\\"${t('info.mockOnlyWarning')}\\\"`);
        expect(noflpScript).toBe(`echo \\\"${t('info.mockOnlyWarning')}\\\"`);
    });
});
