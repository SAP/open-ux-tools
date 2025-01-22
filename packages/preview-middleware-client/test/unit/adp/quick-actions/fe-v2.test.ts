import FlexBox from 'sap/m/FlexBox';
import RuntimeAuthoring, { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import * as versionUtils from 'open/ux/preview/client/utils/version';

import {
    quickActionListChanged,
    executeQuickAction,
    QuickAction
} from '@sap-ux-private/control-property-editor-common';

import { QuickActionService } from '../../../../src/cpe/quick-actions/quick-action-service';
import { OutlineService } from '../../../../src/cpe/outline/service';
import { FeatureService } from '../../../../src/cpe/feature-service';

import FEV2QuickActionRegistry from '../../../../src/adp/quick-actions/fe-v2/registry';
import { attachBeforeClose } from 'mock/sap/ui/core/Fragment';
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
} from 'open/ux/preview/client/adp/quick-actions/control-types';
import { DialogFactory, DialogNames } from 'open/ux/preview/client/adp/dialog-factory';
import * as adpUtils from 'open/ux/preview/client/adp/utils';
import type { ChangeService } from '../../../../src/cpe/changes/service';
import VersionInfo from 'mock/sap/ui/VersionInfo';

describe('FE V2 quick actions', () => {
    let sendActionMock: jest.Mock;
    let subscribeMock: jest.Mock;
    const mockChangeService = {
        syncOutlineChanges: jest.fn()
    } as unknown as ChangeService;
    beforeEach(() => {
        sendActionMock = jest.fn();
        subscribeMock = jest.fn();
        jest.spyOn(DialogFactory, 'createDialog').mockResolvedValue();
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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const closeDialogFunction = attachBeforeClose.mock.calls[0]?.[0];
            if (typeof closeDialogFunction === 'function') {
                // make sure that dialog factory is in clean state after each test
                closeDialogFunction();
            }
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

                expect(DialogFactory.createDialog).toHaveBeenCalledWith(mockOverlay, rtaMock, 'ControllerExtension');
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

                expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                    mockOverlay,
                    rtaMock,
                    'AddFragment',
                    undefined,
                    {
                        aggregation: 'content',
                        title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION'
                    }
                );
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

                expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                    mockOverlay,
                    rtaMock,
                    'AddFragment',
                    undefined,
                    {
                        aggregation: 'actions',
                        title: 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION'
                    }
                );
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

                expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                    mockOverlay,
                    rtaMock,
                    testCase.dialog,
                    undefined,
                    {
                        aggregation: 'columns',
                        title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
                    }
                );
            });
        });

        describe('Enable Semantic Date Range', () => {
            const testCases: {
                validVersion: boolean;
                versionInfo: string;
                isManifestPagesAsArray: boolean;
                isAlp?: boolean;
            }[] = [
                {
                    validVersion: true,
                    versionInfo: '1.96.37',
                    isManifestPagesAsArray: false
                },
                {
                    validVersion: true,
                    versionInfo: '1.108.38',
                    isManifestPagesAsArray: false
                },
                {
                    validVersion: true,
                    versionInfo: '1.96.38',
                    isManifestPagesAsArray: false
                },
                {
                    validVersion: true,
                    versionInfo: '1.120.23',
                    isManifestPagesAsArray: false
                },
                {
                    validVersion: true,
                    versionInfo: '1.128',
                    isManifestPagesAsArray: false
                },
                {
                    validVersion: true,
                    versionInfo: '1.130',
                    isManifestPagesAsArray: false
                },
                {
                    validVersion: true,
                    versionInfo: '1.130',
                    isManifestPagesAsArray: false,
                    isAlp: true
                },
                {
                    validVersion: false,
                    versionInfo: '1.96.34',
                    isManifestPagesAsArray: false
                },
                {
                    validVersion: true,
                    versionInfo: '1.130',
                    isManifestPagesAsArray: true
                }
            ];
            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                VersionInfo.load.mockResolvedValue({ name: 'sap.ui.core', version: testCase.versionInfo });
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'SmartFilterBar') {
                        return {
                            isA: (type: string) =>
                                type ===
                                (testCase.isAlp
                                    ? 'sap.suite.ui.generic.template.AnalyticalListPage.control.SmartFilterBarExt'
                                    : 'sap.ui.comp.smartfilterbar.SmartFilterBar'),
                            getProperty: jest.fn().mockImplementation((name) => {
                                if (name === 'persistencyKey') {
                                    return 'filterbar';
                                }
                                return false;
                            }),
                            getUseDateRangeType: () => false,
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
                        pageView.getViewName.mockImplementation(() =>
                            testCase.isAlp
                                ? 'sap.suite.ui.generic.template.AnalyticalListPage.view.AnalyticalListPage'
                                : 'sap.suite.ui.generic.template.ListReport.view.ListReport'
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
                const pages = testCase.isManifestPagesAsArray
                    ? [{ name: 'test', id: 'test' }]
                    : { name: 'test', id: 'test' };
                jest.spyOn(rtaMock.getRootControlInstance(), 'getManifest').mockReturnValue({
                    'sap.ui.generic.app': {
                        pages
                    }
                });
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn(), getConfigurationPropertyValue: jest.fn() } as any
                );
                await service.init(sendActionMock, subscribeMock);
                await service.reloadQuickActions({
                    [testCase.isAlp
                        ? 'sap.suite.ui.generic.template.AnalyticalListPage.control.SmartFilterBarExt'
                        : 'sap.ui.comp.smartfilterbar.SmartFilterBar']: [
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
                            title: testCase.isAlp ? 'ANALYTICAL LIST PAGE' : 'LIST REPORT',
                            actions:
                                testCase.validVersion && !testCase.isManifestPagesAsArray
                                    ? [
                                          {
                                              'kind': 'simple',
                                              id: testCase.isAlp
                                                  ? 'analyticalListPage0-enable-semantic-daterange-filterbar'
                                                  : 'listReport0-enable-semantic-daterange-filterbar',
                                              title: 'Enable Semantic Date Range in Filter Bar',
                                              enabled: true
                                          }
                                      ]
                                    : []
                        }
                    ])
                );
                if (testCase.validVersion && !testCase.isManifestPagesAsArray) {
                    await subscribeMock.mock.calls[0][0](
                        executeQuickAction({
                            id: testCase.isAlp
                                ? 'analyticalListPage0-enable-semantic-daterange-filterbar'
                                : 'listReport0-enable-semantic-daterange-filterbar',
                            kind: 'simple'
                        })
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
                                    'component': testCase.isAlp
                                        ? 'sap.suite.ui.generic.template.AnalyticalListPage'
                                        : 'sap.suite.ui.generic.template.ListReport',
                                    'entitySet': 'testEntity'
                                }
                            },
                            'reference': undefined
                        }
                    });
                }
            });
        });

        describe('Enable Table Filtering', () => {
            const testCases: {
                visible: boolean;
                ui5version: string;
                expectedIsEnabled: boolean;
                isValidUI5Version: boolean;
                expectedTooltip?: string;
            }[] = [
                {
                    visible: false,
                    ui5version: '1.124.0',
                    expectedIsEnabled: true,
                    isValidUI5Version: false
                },
                {
                    visible: false,
                    ui5version: '1.96.0',
                    expectedIsEnabled: true,
                    isValidUI5Version: false
                },
                {
                    visible: false,
                    ui5version: '1.96.37',
                    expectedIsEnabled: true,
                    isValidUI5Version: true
                },
                {
                    visible: false,
                    ui5version: '1.130.0',
                    expectedIsEnabled: true,
                    isValidUI5Version: true
                },
                {
                    visible: true,
                    ui5version: '1.108.38',
                    expectedIsEnabled: false,
                    isValidUI5Version: true,
                    expectedTooltip:
                        'This option is disabled because table filtering for page variants is already enabled'
                }
            ];
            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                const pageView = new XMLView();
                VersionInfo.load.mockResolvedValue({ name: 'sap.ui.core', version: testCase.ui5version });
                const scrollIntoView = jest.fn();
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'mTable') {
                        return {
                            isA: (type: string) => type === 'sap.m.Table',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),
                            getProperty: jest.fn().mockImplementation((name) => {
                                if (name === 'persistencyKey') {
                                    return 'table';
                                }
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
                                        }
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

                const pages = { name: 'test', id: 'test' };
                jest.spyOn(rtaMock.getRootControlInstance(), 'getManifest').mockReturnValue({
                    'sap.ui.generic.app': {
                        pages
                    }
                });
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    {
                        onStackChange: jest.fn(),
                        getConfigurationPropertyValue: jest.fn().mockReturnValue(undefined)
                    } as any
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

        describe('create new annotation file', () => {
            const pageView = new XMLView();
            let rtaMock: RuntimeAuthoring;
            beforeEach(async () => {
                jest.clearAllMocks();
                jest.spyOn(versionUtils, 'getUi5Version').mockResolvedValue({ major: 1, minor: 132, patch: 0 });
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
                    json: jest.fn().mockReturnValue({
                        isRunningInBAS: false,
                        annotationDataSourceMap: {
                            mainService: {
                                serviceUrl: 'main/service/url',
                                isRunningInBAS: false,
                                annotationDetails: {
                                    annotationExistsInWS: false
                                }
                            },
                            dataService: {
                                serviceUrl: 'data/service/url',
                                isRunningInBAS: false,
                                annotationDetails: {
                                    annotationExistsInWS: true,
                                    annotationPath: 'mock/adp/project/annotation/path',
                                    annotationPathFromRoot: 'mock/adp.project.annotation/path'
                                }
                            }
                        }
                    }),
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

                rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
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
                    ],
                    'sap.ui.core.XMLView': [
                        {
                            controlId: 'ListReportView'
                        } as any
                    ]
                });
            });
            test('initialize and execute action', async () => {
                jest.spyOn(Date, 'now').mockReturnValue(1736143853603);
                expect(sendActionMock).toHaveBeenCalledWith(
                    quickActionListChanged([
                        {
                            title: 'LIST REPORT',
                            actions: [
                                {
                                    kind: 'simple',
                                    id: 'listReport0-add-controller-to-page',
                                    title: 'Add Controller to Page',
                                    enabled: true,
                                    tooltip: undefined
                                },
                                {
                                    kind: 'nested',
                                    id: 'listReport0-add-new-annotation-file',
                                    title: 'Add Local Annotation File',
                                    enabled: true,
                                    children: [
                                        {
                                            children: [],
                                            enabled: true,
                                            label: 'Add Annotation File for \'\'{0}\'\''
                                        },
                                        {
                                            children: [],
                                            enabled: true,
                                            label: 'Show Annotation File for \'\'{0}\'\''
                                        }
                                    ]
                                }
                            ]
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-add-new-annotation-file', kind: 'nested', path: '0' })
                );
                expect(rtaMock.getCommandStack().pushAndExecute).toHaveBeenCalledWith({
                    settings: {},
                    type: 'annotation',
                    value: {
                        changeType: 'appdescr_app_addAnnotationsToOData',
                        content: {
                            annotations: ['annotation.annotation_1736143853603'],
                            annotationsInsertPosition: 'END',
                            dataSource: {
                                'annotation.annotation_1736143853603': {
                                    type: 'ODataAnnotation',
                                    uri: 'annotations/annotation_1736143853603.xml'
                                }
                            },
                            dataSourceId: 'mainService',
                            reference: undefined
                        },
                        fileName: 'id_1736143853603_addAnnotationsToOData',
                        generator: undefined,
                        serviceUrl: 'main/service/url'
                    }
                });
            });
            test('initialize and execute action - when file exists', async () => {
                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-add-new-annotation-file', kind: 'nested', path: '1' })
                );
                expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                    mockOverlay,
                    rtaMock,
                    'FileExistsDialog',
                    undefined,
                    {
                        fileName: 'mock/adp.project.annotation/path',
                        filePath: 'mock/adp/project/annotation/path',
                        isRunningInBAS: false
                    }
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

                expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                    mockOverlay,
                    rtaMock,
                    'AddFragment',
                    undefined,
                    {
                        aggregation: 'items',
                        title: 'QUICK_ACTION_OP_ADD_HEADER_FIELD'
                    }
                );
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

                expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                    mockOverlay,
                    rtaMock,
                    'AddFragment',
                    undefined,
                    {
                        aggregation: 'sections',
                        title: 'QUICK_ACTION_OP_ADD_CUSTOM_SECTION'
                    }
                );
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
                            setSelectedSubSection: () => {}
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

                            getAggregation: (aggregationName: string) => {
                                if (aggregationName === 'items') {
                                    return [
                                        {
                                            isA: (type: string) => type === 'sap.ui.table.Table',
                                            getAggregation: () => 'item' // Mock inner aggregation for table rows
                                        },
                                        {
                                            isA: (type: string) => type === 'sap.m.Table',
                                            getAggregation: () => 'item' // Mock another type of table
                                        }
                                    ];
                                } else if (aggregationName === 'headerToolbar') {
                                    return 'headerToolbar'; // Return a simple string for headerToolbar
                                }
                                return [];
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
                    executeQuickAction({ id: 'objectPage0-create-table-action', kind: 'nested', path: '0/0' })
                );

                expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                    mockOverlay,
                    rtaMock,
                    'AddFragment',
                    undefined,
                    {
                        aggregation: 'content',
                        title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION'
                    }
                );
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
                            setSelectedSubSection: () => {}
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

                            getAggregation: (aggregationName: string) => {
                                if (aggregationName === 'items') {
                                    return [
                                        {
                                            isA: (type: string) => type === testCase.tableType,
                                            getAggregation: () => 'item'
                                        }
                                    ];
                                } else if (aggregationName === 'headerToolbar') {
                                    return 'headerToolbar'; // Mock headerToolbar aggregation
                                } else if (aggregationName === 'columns') {
                                    return [
                                        {
                                            isA: (type: string) => type === testCase.tableType,
                                            getAggregation: () => 'columns' // Mock column aggregation
                                        }
                                    ];
                                }
                                return [];
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

                // filter out irrelevant actions
                const actions = (sendActionMock.mock.calls[0][0].payload[0]?.actions as QuickAction[]) ?? [];
                for (let i = actions.length - 1; i >= 0; i--) {
                    if (actions[i].title !== 'Add Custom Table Column') {
                        actions.splice(i, 1);
                    }
                }

                expect(sendActionMock).toHaveBeenCalledWith(
                    quickActionListChanged([
                        {
                            'title': 'OBJECT PAGE',
                            'actions': [
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
                        path: '0/0'
                    })
                );

                expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                    mockOverlay,
                    rtaMock,
                    testCase.dialog,
                    undefined,
                    {
                        aggregation: 'columns',
                        title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
                    }
                );
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
                            setSelectedSubSection: () => {}
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
                        path: '0/0'
                    })
                );

                expect(notifySpy).toHaveBeenCalledWith(
                    'At least one table row is required to create new custom column. Make sure the table data is loaded and try again.',
                    8000
                );
            });
        });

        describe('enable creation table rows', () => {
            const testCases: {
                innerTableType: string;
                toString: () => string;
                ui5version?: versionUtils.Ui5VersionInfo;
                value?: string;
                parentEntitySet?: string;
                tableSectionId?: string;
                expectDisabledReason?: string;
                expectUnsupported?: boolean;
                expectToThrow?: string;
                manifestPages?: Object;
            }[] = [
                {
                    innerTableType: M_TABLE_TYPE,
                    toString: () => SMART_TABLE_TYPE + ', supported version',
                    ui5version: { major: 1, minor: 120, patch: 23 }
                },
                {
                    innerTableType: M_TABLE_TYPE,
                    toString: () => 'row creation already enabled',
                    value: 'creationRows',
                    expectDisabledReason:
                        'This option has been disabled because empty row mode is already enabled for this table'
                },
                {
                    innerTableType: M_TABLE_TYPE,
                    toString: () => 'unsupported UI5 version',
                    ui5version: { major: 1, minor: 120, patch: 22 },
                    expectUnsupported: true
                },
                {
                    innerTableType: M_TABLE_TYPE,
                    toString: () => 'empty entity set',
                    parentEntitySet: '',
                    expectToThrow: 'Internal error. Object Page entity set not found'
                },
                {
                    innerTableType: M_TABLE_TYPE,
                    toString: () => 'empty table section id',
                    tableSectionId: '',
                    expectToThrow: 'Internal error. Table sectionId property not found'
                },
                {
                    innerTableType: M_TABLE_TYPE,
                    toString: () => 'unsupported pages array manifest structure',
                    manifestPages: [],
                    expectUnsupported: true
                },
                {
                    innerTableType: GRID_TABLE_TYPE,
                    toString: () => GRID_TABLE_TYPE
                },
                {
                    innerTableType: TREE_TABLE_TYPE,
                    toString: () => TREE_TABLE_TYPE,
                    expectDisabledReason:
                        'This action is disabled because empty row mode is not supported for analytical and tree tables'
                },
                {
                    innerTableType: ANALYTICAL_TABLE_TYPE,
                    toString: () => ANALYTICAL_TABLE_TYPE,
                    expectDisabledReason:
                        'This action is disabled because empty row mode is not supported for analytical and tree tables'
                }
            ];
            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                jest.spyOn(versionUtils, 'getUi5Version').mockResolvedValue(
                    testCase.ui5version ?? { major: 1, minor: 131 }
                );

                const pageView = new XMLView();
                pageView.getParent.mockReturnValue({
                    getProperty: (propName: string) => {
                        if (propName === 'entitySet') {
                            return testCase.parentEntitySet ?? 'DummyEntitySet';
                        } else {
                            return undefined;
                        }
                    }
                });
                const scrollIntoView = jest.fn();
                const actionId = 'objectPage0-enable-table-empty-row-mode';

                const setSelectedSubSectionMock = jest.fn();
                const fakeSubSection = new ManagedObject() as any;
                jest.spyOn(QCUtils, 'getParentContainer').mockImplementation((control: any, type: string) => {
                    if (type === 'sap.uxap.ObjectPageSection') {
                        // Return a mock object with the getSubSections method
                        return {
                            children: [2],
                            getSubSections: () => [{}, {}],
                            getTitle: () => 'section 01',
                            setSelectedSubSection: setSelectedSubSectionMock
                        };
                    }

                    if (type === 'sap.uxap.ObjectPageSubSection') {
                        // Return a new instance of ManagedObject
                        return fakeSubSection;
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

                            getAggregation: (aggregationName: string) => {
                                if (aggregationName === 'items') {
                                    return [
                                        {
                                            isA: (type: string) => type === testCase.innerTableType,
                                            getAggregation: () => 'item'
                                        }
                                    ];
                                }

                                return [];
                            },
                            getParent: () => pageView,
                            getBusy: () => false,
                            selectOverlay: () => ({}),
                            data: (key: string) => {
                                if (key === 'creationMode') {
                                    return testCase.value ?? 'inline';
                                }
                                if (key === 'sectionId') {
                                    return testCase.tableSectionId ?? 'DummyTableSectionID';
                                }
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
                rtaMock.getRootControlInstance = jest.fn().mockReturnValue({
                    getManifest: jest.fn().mockReturnValue({
                        ['sap.ui.generic.app']: {
                            pages: testCase.manifestPages ?? {}
                        }
                    })
                });
                const registry = new FEV2QuickActionRegistry();
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );

                CommandFactory.getCommandFor.mockImplementation((control, type, value, _, settings) => {
                    return { type, value, settings };
                });

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

                // filter out irrelevant actions
                const actions = (sendActionMock.mock.calls[0][0].payload[0]?.actions as QuickAction[]) ?? [];
                for (let i = actions.length - 1; i >= 0; i--) {
                    if (actions[i].title !== 'Enable Empty Row Mode for Tables') {
                        actions.splice(i, 1);
                    }
                }

                let thrown;
                try {
                    await subscribeMock.mock.calls[0][0](
                        executeQuickAction({
                            id: actionId,
                            kind: 'nested',
                            path: '0/0'
                        })
                    );
                } catch (e) {
                    thrown = (e as Error).message;
                }

                expect(thrown).toBe(testCase.expectToThrow);

                expect(sendActionMock).toHaveBeenNthCalledWith(
                    1,
                    quickActionListChanged([
                        {
                            title: 'OBJECT PAGE',
                            actions: testCase.expectUnsupported
                                ? []
                                : [
                                      {
                                          kind: 'nested',
                                          id: actionId,
                                          enabled: true,
                                          tooltip: undefined,
                                          title: 'Enable Empty Row Mode for Tables',
                                          children: [
                                              {
                                                  'children': [
                                                      {
                                                          'children': [],
                                                          'enabled': !testCase.expectDisabledReason,
                                                          'label': `'MyTable' table`,
                                                          tooltip: testCase.expectDisabledReason
                                                      }
                                                  ],
                                                  'enabled': true,
                                                  'label': `'section 01' section`
                                              }
                                          ]
                                      }
                                  ]
                        }
                    ])
                );

                if (testCase.expectUnsupported || testCase.expectToThrow) {
                    expect(mockOverlay.setSelected).toHaveBeenCalledTimes(0);
                    expect(setSelectedSubSectionMock).toHaveBeenCalledTimes(0);
                    expect(rtaMock.getCommandStack().pushAndExecute).toHaveBeenCalledTimes(0);
                } else {
                    expect(mockOverlay.setSelected).toHaveBeenCalledWith(true);
                    expect(setSelectedSubSectionMock).toHaveBeenCalledWith(fakeSubSection);
                    expect(rtaMock.getCommandStack().pushAndExecute).toHaveBeenCalledWith({
                        'settings': {},
                        'type': 'appDescriptor',
                        'value': {
                            'changeType': 'appdescr_ui_generic_app_changePageConfiguration',
                            'parameters': {
                                'entityPropertyChange': {
                                    'operation': 'UPSERT',
                                    'propertyPath': 'component/settings/sections/DummyTableSectionID/createMode',
                                    'propertyValue': 'creationRows'
                                },
                                'parentPage': {
                                    'component': 'sap.suite.ui.generic.template.ObjectPage',
                                    'entitySet': 'DummyEntitySet'
                                }
                            },
                            'reference': undefined
                        }
                    });
                }
            });
        });
    });

    describe('AnalyticalListPage', () => {
        describe('create table custom column', () => {
            test('initialize and execute action', async () => {
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
                                    'id': 'analyticalListPage0-create-table-action',
                                    'kind': 'nested',
                                    'title': 'Add Custom Table Action',
                                    'tooltip': undefined
                                },
                                {
                                    'children': [
                                        {
                                            'children': [],
                                            'enabled': true,
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

                expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                    mockOverlay,
                    rtaMock,
                    DialogNames.ADD_FRAGMENT,
                    undefined,
                    {
                        aggregation: 'columns',
                        title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
                    }
                );
            });
        });
    });
});
