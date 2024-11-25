import FlexBox from 'sap/m/FlexBox';
import RuntimeAuthoring, { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';

import { quickActionListChanged, executeQuickAction } from '@sap-ux-private/control-property-editor-common';
import * as VersionUtils from '../../../../src/utils/version';

jest.mock('../../../../src/adp/init-dialogs', () => {
    return {
        ...jest.requireActual('../../../../src/adp/init-dialogs'),
        handler: jest.fn()
    };
});

import { QuickActionService } from '../../../../src/cpe/quick-actions/quick-action-service';
import { OutlineService } from '../../../../src/cpe/outline/service';
import { FeatureService } from '../../../../src/cpe/feature-service';

import FEV2QuickActionRegistry from '../../../../src/adp/quick-actions/fe-v2/registry';
import { sapCoreMock } from 'mock/window';
import NavContainer from 'mock/sap/m/NavContainer';
import XMLView from 'mock/sap/ui/core/mvc/XMLView';
import ComponentContainer from 'sap/ui/core/ComponentContainer';
import UIComponentMock from 'mock/sap/ui/core/UIComponent';
import Component from 'mock/sap/ui/core/Component';
import CommandFactory from 'mock/sap/ui/rta/command/CommandFactory';
import FlexUtils from 'mock/sap/ui/fl/Utils';
import * as QCUtils from '../../../../src/cpe/quick-actions/utils';
import { fetchMock } from 'mock/window';
import { mockOverlay } from 'mock/sap/ui/dt/OverlayRegistry';
import ManagedObject from 'mock/sap/ui/base/ManagedObject';
import {
    ANALYTICAL_TABLE_TYPE,
    GRID_TABLE_TYPE,
    M_TABLE_TYPE,
    SMART_TABLE_TYPE,
    TREE_TABLE_TYPE
} from 'open/ux/preview/client/adp/quick-actions/table-quick-action-base';
import { DialogNames } from 'open/ux/preview/client/adp/init-dialogs';
import * as adpUtils from 'open/ux/preview/client/adp/utils';
import type { ChangeService } from '../../../../src/cpe/changes/service';
import { Ui5VersionInfo } from '../../../../src/utils/version';
import * as versionUtils from 'open/ux/preview/client/utils/version';
describe('FE V2 quick actions', () => {
    let sendActionMock: jest.Mock;
    let subscribeMock: jest.Mock;
    const mockChangeService = {
        syncOutlineChanges: jest.fn()
    } as unknown as ChangeService;

    beforeEach(() => {
        sendActionMock = jest.fn();
        subscribeMock = jest.fn();
        jest.clearAllMocks();
    });

    afterEach(() => {
        fetchMock.mockRestore();
    });

    describe('ListReport', () => {
        beforeEach(() => {
            jest.spyOn(FeatureService, 'isFeatureEnabled').mockImplementation((feature: string) => {
                if (feature === 'cpe.beta.quick-actions') {
                    return true;
                }
                return false;
            });
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        describe('clear filter bar button', () => {
            test('initialize and execute action', async () => {
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'SmartFilterBar') {
                        return {
                            getShowClearOnFB: jest.fn().mockImplementation(() => false),
                            getDomRef: () => ({})
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new UIComponentMock();
                        const view = new XMLView();
                        const pageView = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getViewName.mockImplementation(
                            () => 'sap.suite.ui.generic.template.ListReport.view.ListReport'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        view.getContent.mockImplementation(() => {
                            return [componentContainer];
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return view;
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
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );
                await service.init(sendActionMock, subscribeMock);

                await service.reloadQuickActions({
                    'sap.ui.comp.smartfilterbar.SmartFilterBar': [
                        {
                            controlId: 'SmartFilterBar'
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
                    'settings': {},
                    'type': 'Property',
                    'value': {
                        'generator': undefined,
                        'newValue': true,
                        'propertyName': 'showClearOnFB'
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
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'DynamicPage') {
                        return {
                            getDomRef: () => ({}),
                            getParent: () => pageView
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new UIComponentMock();
                        const view = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getViewName.mockImplementation(
                            () => 'sap.suite.ui.generic.template.ListReport.view.ListReport'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        view.getContent.mockImplementation(() => {
                            return [componentContainer];
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return view;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );
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
            test('initialize and execute', async () => {
                const pageView = new XMLView();

                const scrollIntoView = jest.fn();
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'SmartTable') {
                        return {
                            isA: (type: string) => type === 'sap.ui.comp.smarttable.SmartTable',
                            getHeader: () => 'MyTable',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),
                            getAggregation: () => {
                                return [
                                    {
                                        getAggregation: () => 'headerToolbar'
                                    }
                                ];
                            },
                            getParent: () => pageView,
                            getBusy: () => false
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new UIComponentMock();
                        const view = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getViewName.mockImplementation(
                            () => 'sap.suite.ui.generic.template.ListReport.view.ListReport'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        view.getContent.mockImplementation(() => {
                            return [componentContainer];
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return view;
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
                                if (controlId === 'SmartTable') {
                                    return [{ id: 'CTX_COMP_VARIANT_CONTENT' }];
                                }
                            },
                            execute
                        };
                    }
                });
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );
                await service.init(sendActionMock, subscribeMock);

                await service.reloadQuickActions({
                    'sap.ui.comp.smarttable.SmartTable': [
                        {
                            controlId: 'SmartTable'
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
                                            enabled: true,
                                            label: `'MyTable' table`
                                        }
                                    ]
                                },
                                {
                                    'kind': 'nested',
                                    id: 'listReport0-create-table-action',
                                    title: 'Add Custom Table Action',
                                    enabled: true,
                                    children: [
                                        {
                                            children: [],
                                            enabled: true,
                                            label: `'MyTable' table`
                                        }
                                    ]
                                },
                                {
                                    'children': [
                                        {
                                            'children': [],
                                            enabled: true,
                                            'label': `'MyTable' table`
                                        }
                                    ],
                                    'enabled': true,
                                    'id': 'listReport0-create-table-custom-column',
                                    'kind': 'nested',
                                    'title': 'Add Custom Table Column'
                                }
                            ]
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-change-table-columns', kind: 'nested', path: '0' })
                );
                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-create-table-action', kind: 'nested', path: '0' })
                );
                expect(scrollIntoView).toHaveBeenCalled();
                expect(execute).toHaveBeenCalledWith('SmartTable', 'CTX_COMP_VARIANT_CONTENT');
            });
        });

        describe('create table action', () => {
            test('initialize and execute', async () => {
                const pageView = new XMLView();

                const scrollIntoView = jest.fn();
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'mTable') {
                        return {
                            isA: (type: string) => type === 'sap.m.Table',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),
                            getAggregation: () => 'headerToolbar',
                            getParent: () => pageView,
                            getHeaderToolbar: () => {
                                return {
                                    getTitleControl: () => {
                                        return {
                                            getText: () => 'MyTable'
                                        };
                                    }
                                };
                            }
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new UIComponentMock();
                        const view = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getViewName.mockImplementation(
                            () => 'sap.suite.ui.generic.template.ListReport.view.ListReport'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        view.getContent.mockImplementation(() => {
                            return [componentContainer];
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return view;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });
                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );
                await service.init(sendActionMock, subscribeMock);

                await service.reloadQuickActions({
                    'sap.m.Table': [
                        {
                            controlId: 'mTable'
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
                                    id: 'listReport0-create-table-action',
                                    title: 'Add Custom Table Action',
                                    enabled: true,
                                    children: [
                                        {
                                            children: [],
                                            enabled: true,
                                            label: `'MyTable' table`
                                        }
                                    ]
                                },
                                {
                                    'children': [
                                        {
                                            'children': [],
                                            enabled: true,
                                            'label': `'MyTable' table`
                                        }
                                    ],
                                    'enabled': true,
                                    'id': 'listReport0-create-table-custom-column',
                                    'kind': 'nested',
                                    'title': 'Add Custom Table Column'
                                }
                            ]
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-create-table-action', kind: 'nested', path: '0' })
                );

                const { handler } = jest.requireMock<{ handler: () => Promise<void> }>(
                    '../../../../src/adp/init-dialogs'
                );

                expect(handler).toHaveBeenCalledWith(mockOverlay, rtaMock, 'AddFragment', undefined, {
                    aggregation: 'content',
                    title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION'
                });
            });
        });

        describe('add page action', () => {
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

                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'DynamicPageTitle') {
                        return {
                            getId: () => id,
                            getDomRef: () => ({}),
                            getParent: () => pageView
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new UIComponentMock();
                        const view = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getViewName.mockImplementation(
                            () => 'sap.suite.ui.generic.template.ListReport.view.ListReport'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        view.getContent.mockImplementation(() => {
                            return [componentContainer];
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return view;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );
                await service.init(sendActionMock, subscribeMock);

                await service.reloadQuickActions({
                    'sap.f.DynamicPageTitle': [
                        {
                            controlId: 'DynamicPageTitle'
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
                                    kind: 'simple',
                                    id: 'listReport0-add-page-action',
                                    enabled: true,
                                    title: 'Add Custom Page Action'
                                }
                            ]
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-add-page-action', kind: 'simple' })
                );
                const { handler } = jest.requireMock<{ handler: () => Promise<void> }>(
                    '../../../../src/adp/init-dialogs'
                );

                expect(handler).toHaveBeenCalledWith(mockOverlay, rtaMock, 'AddFragment', undefined, {
                    aggregation: 'actions',
                    title: 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION'
                });
            });
        });

        describe('create table custom column', () => {
            const testCases = [
                {
                    tableType: M_TABLE_TYPE,
                    dialog: DialogNames.ADD_TABLE_COLUMN_FRAGMENTS,
                    toString: () => M_TABLE_TYPE
                },
                { tableType: TREE_TABLE_TYPE, dialog: DialogNames.ADD_FRAGMENT, toString: () => TREE_TABLE_TYPE },
                {
                    tableType: ANALYTICAL_TABLE_TYPE,
                    dialog: DialogNames.ADD_FRAGMENT,
                    toString: () => ANALYTICAL_TABLE_TYPE
                },
                { tableType: GRID_TABLE_TYPE, dialog: DialogNames.ADD_FRAGMENT, toString: () => GRID_TABLE_TYPE }
            ];
            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                const pageView = new XMLView();
                const scrollIntoView = jest.fn();
                jest.spyOn(QCUtils, 'getParentContainer').mockImplementation(() => {
                    return undefined;
                });
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'SmartTable') {
                        return {
                            isA: (type: string) => type === SMART_TABLE_TYPE,
                            getHeader: () => 'MyTable',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),

                            getAggregation: () => {
                                return [
                                    {
                                        isA: (type: string) => type === testCase.tableType,
                                        getAggregation: () => 'columns'
                                    }
                                ];
                            },
                            getParent: () => pageView,
                            getBusy: () => false,
                            selectOverlay: () => ({})
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new UIComponentMock();
                        const view = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getViewName.mockImplementation(
                            () => 'sap.suite.ui.generic.template.ListReport.view.ListReport'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        view.getContent.mockImplementation(() => {
                            return [componentContainer];
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return view;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );

                await service.init(sendActionMock, subscribeMock);
                await service.reloadQuickActions({
                    'sap.ui.comp.smarttable.SmartTable': [
                        {
                            controlId: 'SmartTable'
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
                            'actions': [
                                {
                                    'children': [
                                        {
                                            'children': [],
                                            enabled: true,
                                            'label': `'MyTable' table`
                                        }
                                    ],
                                    'enabled': true,
                                    'id': 'listReport0-create-table-action',
                                    'kind': 'nested',
                                    'title': 'Add Custom Table Action'
                                },
                                {
                                    'children': [
                                        {
                                            'children': [],
                                            enabled: true,
                                            'label': `'MyTable' table`
                                        }
                                    ],

                                    'enabled': true,

                                    'id': 'listReport0-create-table-custom-column',
                                    'kind': 'nested',

                                    'title': 'Add Custom Table Column'
                                }
                            ],
                            'title': 'LIST REPORT'
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-create-table-custom-column', kind: 'nested', path: '0' })
                );

                const { handler } = jest.requireMock<{ handler: () => Promise<void> }>(
                    '../../../../src/adp/init-dialogs'
                );

                expect(handler).toHaveBeenCalledWith(mockOverlay, rtaMock, testCase.dialog, undefined, {
                    aggregation: 'columns',
                    title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
                });
            });
        });

        describe('disable/enable "semantic date range" in filter bar', () => {
            afterEach(() => {
                jest.restoreAllMocks(); // Restores all mocked functions to their original implementations
            });
            test('not available by default', async () => {
                jest.spyOn(FeatureService, 'isFeatureEnabled').mockReturnValue(false);
                jest.spyOn(VersionUtils, 'getUi5Version').mockReturnValue(
                    Promise.resolve({
                        major: 1,
                        minor: 130
                    } as Ui5VersionInfo)
                );
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'SmartFilterBar') {
                        return {
                            getProperty: jest.fn().mockImplementation(() => false),
                            getDomRef: () => ({}),
                            getEntitySet: jest.fn().mockImplementation(() => 'testEntity')
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new UIComponentMock();
                        const view = new XMLView();
                        const pageView = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getViewName.mockImplementation(
                            () => 'sap.suite.ui.generic.template.ListReport.view.ListReport'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        view.getContent.mockImplementation(() => {
                            return [componentContainer];
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return view;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );
                await service.init(sendActionMock, subscribeMock);

                await service.reloadQuickActions({
                    'sap.ui.comp.smartfilterbar.SmartFilterBar': [
                        {
                            controlId: 'SmartFilterBar'
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
                            actions: []
                        }
                    ])
                );
            });
            describe('enable table filtering for different valid UI5 versions', () => {
                const testCases: {
                    validVersion: boolean,
                    major: int;
                    minor: int;
                    patch?: int;
                }[] = [
                        {
                            validVersion: true, major: 1, minor: 96, patch: 37
                        },
                        {
                            validVersion: true, major: 1, minor: 108, patch: 38
                        },
                        {
                            validVersion: true, major: 1, minor: 96, patch: 38
                        },
                        {
                            validVersion: true, major: 1, minor: 120, patch: 23
                        },
                        {
                            validVersion: true, major: 1, minor: 128
                        },
                        {
                            validVersion: true, major: 1, minor: 130
                        },
                        {
                            validVersion: false, major: 1, minor: 96, patch: 36
                        }
                    ];
                test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                    jest.spyOn(VersionUtils, 'getUi5Version').mockReturnValue(
                        Promise.resolve({
                            major: testCase.major,
                            minor: testCase.minor,
                            patch: testCase.patch
                        } as Ui5VersionInfo)
                    );
                    sapCoreMock.byId.mockImplementation((id) => {
                        if (id == 'SmartFilterBar') {
                            return {
                                getProperty: jest.fn().mockImplementation(() => false),
                                getDomRef: () => ({}),
                                getEntitySet: jest.fn().mockImplementation(() => 'testEntity')
                            };
                        }
                        if (id == 'NavContainer') {
                            const container = new NavContainer();
                            const component = new UIComponentMock();
                            const view = new XMLView();
                            const pageView = new XMLView();
                            pageView.getDomRef.mockImplementation(() => {
                                return {
                                    contains: () => true
                                };
                            });
                            pageView.getViewName.mockImplementation(
                                () => 'sap.suite.ui.generic.template.ListReport.view.ListReport'
                            );
                            const componentContainer = new ComponentContainer();
                            const spy = jest.spyOn(componentContainer, 'getComponent');
                            spy.mockImplementation(() => {
                                return 'component-id';
                            });
                            jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                                if (id === 'component-id') {
                                    return component;
                                }
                            });
                            view.getContent.mockImplementation(() => {
                                return [componentContainer];
                            });
                            container.getCurrentPage.mockImplementation(() => {
                                return view;
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
                    const registry = new FEV2QuickActionRegistry();
                    const service = new QuickActionService(
                        rtaMock,
                        new OutlineService(rtaMock, mockChangeService),
                        [registry],
                        { onStackChange: jest.fn() } as any
                    );
                    await service.init(sendActionMock, subscribeMock);

                    await service.reloadQuickActions({
                        'sap.ui.comp.smartfilterbar.SmartFilterBar': [
                            {
                                controlId: 'SmartFilterBar'
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
                                actions: testCase.validVersion ? [{
                                    'kind': 'simple',
                                    id: 'listReport0-enable-semantic-daterange-filterbar',
                                    title: 'Enable "Semantic Date Range" for Filter Bar',
                                    enabled: true
                                }
                                ] : []
                            }
                        ])
                    );
                    if (testCase.validVersion) {
                        await subscribeMock.mock.calls[0][0](
                            executeQuickAction({ id: 'listReport0-enable-semantic-daterange-filterbar', kind: 'simple' })
                        );
                        expect(rtaMock.getCommandStack().pushAndExecute).toHaveBeenCalledWith({
                            'settings': {},
                            'type': 'appDescriptor',
                            'value': {
                                'changeType': 'appdescr_ui_generic_app_changePageConfiguration',
                                'parameters': {
                                    'entityPropertyChange': {
                                        'operation': 'UPSERT',
                                        'propertyPath': 'component/settings/filterSettings/dateSettings',
                                        'propertyValue': {
                                            'useDateRange': true
                                        }
                                    },
                                    'parentPage': {
                                        'component': 'sap.suite.ui.generic.template.ListReport',
                                        'entitySet': 'testEntity'
                                    }
                                },
                                'reference': undefined
                            }
                        });
                    }
                });
            });
        });

        describe('enable table filtering', () => {
            const testCases: {
                visible: boolean;
                ui5version: versionUtils.Ui5VersionInfo;
                expectedIsEnabled: boolean;
                isValidUI5Version: boolean;
                expectedTooltip?: string;

            }[] = [{
                visible: false, ui5version: {
                    major: 1, minor: 124, patch: 0
                }, expectedIsEnabled: true,
                isValidUI5Version: false
            },
            {
                visible: false, ui5version: {
                    major: 1, minor: 96, patch: 0
                }, expectedIsEnabled: true,
                isValidUI5Version: false
            },
            {
                visible: false, ui5version: {
                    major: 1, minor: 96, patch: 37
                }, expectedIsEnabled: true,
                isValidUI5Version: true
            },
            {
                visible: false, ui5version: {
                    major: 1, minor: 130, patch: 0
                }, expectedIsEnabled: true, isValidUI5Version: true
            },
            {
                visible: true,
                ui5version: {
                    major: 1, minor: 108, patch: 38
                },
                expectedIsEnabled: false,
                isValidUI5Version: true,
                expectedTooltip: 'This option has been disabled because the change has already been made'
            }
                ];
            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                const pageView = new XMLView();
                jest.spyOn(VersionUtils, 'getUi5Version').mockReturnValue(
                    Promise.resolve({
                        major: testCase.ui5version.major,
                        minor: testCase.ui5version.minor,
                        patch: testCase.ui5version.patch
                    } as Ui5VersionInfo)
                );
                const scrollIntoView = jest.fn();
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'mTable') {
                        return {
                            isA: (type: string) => type === 'sap.m.Table',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),
                            getEntitySet: jest.fn().mockImplementation(() => 'testEntity'),
                            getAggregation: () => 'headerToolbar',
                            getParent: () => pageView,
                            getHeaderToolbar: () => {
                                return {
                                    getTitleControl: () => {
                                        return {
                                            getText: () => 'MyTable'
                                        };
                                    }
                                };
                            },
                            data: jest.fn().mockImplementation((key) => {
                                if (key === 'p13nDialogSettings') {
                                    return {
                                        filter: {
                                            visible: testCase.visible
                                        },
                                    };
                                }
                            })
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new UIComponentMock();
                        const view = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getViewName.mockImplementation(
                            () => 'sap.suite.ui.generic.template.ListReport.view.ListReport'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        view.getContent.mockImplementation(() => {
                            return [componentContainer];
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return view;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });
                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(rtaMock, new OutlineService(rtaMock, mockChangeService), [
                    registry,

                ], { onStackChange: jest.fn() } as any);
                await service.init(sendActionMock, subscribeMock);

                await service.reloadQuickActions({
                    'sap.m.Table': [
                        {
                            controlId: 'mTable'
                        } as any
                    ],
                    'sap.m.NavContainer': [
                        {
                            controlId: 'NavContainer'
                        } as any
                    ]
                });

                const isActionExpected = testCase.isValidUI5Version;

                expect(sendActionMock).toHaveBeenCalledWith(
                    quickActionListChanged([
                        {
                            'actions': [
                                {
                                    'kind': 'nested',
                                    id: 'listReport0-create-table-action',
                                    title: 'Add Custom Table Action',
                                    tooltip: undefined,
                                    enabled: true,
                                    children: [
                                        {
                                            children: [],
                                            enabled: true,
                                            label: `'MyTable' table`
                                        }
                                    ]
                                },
                                {
                                    'children': [
                                        {
                                            'children': [],
                                            enabled: true,
                                            'label': `'MyTable' table`
                                        }
                                    ],
                                    'enabled': true,
                                    'id': 'listReport0-create-table-custom-column',
                                    'kind': 'nested',
                                    'tooltip': undefined,
                                    'title': 'Add Custom Table Column'
                                },
                                ...(isActionExpected
                                    ? [
                                        {
                                            'enabled': testCase.expectedIsEnabled,
                                            'id': 'listReport0-enable-table-filtering',
                                            'kind': 'simple',
                                            'title': 'Enable Table Filtering for Page Variants',
                                            'tooltip': testCase.expectedTooltip
                                        } as any
                                    ]
                                    : [])
                            ],
                            'title': 'LIST REPORT'
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-enable-table-filtering', kind: 'simple' })
                );
            });
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

                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'ObjectPageLayout') {
                        return {
                            getDomRef: () => ({}),
                            getParent: () => pageView,
                            getHeaderContent: () => {
                                return [new FlexBox()];
                            }
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new UIComponentMock();
                        const view = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getViewName.mockImplementation(
                            () => 'sap.suite.ui.generic.template.ObjectPage.view.Details'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        view.getContent.mockImplementation(() => {
                            return [componentContainer];
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return view;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );
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
                                    kind: 'simple',
                                    id: 'objectPage0-op-add-custom-section',
                                    title: 'Add Custom Section',
                                    enabled: true
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
        describe('add custom section', () => {
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

                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'ObjectPageLayout') {
                        return {
                            getDomRef: () => ({}),
                            getParent: () => pageView,
                            getHeaderContent: () => {
                                return [new FlexBox()];
                            }
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new UIComponentMock();
                        const view = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getViewName.mockImplementation(
                            () => 'sap.suite.ui.generic.template.ObjectPage.view.Details'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        view.getContent.mockImplementation(() => {
                            return [componentContainer];
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return view;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );
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
                                    kind: 'simple',
                                    id: 'objectPage0-op-add-custom-section',
                                    title: 'Add Custom Section',
                                    enabled: true
                                }
                            ]
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'objectPage0-op-add-custom-section', kind: 'simple' })
                );
                const { handler } = jest.requireMock<{ handler: () => Promise<void> }>(
                    '../../../../src/adp/init-dialogs'
                );

                expect(handler).toHaveBeenCalledWith(mockOverlay, rtaMock, 'AddFragment', undefined, {
                    aggregation: 'sections',
                    title: 'QUICK_ACTION_OP_ADD_CUSTOM_SECTION'
                });
            });
        });
        describe('create table action', () => {
            test('initialize and execute action', async () => {
                const pageView = new XMLView();
                const scrollIntoView = jest.fn();
                jest.spyOn(QCUtils, 'getParentContainer').mockImplementation((control: any, type: string) => {
                    if (type === 'sap.uxap.ObjectPageSection') {
                        // Return a mock object with the getSubSections method
                        return {
                            children: [2],
                            getSubSections: () => [{}, {}],
                            getTitle: () => 'section 01',
                            setSelectedSubSection: () => { }
                        };
                    }

                    if (type === 'sap.uxap.ObjectPageSubSection') {
                        // Return a new instance of ManagedObject
                        return new ManagedObject() as any;
                    }
                    // Return undefined if no match is found
                    return undefined;
                });
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'SmartTable') {
                        return {
                            isA: (type: string) => type === 'sap.ui.comp.smarttable.SmartTable',
                            getHeader: () => 'MyTable',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),

                            getAggregation: () => {
                                return [
                                    {
                                        getAggregation: () => 'headerToolbar'
                                    }
                                ];
                            },
                            getParent: () => pageView,
                            getBusy: () => false,
                            selectOverlay: () => ({})
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new UIComponentMock();
                        const view = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getViewName.mockImplementation(
                            () => 'sap.suite.ui.generic.template.ObjectPage.view.Details'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        view.getContent.mockImplementation(() => {
                            return [componentContainer];
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return view;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );

                await service.init(sendActionMock, subscribeMock);
                await service.reloadQuickActions({
                    'sap.ui.comp.smarttable.SmartTable': [
                        {
                            controlId: 'SmartTable'
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
                                    'kind': 'nested',
                                    id: 'objectPage0-create-table-action',
                                    title: 'Add Custom Table Action',
                                    enabled: true,
                                    children: [
                                        {
                                            enabled: true,
                                            children: [{ enabled: true, children: [], label: `'MyTable' table` }],
                                            label: `'section 01' section`
                                        }
                                    ]
                                },
                                {
                                    'children': [
                                        {
                                            enabled: true,
                                            'children': [{ enabled: true, 'children': [], 'label': `'MyTable' table` }],
                                            'label': `'section 01' section`
                                        }
                                    ],
                                    'enabled': true,
                                    'id': 'objectPage0-create-table-custom-column',
                                    'kind': 'nested',
                                    'title': 'Add Custom Table Column'
                                }
                            ]
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'objectPage0-create-table-action', kind: 'nested', path: '-1/0' })
                );

                const { handler } = jest.requireMock<{ handler: () => Promise<void> }>(
                    '../../../../src/adp/init-dialogs'
                );

                expect(handler).toHaveBeenCalledWith(mockOverlay, rtaMock, 'AddFragment', undefined, {
                    aggregation: 'content',
                    title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION'
                });
            });
        });

        describe('create table custom column', () => {
            const testCases = [
                {
                    tableType: M_TABLE_TYPE,
                    dialog: DialogNames.ADD_TABLE_COLUMN_FRAGMENTS,
                    toString: () => M_TABLE_TYPE
                },
                { tableType: TREE_TABLE_TYPE, dialog: DialogNames.ADD_FRAGMENT, toString: () => TREE_TABLE_TYPE },
                {
                    tableType: ANALYTICAL_TABLE_TYPE,
                    dialog: DialogNames.ADD_FRAGMENT,
                    toString: () => ANALYTICAL_TABLE_TYPE
                },
                { tableType: GRID_TABLE_TYPE, dialog: DialogNames.ADD_FRAGMENT, toString: () => GRID_TABLE_TYPE }
            ];
            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                const pageView = new XMLView();
                const scrollIntoView = jest.fn();
                jest.spyOn(QCUtils, 'getParentContainer').mockImplementation((control: any, type: string) => {
                    if (type === 'sap.uxap.ObjectPageSection') {
                        // Return a mock object with the getSubSections method
                        return {
                            children: [2],
                            getSubSections: () => [{}, {}],
                            getTitle: () => 'section 01',
                            setSelectedSubSection: () => { }
                        };
                    }

                    if (type === 'sap.uxap.ObjectPageSubSection') {
                        // Return a new instance of ManagedObject
                        return new ManagedObject() as any;
                    }

                    return undefined;
                });
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'SmartTable') {
                        return {
                            isA: (type: string) => type === SMART_TABLE_TYPE,
                            getHeader: () => 'MyTable',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),

                            getAggregation: () => {
                                return [
                                    {
                                        isA: (type: string) => type === testCase.tableType,
                                        getAggregation: () => 'columns'
                                    }
                                ];
                            },
                            getParent: () => pageView,
                            getBusy: () => false,
                            selectOverlay: () => ({})
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new UIComponentMock();
                        const view = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getViewName.mockImplementation(
                            () => 'sap.suite.ui.generic.template.ObjectPage.view.Details'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        view.getContent.mockImplementation(() => {
                            return [componentContainer];
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return view;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );

                await service.init(sendActionMock, subscribeMock);
                await service.reloadQuickActions({
                    'sap.ui.comp.smarttable.SmartTable': [
                        {
                            controlId: 'SmartTable'
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
                            'title': 'OBJECT PAGE',
                            'actions': [
                                {
                                    'children': [
                                        {
                                            enabled: true,
                                            'children': [{ enabled: true, 'children': [], 'label': `'MyTable' table` }],
                                            'label': `'section 01' section`
                                        }
                                    ],
                                    'enabled': true,
                                    'id': 'objectPage0-create-table-action',
                                    'kind': 'nested',
                                    'title': 'Add Custom Table Action'
                                },
                                {
                                    'children': [
                                        {
                                            enabled: true,
                                            'children': [
                                                {
                                                    'children': [],
                                                    enabled: true,
                                                    'label': `'MyTable' table`
                                                }
                                            ],
                                            'label': `'section 01' section`
                                        }
                                    ],
                                    'enabled': true,

                                    'id': 'objectPage0-create-table-custom-column',
                                    'kind': 'nested',
                                    'title': 'Add Custom Table Column'
                                }
                            ]
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({
                        id: 'objectPage0-create-table-custom-column',
                        kind: 'nested',
                        path: '-1/0'
                    })
                );

                const { handler } = jest.requireMock<{ handler: () => Promise<void> }>(
                    '../../../../src/adp/init-dialogs'
                );

                expect(handler).toHaveBeenCalledWith(mockOverlay, rtaMock, testCase.dialog, undefined, {
                    aggregation: 'columns',
                    title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
                });
            });
            test('displays warning when no rows loaded', async () => {
                const pageView = new XMLView();
                const scrollIntoView = jest.fn();
                jest.spyOn(QCUtils, 'getParentContainer').mockImplementation((control: any, type: string) => {
                    if (type === 'sap.uxap.ObjectPageSection') {
                        // Return a mock object with the getSubSections method
                        return {
                            children: [2],
                            getSubSections: () => [{}, {}],
                            getTitle: () => 'section 01',
                            setSelectedSubSection: () => { }
                        };
                    }

                    if (type === 'sap.uxap.ObjectPageSubSection') {
                        // Return a new instance of ManagedObject
                        return new ManagedObject() as any;
                    }

                    return undefined;
                });
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'SmartTable') {
                        return {
                            isA: (type: string) => type === SMART_TABLE_TYPE,
                            getHeader: () => 'MyTable',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),

                            getAggregation: () => {
                                return [
                                    {
                                        isA: (type: string) => type === M_TABLE_TYPE,
                                        getAggregation: () => []
                                    }
                                ];
                            },
                            getParent: () => pageView,
                            getBusy: () => false,
                            selectOverlay: () => ({})
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new UIComponentMock();
                        const view = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getViewName.mockImplementation(
                            () => 'sap.suite.ui.generic.template.ObjectPage.view.Details'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        view.getContent.mockImplementation(() => {
                            return [componentContainer];
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return view;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );

                await service.init(sendActionMock, subscribeMock);
                await service.reloadQuickActions({
                    'sap.ui.comp.smarttable.SmartTable': [
                        {
                            controlId: 'SmartTable'
                        } as any
                    ],
                    'sap.m.NavContainer': [
                        {
                            controlId: 'NavContainer'
                        } as any
                    ]
                });

                const notifySpy = jest.spyOn(adpUtils, 'notifyUser');

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({
                        id: 'objectPage0-create-table-custom-column',
                        kind: 'nested',
                        path: '-1/0'
                    })
                );

                expect(notifySpy).toHaveBeenCalledWith(
                    'At least one table row is required to create new custom column. Make sure the table data is loaded and try again.',
                    8000
                );
            });
        });
    });
    describe('AnalyticalListPage', () => {
        describe('create table custom column', () => {
            test('initialize and execute action (%s)', async () => {
                const pageView = new XMLView();
                const scrollIntoView = jest.fn();
                jest.spyOn(QCUtils, 'getParentContainer').mockImplementation(() => {
                    return undefined;
                });
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'SmartTable') {
                        return {
                            isA: (type: string) => type === SMART_TABLE_TYPE,
                            getHeader: () => 'MyTable',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),

                            getAggregation: () => {
                                return [
                                    {
                                        isA: (type: string) => type === ANALYTICAL_TABLE_TYPE,
                                        getAggregation: () => 'columns'
                                    }
                                ];
                            },
                            getParent: () => pageView,
                            getBusy: () => false,
                            selectOverlay: () => ({})
                        };
                    }
                    if (id == 'NavContainer') {
                        const container = new NavContainer();
                        const component = new UIComponentMock();
                        const view = new XMLView();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getViewName.mockImplementation(
                            () => 'sap.suite.ui.generic.template.AnalyticalListPage.view.AnalyticalListPage'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component;
                            }
                        });
                        view.getContent.mockImplementation(() => {
                            return [componentContainer];
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return view;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );

                await service.init(sendActionMock, subscribeMock);
                await service.reloadQuickActions({
                    'sap.ui.comp.smarttable.SmartTable': [
                        {
                            controlId: 'SmartTable'
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
                            'actions': [
                                {
                                    'children': [
                                        {
                                            'children': [],
                                            enabled: true,
                                            'label': `'MyTable' table`
                                        }
                                    ],
                                    'enabled': true,
                                    'id': 'analyticalListPage0-create-table-custom-column',
                                    'kind': 'nested',

                                    'title': 'Add Custom Table Column'
                                }
                            ],
                            'title': 'ANALYTICAL LIST PAGE'
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({
                        id: 'analyticalListPage0-create-table-custom-column',
                        kind: 'nested',
                        path: '0'
                    })
                );

                const { handler } = jest.requireMock<{ handler: () => Promise<void> }>(
                    '../../../../src/adp/init-dialogs'
                );

                expect(handler).toHaveBeenCalledWith(mockOverlay, rtaMock, DialogNames.ADD_FRAGMENT, undefined, {
                    aggregation: 'columns',
                    title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
                });
            });
        });
    });
});
