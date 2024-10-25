import RuntimeAuthoring, { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import FlexBox from 'sap/m/FlexBox';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import type { ChangeService } from '../../../../src/cpe/changes/service';
const mockChangeService = {
    syncOutlineChanges: jest.fn()
} as unknown as ChangeService;

import { quickActionListChanged, executeQuickAction } from '@sap-ux-private/control-property-editor-common';

jest.mock('../../../../src/adp/init-dialogs', () => {
    return {
        ...jest.requireActual('../../../../src/adp/init-dialogs'),
        handler: jest.fn()
    };
});
import { QuickActionService } from '../../../../src/cpe/quick-actions/quick-action-service';
import { OutlineService } from '../../../../src/cpe/outline/service';
import { FeatureService } from '../../../../src/cpe/feature-service';

import FEV4QuickActionRegistry from 'open/ux/preview/client/adp/quick-actions/fe-v4/registry';
import { sapCoreMock } from 'mock/window';
import NavContainer from 'mock/sap/m/NavContainer';
import XMLView from 'mock/sap/ui/core/mvc/XMLView';
import ComponentContainer from 'mock/sap/ui/core/ComponentContainer';
import TemplateComponentMock from 'mock/sap/fe/core/TemplateComponent';
import Component from 'mock/sap/ui/core/Component';
import CommandFactory from 'mock/sap/ui/rta/command/CommandFactory';
import FlexUtils from 'mock/sap/ui/fl/Utils';

import { fetchMock } from 'mock/window';
import { mockOverlay } from 'mock/sap/ui/dt/OverlayRegistry';
import ComponentMock from 'mock/sap/ui/core/Component';
import UIComponent from 'sap/ui/core/UIComponent';
import AppComponentMock from 'mock/sap/fe/core/AppComponent';
import FlexRuntimeInfoAPI from 'mock/sap/ui/fl/apply/api/FlexRuntimeInfoAPI';

describe('FE V2 quick actions', () => {
    let sendActionMock: jest.Mock;
    let subscribeMock: jest.Mock;

    beforeEach(() => {
        sendActionMock = jest.fn();
        subscribeMock = jest.fn();
        jest.clearAllMocks();
    });

    afterEach(() => {
        fetchMock.mockRestore();
    });

    describe('ListReport', () => {
        describe('clear filter bar button', () => {
            test('initialize and execute action', async () => {
                const appComponent = new AppComponentMock();
                const component = new TemplateComponentMock();
                jest.spyOn(component, 'getAppComponent').mockReturnValue(appComponent);
                jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                    return component as unknown as UIComponent;
                });
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'FilterBar') {
                        return {
                            getShowClearButton: jest.fn().mockImplementation(() => false),
                            getDomRef: () => ({}),
                            getParent: () => ({})
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const pageView = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getId.mockReturnValue('test.app::ProductsList');
                        pageView.getViewName.mockImplementation(() => 'sap.fe.templates.ListReport.ListReport');
                        const componentContainer = new ComponentContainer();
                        jest.spyOn(componentContainer, 'getComponent').mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return componentContainer;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                CommandFactory.getCommandFor.mockImplementation((control, type, value, _, settings) => {
                    return { type, value, settings };
                });

                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV4QuickActionRegistry();
                const service = new QuickActionService(rtaMock, new OutlineService(rtaMock, mockChangeService), [registry]);
                await service.init(sendActionMock, subscribeMock);

                await service.reloadQuickActions({
                    'sap.fe.macros.controls.FilterBar': [
                        {
                            controlId: 'FilterBar'
                        } as any
                    ],
                    'sap.m.NavContainer': [
                        {
                            controlId: 'NavContainer'
                        } as any
                    ]
                });

                expect(sendActionMock).toHaveBeenCalledWith(
                    quickActionListChanged([
                        {
                            title: 'LIST REPORT',
                            actions: [
                                {
                                    'kind': 'simple',
                                    id: 'listReport0-enable-clear-filter-bar',
                                    title: 'Enable "Clear" Button in Filter Bar',
                                    enabled: true
                                }
                            ]
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-enable-clear-filter-bar', kind: 'simple' })
                );
                expect(rtaMock.getCommandStack().pushAndExecute).toHaveBeenCalledWith({
                    settings: {},
                    type: 'appDescriptor',
                    value: {
                        appComponent,
                        reference: 'test.id',
                        changeType: 'appdescr_fe_changePageConfiguration',
                        parameters: {
                            page: 'ProductsList',
                            entityPropertyChange: {
                                propertyPath:
                                    'controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/showClearButton',
                                propertyValue: true,
                                operation: 'UPSERT'
                            }
                        }
                    }
                });
            });
        });

        describe('add controller to the page', () => {
            test('initialize and execute action', async () => {
                const pageView = new XMLView();
                FlexUtils.getViewForControl.mockImplementation(() => {
                    return {
                        getId: () => 'MyView',
                        getController: () => {
                            return {
                                getMetadata: () => {
                                    return {
                                        getName: () => 'MyController'
                                    };
                                }
                            };
                        }
                    };
                });
                fetchMock.mockResolvedValue({
                    json: jest
                        .fn()
                        .mockReturnValueOnce({
                            controllerExists: false,
                            controllerPath: '',
                            controllerPathFromRoot: '',
                            isRunningInBAS: false
                        })
                        .mockReturnValueOnce({ controllers: [] }),
                    text: jest.fn(),
                    ok: true
                });
                const appComponent = new AppComponentMock();
                const component = new TemplateComponentMock();
                jest.spyOn(component, 'getAppComponent').mockReturnValue(appComponent);
                jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                    return component as unknown as UIComponent;
                });
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'DynamicPage') {
                        return {
                            getDomRef: () => ({}),
                            getParent: () => pageView
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new TemplateComponentMock();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getId.mockReturnValue('test.app::ProductsList');
                        pageView.getViewName.mockImplementation(() => 'sap.fe.templates.ListReport.ListReport');
                        const componentContainer = new ComponentContainer();
                        jest.spyOn(componentContainer, 'getComponent').mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return componentContainer;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV4QuickActionRegistry();
                const service = new QuickActionService(rtaMock, new OutlineService(rtaMock, mockChangeService), [registry]);
                await service.init(sendActionMock, subscribeMock);

                await service.reloadQuickActions({
                    'sap.f.DynamicPage': [
                        {
                            controlId: 'DynamicPage'
                        } as any
                    ],
                    'sap.m.NavContainer': [
                        {
                            controlId: 'NavContainer'
                        } as any
                    ]
                });

                expect(sendActionMock).toHaveBeenCalledWith(
                    quickActionListChanged([
                        {
                            title: 'LIST REPORT',
                            actions: [
                                {
                                    'kind': 'simple',
                                    id: 'listReport0-add-controller-to-page',
                                    title: 'Add Controller to Page',
                                    enabled: true
                                }
                            ]
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-add-controller-to-page', kind: 'simple' })
                );
                const { handler } = jest.requireMock<{ handler: () => Promise<void> }>(
                    '../../../../src/adp/init-dialogs'
                );

                expect(handler).toHaveBeenCalledWith(mockOverlay, rtaMock, 'ControllerExtension');
            });
        });

        describe('change table columns', () => {
            beforeEach(() => {
                jest.spyOn(FeatureService, 'isFeatureEnabled').mockImplementation((feature: string) => {
                    if (feature === 'cpe.beta.quick-actions') {
                        return true;
                    }
                    return false;
                });
                FeatureService.isFeatureEnabled;
            });
            test('initialize and execute action', async () => {
                const pageView = new XMLView();
                jest.spyOn(FlexRuntimeInfoAPI, 'hasVariantManagement').mockReturnValue(true);
                const scrollIntoView = jest.fn();
                const appComponent = new AppComponentMock();
                const component = new TemplateComponentMock();
                jest.spyOn(component, 'getAppComponent').mockReturnValue(appComponent);
                jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                    return component as unknown as UIComponent;
                });
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'Table') {
                        return {
                            isA: (type: string) => type === 'sap.ui.mdc.Table',
                            getHeader: () => 'MyTable',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),
                            getParent: () => pageView,
                            getBusy: () => false
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new TemplateComponentMock();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getId.mockReturnValue('test.app::ProductsList');
                        pageView.getViewName.mockImplementation(() => 'sap.fe.templates.ListReport.ListReport');
                        const componentContainer = new ComponentContainer();
                        jest.spyOn(componentContainer, 'getComponent').mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return componentContainer;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                const execute = jest.fn();
                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                jest.spyOn(rtaMock, 'getService').mockImplementation((serviceName: string): any => {
                    if (serviceName === 'action') {
                        return {
                            get: (controlId: string) => {
                                if (controlId === 'Table') {
                                    return [{ id: 'CTX_SETTINGS0' }];
                                }
                            },
                            execute
                        };
                    }
                });
                const registry = new FEV4QuickActionRegistry();
                const service = new QuickActionService(rtaMock, new OutlineService(rtaMock, mockChangeService), [registry]);
                await service.init(sendActionMock, subscribeMock);

                await service.reloadQuickActions({
                    'sap.ui.mdc.Table': [
                        {
                            controlId: 'Table'
                        } as any
                    ],
                    'sap.m.NavContainer': [
                        {
                            controlId: 'NavContainer'
                        } as any
                    ]
                });

                expect(sendActionMock).toHaveBeenCalledWith(
                    quickActionListChanged([
                        {
                            title: 'LIST REPORT',
                            actions: [
                                {
                                    'kind': 'nested',
                                    id: 'listReport0-change-table-columns',
                                    title: 'Change Table Columns',
                                    enabled: true,
                                    children: [
                                        {
                                            children: [],
                                            label: `'MyTable' table`
                                        }
                                    ]
                                },
                                {
                                    'kind': 'nested',
                                    id: 'listReport0-create_table_action',
                                    title: 'Add Custom Table Action',
                                    enabled: true,
                                    children: [
                                        {
                                            children: [],
                                            label: `'MyTable' table`
                                        }
                                    ]
                                }
                            ]
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-change-table-columns', kind: 'nested', path: '0' })
                );

                expect(execute).toHaveBeenCalledWith('Table', 'CTX_SETTINGS0');
            });
        });

        describe('create table table', () => {
            test('initialize and execute action', async () => {
                const pageView = new XMLView();
                jest.spyOn(FlexRuntimeInfoAPI, 'hasVariantManagement').mockReturnValue(true);
                const scrollIntoView = jest.fn();
                const appComponent = new AppComponentMock();
                const component = new TemplateComponentMock();
                jest.spyOn(component, 'getAppComponent').mockReturnValue(appComponent);
                jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                    return component as unknown as UIComponent;
                });
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'Table') {
                        return {
                            isA: (type: string) => type === 'sap.ui.mdc.Table',
                            getHeader: () => 'MyTable',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),
                            getParent: () => pageView,
                            getBusy: () => false
                        };
                    }

                    if (id == 'ToolbarAction') {
                        return {
                            isA: (type: string) => type === 'sap.ui.mdc.ActionToolbar',
                            getHeader: () => 'MyTable',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),
                            getParent: () => pageView,
                            getBusy: () => false
                        };
                    }

                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new TemplateComponentMock();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getId.mockReturnValue('test.app::ProductsList');
                        pageView.getViewName.mockImplementation(() => 'sap.fe.templates.ListReport.ListReport');
                        const componentContainer = new ComponentContainer();
                        jest.spyOn(componentContainer, 'getComponent').mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return componentContainer;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                const execute = jest.fn();
                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                jest.spyOn(rtaMock, 'getService').mockImplementation((serviceName: string): any => {
                    if (serviceName === 'action') {
                        return {
                            get: (controlId: string) => {
                                if (controlId === 'Table') {
                                    return [{ id: 'CTX_SETTINGS0' }];
                                }
                            },
                            execute
                        };
                    }
                });
                const registry = new FEV4QuickActionRegistry();
                const service = new QuickActionService(rtaMock, new OutlineService(rtaMock), [registry]);
                await service.init(sendActionMock, subscribeMock);

                await service.reloadQuickActions({
                    'sap.ui.mdc.Table': [
                        {
                            controlId: 'Table'
                        } as any
                    ],
                    'sap.ui.mdc.ActionToolbar': [
                        {
                            controlId: 'ToolbarAction'
                        } as any
                    ],
                    'sap.m.NavContainer': [
                        {
                            controlId: 'NavContainer'
                        } as any
                    ]
                });

                expect(sendActionMock).toHaveBeenCalledWith(
                    quickActionListChanged([
                        {
                            title: 'LIST REPORT',
                            actions: [
                                {
                                    'kind': 'nested',
                                    id: 'listReport0-change-table-columns',
                                    title: 'Change Table Columns',
                                    enabled: true,
                                    children: [
                                        {
                                            children: [],
                                            label: `'MyTable' table`
                                        }
                                    ]
                                },
                                {
                                    'kind': 'nested',
                                    id: 'listReport0-create_table_action',
                                    title: 'Add Custom Table Action',
                                    enabled: true,
                                    children: [
                                        {
                                            children: [],
                                            label: `'MyTable' table`
                                        }
                                    ]
                                }
                            ]
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-create_table_action', kind: 'nested', path: '0' })
                );
            });
        });

        describe('ObjectPage', () => {
            describe('add header field', () => {
                test('initialize and execute action', async () => {
                    const pageView = new XMLView();
                    FlexUtils.getViewForControl.mockImplementation(() => {
                        return {
                            getId: () => 'MyView',
                            getController: () => {
                                return {
                                    getMetadata: () => {
                                        return {
                                            getName: () => 'MyController'
                                        };
                                    }
                                };
                            }
                        };
                    });
                    fetchMock.mockResolvedValue({
                        json: jest
                            .fn()
                            .mockReturnValueOnce({
                                controllerExists: false,
                                controllerPath: '',
                                controllerPathFromRoot: '',
                                isRunningInBAS: false
                            })
                            .mockReturnValueOnce({ controllers: [] }),
                        text: jest.fn(),
                        ok: true
                    });
                    const appComponent = new AppComponentMock();
                    const component = new TemplateComponentMock();
                    jest.spyOn(component, 'getAppComponent').mockReturnValue(appComponent);
                    jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                        return component as unknown as UIComponent;
                    });
                    sapCoreMock.byId.mockImplementation((id) => {
                        if (id == 'ObjectPageLayout') {
                            return {
                                getId: () => 'ObjectPageLayout',
                                getDomRef: () => ({}),
                                getParent: () => pageView,
                                getHeaderContent: () => {
                                    return [new FlexBox()];
                                }
                            };
                        }
                        if (id == 'NavContainer') {
                            const container = new NavContainer();
                            const component = new TemplateComponentMock();
                            pageView.getDomRef.mockImplementation(() => {
                                return {
                                    contains: () => true
                                };
                            });
                            pageView.getId.mockReturnValue('test.app::ProductDetails');
                            pageView.getViewName.mockImplementation(() => 'sap.fe.templates.ObjectPage.ObjectPage');
                            const componentContainer = new ComponentContainer();
                            jest.spyOn(componentContainer, 'getComponent').mockImplementation(() => {
                                return 'component-id';
                            });
                            jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                                if (id === 'component-id') {
                                    return component;
                                }
                            });
                            container.getCurrentPage.mockImplementation(() => {
                                return componentContainer;
                            });
                            component.getRootControl.mockImplementation(() => {
                                return pageView;
                            });
                            return container;
                        }
                    });

                    const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                    const registry = new FEV4QuickActionRegistry();
                    const service = new QuickActionService(rtaMock, new OutlineService(rtaMock, mockChangeService), [registry]);
                    await service.init(sendActionMock, subscribeMock);

                    await service.reloadQuickActions({
                        'sap.uxap.ObjectPageLayout': [
                            {
                                controlId: 'ObjectPageLayout'
                            } as any
                        ],
                        'sap.m.NavContainer': [
                            {
                                controlId: 'NavContainer'
                            } as any
                        ]
                    });

                    expect(sendActionMock).toHaveBeenCalledWith(
                        quickActionListChanged([
                            {
                                title: 'OBJECT PAGE',
                                actions: [
                                    {
                                        kind: 'simple',
                                        id: 'objectPage0-add-controller-to-page',
                                        enabled: true,
                                        title: 'Add Controller to Page'
                                    },
                                    {
                                        kind: 'simple',
                                        id: 'objectPage0-op-add-header-field',
                                        title: 'Add Header Field',
                                        enabled: true
                                    },
                                    {
                                        enabled: true,
                                        id: 'objectPage0-op-add-custom-section',
                                        kind: 'simple',
                                        title: 'Add Custom Section'
                                    }
                                ]
                            }
                        ])
                    );

                    await subscribeMock.mock.calls[0][0](
                        executeQuickAction({ id: 'objectPage0-op-add-header-field', kind: 'simple' })
                    );
                    const { handler } = jest.requireMock<{ handler: () => Promise<void> }>(
                        '../../../../src/adp/init-dialogs'
                    );

                    expect(handler).toHaveBeenCalledWith(mockOverlay, rtaMock, 'AddFragment', undefined, {
                        aggregation: 'items',
                        title: 'QUICK_ACTION_OP_ADD_HEADER_FIELD'
                    });
                });
            });
        });
    });
});
