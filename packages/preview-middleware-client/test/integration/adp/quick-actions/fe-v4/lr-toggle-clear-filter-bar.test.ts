
import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import OutlineService from 'sap/ui/rta/command/OutlineService';
import AppComponent from 'sap/fe/core/AppComponent';

// import type { QuickActionContext } from 'open/ux/preview/client/cpe/quick-actions/quick-action-definition';
import { ToggleClearFilterBarQuickAction } from 'open/ux/preview/client/adp/quick-actions/fe-v2/lr-toggle-clear-filter-bar';
import { getTextBundle } from 'open/ux/preview/client/i18n';
import { ChangeService } from 'open/ux/preview/client/cpe/changes/service';
import { transformNodes } from 'open/ux/preview/client/cpe/outline/nodes';
import { ControlTreeIndex } from 'open/ux/preview/client/cpe/types';
import Component from 'sap/ui/core/Component';
import ComponentContainer from 'sap/ui/core/ComponentContainer';


describe('lr-toggle-clear-filter-bar', () => {
    test('basic', async () => {
        // mocks

        // config
        const layer = 'VENDOR';

        // mocks


        const guid = Date.now().toString();

        sap.ui.define(`test/fe/v4/lrop/${guid}/Component`, ['sap/fe/core/AppComponent'], function (X: any) {
            return X.extend(`test.fe.v4.lrop.${guid}.Component`, {
                metadata: {
                    manifest: {
                        '_version': '1.59.0',
                        'sap.app': {
                            'id': `test.fe.v4.lrop.${guid}`,
                            'type': 'application',
                            'i18n': 'i18n/i18n.properties',
                            'applicationVersion': {
                                'version': '0.0.1'
                            },
                            'title': '{{appTitle}}',
                            'description': '{{appDescription}}',
                            'resources': 'resources.json',
                            'sourceTemplate': {
                                'id': '@sap/generator-fiori:lrop',
                                'version': '1.12.2',
                                'toolsId': 'e0dee5ad-d7c2-48b8-8568-29a60c49271e'
                            },
                            'dataSources': {
                                'mainService': {
                                    'uri': '/sap/opu/odata4/sap/c_salesordermanage_srv/srvd/sap/c_salesordermanage_sd/0001/',
                                    'type': 'OData',
                                    'settings': {
                                        'annotations': ['annotation'],
                                        'localUri': 'localService/metadata.xml',
                                        'odataVersion': '4.0'
                                    }
                                },
                                'annotation': {
                                    'type': 'ODataAnnotation',
                                    'uri': 'annotations/annotation.xml',
                                    'settings': {
                                        'localUri': 'annotations/annotation.xml'
                                    }
                                }
                            }
                        },
                        'sap.ui': {
                            'technology': 'UI5',
                            'icons': {
                                'icon': '',
                                'favIcon': '',
                                'phone': '',
                                'phone@2': '',
                                'tablet': '',
                                'tablet@2': ''
                            },
                            'deviceTypes': {
                                'desktop': true,
                                'tablet': true,
                                'phone': true
                            }
                        },
                        'sap.ui5': {
                            'flexEnabled': true,
                            'dependencies': {
                                'minUI5Version': '1.126.0',
                                'libs': {
                                    'sap.fe.templates': {}
                                }
                            },
                            'contentDensities': {
                                'compact': true,
                                'cozy': true
                            },
                            'models': {
                                'i18n': {
                                    'type': 'sap.ui.model.resource.ResourceModel',
                                    'settings': {
                                        'bundleName': 'fe.v4.lrop.s4cloud.i18n.i18n'
                                    }
                                },
                                '': {
                                    'dataSource': 'mainService',
                                    'preload': true,
                                    'settings': {
                                        'synchronizationMode': 'None',
                                        'operationMode': 'Server',
                                        'autoExpandSelect': true,
                                        'earlyRequests': true
                                    }
                                },
                                '@i18n': {
                                    'type': 'sap.ui.model.resource.ResourceModel',
                                    'uri': 'i18n/i18n.properties'
                                }
                            },
                            'resources': {
                                'css': []
                            },
                            'routing': {
                                'config': {},
                                'routes': [
                                    {
                                        'pattern': ':?query:',
                                        'name': 'SalesOrderManageList',
                                        'target': 'SalesOrderManageList'
                                    },
                                    {
                                        'pattern': 'SalesOrderManageObjectPage({key}):?query:',
                                        'name': 'SalesOrderManageObjectPage',
                                        'target': 'SalesOrderManageObjectPage'
                                    }
                                ],
                                'targets': {
                                    'SalesOrderManageList': {
                                        'type': 'Component',
                                        'id': 'SalesOrderManageList',
                                        'name': 'sap.fe.templates.ListReport',
                                        'options': {
                                            'settings': {
                                                'contextPath': '/SalesOrderManage',
                                                'variantManagement': 'Page',
                                                'navigation': {
                                                    'AdditionalCustomerGroup1': {
                                                        'detail': {
                                                            'route': 'SalesOrderManageObjectPage'
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    'SalesOrderManageObjectPage': {
                                        'type': 'Component',
                                        'id': 'SalesOrderManageObjectPage',
                                        'name': 'sap.fe.templates.ObjectPage',
                                        'options': {
                                            'settings': {
                                                'editableHeaderContent': false,
                                                'contextPath': '/SalesOrderManage'
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        'sap.fiori': {
                            'registrationIds': [],
                            'archeType': 'transactional'
                        }
                    }
                }
            });
        });

        // setup

        const component = (await Component.create({
            id: 'testId',
            name: `test.fe.v4.lrop.${guid}`
        })) as AppComponent;
        // for some reason property is missing from type definitions
        await (component as any).initialized;
        // const v = await (component.getRouter().getTarget('Default') as { load?: Function }).load?.();

        const view = component.getRootControl();

        const startAdaptation = (await import('sap/ui/rta/api/startAdaptation')).default;
        let rta: RuntimeAuthoring;
        await startAdaptation(
            {
                rootControl: view,
                flexSettings: {
                    developerMode: true,
                    layer
                }
            },
            (x: RuntimeAuthoring) => {
                rta = x;
            }
        );
        const changeService = new ChangeService({
            rta: rta!
        });

        const outlineService = await rta!.getService<OutlineService>('outline');
        const viewNodes = await outlineService.get();
        const controlIndex: ControlTreeIndex = {};
        const configPropertyIdMap = new Map<string, string[]>();
        await transformNodes(
            viewNodes,
            'ADAPTATION_PROJECT',
            new Set(),
            controlIndex,
            changeService,
            configPropertyIdMap
        );

 
        const texts = await getTextBundle();
        const actionContext: any = {
            controlIndex,
            manifest: rta!.getRootControlInstance().getManifest(),
            actionService: {},
            view,
            key: 'test-key',
            rta: rta!, // TODO: init
            flexSettings: rta!.getFlexSettings(),
            resourceBundle: texts,
            changeService: {}
        };
        const action = new ToggleClearFilterBarQuickAction(actionContext as any);
        action.initialize();
        expect(action.getActionObject()).toMatchSnapshot();
    }, 200000);
});
