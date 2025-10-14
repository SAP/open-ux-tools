import FlexBox from 'sap/m/FlexBox';
import RuntimeAuthoring, { FlexSettings, RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import * as versionUtils from 'open/ux/preview/client/utils/version';
import type AppComponentV2 from 'sap/suite/ui/generic/template/lib/AppComponent';

import {
    quickActionListChanged,
    executeQuickAction,
    QuickAction,
    MessageBarType,
    showInfoCenterMessage
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
import OverlayRegistry from 'mock/sap/ui/dt/OverlayRegistry';
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
import ComponentMock from 'mock/sap/ui/core/Component';
import UIComponent from 'sap/ui/core/UIComponent';
import Model from 'sap/ui/model/Model';
import { EntityContainer, EntitySet, EntityType, NavigationProperty } from 'sap/ui/model/odata/ODataMetaModel';
import * as utils from 'open/ux/preview/client/adp/quick-actions/fe-v2/utils';
import ObjectPageSubSection from 'sap/uxap/ObjectPageSubSection';
import * as appUtils from 'open/ux/preview/client/utils/application';
import * as cpeCommon from '@sap-ux-private/control-property-editor-common';
import { CommunicationService } from 'open/ux/preview/client/cpe/communication-service';

let telemetryEventIdentifier: string;
const mockTelemetryEventIdentifier = () => {
    telemetryEventIdentifier = new Date().toISOString();
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(telemetryEventIdentifier);
};

describe('FE V2 quick actions', () => {
    jest.spyOn(adpUtils, 'checkForExistingChange').mockReturnValue(false);
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
                                return component as unknown as ComponentMock;
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
            mockTelemetryEventIdentifier();
            let reportTelemetrySpy: jest.SpyInstance;
            beforeEach(() => {
                jest.clearAllMocks();

                reportTelemetrySpy = jest.spyOn(cpeCommon, 'reportTelemetry');
                jest.spyOn(appUtils, 'getApplicationType').mockReturnValue('fe-v2');
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
                                return component as unknown as ComponentMock;
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

                expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                    mockOverlay,
                    rtaMock,
                    'ControllerExtension',
                    undefined,
                    {},
                    expect.objectContaining({ actionName: 'add-controller-to-page' })
                );

                expect(reportTelemetrySpy).toHaveBeenCalledWith({
                    category: 'QuickAction',
                    actionName: 'add-controller-to-page',
                    telemetryEventIdentifier,
                    quickActionSteps: 2,
                    ui5Version: '1.130.0',
                    appType: 'fe-v2'
                });
            });

            test('initialize and execute action for existing controller change', async () => {
                jest.spyOn(adpUtils, 'checkForExistingChange').mockReturnValueOnce(true);
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
                                return component as unknown as ComponentMock;
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
                                    enabled: false,
                                    tooltip:
                                        'This action is disabled because a pending change for a controller extension has been found. '
                                }
                            ]
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-add-controller-to-page', kind: 'simple' })
                );

                expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                    mockOverlay,
                    rtaMock,
                    'ControllerExtension',
                    undefined,
                    {},
                    expect.objectContaining({ actionName: 'add-controller-to-page' })
                );
            });
        });

        describe('change table columns', () => {
            const testCases: {
                tableType: typeof SMART_TABLE_TYPE;
                versionInfo: string;
                actionId: 'CTX_COMP_VARIANT_CONTENT' | 'CTX_SETTINGS';
                expectActionAvailable: boolean;
                isTableNotLoaded?: boolean;
                isWithIconTabBar?: boolean;
                variantManagementDisabled?: boolean;
            }[] = [
                {
                    tableType: SMART_TABLE_TYPE,
                    versionInfo: '1.96.0',
                    actionId: 'CTX_SETTINGS',
                    expectActionAvailable: true
                },
                {
                    tableType: SMART_TABLE_TYPE,
                    versionInfo: '1.127.0',
                    actionId: 'CTX_COMP_VARIANT_CONTENT',
                    expectActionAvailable: true
                },
                {
                    tableType: SMART_TABLE_TYPE,
                    versionInfo: '1.127.0',
                    actionId: 'CTX_COMP_VARIANT_CONTENT',
                    expectActionAvailable: true,
                    isWithIconTabBar: true
                },
                {
                    tableType: SMART_TABLE_TYPE,
                    versionInfo: '1.127.0',
                    actionId: 'CTX_COMP_VARIANT_CONTENT',
                    expectActionAvailable: true,
                    isWithIconTabBar: true,
                    variantManagementDisabled: true
                }
            ];
            const setSelectedKeyMock = jest.fn();
            test.each(testCases)('initialize and execute (%s)', async (testCase) => {
                VersionInfo.load.mockResolvedValue({
                    name: 'SAPUI5 Distribution',
                    libraries: [{ name: 'sap.ui.core', version: testCase.versionInfo }]
                });
                const pageView = new XMLView();
                const scrollIntoView = jest.fn();
                let attachedEvent: (() => Promise<void>) | undefined = undefined;
                const tableId = 'SmartTable' + testCase.isWithIconTabBar ? '-tab1' : '';
                if (testCase.variantManagementDisabled) {
                    jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                        return {
                            isA: (type: string) => type === 'sap.suite.ui.generic.template.ObjectPage.Component',
                            getAppComponent: jest.fn().mockReturnValue({})
                        } as unknown as UIComponent;
                    });
                }
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == tableId) {
                        return {
                            isA: (type: string) => type === testCase.tableType,
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
                            getHeaderToolbar: () => ({
                                getTitleControl: () => ({
                                    getText: () => 'MyTable'
                                })
                            }),
                            getBindingInfo: () => undefined,
                            getBindingContext: () => !testCase.isTableNotLoaded,
                            attachEventOnce: (name: string, handler: () => Promise<void>) => {
                                attachedEvent = handler;
                            },
                            ...(testCase.variantManagementDisabled && {
                                getVariantManagement: () => false
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
                                return component as unknown as ComponentMock;
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
                    if ((id = 'IconTabBar')) {
                        return {
                            getParent: () => pageView,
                            getId: () => id,
                            isA: (type: string) => type === 'sap.m.IconTabBar',
                            setSelectedKey: setSelectedKeyMock,
                            getItems: () => [
                                {
                                    isA: (type: string) =>
                                        ['sap.m.IconTabFilter', 'sap.ui.base.ManagedObject'].includes(type),
                                    getKey: () => 'tab1',
                                    getText: () => 'Tab 1'
                                }
                            ]
                        };
                    }
                });

                const execute = jest.fn();
                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                jest.spyOn(rtaMock, 'getService').mockImplementation((serviceName: string): any => {
                    if (serviceName === 'action') {
                        return {
                            get: (controlId: string) => {
                                if (controlId === tableId) {
                                    return [{ id: testCase.actionId }];
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
                    {
                        ...mockChangeService,
                        onStackChange: jest.fn(),
                        getConfigurationPropertyValue: jest.fn().mockReturnValue(undefined)
                    } as any
                );
                await service.init(sendActionMock, subscribeMock);

                await service.reloadQuickActions({
                    [testCase.tableType]: [
                        {
                            controlId: tableId
                        } as any
                    ],
                    'sap.m.NavContainer': [
                        {
                            controlId: 'NavContainer'
                        } as any
                    ],

                    'sap.m.IconTabBar': testCase.isWithIconTabBar
                        ? [
                              {
                                  controlId: 'IconTabBar'
                              } as any
                          ]
                        : []
                });

                // filter out irrelevant actions
                const actions = (sendActionMock.mock.calls[0][0].payload[0]?.actions as QuickAction[]) ?? [];
                for (let i = actions.length - 1; i >= 0; i--) {
                    if (actions[i].title !== 'Change Table Columns') {
                        actions.splice(i, 1);
                    }
                }

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
                                            path: '0',
                                            children: [],
                                            enabled: testCase.variantManagementDisabled ? false : true,
                                            ...(testCase.variantManagementDisabled && {
                                                tooltip:
                                                    'This action has been disabled because variant management is disabled. Enable variant management and try again.'
                                            }),
                                            label: testCase.isWithIconTabBar ? `'Tab 1' table` : `'MyTable' table`
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
                if (testCase.isTableNotLoaded) {
                    expect(attachedEvent).toBeDefined();
                    await attachedEvent!();
                } else {
                    expect(attachedEvent).toBeUndefined();
                }

                expect(setSelectedKeyMock.mock.calls[0]).toStrictEqual(
                    testCase.isWithIconTabBar ? ['tab1'] : undefined
                );

                expect(scrollIntoView).toHaveBeenCalled();
                expect(execute).toHaveBeenCalledWith(
                    tableId,
                    testCase.expectActionAvailable ? testCase.actionId : undefined
                );
            });
        });

        describe('create table action', () => {
            type TableToolbar = 'None' | 'toolbarAggregation' | 'ItemAggregation' | 'smartTableProperty';

            interface TestCase {
                tableType: string;
                tableToolbar: TableToolbar;
                expectedToolbarID: string;
            }
            const testCases: TestCase[] = [
                {
                    tableType: M_TABLE_TYPE,
                    tableToolbar: 'toolbarAggregation',
                    expectedToolbarID: 'dummyMTableToolbar'
                },
                {
                    tableType: SMART_TABLE_TYPE,
                    tableToolbar: 'toolbarAggregation',
                    expectedToolbarID: 'dummyToolbar'
                },
                {
                    tableType: SMART_TABLE_TYPE,
                    tableToolbar: 'smartTableProperty',
                    expectedToolbarID: 'dummyPropertyToolbar'
                },
                { tableType: SMART_TABLE_TYPE, tableToolbar: 'None', expectedToolbarID: '' },
                {
                    tableType: SMART_TABLE_TYPE,
                    tableToolbar: 'ItemAggregation',
                    expectedToolbarID: 'dummyOverflowToolbar'
                }
            ];
            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
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
                            getAggregation: () => {
                                return {
                                    id: 'dummyMTableToolbar'
                                }; // Return a simple string for headerToolbar
                            },
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
                    if (id == 'smartTable') {
                        return {
                            isA: (type: string) => type === SMART_TABLE_TYPE,
                            getHeader: () => 'MyTable',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),

                            getToolbar: () => {
                                if (testCase.tableToolbar == 'smartTableProperty') {
                                    return {
                                        id: 'dummyPropertyToolbar'
                                    };
                                } else {
                                    return null;
                                }
                            },
                            getAggregation: (aggregationName: string) => {
                                if (aggregationName === 'items') {
                                    if (testCase.tableToolbar === 'toolbarAggregation') {
                                        return [
                                            {
                                                isA: (type: string) => type === testCase.tableType,
                                                getAggregation: (aggregationName: string) => {
                                                    if (aggregationName === 'headerToolbar') {
                                                        return {
                                                            id: 'dummyToolbar'
                                                        }; // Return a simple string for headerToolbar
                                                    }
                                                }
                                            }
                                        ];
                                    } else if (testCase.tableToolbar === 'ItemAggregation') {
                                        return [
                                            {
                                                getAggregation: () => null,
                                                isA: (type: string) => type === 'sap.m.OverflowToolbar',
                                                id: 'dummyOverflowToolbar'
                                            }
                                        ];
                                    } else {
                                        return [
                                            {
                                                getAggregation: () => null,
                                                isA: (type: string) => type === 'test'
                                            }
                                        ];
                                    }
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
                            () => 'sap.suite.ui.generic.template.ListReport.view.ListReport'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component as unknown as ComponentMock;
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

                if (testCase.tableType === M_TABLE_TYPE) {
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
                } else if (testCase.tableType === SMART_TABLE_TYPE) {
                    await service.reloadQuickActions({
                        'sap.ui.comp.smarttable.SmartTable': [
                            {
                                controlId: 'smartTable'
                            } as any
                        ],

                        'sap.m.NavContainer': [
                            {
                                controlId: 'NavContainer'
                            } as any
                        ]
                    });
                }

                expect(sendActionMock).toHaveBeenCalledWith(
                    quickActionListChanged([
                        {
                            title: 'LIST REPORT',
                            actions: [
                                {
                                    kind: 'nested',
                                    id: 'listReport0-create-table-action',
                                    title: 'Add Custom Table Action',
                                    enabled: true,
                                    children: [
                                        {
                                            path: '0',
                                            children: [],
                                            enabled: !(testCase.tableToolbar === 'None'),
                                            label: `'MyTable' table`,
                                            ...(testCase.tableToolbar === 'None' && {
                                                tooltip:
                                                    'This option has been disabled because the table does not have a header toolbar.'
                                            })
                                        }
                                    ]
                                },
                                {
                                    children: [
                                        {
                                            path: '0',
                                            children: [],
                                            enabled: true,
                                            label: `'MyTable' table`
                                        }
                                    ],
                                    enabled: true,
                                    id: 'listReport0-create-table-custom-column',
                                    kind: 'nested',
                                    title: 'Add Custom Table Column'
                                }
                            ]
                        }
                    ])
                );
                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-create-table-action', kind: 'nested', path: '0' })
                );

                expect(DialogFactory.createDialog).toHaveBeenCalledTimes(testCase.tableToolbar === 'None' ? 0 : 1);

                if (testCase.tableToolbar !== 'None') {
                    expect(OverlayRegistry.getOverlay.mock.calls[0][0].id).toBe(testCase.expectedToolbarID);
                    expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                        mockOverlay,
                        rtaMock,
                        'AddFragment',
                        undefined,
                        {
                            aggregation: 'content',
                            defaultAggregationArrayIndex: 1,
                            title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION'
                        },
                        expect.objectContaining({ actionName: 'create-table-action' })
                    );
                }
            });
        });

        describe('add page action', () => {
            test('initialize and execute action', async () => {
                mockTelemetryEventIdentifier();
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
                                return component as unknown as ComponentMock;
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
                        'defaultAggregationArrayIndex': 1,
                        title: 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION'
                    },
                    { actionName: 'add-page-action', telemetryEventIdentifier }
                );
            });
        });

        describe('create table custom column', () => {
            const testCases = [
                {
                    tableType: M_TABLE_TYPE,
                    dialog: DialogNames.ADD_TABLE_COLUMN_FRAGMENTS,
                    toString: () => M_TABLE_TYPE,
                    enabled: false
                },
                {
                    tableType: TREE_TABLE_TYPE,
                    dialog: DialogNames.ADD_FRAGMENT,
                    toString: () => TREE_TABLE_TYPE,
                    enabled: true
                },
                {
                    tableType: ANALYTICAL_TABLE_TYPE,
                    dialog: DialogNames.ADD_FRAGMENT,
                    toString: () => ANALYTICAL_TABLE_TYPE,
                    enabled: true
                },
                {
                    tableType: GRID_TABLE_TYPE,
                    dialog: DialogNames.ADD_FRAGMENT,
                    toString: () => GRID_TABLE_TYPE,
                    enabled: true
                }
            ];
            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                mockTelemetryEventIdentifier();
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
                            () => 'sap.suite.ui.generic.template.ListReport.view.ListReport'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component as unknown as ComponentMock;
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
                                            path: '0',
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
                                            path: '0',
                                            'children': [],
                                            'enabled': testCase.enabled,
                                            tooltip: testCase.enabled
                                                ? undefined
                                                : 'This action has been disabled because the table rows are not available. Please load the table data and try again.',
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
                if (testCase.enabled) {
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
                        },
                        { actionName: 'create-table-custom-column', telemetryEventIdentifier }
                    );
                }
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
                },
                {
                    validVersion: true,
                    versionInfo: '1.134.0',
                    isManifestPagesAsArray: true
                }
            ];
            beforeEach(() => {
                jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                    return {
                        isA: (type: string) => type === 'sap.suite.ui.generic.template.lib.TemplateComponent',
                        getAppComponent: jest.fn().mockReturnValue({})
                    } as unknown as UIComponent;
                });
            });
            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                VersionInfo.load.mockResolvedValue({
                    name: 'SAPUI5 Distribution',
                    libraries: [{ name: 'sap.ui.core', version: testCase.versionInfo }]
                });
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
                            getEntitySet: jest.fn().mockImplementation(() => 'testEntity'),
                            getId: jest
                                .fn()
                                .mockImplementation(
                                    () => 's2p.template.ListReport.view.ListReport::testEntity--listReportFilter'
                                ),
                            data: (key: string) => {
                                if (key === 'useDateRangeType') {
                                    return false;
                                }
                            }
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
                                return component as unknown as ComponentMock;
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
                                    : testCase.versionInfo === '1.134.0' && testCase.isManifestPagesAsArray // support manifest pages as array from version 1.134 and above
                                    ? [
                                          {
                                              enabled: true,
                                              id: 'listReport0-enable-semantic-daterange-filterbar',
                                              kind: 'simple',
                                              title: 'Enable Semantic Date Range in Filter Bar',
                                              tooltip: undefined
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
                            'appComponent': {},
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
                VersionInfo.load.mockResolvedValue({
                    name: 'SAPUI5 Distribution',
                    libraries: [{ name: 'sap.ui.core', version: testCase.ui5version }]
                });
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
                                return component as unknown as ComponentMock;
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
                                            path: '0',
                                            children: [],
                                            enabled: true,
                                            label: `'MyTable' table`
                                        }
                                    ]
                                },
                                {
                                    'children': [
                                        {
                                            path: '0',
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
            const testCases: {
                metadataReadErrorMsg: string | undefined;
            }[] = [
                {
                    metadataReadErrorMsg: 'Metadata fetch error'
                },
                {
                    metadataReadErrorMsg: undefined
                }
            ];
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
                jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                    return {
                        isA: (type: string) => type === 'sap.suite.ui.generic.template.lib.TemplateComponent',
                        getAppComponent: jest.fn().mockReturnValue({})
                    } as unknown as UIComponent;
                });
            });

            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                fetchMock.mockResolvedValue({
                    json: jest.fn().mockReturnValue({
                        isRunningInBAS: false,
                        annotationDataSourceMap: {
                            mainService: {
                                serviceUrl: 'main/service/url',
                                isRunningInBAS: false,
                                annotationDetails: {
                                    annotationExistsInWS: false
                                },
                                metadataReadErrorMsg: testCase.metadataReadErrorMsg
                            },
                            dataService: {
                                serviceUrl: 'data/service/url',
                                isRunningInBAS: false,
                                annotationDetails: {
                                    annotationExistsInWS: true,
                                    annotationPath: 'mock/adp/project/annotation/path',
                                    annotationPathFromRoot: 'mock/adp.project.annotation/path'
                                },
                                metadataReadErrorMsg: testCase.metadataReadErrorMsg
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
                                return component as unknown as ComponentMock;
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
                jest.spyOn(Date, 'now').mockReturnValue(1736143853603);
                const actions = (sendActionMock.mock.calls[0][0].payload[0]?.actions as QuickAction[]) ?? [];
                for (let i = actions.length - 1; i >= 0; i--) {
                    if (actions[i].title !== 'Add Local Annotation File') {
                        actions.splice(i, 1);
                    }
                }

                expect(sendActionMock).toHaveBeenCalledWith(
                    quickActionListChanged([
                        {
                            title: 'LIST REPORT',
                            actions: [
                                {
                                    kind: 'nested',
                                    id: 'listReport0-add-new-annotation-file',
                                    title: 'Add Local Annotation File',
                                    enabled: true,
                                    children: [
                                        {
                                            path: '0',
                                            children: [],
                                            enabled: testCase.metadataReadErrorMsg ? false : true,
                                            label: `Add Annotation File for ''mainService''`,
                                            tooltip: testCase.metadataReadErrorMsg
                                        },
                                        {
                                            path: '1',
                                            children: [],
                                            enabled: testCase.metadataReadErrorMsg ? false : true,
                                            label: testCase.metadataReadErrorMsg
                                                ? `Add Annotation File for ''dataService''`
                                                : `Show Annotation File for ''dataService''`,
                                            tooltip: testCase.metadataReadErrorMsg
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
                    type: 'appDescriptor',
                    value: {
                        appComponent: {},
                        changeType: 'appdescr_app_addAnnotationsToOData',
                        generator: undefined,
                        parameters: {
                            annotations: ['annotation.annotation_1736143853603'],
                            annotationsInsertPosition: 'END',
                            dataSource: {
                                'annotation.annotation_1736143853603': {
                                    type: 'ODataAnnotation',
                                    uri: 'annotations/annotation_1736143853603.xml'
                                }
                            },
                            dataSourceId: 'mainService'
                        },
                        reference: undefined,
                        serviceUrl: 'main/service/url'
                    }
                });
            });
            test('initialize and execute action - when file exists', async () => {
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
                                return component as unknown as ComponentMock;
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

        describe('enable variant management in tables and charts', () => {
            const testCases: {
                supportedVersion: boolean;
                isEnabled?: boolean;
                ui5version?: versionUtils.Ui5VersionInfo;
            }[] = [
                {
                    supportedVersion: true,
                    isEnabled: true
                },
                {
                    supportedVersion: true,
                    isEnabled: false
                },
                {
                    supportedVersion: false,
                    isEnabled: true,
                    ui5version: {
                        major: 1,
                        minor: 70
                    }
                }
            ];
            afterEach(() => {
                jest.restoreAllMocks();
            });
            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                const pageView = new XMLView();
                jest.spyOn(versionUtils, 'getUi5Version').mockResolvedValue(
                    testCase.ui5version ?? { major: 1, minor: 131 }
                );
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'DynamicPage') {
                        return {
                            getId: () => id,
                            getDomRef: () => ({}),
                            getParent: () => pageView
                        };
                    }
                    if (id == 'NavContainer') {
                        const component = new UIComponentMock();
                        const container = new NavContainer();
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
                                return component as unknown as ComponentMock;
                            }
                        });

                        jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                            return {
                                getSmartVariantManagement: jest.fn().mockReturnValue(testCase.isEnabled),
                                getEntitySet: jest.fn().mockReturnValue('testEntity'), // Use mockReturnValue for simple values
                                getMetadata: jest.fn().mockImplementation(() => ({
                                    getComponentName: jest.fn().mockReturnValue('MyController') // Mock nested methods
                                })),
                                isA: (type: string) => type === 'sap.suite.ui.generic.template.ListReport.Component'
                            } as unknown as UIComponent;
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
                    { onStackChange: jest.fn(), getConfigurationPropertyValue: jest.fn() } as any
                );
                CommandFactory.getCommandFor.mockImplementation((control, type, value, _, settings) => {
                    return { type, value, settings };
                });
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
                let tooltip = undefined;
                let enabled = true;
                if (!testCase.isEnabled) {
                    (tooltip =
                        'This option has been disabled because variant management is already enabled for tables and charts'),
                        (enabled = false);
                }
                expect(sendActionMock).toHaveBeenCalledWith(
                    quickActionListChanged([
                        {
                            title: 'LIST REPORT',
                            actions: testCase.supportedVersion
                                ? [
                                      {
                                          kind: 'simple',
                                          id: 'listReport0-enable-variant-management-in-tables-charts',
                                          enabled,
                                          title: 'Enable Variant Management in Tables and Charts',
                                          tooltip
                                      }
                                  ]
                                : []
                        }
                    ])
                );

                if (testCase.supportedVersion && testCase.isEnabled) {
                    await subscribeMock.mock.calls[0][0](
                        executeQuickAction({
                            id: 'listReport0-enable-variant-management-in-tables-charts',
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
                                    'propertyPath': 'component/settings',
                                    'propertyValue': {
                                        'smartVariantManagement': false
                                    }
                                },
                                'parentPage': {
                                    'component': 'MyController',
                                    'entitySet': 'testEntity'
                                }
                            },
                            'reference': undefined
                        }
                    });
                }

                jest.clearAllMocks();
            });
        });
    });
    describe('ObjectPage', () => {
        describe('add header field', () => {
            const testCases = [
                {
                    ShowHeaderContent: true
                },
                {
                    ShowHeaderContent: false
                }
            ];
            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                mockTelemetryEventIdentifier();
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
                            getShowHeaderContent: () => testCase.ShowHeaderContent,
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
                                return component as unknown as ComponentMock;
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

                const actions = (sendActionMock.mock.calls[0][0].payload[0]?.actions as QuickAction[]) ?? [];
                for (let i = actions.length - 1; i >= 0; i--) {
                    if (actions[i].title !== 'Add Header Field') {
                        actions.splice(i, 1);
                    }
                }

                expect(sendActionMock).toHaveBeenCalledWith(
                    quickActionListChanged([
                        {
                            title: 'OBJECT PAGE',
                            actions: [
                                {
                                    kind: 'simple',
                                    id: 'objectPage0-op-add-header-field',
                                    title: 'Add Header Field',
                                    enabled: testCase.ShowHeaderContent,
                                    tooltip: testCase.ShowHeaderContent
                                        ? undefined
                                        : 'This option has been disabled because the "Show Header Content" page property is set to false.'
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
                    },
                    { actionName: 'op-add-header-field', telemetryEventIdentifier }
                );
            });
        });
        describe('add custom section', () => {
            test('initialize and execute action', async () => {
                jest.spyOn(adpUtils, 'checkForExistingChange').mockReturnValue(false);
                mockTelemetryEventIdentifier();
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
                            getShowHeaderContent: () => true,
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
                                return component as unknown as ComponentMock;
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
                                    title: 'Add Controller to Page',
                                    tooltip: undefined
                                },
                                {
                                    kind: 'simple',
                                    id: 'objectPage0-op-add-header-field',
                                    title: 'Add Header Field',
                                    enabled: true,
                                    tooltip: undefined
                                },
                                {
                                    kind: 'simple',
                                    id: 'objectPage0-op-add-custom-section',
                                    title: 'Add Custom Section',
                                    enabled: true,
                                    tooltip: undefined
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
                    },
                    { actionName: 'op-add-custom-section', telemetryEventIdentifier }
                );
            });
        });
        describe('create table action', () => {
            test('initialize and execute action', async () => {
                mockTelemetryEventIdentifier();
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
                                return component as unknown as ComponentMock;
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
                                            path: '0',
                                            enabled: true,
                                            children: [
                                                { path: '0/0', enabled: true, children: [], label: `'MyTable' table` }
                                            ],
                                            label: `'section 01' section`
                                        }
                                    ]
                                },
                                {
                                    'children': [
                                        {
                                            path: '0',
                                            enabled: true,
                                            'children': [
                                                {
                                                    path: '0/0',
                                                    enabled: true,
                                                    'children': [],
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
                    executeQuickAction({ id: 'objectPage0-create-table-action', kind: 'nested', path: '0/0' })
                );

                expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                    mockOverlay,
                    rtaMock,
                    'AddFragment',
                    undefined,
                    {
                        aggregation: 'content',
                        defaultAggregationArrayIndex: 1,
                        title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION'
                    },
                    { actionName: 'create-table-action', telemetryEventIdentifier }
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
                mockTelemetryEventIdentifier();
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
                                return component as unknown as ComponentMock;
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
                                            path: '0',
                                            enabled: true,
                                            'children': [
                                                {
                                                    path: '0/0',
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
                    },
                    { actionName: 'create-table-custom-column', telemetryEventIdentifier }
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
                                return component as unknown as ComponentMock;
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
                jest.spyOn(CommunicationService, 'sendAction');

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

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({
                        id: 'objectPage0-create-table-custom-column',
                        kind: 'nested',
                        path: '0/0'
                    })
                );

                expect(CommunicationService.sendAction).toHaveBeenCalledWith(
                    showInfoCenterMessage({
                        title: 'Create XML Fragment',
                        description:
                            'At least one table row is required to create a new custom column. Make sure the table data is loaded and try again.',
                        type: MessageBarType.error
                    })
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
                                return component as unknown as ComponentMock;
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
                                                  path: '0',
                                                  'children': [
                                                      {
                                                          path: '0/0',
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

        describe('enable variant management in tables and charts', () => {
            const testCases: {
                supportedVersion: boolean;
                isEnabled?: boolean;
                isCustomTable?: boolean;
                ui5version?: versionUtils.Ui5VersionInfo;
                tooltip?: string;
            }[] = [
                {
                    supportedVersion: true
                },
                {
                    supportedVersion: false,
                    ui5version: {
                        major: 1,
                        minor: 80
                    }
                },
                {
                    supportedVersion: true,
                    isEnabled: true,
                    tooltip: `This option has been disabled because variant management is already enabled for the '''MyTable' table''`
                },
                {
                    supportedVersion: true,
                    isCustomTable: true,
                    tooltip: `Variant management cannot be set for custom table '''MyTable' table''`
                }
            ];
            afterEach(() => {
                jest.restoreAllMocks();
            });
            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                jest.spyOn(versionUtils, 'getUi5Version').mockResolvedValue(
                    testCase.ui5version ?? { major: 1, minor: 131 }
                );

                const pageView = new XMLView();
                pageView.getParent.mockReturnValue({
                    getProperty: (propName: string) => {
                        if (propName === 'entitySet') {
                            return 'DummyEntitySet';
                        } else {
                            return undefined;
                        }
                    }
                });
                const scrollIntoView = jest.fn();
                const actionId = 'objectPage0-enable-variant-management-in-tables-charts';

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
                        const tableData: Record<string, any> = {
                            lineItemQualifier: 'lineItem123',
                            sectionId: testCase.isCustomTable ? undefined : 'dummySection'
                        };
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
                                            isA: (type: string) => type === SMART_TABLE_TYPE,
                                            getAggregation: () => 'item'
                                        }
                                    ];
                                }

                                return [];
                            },
                            getParent: () => pageView,
                            getBusy: () => false,
                            selectOverlay: () => ({}),
                            getVariantManagement: () => testCase.isEnabled,
                            data: jest.fn((prop: string) => {
                                if (!prop) {
                                    return tableData;
                                }
                                return tableData[prop];
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
                            () => 'sap.suite.ui.generic.template.ObjectPage.view.Details'
                        );
                        const componentContainer = new ComponentContainer();
                        const spy = jest.spyOn(componentContainer, 'getComponent');
                        spy.mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component as unknown as ComponentMock;
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
                    { onStackChange: jest.fn(), getConfigurationPropertyValue: jest.fn() } as any
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
                    if (actions[i].title !== 'Enable Variant Management in Tables') {
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
                    thrown = e;
                }

                expect(thrown?.message).toBe(
                    testCase.isCustomTable ? 'Internal error. Table sectionId property not found' : undefined
                );

                expect(sendActionMock).toHaveBeenNthCalledWith(
                    1,
                    quickActionListChanged([
                        {
                            title: 'OBJECT PAGE',
                            actions: !testCase.supportedVersion
                                ? []
                                : [
                                      {
                                          kind: 'nested',
                                          id: actionId,
                                          enabled: true,
                                          tooltip: undefined,
                                          title: 'Enable Variant Management in Tables',
                                          children: [
                                              {
                                                  path: '0',
                                                  'children': [
                                                      {
                                                          path: '0/0',
                                                          'children': [],
                                                          'enabled':
                                                              testCase.isEnabled || testCase.isCustomTable
                                                                  ? false
                                                                  : true,
                                                          'label': `'MyTable' table`,
                                                          tooltip: testCase.tooltip
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

                if (!testCase.supportedVersion || testCase.isCustomTable) {
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
                                    'propertyPath': 'component/settings/sections/dummySection/tableSettings',
                                    'propertyValue': {
                                        'variantManagement': true
                                    }
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
                mockTelemetryEventIdentifier();
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
                                return component as unknown as ComponentMock;
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
                                            path: '0',
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
                                            path: '0',
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
                    },
                    { actionName: 'create-table-custom-column', telemetryEventIdentifier }
                );
            });
        });
    });

    describe('Add subpage', () => {
        const testCases: {
            ui5version?: versionUtils.Ui5VersionInfo;
            isNewPageUnavailable?: boolean;
            isArrayStructuredManifest?: boolean;
            isUnexpectedOwnerComponent?: boolean;
            componentHasNoEntitySet?: boolean;
            isListReport?: boolean;
            isBetaFeatureDisabled?: boolean;
            expect: {
                toBeAvailable: boolean;
                toBeEnabled?: boolean;
                toThrow?: string;
                tooltip?: string;
            };
        }[] = [
            {
                expect: {
                    toBeAvailable: true,
                    toBeEnabled: true
                }
            },
            {
                isNewPageUnavailable: true,
                expect: {
                    toBeAvailable: true,
                    toBeEnabled: false,
                    tooltip: `This option has been disabled because there are no subpages to add`
                }
            },
            {
                isArrayStructuredManifest: true,
                ui5version: {
                    major: 1,
                    minor: 134
                },
                expect: {
                    toBeAvailable: true,
                    toBeEnabled: true
                }
            },
            {
                isArrayStructuredManifest: true,
                isNewPageUnavailable: true,
                ui5version: {
                    major: 1,
                    minor: 134
                },
                expect: {
                    toBeAvailable: true,
                    toBeEnabled: false,
                    tooltip: `This option has been disabled because there are no subpages to add`
                }
            },

            {
                ui5version: {
                    major: 1,
                    minor: 80
                },
                expect: {
                    toBeAvailable: false
                }
            },
            {
                isUnexpectedOwnerComponent: true,
                expect: {
                    toBeAvailable: false
                }
            },
            {
                componentHasNoEntitySet: true,
                expect: {
                    toBeAvailable: false
                }
            },
            {
                isListReport: true,
                expect: {
                    toBeAvailable: true,
                    toBeEnabled: true
                }
            },
            {
                isListReport: true,
                isNewPageUnavailable: true,
                expect: {
                    toBeAvailable: true,
                    toBeEnabled: false,
                    tooltip: `This option has been disabled because there are no subpages to add`
                }
            }
        ];
        afterEach(() => {
            jest.restoreAllMocks();
        });
        test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
            mockTelemetryEventIdentifier();
            jest.spyOn(versionUtils, 'getUi5Version').mockResolvedValue(
                testCase.ui5version ?? { major: 1, minor: 131 }
            );
            jest.spyOn(FeatureService, 'isFeatureEnabled').mockReturnValue(!testCase.isBetaFeatureDisabled);

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

            const pageView = new XMLView();
            pageView.getParent.mockReturnValue({
                getProperty: (propName: string) => {
                    if (propName === 'entitySet') {
                        return 'DummyEntitySet';
                    } else {
                        return undefined;
                    }
                }
            });

            const actionId = testCase.isListReport ? 'listReport0-add-new-subpage' : 'objectPage0-add-new-subpage';

            jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                return {
                    isA: (type: string) =>
                        type ===
                        (testCase.isUnexpectedOwnerComponent
                            ? 'wrongType'
                            : 'sap.suite.ui.generic.template.lib.TemplateComponent'),
                    getEntitySet: jest.fn().mockReturnValue(testCase.componentHasNoEntitySet ? undefined : 'Travels')
                } as unknown as UIComponent;
            });

            sapCoreMock.byId.mockImplementation((id) => {
                if (id == 'ObjectPage') {
                    return {
                        isA: (type: string) => type === 'ObjectPageType',
                        getId: () => id,
                        getDomRef: () => ({ ref: 'OP' }),
                        getParent: () => pageView
                    };
                }
                if (id == 'ListReport') {
                    return {
                        isA: (type: string) => type === 'ListReportType',
                        getId: () => id,
                        getDomRef: () => ({ ref: 'LR' }),
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
                        () =>
                            `sap.suite.ui.generic.template.${
                                testCase.isListReport ? 'ListReport.view.ListReport' : 'ObjectPage.view.Details'
                            }`
                    );
                    const componentContainer = new ComponentContainer();
                    const spy = jest.spyOn(componentContainer, 'getComponent');
                    spy.mockImplementation(() => {
                        return 'component-id';
                    });
                    jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                        if (id === 'component-id') {
                            return component as unknown as ComponentMock;
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
            const pages = testCase.isArrayStructuredManifest
                ? [
                      {
                          component: {
                              name: 'sap.suite.ui.generic.template.ListReport'
                          },
                          entitySet: 'Travels',
                          pages: [
                              {
                                  component: {
                                      name: 'sap.suite.ui.generic.template.ObjectPage'
                                  },
                                  entitySet: 'Travels',
                                  pages: testCase.isNewPageUnavailable
                                      ? [
                                            {
                                                component: {
                                                    name: 'sap.suite.ui.generic.template.ObjectPage'
                                                },
                                                entitySet: 'Bookings'
                                            }
                                        ]
                                      : undefined
                              }
                          ]
                      }
                  ]
                : {
                      'ListReport|Travel': {
                          component: {
                              name: 'sap.suite.ui.generic.template.ListReport'
                          },
                          entitySet: 'Travels',
                          pages:
                              testCase.isListReport && !testCase.isNewPageUnavailable
                                  ? undefined
                                  : {
                                        'ObjectPage|Travels': {
                                            component: {
                                                name: 'sap.suite.ui.generic.template.ObjectPage'
                                            },
                                            entitySet: 'Travels',
                                            pages: testCase.isNewPageUnavailable
                                                ? {
                                                      'ObjectPage|Bookings': {
                                                          component: {
                                                              name: 'sap.suite.ui.generic.template.ObjectPage'
                                                          },
                                                          entitySet: 'Bookings'
                                                      }
                                                  }
                                                : undefined
                                        }
                                    }
                      }
                  };
            jest.spyOn(rtaMock.getRootControlInstance(), 'getManifest').mockReturnValue({
                'sap.ui.generic.app': {
                    pages
                }
            });
            jest.spyOn(rtaMock, 'getFlexSettings').mockReturnValue({
                projectId: 'dummyProjectId'
            } as unknown as FlexSettings);

            const navigationProps: NavigationProperty[] = [
                {
                    fromRole: 'fromRoleBooking',
                    toRole: 'toRoleBooking',
                    name: 'to_Booking',
                    relationship: 'Booking'
                },
                {
                    fromRole: 'fromRoleAirline',
                    toRole: 'toRoleAirline',
                    name: 'to_Airline',
                    relationship: 'Airline'
                }
            ];
            const entityContainerMock: EntityContainer = {
                entitySet: [
                    {
                        entityType: 'Travel',
                        name: 'Travels'
                    },
                    {
                        entityType: 'Booking',
                        name: 'Bookings'
                    },
                    {
                        entityType: 'Airline',
                        name: 'Airlines'
                    }
                ]
            } as unknown as EntityContainer;
            const metaModelMock = {
                getODataEntitySet: jest.fn().mockReturnValue({
                    name: 'Travels',
                    entityType: 'Travel'
                } as EntitySet),
                getODataEntityType: jest.fn().mockReturnValue({
                    name: 'Travel',
                    navigationProperty: navigationProps
                } as EntityType),
                getODataAssociationEnd: jest.fn().mockImplementation((entityType: EntityType, navProp: string) => {
                    return {
                        multiplicity: entityType.name === 'Travel' && navProp === 'to_Booking' ? '*' : '1:1',
                        type: navProp === 'to_Booking' ? 'Booking' : 'Airline'
                    };
                }),
                getODataEntityContainer: () => entityContainerMock
            };
            jest.spyOn(rtaMock.getRootControlInstance(), 'getModel').mockReturnValue({
                getMetaModel: () => metaModelMock
            } as unknown as Model);

            const dummyAppComponent = {} as unknown as AppComponentV2;
            jest.spyOn(utils, 'getV2AppComponent').mockReturnValue(dummyAppComponent);

            const registry = new FEV2QuickActionRegistry();
            const service = new QuickActionService(
                rtaMock,
                new OutlineService(rtaMock, mockChangeService),
                [registry],
                { onStackChange: jest.fn(), getConfigurationPropertyValue: jest.fn() } as any
            );

            CommandFactory.getCommandFor.mockImplementation((control, type, value, _, settings) => {
                return { type, value, settings };
            });

            await service.init(sendActionMock, subscribeMock);

            await service.reloadQuickActions({
                'sap.uxap.ObjectPageLayout': [
                    {
                        controlId: 'ObjectPage'
                    } as any
                ],
                'sap.f.DynamicPage': [
                    {
                        controlId: 'ListReport'
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
                if (actions[i].title !== 'Add Subpage') {
                    actions.splice(i, 1);
                }
            }
            await subscribeMock.mock.calls[0][0](
                executeQuickAction({
                    id: actionId,
                    kind: 'simple'
                })
            );

            expect(sendActionMock).toHaveBeenNthCalledWith(
                1,
                quickActionListChanged([
                    {
                        title: testCase.isListReport ? 'LIST REPORT' : 'OBJECT PAGE',
                        actions: !testCase.expect.toBeAvailable
                            ? []
                            : [
                                  {
                                      kind: 'simple',
                                      id: actionId,
                                      enabled: !!testCase.expect.toBeEnabled,
                                      tooltip: testCase.expect.tooltip,
                                      title: 'Add Subpage'
                                  }
                              ]
                    }
                ])
            );

            if (!testCase.expect.toBeAvailable) {
                expect(DialogFactory.createDialog).toHaveBeenCalledTimes(0);
            } else {
                expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                    mockOverlay,
                    rtaMock,
                    'AddSubpage',
                    undefined,
                    {
                        appReference: 'dummyProjectId',
                        navProperties: testCase.isNewPageUnavailable
                            ? []
                            : [
                                  testCase.isListReport
                                      ? {
                                            entitySet: 'Travels',
                                            navProperty: 'Travels'
                                        }
                                      : {
                                            entitySet: 'Bookings',
                                            navProperty: 'to_Booking'
                                        }
                              ],
                        pageDescriptor: {
                            appType: 'fe-v2',
                            appComponent: dummyAppComponent,
                            entitySet: 'Travels',
                            pageType: testCase.isListReport
                                ? 'sap.suite.ui.generic.template.ListReport'
                                : 'sap.suite.ui.generic.template.ObjectPage'
                        },
                        title: 'ADD_SUB_PAGE_DIALOG_TITLE'
                    },
                    { 'actionName': 'add-new-subpage', telemetryEventIdentifier }
                );
            }
        });
    });

    const pageMap = {
        ListReport: { title: 'LIST REPORT', type: 'sap.suite.ui.generic.template.ListReport.view.ListReport' },
        ObjectPage: { title: 'OBJECT PAGE', type: 'sap.suite.ui.generic.template.ObjectPage.view.Details' },
        AnalyticalListPage: {
            title: 'ANALYTICAL LIST PAGE',
            type: 'sap.suite.ui.generic.template.AnalyticalListPage.view.AnalyticalListPage'
        }
    };
    describe('change table actions', () => {
        const testCases: {
            versionInfo: string;
            actionId: 'CTX_SETTINGS' | 'CTX_SETTINGS0' | '';
            isActionDisabled?: boolean;
            isNotApplicable?: boolean;
            isWithIconTabBar?: boolean;
            pageType: 'ListReport' | 'ObjectPage' | 'AnalyticalListPage';
            isOPSection?: boolean;
            expect: {
                isEnabled: boolean;
                tooltip?: string;
            };
        }[] = [
            {
                // object page
                versionInfo: '1.130.1',
                actionId: 'CTX_SETTINGS0',
                pageType: 'ListReport',
                isNotApplicable: true,
                expect: {
                    isEnabled: false,
                    tooltip: 'This option is disabled because the contents of the table toolbar cannot be changed.'
                }
            },
            {
                versionInfo: '1.96.0',
                actionId: '',
                pageType: 'ListReport',
                expect: {
                    isEnabled: false,
                    tooltip: 'This option is disabled because the contents of the table toolbar cannot be changed.'
                }
            },
            {
                versionInfo: '1.127.1',
                actionId: 'CTX_SETTINGS',
                pageType: 'ListReport',
                expect: {
                    isEnabled: true
                }
            },
            {
                versionInfo: '1.130.1',
                actionId: 'CTX_SETTINGS0',
                pageType: 'ListReport',
                expect: {
                    isEnabled: true
                }
            },
            {
                // with icon tabbar
                versionInfo: '1.130.1',
                actionId: 'CTX_SETTINGS0',
                pageType: 'ListReport',
                isWithIconTabBar: true,
                expect: {
                    isEnabled: true
                }
            },
            {
                // object page
                versionInfo: '1.130.1',
                actionId: 'CTX_SETTINGS0',
                pageType: 'ObjectPage',
                isWithIconTabBar: true,
                expect: {
                    isEnabled: true
                }
            },
            {
                // object page
                versionInfo: '1.130.1',
                actionId: 'CTX_SETTINGS0',
                pageType: 'ObjectPage',
                isOPSection: true,
                expect: {
                    isEnabled: true
                }
            },
            {
                // object page
                versionInfo: '1.130.1',
                actionId: 'CTX_SETTINGS0',
                pageType: 'AnalyticalListPage',
                isWithIconTabBar: true,
                expect: {
                    isEnabled: true
                }
            },
            {
                // action disabled by FE
                versionInfo: '1.134.1',
                actionId: 'CTX_SETTINGS0',
                pageType: 'ListReport',
                isActionDisabled: true,
                expect: {
                    isEnabled: false,
                    tooltip: 'This option is disabled because the contents of the table toolbar cannot be changed.'
                }
            }
        ];
        const setSelectedKeyMock = jest.fn();
        test.each(testCases)('initialize and execute (%s)', async (testCase) => {
            VersionInfo.load.mockResolvedValue({
                name: 'SAPUI5 Distribution',
                libraries: [{ name: 'sap.ui.core', version: testCase.versionInfo }]
            });
            const pageView = new XMLView();
            const scrollIntoView = jest.fn();
            const tableId = 'SmartTable' + (testCase.isWithIconTabBar ? '-tab1' : '');

            const opLayout = {
                isA: (type: string) => type === 'sap.uxap.ObjectPageLayout',
                getParent: () => pageView,
                setSelectedSection: jest.fn()
            };

            const subsections: ObjectPageSubSection[] = [];
            const opSection = {
                isA: (type: string) => type === 'sap.uxap.ObjectPageSection',
                getParent: () => opLayout,
                getSubSections: () => subsections,
                setSelectedSubSection: jest.fn()
            };

            const opSubSection = {
                isA: (type: string) => type === 'sap.uxap.ObjectPageSubSection',
                getParent: () => opSection,
                getSubSections: () => []
            };
            subsections.push(opSubSection as unknown as ObjectPageSubSection);

            sapCoreMock.byId.mockImplementation((id) => {
                if (id == tableId) {
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
                                    getAggregation: () => 'headerToolbar'
                                }
                            ];
                        },
                        getParent: () => (testCase.isOPSection ? opSubSection : pageView),
                        getBusy: () => false,
                        getHeaderToolbar: () => ({
                            getTitleControl: () => ({
                                getText: () => 'MyTable'
                            })
                        }),
                        getBindingInfo: () => undefined,
                        attachEventOnce: jest.fn()
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
                    pageView.getViewName.mockImplementation(() => pageMap[testCase.pageType].type);
                    const componentContainer = new ComponentContainer();
                    const spy = jest.spyOn(componentContainer, 'getComponent');
                    spy.mockImplementation(() => {
                        return 'component-id';
                    });
                    jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                        if (id === 'component-id') {
                            return component as unknown as ComponentMock;
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
                if ((id = 'IconTabBar')) {
                    return {
                        getParent: () => pageView,
                        getId: () => id,
                        isA: (type: string) => type === 'sap.m.IconTabBar',
                        setSelectedKey: setSelectedKeyMock,
                        getItems: () => [
                            {
                                isA: (type: string) =>
                                    ['sap.m.IconTabFilter', 'sap.ui.base.ManagedObject'].includes(type),
                                getKey: () => 'tab1',
                                getText: () => 'Tab 1'
                            }
                        ]
                    };
                }
            });

            const execute = jest.fn();
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
            jest.spyOn(rtaMock, 'getService').mockImplementation((serviceName: string): any => {
                if (serviceName === 'action') {
                    return {
                        get: (controlId: string) => {
                            if (controlId === tableId) {
                                return testCase.isNotApplicable
                                    ? []
                                    : [{ id: testCase.actionId, enabled: !testCase.isActionDisabled }];
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
                [SMART_TABLE_TYPE]: [
                    {
                        controlId: tableId
                    } as any
                ],
                'sap.m.NavContainer': [
                    {
                        controlId: 'NavContainer'
                    } as any
                ],

                'sap.m.IconTabBar': testCase.isWithIconTabBar
                    ? [
                          {
                              controlId: 'IconTabBar'
                          } as any
                      ]
                    : []
            });

            // filter out irrelevant actions
            const actions = (sendActionMock.mock.calls[0][0].payload[0]?.actions as QuickAction[]) ?? [];
            for (let i = actions.length - 1; i >= 0; i--) {
                if (actions[i].title !== 'Change Table Actions') {
                    actions.splice(i, 1);
                }
            }

            const expectedActionId =
                testCase.pageType[0].toLowerCase() + testCase.pageType.substring(1) + '0-change-table-actions';

            expect(sendActionMock).toHaveBeenCalledWith(
                quickActionListChanged([
                    {
                        title: pageMap[testCase.pageType].title,
                        actions: [
                            {
                                'kind': 'nested',
                                id: expectedActionId,
                                title: 'Change Table Actions',
                                enabled: true,
                                children: [
                                    {
                                        path: '0',
                                        children: [],
                                        enabled: !!testCase.expect.isEnabled,
                                        label: testCase.isWithIconTabBar ? `'Tab 1' table` : `'MyTable' table`,
                                        tooltip: testCase.expect.tooltip
                                    }
                                ]
                            }
                        ]
                    }
                ])
            );

            if (testCase.expect.isEnabled) {
                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: expectedActionId, kind: 'nested', path: '0' })
                );

                if (testCase.isOPSection) {
                    expect(opLayout.setSelectedSection.mock.calls[0][0]).toStrictEqual(opSection);
                    expect(opSection.setSelectedSubSection.mock.calls[0][0]).toStrictEqual(opSubSection);
                }

                expect(scrollIntoView).toHaveBeenCalledTimes(testCase.isOPSection ? 0 : 1);
            }

            expect(setSelectedKeyMock.mock.calls[0]).toStrictEqual(testCase.isWithIconTabBar ? ['tab1'] : undefined);

            if (testCase.expect.isEnabled) {
                expect(execute).toHaveBeenCalledWith(tableId, testCase.actionId);
            } else {
                expect(execute).toHaveBeenCalledTimes(0);
            }
        });
    });
});
