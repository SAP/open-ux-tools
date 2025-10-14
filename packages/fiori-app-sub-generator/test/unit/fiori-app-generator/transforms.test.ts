import type { ServiceProvider } from '@sap-ux/axios-extension';
import { DatasourceType, type EntityRelatedAnswers } from '@sap-ux/odata-service-inquirer';
import type { BackendSystem } from '@sap-ux/store';
import { AuthenticationType } from '@sap-ux/store';
import { transformState } from '../../../src/fiori-app-generator/transforms';
import type { Project, Service, State } from '../../../src/types';
import { ApiHubType, FloorplanFE, FloorplanFF, PLATFORMS } from '../../../src/types';
import type { FioriElementsApp } from '@sap-ux/fiori-elements-writer';
import type { FreestyleApp } from '@sap-ux/fiori-freestyle-writer';
import type { BasicAppSettings } from '@sap-ux/fiori-freestyle-writer/dist/types';
import type { Destination } from '@sap-ux/btp-utils';
import { Authentication as DestinationAuthType } from '@sap-ux/btp-utils';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';

jest.mock('@sap-ux/fiori-generator-shared', () => {
    return {
        ...jest.requireActual('@sap-ux/fiori-generator-shared'),
        sendTelemetry: jest.fn(),
        getHostEnvironment: jest.fn().mockReturnValue({
            name: 'CLI',
            technical: 'CLI'
        })
    };
});

describe('Test transform state', () => {
    const baseState: State = {
        project: {
            name: 'test-app1',
            title: 'App Title',
            description: 'app desription',
            targetFolder: '/some/target/folder',
            ui5Theme: 'sap_fiori_3',
            ui5Version: '1.82.2',
            localUI5Version: '1.82.2'
        },
        service: {
            edmx: '<edmx>mock-edmx</edmx>',
            source: DatasourceType.sapSystem,
            host: 'https://abap.s4hana.cloud',
            client: undefined,
            annotations: undefined
        },
        floorplan: FloorplanFE.FE_LROP,
        entityRelatedConfig: {}
    };

    test('should return preview settings based on state using connected system auth setting', async () => {
        const state: State = {
            ...baseState,
            service: {
                ...baseState.service,
                connectedSystem: {
                    backendSystem: {
                        authenticationType: AuthenticationType.ReentranceTicket,
                        name: 'some-backend-system'
                    } as BackendSystem,
                    serviceProvider: {} as ServiceProvider
                },
                ignoreCertError: true
            }
        };

        const feApp = await transformState<FioriElementsApp<unknown>>(state);
        expect(feApp.service.previewSettings).toStrictEqual({
            authenticationType: AuthenticationType.ReentranceTicket
        });
        expect(feApp.app.projectType).toStrictEqual('EDMXBackend');
        expect(feApp.service.ignoreCertError).toBe(true);

        // Deprecated Destination Auth type 'SAML_ASSERTION'
        state.service!.destinationAuthType = DestinationAuthType.SAML_ASSERTION;
        let ffApp = await transformState<FreestyleApp<BasicAppSettings>>(state);
        expect(ffApp.service?.previewSettings?.authenticationType).toEqual(AuthenticationType.ReentranceTicket);

        // Destination auth type
        state.service!.connectedSystem = {
            destination: {
                Name: 'destination-name',
                Authentication: DestinationAuthType.SAML_ASSERTION
            } as Partial<Destination>,
            serviceProvider: undefined!
        } as Service['connectedSystem'];

        ffApp = await transformState<FreestyleApp<BasicAppSettings>>(state);
        expect(ffApp.service?.previewSettings?.authenticationType).toEqual(AuthenticationType.ReentranceTicket);
    });

    test('should set preview setting `authenticationType` correctly', async () => {
        const state: State = {
            ...baseState,
            service: {
                ...baseState.service,
                connectedSystem: {
                    destination: {
                        Name: 'destination-name',
                        Authentication: DestinationAuthType.BASIC_AUTHENTICATION,
                        WebIDEUsage: 'abap_cloud'
                    } as Partial<Destination>,
                    serviceProvider: undefined!
                } as Service['connectedSystem']
            }
        };
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.bas);

        let ffApp = await transformState<FreestyleApp<BasicAppSettings>>(state);
        // All cloud systems support reentrance this supports BAS -> VSCode portability
        expect(ffApp.service?.previewSettings?.authenticationType).toBe('reentranceTicket');

        // Should support legacy service key backend system entries, using reentrance tickets in new apps
        state.service!.connectedSystem = {
            backendSystem: {
                serviceKeys: { any: 'thing' },
                authenticationType: AuthenticationType.Basic,
                name: 'some-backend'
            } as Partial<BackendSystem>,
            serviceProvider: undefined!
        } as Service['connectedSystem'];

        ffApp = await transformState<FreestyleApp<BasicAppSettings>>(state);
        expect(ffApp.service?.previewSettings?.authenticationType).toBe('reentranceTicket');
    });

    test('should return preview setting `apiHub`', async () => {
        const state: State = {
            ...baseState,
            service: {
                ...baseState.service,
                apiHubConfig: {
                    apiHubKey: 'apiHubKey1234',
                    apiHubType: ApiHubType.apiHub
                }
            }
        };
        const feApp = await transformState<FioriElementsApp<unknown>>(state);
        expect(feApp.service.previewSettings).toMatchObject({ apiHub: true });
    });

    test('should correctly map entity related config and page building block title for FPM floorplan', async () => {
        const state: State = {
            ...baseState,
            project: {
                ...baseState.project
            },
            service: {
                ...baseState.service,
                connectedSystem: {
                    backendSystem: {
                        authenticationType: AuthenticationType.ReentranceTicket,
                        name: 'some-backend-system',
                        url: 'https://abap.cloud.system'
                    },
                    serviceProvider: {} as ServiceProvider
                }
            },
            entityRelatedConfig: {
                mainEntity: {
                    entitySetName: 'SEPMRA_C_PD_Product',
                    entitySetType: 'SEPMRA_C_PD_ProductType'
                },
                addPageBuildingBlock: true,
                pageBuildingBlockTitle: 'Product Details',
                navigationEntity: {} as EntityRelatedAnswers['navigationEntity'], // test None selection,
                presentationQualifier: '',
                tableType: 'ResponsiveTable',
                tableSelectionMode: 'None'
            },
            floorplan: FloorplanFE.FE_FPM
        };

        const feApp = await transformState<FioriElementsApp<unknown>>(state);
        expect(feApp.template.settings).toEqual({
            entityConfig: {
                mainEntityName: 'SEPMRA_C_PD_Product'
            },
            pageBuildingBlockTitle: 'Product Details',
            pageName: 'Main'
        });
    });

    test('should transform entity related config correctly', async () => {
        const state: State = {
            ...baseState,
            project: {
                ...baseState.project
            },
            service: {
                ...baseState.service,
                connectedSystem: {
                    backendSystem: {
                        authenticationType: AuthenticationType.ReentranceTicket,
                        name: 'some-backend-system',
                        url: 'https://abap.cloud.system'
                    },
                    serviceProvider: {} as ServiceProvider
                }
            },
            // Null state for entity related config
            entityRelatedConfig: {
                mainEntity: {
                    entitySetName: 'SEPMRA_C_PD_Product',
                    entitySetType: 'SEPMRA_C_PD_ProductType'
                },
                navigationEntity: {} as EntityRelatedAnswers['navigationEntity'], // test None selection,
                presentationQualifier: '',
                tableType: 'ResponsiveTable',
                tableSelectionMode: 'None'
            },
            floorplan: FloorplanFE.FE_ALP
        };

        let feApp = await transformState<FioriElementsApp<unknown>>(state);
        expect(feApp.template.settings).toEqual({
            autoHide: undefined,
            entityConfig: {
                mainEntityName: 'SEPMRA_C_PD_Product'
            },
            hierarchyQualifier: undefined,
            multiSelect: undefined,
            qualifier: undefined,
            selectionMode: 'None',
            smartVariantManagement: undefined,
            tableType: 'ResponsiveTable'
        });

        state.entityRelatedConfig = {
            mainEntity: {
                entitySetName: 'SEPMRA_C_PD_Product',
                entitySetType: 'SEPMRA_C_PD_ProductType'
            },
            navigationEntity: {
                entitySetName: 'to_ProductTextSetName',
                navigationPropertyName: 'to_ProductTextNavPropName'
            },
            presentationQualifier: 'DefaultVariant',
            tableType: 'GridTable',
            tableSelectionMode: 'Auto',
            smartVariantManagement: true,
            tableMultiSelect: true
        };

        feApp = await transformState(state);
        expect(feApp.template.settings).toEqual({
            autoHide: undefined,
            entityConfig: {
                mainEntityName: 'SEPMRA_C_PD_Product',
                navigationEntity: {
                    EntitySet: 'to_ProductTextSetName',
                    Name: 'to_ProductTextNavPropName'
                }
            },
            hierarchyQualifier: undefined,
            multiSelect: true,
            qualifier: 'DefaultVariant',
            selectionMode: 'Auto',
            smartVariantManagement: true,
            tableType: 'GridTable'
        });
    });

    test('should transform parameterised entity related config correctly', async () => {
        const state: State = {
            ...baseState,
            project: {
                ...baseState.project
            },
            entityRelatedConfig: {
                mainEntity: {
                    entitySetName: 'ZC_STOCKAGEING',
                    entitySetType: 'com.sap.gateway.srvd.zserv_d_stock_ageing.v0001.ZC_STOCKAGEINGParameters',
                    mainEntityParameterName: 'Set'
                },
                navigationEntity: {} as EntityRelatedAnswers['navigationEntity'],
                presentationQualifier: '',
                tableType: 'ResponsiveTable',
                tableSelectionMode: 'None'
            },
            floorplan: FloorplanFE.FE_LROP
        };

        const feApp = await transformState<FioriElementsApp<unknown>>(state);
        // Check for parametrised main entity
        expect(feApp.template.settings).toEqual({
            entityConfig: {
                mainEntityName: 'ZC_STOCKAGEING',
                mainEntityParameterName: 'Set'
            },
            hierarchyQualifier: undefined,
            tableType: 'ResponsiveTable'
        });
    });

    test('should transform to correct template when generated using CAP', async () => {
        const state: State = {
            ...baseState,
            service: {
                ...baseState.service,
                capService: {
                    projectPath: 'path/to/cds/project',
                    appPath: 'app',
                    capType: 'Node.js',
                    serviceName: 'TestService',
                    serviceCdsPath: 'path/to/cds/project/srv'
                }
            }
        };
        const feApp = await transformState<FioriElementsApp<unknown>>(state, true);
        expect(feApp.app.projectType).toStrictEqual('CAPNodejs');
    });

    test('Should transform state to Fiori Freestyle `simple` template settings', async () => {
        const state: State = {
            ...baseState,
            floorplan: FloorplanFF.FF_SIMPLE,
            viewName: 'TestViewName123'
        };
        // Data source set to none
        const noDataSourceState = await transformState<FreestyleApp<BasicAppSettings>>(state);
        expect(noDataSourceState).toMatchObject({
            template: {
                settings: {
                    viewName: 'TestViewName123'
                },
                type: 'basic'
            }
        });
    });

    test('Should transform state setting default ui5 versions and url if not specified (adaptor and headless use cases)', async () => {
        const state: State = {
            project: {
                name: 'TestProject1',
                description: 'An SAP Fiori application.',
                title: 'App Title',
                skipAnnotations: false,
                namespace: 'namespace1',
                targetFolder: ''
            } as Project,
            service: { ...baseState.service },
            floorplan: FloorplanFE.FE_LROP,
            entityRelatedConfig: {
                mainEntity: {
                    entitySetName: 'SEPMRA_C_PD_Product',
                    entitySetType: 'SEPMRA_C_PD_ProductType'
                }
            }
        };
        const noDataSourceState = await transformState<FioriElementsApp<unknown>>(state);
        expect(noDataSourceState).toMatchObject({
            ui5: {
                version: undefined,
                ui5Theme: undefined,
                localVersion: undefined,
                minUI5Version: '1.84.0',
                frameworkUrl: 'https://ui5.sap.com'
            }
        });
    });
});
