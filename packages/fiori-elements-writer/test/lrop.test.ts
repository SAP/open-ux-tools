import type { FioriElementsApp, LROPSettings } from '../src';
import { generate, TableType, TemplateType } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { OdataVersion } from '@sap-ux/odata-service-writer';
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
    v4TemplateSettingsTreeTable,
    getTestData,
    applyBaseConfigToFEApp,
    sampleCapService
} from './common';
import { ServiceType } from '@sap-ux/odata-service-writer';
import { type OdataService } from '@sap-ux/odata-service-writer';
import { applyCAPUpdates, type CapServiceCdsInfo } from '@sap-ux/cap-config-writer';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { generateAnnotations } from '@sap-ux/annotation-generator';
import { initI18n } from '../src/i18n';

const TEST_NAME = 'lropTemplates';
if (debug?.enabled) {
    jest.setTimeout(360000);
}

jest.mock('read-pkg-up', () => ({
    sync: jest.fn().mockReturnValue({
        packageJson: {
            name: 'mocked-package-name',
            version: '9.9.9-mocked'
        }
    })
}));

jest.mock('@sap-ux/cap-config-writer', () => ({
    ...jest.requireActual('@sap-ux/cap-config-writer'),
    applyCAPUpdates: jest.fn()
}));

jest.mock('@sap-ux/annotation-generator', () => ({
    ...jest.requireActual('@sap-ux/annotation-generator'),
    generateAnnotations: jest.fn()
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
                app: {
                    ...feBaseConfig('lrop_v4_addtests_cds').app,
                    projectType: 'CAPNodejs'
                },
                service: {
                    ...v4Service,
                    metadata: undefined,
                    type: ServiceType.CDS
                }
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lrop_v4_addtests_cds_typescript',
            config: {
                ...Object.assign(feBaseConfig('lrop_v4_addtests_cds'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v4TemplateSettings
                    },
                    appOptions: {
                        ...feBaseConfig('lrop_v4_addtests_cds').appOptions,
                        addTests: true,
                        typescript: true
                    }
                }),
                app: {
                    ...feBaseConfig('lrop_v4_addtests_cds').app,
                    projectType: 'CAPNodejs'
                },
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
            name: 'lropV2_omit_reuse_libs_use_virtual_endpoints',
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
                        loadReuseLibs: false,
                        useVirtualPreviewEndpoints: true
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
        },
        {
            name: 'lropV2_with_start-noflp',
            config: {
                ...Object.assign(feBaseConfig('lrop_v2_ts'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v2TemplateSettings
                    },
                    ui5: {
                        version: '1.84.2'
                    },
                    appOptions: { generateIndex: true }
                }),
                service: {
                    path: '/sap/opu/odata4/dmo/sb_travel_mduu_o4/srvd/dmo/sd_travel_mduu/0001/',
                    version: '4'
                } as unknown as OdataService
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lrop_v4_annotation_reuse_lib',
            config: {
                ...Object.assign(feBaseConfig('lrop_v4_annotation_reuse_lib'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v4TemplateSettings
                    },
                    appOptions: {
                        ...feBaseConfig('lrop_v4_annotation_reuse_lib').appOptions,
                        generateIndex: true,
                        addTests: true
                    }
                }),
                service: {
                    ...v4Service,
                    metadata: getTestData('annotation_v4', 'metadata'),
                    type: ServiceType.EDMX
                }
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lrop_v4_add_test_virtual_endpoints',
            config: {
                ...Object.assign(feBaseConfig('lrop_v4_add_test_virtual_endpoints'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v4TemplateSettings
                    },
                    appOptions: {
                        ...feBaseConfig('lrop_v4_add_test_virtual_endpoints').appOptions,
                        generateIndex: false,
                        addTests: true,
                        useVirtualPreviewEndpoints: true
                    }
                }),
                service: {
                    ...v4Service,
                    metadata: getTestData('annotation_v4', 'metadata'),
                    type: ServiceType.EDMX
                }
            } as FioriElementsApp<LROPSettings>
        }
    ];

    beforeAll(async () => {
        await initI18n();
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

    test('should generate manifest with correct routing and context paths when parameterised main entity is selected', async () => {
        const projectName = 'projectWithParametrisedMainEntity';
        const config = {
            ...Object.assign(feBaseConfig(projectName), {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: {
                        entityConfig: {
                            mainEntityName: 'ZC_STOCKAGEING',
                            mainEntityParameterName: 'Set'
                        },
                        tableType: 'ResponsiveTable'
                    }
                },
                appOptions: {
                    ...feBaseConfig(projectName).appOptions,
                    generateIndex: false,
                    addTests: true,
                    useVirtualPreviewEndpoints: true
                }
            }),
            service: {
                ...v4Service,
                type: ServiceType.EDMX
            },
            ui5: {
                ...feBaseConfig(projectName).ui5,
                minUI5Version: '1.94.0'
            }
        } as FioriElementsApp<LROPSettings>;

        const testPath = join(curTestOutPath, projectName);
        const fs = await generate(testPath, config);
        const manifestPath = join(testPath, 'webapp', 'manifest.json');
        const manifest = fs.readJSON(manifestPath);

        const routing = (manifest as any)['sap.ui5'].routing;
        const routingRoutes = routing.routes;

        // check routing routes
        expect(routingRoutes).toEqual([
            {
                pattern: ':?query:',
                name: 'ZC_STOCKAGEINGList',
                target: 'ZC_STOCKAGEINGList'
            },
            {
                pattern: 'ZC_STOCKAGEING({key})/Set({key2}):?query:',
                name: 'ZC_STOCKAGEINGObjectPage',
                target: 'ZC_STOCKAGEINGObjectPage'
            }
        ]);

        // check context paths
        const contextPathForListPage = routing.targets.ZC_STOCKAGEINGList.options.settings.contextPath;
        expect(contextPathForListPage).toBe('/ZC_STOCKAGEING/Set');

        const contextPathForObjectPage = routing.targets.ZC_STOCKAGEINGObjectPage.options.settings.contextPath;
        expect(contextPathForObjectPage).toBe('/ZC_STOCKAGEING/Set');
    });

    test('should omit navigation entity target when both `mainEntityParameterName` and `navigationEntity` are specified', async () => {
        const projectName = 'parameterisedMainEntityWithNavigation';
        const config = {
            ...Object.assign(feBaseConfig(projectName), {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: {
                        entityConfig: {
                            mainEntityName: 'Travel',
                            mainEntityParameterName: 'Set',
                            navigationEntity: {
                                EntitySet: 'Booking',
                                Name: '_Booking'
                            }
                        },
                        tableType: 'ResponsiveTable'
                    }
                },
                appOptions: {
                    ...feBaseConfig(projectName).appOptions,
                    generateIndex: false,
                    addTests: true,
                    useVirtualPreviewEndpoints: true
                }
            }),
            service: {
                ...v4Service,
                type: ServiceType.EDMX
            },
            ui5: {
                ...feBaseConfig(projectName).ui5,
                minUI5Version: '1.94.0'
            }
        } as FioriElementsApp<LROPSettings>;

        const testPath = join(curTestOutPath, projectName);
        const fs = await generate(testPath, config);
        const manifestPath = join(testPath, 'webapp', 'manifest.json');
        const manifest = fs.readJSON(manifestPath);

        const routing = (manifest as any)['sap.ui5'].routing;
        const routingRoutes = routing.routes;

        // Verify routing routes & targets to ensure that navigation entity routing is excluded
        // when the mainEntityParameterName is set, as navigation entities are not supported in this scenario.
        expect(routingRoutes).toEqual([
            {
                pattern: ':?query:',
                name: 'TravelList',
                target: 'TravelList'
            },
            {
                name: 'TravelObjectPage',
                pattern: 'Travel({key})/Set({key2}):?query:',
                target: 'TravelObjectPage'
            }
        ]);

        const targets = routing.targets;
        expect(targets).toEqual({
            TravelList: {
                type: 'Component',
                id: 'TravelList',
                name: 'sap.fe.templates.ListReport',
                options: {
                    settings: {
                        contextPath: '/Travel/Set',
                        variantManagement: 'Page',
                        navigation: {
                            Travel: {
                                detail: {
                                    route: 'TravelObjectPage'
                                }
                            }
                        },
                        controlConfiguration: {
                            '@com.sap.vocabularies.UI.v1.LineItem': {
                                tableSettings: {
                                    type: 'ResponsiveTable'
                                }
                            }
                        }
                    }
                }
            },
            TravelObjectPage: {
                type: 'Component',
                id: 'TravelObjectPage',
                name: 'sap.fe.templates.ObjectPage',
                options: {
                    settings: {
                        editableHeaderContent: false,
                        contextPath: '/Travel/Set'
                    }
                }
            }
        });
    });

    test('sapuxLayer is added to package json for edmx projects when provided', async () => {
        const fioriElementsApp: FioriElementsApp<LROPSettings> = {
            ...Object.assign(feBaseConfig('felrop1'), {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: v4TemplateSettings
                }
            }),
            service: v4Service,
            package: {
                ...feBaseConfig('felrop1').package,
                sapuxLayer: 'CUSTOMER_BASE'
            }
        } as FioriElementsApp<LROPSettings>;

        const fs = await generate(curTestOutPath, fioriElementsApp);
        const packageJsonPath = join(curTestOutPath, 'package.json');
        const packageJson = fs.readJSON(packageJsonPath);
        expect((packageJson as any)?.sapuxLayer).toBe('CUSTOMER_BASE');
    });

    describe('CAP updates', () => {
        const capProjectSettings = {
            appRoot: curTestOutPath,
            packageName: 'felrop1',
            appId: 'felrop1',
            sapux: true,
            enableTypescript: undefined
        };

        afterEach(() => {
            jest.clearAllMocks();
            jest.resetAllMocks();
        });

        test('should perform CAP updates when CAP service is available', async () => {
            const fs = create(createStorage());
            const capServiceWithoutCdsUi5PluginInfo = {
                projectPath: 'test/path',
                serviceName: 'test-service',
                capType: 'Node.js',
                cdsUi5PluginInfo: { hasCdsUi5Plugin: false, isCdsUi5PluginEnabled: true, isWorkspaceEnabled: false }
            };
            const appInfo = applyBaseConfigToFEApp('felrop2', TemplateType.ListReportObjectPage);
            const fioriElementsApp = {
                ...appInfo,
                service: {
                    ...appInfo.service,
                    capService: capServiceWithoutCdsUi5PluginInfo as CapServiceCdsInfo
                }
            };
            await generate(curTestOutPath, fioriElementsApp, fs);

            expect(applyCAPUpdates).toHaveBeenCalledTimes(1);
            expect(applyCAPUpdates).toHaveBeenCalledWith(fs, capServiceWithoutCdsUi5PluginInfo, {
                ...capProjectSettings,
                appId: 'felrop2',
                packageName: 'felrop2'
            });
        });

        test('should not perform CAP updates, when no cap service provided', async () => {
            const fs = create(createStorage());
            const fioriElementsApp = applyBaseConfigToFEApp('felrop1', TemplateType.ListReportObjectPage);
            delete fioriElementsApp.service.capService;
            await generate(curTestOutPath, fioriElementsApp, fs);
            expect(applyCAPUpdates).toHaveBeenCalledTimes(0);
        });
    });

    describe('Should generate annotations correctly for LROP projects', () => {
        const fs = create(createStorage());

        afterEach(() => {
            jest.clearAllMocks();
            jest.resetAllMocks();
        });

        test('Should generate annotations for LROP projects when service is OData V4 and addAnnotations is enabled', async () => {
            const fioriElementsApp = {
                ...applyBaseConfigToFEApp('felrop1', TemplateType.ListReportObjectPage),
                appOptions: {
                    addAnnotations: true
                }
            };
            await generate(curTestOutPath, fioriElementsApp, fs);
            expect(generateAnnotations).toHaveBeenCalledTimes(1);

            expect(generateAnnotations).toHaveBeenCalledWith(
                fs,
                {
                    serviceName: sampleCapService.serviceName,
                    appName: fioriElementsApp.package.name,
                    project: sampleCapService.projectPath
                },
                {
                    entitySetName: v4TemplateSettings?.entityConfig?.mainEntityName,
                    annotationFilePath: join('test', 'path', 'felrop1', 'annotations.cds'),
                    addFacets: true,
                    addLineItems: true,
                    addValueHelps: true
                }
            );
        });

        test('Should not generate annotations for LROP projects when service is OData V4 and addAnnotations is disabled', async () => {
            const fioriElementsApp = {
                ...applyBaseConfigToFEApp('felrop1', TemplateType.ListReportObjectPage),
                appOptions: {
                    addAnnotations: false
                }
            };
            await generate(curTestOutPath, fioriElementsApp, fs);
            expect(generateAnnotations).not.toHaveBeenCalled();
        });

        test('Should not generate annotations for LROP projects when service is OData V2 and addAnnotations is enabled', async () => {
            const appInfo = applyBaseConfigToFEApp('felrop1', TemplateType.ListReportObjectPage);
            const fioriElementsApp = {
                ...appInfo,
                appOptions: {
                    addAnnotations: true
                },
                service: {
                    ...appInfo.service,
                    version: OdataVersion.v2
                }
            };
            await generate(curTestOutPath, fioriElementsApp, fs);
            expect(generateAnnotations).not.toHaveBeenCalled();
        });

        test('Should not generate annotations for projects unless they are LROP or Worklist with OData V4 service, or an FEOP project', async () => {
            const appInfo = applyBaseConfigToFEApp('alpV4', TemplateType.AnalyticalListPage);
            const fioriElementsApp = {
                ...appInfo,
                appOptions: {
                    addAnnotations: true
                }
            };
            await generate(curTestOutPath, fioriElementsApp, fs);
            expect(generateAnnotations).not.toHaveBeenCalled();
        });
    });
});
