import FlexBox from 'sap/m/FlexBox';
import RuntimeAuthoring, { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';

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
                const service = new QuickActionService(rtaMock, new OutlineService(rtaMock), [registry]);
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
                const service = new QuickActionService(rtaMock, new OutlineService(rtaMock), [registry]);
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
                const service = new QuickActionService(rtaMock, new OutlineService(rtaMock), [registry]);
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
                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-create-table-action', kind: 'nested', path: '0' })
                );
                expect(scrollIntoView).toHaveBeenCalled();
                expect(execute).toHaveBeenCalledWith('SmartTable', 'CTX_COMP_VARIANT_CONTENT');
            });
        });

        describe('create table action', () => {
            beforeEach(() => {
                jest.spyOn(FeatureService, 'isFeatureEnabled').mockImplementation((feature: string) => {
                    if (feature === 'cpe.beta.quick-actions') {
                        return true;
                    }
                    return false;
                });
                FeatureService.isFeatureEnabled;
            });
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
                const service = new QuickActionService(rtaMock, new OutlineService(rtaMock), [registry]);
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
                                            label: `'MyTable' table`
                                        }
                                    ]
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
                const service = new QuickActionService(rtaMock, new OutlineService(rtaMock), [registry]);
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
                const service = new QuickActionService(rtaMock, new OutlineService(rtaMock), [registry]);
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
                const service = new QuickActionService(rtaMock, new OutlineService(rtaMock), [registry]);
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
                const service = new QuickActionService(rtaMock, new OutlineService(rtaMock), [registry]);

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
                                            children: [
                                                {
                                                    children: [],
                                                    label: '\'MyTable\' table'
                                                }
                                            ],
                                            label: '\'section 01\' section'
                                        }
                                    ]
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
    });
});
