import RuntimeAuthoring, { FlexSettings, RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import FlexBox from 'sap/m/FlexBox';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { attachBeforeClose } from 'mock/sap/ui/core/Fragment';
import ODataModelV4 from 'sap/ui/model/odata/v4/ODataModel';
import type AppComponentV4 from 'sap/fe/core/AppComponent';
import * as cpeCommon from '@sap-ux-private/control-property-editor-common';
import type { ChangeService } from '../../../../src/cpe/changes/service';
const mockChangeService = {
    syncOutlineChanges: jest.fn()
} as unknown as ChangeService;

import {
    quickActionListChanged,
    executeQuickAction,
    QuickAction
} from '@sap-ux-private/control-property-editor-common';

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
import VersionInfo from 'mock/sap/ui/VersionInfo';

import { fetchMock } from 'mock/window';
import { mockOverlay } from 'mock/sap/ui/dt/OverlayRegistry';
import ComponentMock from 'mock/sap/ui/core/Component';
import UIComponent from 'sap/ui/core/UIComponent';
import AppComponentMock from 'mock/sap/fe/core/AppComponent';
import FlexRuntimeInfoAPI from 'mock/sap/ui/fl/apply/api/FlexRuntimeInfoAPI';
import { DialogFactory, DialogNames } from 'open/ux/preview/client/adp/dialog-factory';
import {
    ANALYTICAL_TABLE_TYPE,
    GRID_TABLE_TYPE,
    SMART_TABLE_TYPE,
    MDC_TABLE_TYPE,
    TREE_TABLE_TYPE,
    M_TABLE_TYPE
} from '../../../../src/adp/quick-actions/control-types';
import { TableQuickActionDefinitionBase } from '../../../../src/adp/quick-actions/table-quick-action-base';
import * as QCUtils from '../../../../src/cpe/quick-actions/utils';
import ManagedObject from 'sap/ui/base/ManagedObject';
import * as versionUtils from 'open/ux/preview/client/utils/version';
import * as utils from 'open/ux/preview/client/utils/fe-v4';
import * as adpUtils from 'open/ux/preview/client/adp/utils';
import OverlayUtil from 'mock/sap/ui/dt/OverlayUtil';
import * as appUtils from '../../../../src/utils/application';

let telemetryEventIdentifier: string;
const mockTelemetryEventIdentifier = () => {
    telemetryEventIdentifier = new Date().toISOString();
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(telemetryEventIdentifier);
};

describe('FE V4 quick actions', () => {
    let sendActionMock: jest.Mock;
    let subscribeMock: jest.Mock;

    beforeEach(() => {
        sendActionMock = jest.fn();
        subscribeMock = jest.fn();
        jest.spyOn(DialogFactory, 'createDialog').mockResolvedValue();
        jest.clearAllMocks();
    });

    afterEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const closeDialogFunction = attachBeforeClose.mock.calls[0]?.[0];
        if (typeof closeDialogFunction === 'function') {
            // make sure that dialog factory is in clean state after each test
            closeDialogFunction();
        }
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

        describe('Add Page Action', () => {
            afterEach(() => {
                jest.restoreAllMocks();
            });

            async function setupContext() {
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
                const container = new NavContainer();
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
                        return component as unknown as ComponentMock;
                    }
                });
                container.getCurrentPage.mockImplementation(() => {
                    return componentContainer;
                });
                component.getRootControl.mockImplementation(() => {
                    return pageView;
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
                        return container;
                    }
                });

                CommandFactory.getCommandFor.mockImplementation((control, type, value, _, settings) => {
                    return { type, value, settings };
                });

                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                jest.spyOn(rtaMock.getRootControlInstance(), 'getManifest').mockReturnValue({
                    'sap.ui5': {
                        routing: {
                            targets: [
                                {
                                    name: 'sap.fe.templates.'
                                }
                            ]
                        }
                    }
                });
                const registry = new FEV4QuickActionRegistry();
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
            }
            test('not available on UI5 version prior 1.130', async () => {
                VersionInfo.load.mockResolvedValue({
                    name: 'SAPUI5 Distribution',
                    libraries: [{ name: 'sap.ui.core', version: '1.129.0' }]
                });
                await setupContext();
                expect(sendActionMock).toHaveBeenCalledWith(
                    quickActionListChanged([
                        {
                            title: 'LIST REPORT',
                            actions: []
                        }
                    ])
                );
            });

            test('available since UI5 version 1.130', async () => {
                VersionInfo.load.mockResolvedValue({
                    name: 'SAPUI5 Distribution',
                    libraries: [{ name: 'sap.ui.core', version: '1.130.1' }]
                });
                await setupContext();
                expect(sendActionMock).toHaveBeenCalledWith(
                    quickActionListChanged([
                        {
                            title: 'LIST REPORT',
                            actions: [
                                {
                                    'kind': 'simple',
                                    id: 'listReport0-add-page-action',
                                    title: 'Add Custom Page Action',
                                    enabled: true
                                }
                            ]
                        }
                    ])
                );
            });
        });

        describe('clear filter bar button', () => {
            let service: QuickActionService;
            let rtaMock: RuntimeAuthoring;
            let appComponent: AppComponentMock;
            beforeAll(() => {
                appComponent = new AppComponentMock();
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
                                return component as unknown as ComponentMock;
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

                rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV4QuickActionRegistry();
                service = new QuickActionService(rtaMock, new OutlineService(rtaMock, mockChangeService), [registry], {
                    onStackChange: jest.fn(),
                    getConfigurationPropertyValue: jest
                        .fn()
                        .mockReturnValueOnce(false)
                        .mockReturnValueOnce(undefined)
                        .mockReturnValue(undefined)
                } as any);
            });

            test('initialize and execute action', async () => {
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

            test('initialize and execute action - no value in configuration cache', async () => {
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
            });
        });

        describe('add controller to the page', () => {
            let reportTelemetrySpy: jest.SpyInstance;
            beforeEach(() => {
                jest.clearAllMocks();

                reportTelemetrySpy = jest.spyOn(cpeCommon, 'reportTelemetry');
                jest.spyOn(appUtils, 'getApplicationType').mockReturnValue('fe-v4');
                jest.spyOn(versionUtils, 'getUi5Version').mockResolvedValue({
                    major: 1,
                    minor: 127,
                    patch: 0
                });
            });
            test('initialize and execute action', async () => {
                jest.spyOn(adpUtils, 'checkForExistingChange').mockReturnValue(false);
                const pageView = new XMLView();
                mockTelemetryEventIdentifier();
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
                                return component as unknown as ComponentMock;
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
                    { actionName: 'add-controller-to-page', telemetryEventIdentifier }
                );

                expect(reportTelemetrySpy).toHaveBeenCalledWith({
                    category: 'QuickAction',
                    quickActionSteps: 2,
                    actionName: 'add-controller-to-page',
                    telemetryEventIdentifier,
                    ui5Version: '1.127.0',
                    appType: 'fe-v4'
                });
            });

            test('initialize and execute action with existing controller change', async () => {
                jest.spyOn(adpUtils, 'checkForExistingChange').mockReturnValue(true);
                const pageView = new XMLView();
                mockTelemetryEventIdentifier();
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
                                return component as unknown as ComponentMock;
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
                    { actionName: 'add-controller-to-page', telemetryEventIdentifier }
                );
            });
        });

        describe('change table columns', () => {
            interface TestCase {
                variantManagement: boolean;
            }
            const testCases: TestCase[] = [
                {
                    variantManagement: true
                },
                {
                    variantManagement: false
                }
            ];
            test.each(testCases)('initialize and execute action', async (testCase) => {
                const pageView = new XMLView();
                jest.spyOn(FlexRuntimeInfoAPI, 'hasVariantManagement').mockReturnValue(testCase.variantManagement);
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
                                return component as unknown as ComponentMock;
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
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );
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

                // filter out irrelevant actions
                const actions = (sendActionMock.mock.calls[0][0].payload[0]?.actions as QuickAction[]) ?? [];
                for (let i = actions.length - 1; i >= 0; i--) {
                    if (actions[i].title !== 'Change Table Columns') {
                        actions.splice(i, 1);
                    }
                }
                const enabled = testCase.variantManagement;
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
                                            enabled,
                                            label: `'MyTable' table`,
                                            ...(!testCase.variantManagement && {
                                                tooltip:
                                                    'This action has been disabled because variant management is disabled. Enable variant management and try again.'
                                            })
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

                if (!testCase.variantManagement) {
                    expect(execute).not.toHaveBeenCalled();
                    return;
                }
                expect(execute).toHaveBeenCalledWith('Table', 'CTX_SETTINGS0');
            });
        });

        describe('create table action', () => {
            test('initialize and execute action', async () => {
                const pageView = new XMLView();
                jest.spyOn(FlexRuntimeInfoAPI, 'hasVariantManagement').mockReturnValue(false);
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
                                return component as unknown as ComponentMock;
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
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );
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

                // filter out irrelevant actions
                const actions = (sendActionMock.mock.calls[0][0].payload[0]?.actions as QuickAction[]) ?? [];
                for (let i = actions.length - 1; i >= 0; i--) {
                    if (actions[i].title !== 'Add Custom Table Action') {
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
                                    id: 'listReport0-create-table-action',
                                    title: 'Add Custom Table Action',
                                    enabled: true,
                                    children: [
                                        {
                                            path: '0',
                                            children: [],
                                            enabled: true,
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
            });
        });

        describe('create table custom column', () => {
            test('initialize and execute action (%s)', async () => {
                const pageView = new XMLView();
                jest.spyOn(FlexRuntimeInfoAPI, 'hasVariantManagement').mockReturnValue(false);
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
                            getBusy: () => false,
                            selectOverlay: () => ({})
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
                                return component as unknown as ComponentMock;
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
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    { onStackChange: jest.fn() } as any
                );
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
                            'actions': [
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
                    DialogNames.ADD_FRAGMENT,
                    undefined,
                    {
                        aggregation: 'columns',
                        title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
                    },
                    expect.objectContaining({ actionName: 'create-table-custom-column' })
                );
            });
        });

        describe('enable table filtering', () => {
            const testCases: {
                p13nMode: string[];
                ui5version?: versionUtils.Ui5VersionInfo;
                expectedIsNotApplicable?: boolean;
                expectedIsEnabled: boolean;
                expectedTooltip?: string;
            }[] = [
                {
                    p13nMode: [],
                    expectedIsEnabled: true,
                    ui5version: { major: 1, minor: 130 },
                    expectedIsNotApplicable: true
                },
                { p13nMode: [], expectedIsEnabled: true },
                {
                    p13nMode: ['Filter'],
                    expectedIsEnabled: false,
                    expectedTooltip:
                        'This option is disabled because table filtering for page variants is already enabled'
                }
            ];
            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                const pageView = new XMLView();
                jest.spyOn(versionUtils, 'getUi5Version').mockResolvedValue(
                    testCase.ui5version ?? { major: 1, minor: 131 }
                );
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
                            getBusy: () => false,
                            selectOverlay: () => ({}),
                            getP13nMode: () => testCase.p13nMode,
                            getReference: () => 'dummyReference'
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
                                return component as unknown as ComponentMock;
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
                const service = new QuickActionService(
                    rtaMock,
                    new OutlineService(rtaMock, mockChangeService),
                    [registry],
                    {
                        onStackChange: jest.fn(),
                        getConfigurationPropertyValue: jest
                            .fn()
                            .mockReturnValueOnce(undefined)
                            .mockReturnValueOnce(undefined)
                    } as any
                );

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

                const isActionExpected = testCase.ui5version === undefined || testCase.ui5version.minor >= 131;

                // filter out irrelevant actions
                const actions = (sendActionMock.mock.calls[0][0].payload[0]?.actions as QuickAction[]) ?? [];
                for (let i = actions.length - 1; i >= 0; i--) {
                    if (actions[i].title !== 'Enable Table Filtering for Page Variants') {
                        actions.splice(i, 1);
                    }
                }

                expect(sendActionMock).toHaveBeenCalledWith(
                    quickActionListChanged([
                        {
                            'actions': [
                                ...(isActionExpected
                                    ? [
                                          {
                                              'children': [
                                                  {
                                                      path: '0',
                                                      'children': [],
                                                      'enabled': testCase.expectedIsEnabled,
                                                      'label': `'MyTable' table`,
                                                      'tooltip': testCase.expectedTooltip
                                                  }
                                              ],
                                              'enabled': true,
                                              'id': 'listReport0-enable-table-filtering',
                                              'kind': 'nested',
                                              'title': 'Enable Table Filtering for Page Variants',
                                              'tooltip': undefined
                                          } as QuickAction
                                      ]
                                    : [])
                            ],
                            'title': 'LIST REPORT'
                        }
                    ])
                );

                mockOverlay.getDesignTimeMetadata.mockReturnValue({
                    getData: jest.fn().mockReturnValue({
                        manifestSettings: jest.fn().mockReturnValue([]),
                        manifestPropertyPath: jest.fn().mockReturnValue('dummyManifestPath'),
                        manifestPropertyChange: jest.fn().mockImplementation((propertyValue, propertyPath) => [
                            {
                                appComponent,
                                changeSpecificData: {
                                    appDescriptorChangeType: 'appdescr_fe_changePageConfiguration',
                                    content: {
                                        parameters: {
                                            propertyValue,
                                            propertyPath
                                        }
                                    }
                                },
                                selector: 'dummySelector'
                            }
                        ])
                    })
                });

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-enable-table-filtering', kind: 'nested', path: '0' })
                );

                if (testCase.expectedIsNotApplicable) {
                    expect(rtaMock.getCommandStack().pushAndExecute).toHaveBeenCalledTimes(0);
                } else {
                    expect(rtaMock.getCommandStack().pushAndExecute).toHaveBeenCalledWith({
                        settings: {},
                        type: 'appDescriptor',
                        value: {
                            appComponent,
                            reference: 'test.id',
                            'selector': 'dummySelector',
                            changeType: 'appdescr_fe_changePageConfiguration',
                            parameters: {
                                'propertyPath': 'dummyManifestPath',
                                'propertyValue': {
                                    'personalization': {
                                        'aggregate': true,
                                        'column': true,
                                        'filter': true,
                                        'group': true,
                                        'sort': true
                                    }
                                }
                            }
                        }
                    });
                }
            });
        });

        describe('disable/enable "Semantic Date Range" in Filter Bar', () => {
            let service: QuickActionService;
            let rtaMock: RuntimeAuthoring;
            let appComponent: AppComponentMock;
            beforeAll(async () => {
                appComponent = new AppComponentMock();
                const component = new TemplateComponentMock();
                jest.spyOn(component, 'getAppComponent').mockReturnValue(appComponent);
                jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                    return component as unknown as UIComponent;
                });
                sapCoreMock.byId.mockImplementation((id) => {
                    if (id == 'FilterBar') {
                        return {
                            getDomRef: () => ({}),
                            getParent: () => ({}),
                            getShowClearButton: jest.fn().mockReturnValue(false),
                            data: jest.fn().mockImplementation((key) => {
                                // Mock the return value for 'useSemanticDateRange'
                                if (key === 'useSemanticDateRange') {
                                    return false;
                                }
                                return undefined;
                            })
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
                                return component as unknown as ComponentMock;
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

                rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                const registry = new FEV4QuickActionRegistry();
                service = new QuickActionService(rtaMock, new OutlineService(rtaMock, mockChangeService), [registry], {
                    onStackChange: jest.fn(),
                    getConfigurationPropertyValue: jest
                        .fn()
                        .mockReturnValueOnce(undefined)
                        .mockReturnValueOnce(undefined)
                        .mockReturnValueOnce(true)
                        .mockReturnValueOnce(undefined)
                        .mockReturnValue(undefined)
                } as any);
            });

            test('initialize and execute action', async () => {
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
                                    'enabled': true,
                                    'id': 'listReport0-enable-clear-filter-bar',
                                    'kind': 'simple',
                                    'title': 'Enable "Clear" Button in Filter Bar'
                                },
                                {
                                    enabled: true,
                                    kind: 'simple',
                                    id: 'listReport0-enable-semantic-date-range',
                                    title: 'Enable Semantic Date Range in Filter Bar'
                                }
                            ]
                        }
                    ])
                );

                await subscribeMock.mock.calls[0][0](
                    executeQuickAction({ id: 'listReport0-enable-semantic-date-range', kind: 'simple' })
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
                                    'controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/useSemanticDateRange',
                                propertyValue: true,
                                operation: 'UPSERT'
                            }
                        }
                    }
                });
            });
            test('initialize and execute action  - no value in configuration cache', async () => {
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
                                    'enabled': true,
                                    'id': 'listReport0-enable-clear-filter-bar',
                                    'kind': 'simple',
                                    'title': 'Disable "Clear" Button in Filter Bar'
                                },
                                {
                                    enabled: true,
                                    kind: 'simple',
                                    id: 'listReport0-enable-semantic-date-range',
                                    title: 'Enable Semantic Date Range in Filter Bar'
                                }
                            ]
                        }
                    ])
                );
            });
        });

        describe('enable variant management in tables and charts', () => {
            const testCases: {
                supportedVersion: boolean;
                varianManagmentValue?: string;
                ui5version?: versionUtils.Ui5VersionInfo;
            }[] = [
                {
                    supportedVersion: true,
                    varianManagmentValue: 'None'
                },
                {
                    supportedVersion: true,
                    varianManagmentValue: 'Control'
                },
                {
                    supportedVersion: false,
                    varianManagmentValue: 'None',
                    ui5version: {
                        major: 1,
                        minor: 70
                    }
                }
            ];
            test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                jest.spyOn(adpUtils, 'checkForExistingChange').mockReturnValue(false);
                const pageView = new XMLView();
                jest.spyOn(versionUtils, 'getUi5Version').mockResolvedValue(
                    testCase.ui5version ?? { major: 1, minor: 131 }
                );
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
                            getParent: () => pageView,
                            getId: () => 'DynamicPage'
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
                                return component as unknown as ComponentMock;
                            }
                        });
                        container.getCurrentPage.mockImplementation(() => {
                            return componentContainer;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                            return {
                                getVariantManagement: jest.fn().mockReturnValue(testCase.varianManagmentValue),
                                isA: (type: string) => type === 'sap.fe.templates.ListReport.Component',
                                getAppComponent: jest.fn(() => {
                                    return {
                                        getManifest: jest.fn(() => {
                                            return {
                                                'sap.app': {
                                                    id: 'test.id'
                                                }
                                            };
                                        })
                                    };
                                })
                            } as unknown as UIComponent;
                        });

                        mockOverlay.getDesignTimeMetadata.mockReturnValue({
                            getData: jest.fn().mockReturnValue({
                                manifestSettings: jest.fn().mockReturnValue([]),
                                manifestPropertyPath: jest.fn().mockReturnValue('dummyManifestPath'),
                                manifestPropertyChange: jest.fn().mockImplementation((propertyValue, propertyPath) => [
                                    {
                                        component,
                                        changeSpecificData: {
                                            appDescriptorChangeType: 'appdescr_fe_changePageConfiguration',
                                            content: {
                                                parameters: {
                                                    propertyValue,
                                                    propertyPath
                                                }
                                            }
                                        },
                                        selector: 'dummySelector'
                                    }
                                ])
                            })
                        });
                        return container;
                    }
                });

                const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                jest.spyOn(rtaMock.getRootControlInstance(), 'getManifest').mockReturnValue({
                    'sap.ui5': {
                        routing: {
                            targets: [
                                {
                                    name: 'sap.fe.templates.'
                                }
                            ]
                        }
                    }
                });
                const registry = new FEV4QuickActionRegistry();
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
                if (testCase.varianManagmentValue === 'Control') {
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
                                          'enabled': true,
                                          'id': 'listReport0-add-controller-to-page',
                                          'kind': 'simple',
                                          'title': 'Add Controller to Page',
                                          tooltip: undefined
                                      },
                                      {
                                          kind: 'simple',
                                          id: 'listReport0-enable-variant-management-in-tables-charts',
                                          enabled,
                                          title: 'Enable Variant Management in Tables and Charts',
                                          tooltip
                                      }
                                  ]
                                : [
                                      {
                                          'enabled': true,
                                          'id': 'listReport0-add-controller-to-page',
                                          'kind': 'simple',
                                          'title': 'Add Controller to Page',
                                          tooltip
                                      }
                                  ]
                        }
                    ])
                );

                if (testCase.supportedVersion && testCase.varianManagmentValue === 'None') {
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
                            'changeType': 'appdescr_fe_changePageConfiguration',
                            'appComponent': undefined,
                            'parameters': {
                                'propertyPath': 'dummyManifestPath',
                                'propertyValue': {
                                    'variantManagement': 'Control'
                                }
                            },
                            'reference': '',
                            'selector': 'dummySelector'
                        }
                    });
                }
            });
        });

        describe('ObjectPage', () => {
            beforeAll(() => {
                jest.restoreAllMocks();
            });
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
                                getShowHeaderContent: () => testCase.ShowHeaderContent,
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
                                    return component as unknown as ComponentMock;
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

            describe('create table custom column', () => {
                const testCases = [
                    {
                        tableType: M_TABLE_TYPE,
                        dialog: DialogNames.ADD_FRAGMENT,
                        toString: () => M_TABLE_TYPE,
                        enable: true
                    },
                    {
                        tableType: MDC_TABLE_TYPE,
                        dialog: DialogNames.ADD_FRAGMENT,
                        toString: () => MDC_TABLE_TYPE,
                        enable: true
                    },
                    {
                        tableType: TREE_TABLE_TYPE,
                        dialog: DialogNames.ADD_FRAGMENT,
                        toString: () => TREE_TABLE_TYPE,
                        enable: true
                    },
                    {
                        tableType: ANALYTICAL_TABLE_TYPE,
                        dialog: DialogNames.ADD_FRAGMENT,
                        toString: () => ANALYTICAL_TABLE_TYPE,
                        enable: true
                    },
                    {
                        tableType: GRID_TABLE_TYPE,
                        dialog: DialogNames.ADD_FRAGMENT,
                        toString: () => GRID_TABLE_TYPE,
                        enable: true
                    }
                ];

                test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                    mockTelemetryEventIdentifier();
                    const pageView = new XMLView();
                    const scrollIntoView = jest.fn();
                    jest.spyOn(TableQuickActionDefinitionBase.prototype as any, 'getInternalTable').mockImplementation(
                        () => {
                            return {
                                isA: (type: string) => type === SMART_TABLE_TYPE, // Check if the object is of the correct type
                                getAggregation: jest.fn().mockImplementation((aggregationName: string) => {
                                    if (aggregationName === 'items') {
                                        return testCase.enable ? ['item1', 'item2'] : []; // Return rows or empty array based on `enable`
                                    }
                                    return undefined;
                                })
                            };
                        }
                    );
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
                                    return component as unknown as ComponentMock;
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
                    const service = new QuickActionService(
                        rtaMock,
                        new OutlineService(rtaMock, mockChangeService),
                        [registry],
                        {
                            onStackChange: jest.fn()
                        } as any
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
                                        'enabled': testCase.enable,
                                        tooltip: testCase.enable
                                            ? undefined
                                            : 'This action has been disabled because the table rows are not available. Please load the table data and try again.',
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
                        {
                            actionName: 'create-table-custom-column',
                            telemetryEventIdentifier
                        }
                    );
                });
            });

            describe('enable empty row table mode', () => {
                const testCases: {
                    tableType: string;
                    toString: () => string;
                    isWithHeader: boolean;
                    ui5version?: versionUtils.Ui5VersionInfo;
                    expectDisabledReason?: string;
                    value?: string;
                    expectUnsupported?: boolean;
                }[] = [
                    {
                        tableType: MDC_TABLE_TYPE,
                        toString: () => MDC_TABLE_TYPE + ', supported version',
                        ui5version: { major: 1, minor: 131 },
                        isWithHeader: true
                    },
                    {
                        tableType: MDC_TABLE_TYPE,
                        toString: () => 'row creation already enabled',
                        isWithHeader: true,
                        ui5version: { major: 1, minor: 131 },
                        value: 'InlineCreationRows',
                        expectDisabledReason:
                            'This option has been disabled because empty row mode is already enabled for this table'
                    },
                    {
                        tableType: MDC_TABLE_TYPE,
                        toString: () => 'unsupported version',
                        isWithHeader: true,
                        ui5version: { major: 1, minor: 130 },
                        expectUnsupported: true
                    },
                    {
                        tableType: GRID_TABLE_TYPE,
                        isWithHeader: false,
                        toString: () => GRID_TABLE_TYPE
                    },
                    {
                        tableType: TREE_TABLE_TYPE,
                        isWithHeader: false,
                        toString: () => TREE_TABLE_TYPE,
                        expectDisabledReason:
                            'This action is disabled because empty row mode is not supported for analytical and tree tables'
                    },
                    {
                        tableType: ANALYTICAL_TABLE_TYPE,
                        isWithHeader: false,
                        toString: () => ANALYTICAL_TABLE_TYPE,
                        expectDisabledReason:
                            'This action is disabled because empty row mode is not supported for analytical and tree tables'
                    }
                ];
                test.each(testCases)(
                    'initialize and execute action (%s)',
                    async (testCase) => {
                        jest.spyOn(versionUtils, 'getUi5Version').mockResolvedValue(
                            testCase.ui5version ?? { major: 1, minor: 131 }
                        );

                        const pageView = new XMLView();
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
                                    getShowHeaderContent: () => true,
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

                        mockOverlay.getDesignTimeMetadata.mockReturnValue({
                            getData: jest.fn().mockReturnValue({
                                manifestSettings: jest.fn().mockReturnValue([]),
                                manifestPropertyPath: jest.fn().mockReturnValue('dummyManifestPath'),
                                manifestPropertyChange: jest.fn().mockImplementation((propertyValue, propertyPath) => [
                                    {
                                        appComponent,
                                        changeSpecificData: {
                                            appDescriptorChangeType: 'appdescr_fe_changePageConfiguration',
                                            content: {
                                                parameters: {
                                                    propertyValue,
                                                    propertyPath
                                                }
                                            }
                                        },
                                        selector: 'dummySelector'
                                    }
                                ])
                            })
                        });
                        sapCoreMock.byId.mockImplementation((id) => {
                            if (id == 'mdcTable') {
                                return {
                                    isA: (type: string) => type === testCase.tableType,
                                    getHeader: () => 'MyTable',
                                    getId: () => id,
                                    getDomRef: () => ({
                                        scrollIntoView
                                    }),

                                    getParent: () => pageView,
                                    getBusy: () => false,
                                    selectOverlay: () => ({}),
                                    data: (key: string) => {
                                        if (key === 'creationMode') {
                                            return testCase.value ?? 'inline';
                                        }
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
                                jest.spyOn(Component, 'getComponentById').mockImplementation(
                                    (id: string | undefined) => {
                                        if (id === 'component-id') {
                                            return component as unknown as ComponentMock;
                                        }
                                    }
                                );
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
                        const service = new QuickActionService(
                            rtaMock,
                            new OutlineService(rtaMock, mockChangeService),
                            [registry],
                            {
                                onStackChange: jest.fn()
                            } as unknown as ChangeService
                        );

                        await service.init(sendActionMock, subscribeMock);
                        await service.reloadQuickActions({
                            [testCase.tableType]: [
                                {
                                    controlId: 'mdcTable'
                                } as any
                            ],
                            'sap.m.NavContainer': [
                                {
                                    controlId: 'NavContainer'
                                } as any
                            ]
                        });

                        expect(sendActionMock).toHaveBeenCalled();

                        const actions = (sendActionMock.mock.calls[0][0].payload[0]?.actions as QuickAction[]) ?? [];
                        for (let i = actions.length - 1; i >= 0; i--) {
                            if (actions[i].title !== 'Enable Empty Row Mode for Tables') {
                                actions.splice(i, 1);
                            }
                        }

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
                                                          children: [
                                                              {
                                                                  path: '0/0',
                                                                  label: testCase.isWithHeader
                                                                      ? `'MyTable' table`
                                                                      : `Unnamed table`,
                                                                  enabled: !testCase.expectDisabledReason,
                                                                  tooltip: testCase.expectDisabledReason,
                                                                  children: []
                                                              }
                                                          ],
                                                          enabled: true,
                                                          label: `'section 01' section`
                                                      }
                                                  ]
                                              }
                                          ]
                                }
                            ])
                        );

                        await subscribeMock.mock.calls[0][0](
                            executeQuickAction({
                                id: actionId,
                                kind: 'nested',
                                path: '0/0'
                            })
                        );

                        if (testCase.expectUnsupported) {
                            expect(mockOverlay.setSelected).toHaveBeenCalledTimes(0);
                            expect(setSelectedSubSectionMock).toHaveBeenCalledTimes(0);
                            expect(rtaMock.getCommandStack().pushAndExecute).toHaveBeenCalledTimes(0);
                        } else {
                            expect(mockOverlay.setSelected).toHaveBeenCalledWith(true);
                            expect(setSelectedSubSectionMock).toHaveBeenCalledWith(fakeSubSection);
                            expect(rtaMock.getCommandStack().pushAndExecute).toHaveBeenCalledWith({
                                settings: {},
                                type: 'appDescriptor',
                                value: {
                                    reference: 'test.id',
                                    appComponent,
                                    changeType: 'appdescr_fe_changePageConfiguration',
                                    parameters: {
                                        propertyValue: {
                                            name: 'InlineCreationRows'
                                        },
                                        propertyPath: 'dummyManifestPath/creationMode'
                                    },
                                    selector: 'dummySelector'
                                }
                            });
                        }
                    },
                    100000
                );
            });
            describe('enable variant management in tables and charts', () => {
                jest.spyOn(adpUtils, 'checkForExistingChange').mockReturnValue(false);
                const testCases: {
                    supportedVersion: boolean;
                    varianManagmentValue?: string;
                    ui5version?: versionUtils.Ui5VersionInfo;
                }[] = [
                    {
                        supportedVersion: true,
                        varianManagmentValue: 'None'
                    },
                    {
                        supportedVersion: true,
                        varianManagmentValue: 'Control'
                    },
                    {
                        supportedVersion: false,
                        varianManagmentValue: 'None',
                        ui5version: {
                            major: 1,
                            minor: 70
                        }
                    }
                ];
                test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
                    const pageView = new XMLView();
                    jest.spyOn(versionUtils, 'getUi5Version').mockResolvedValue(
                        testCase.ui5version ?? { major: 1, minor: 131 }
                    );
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
                                getParent: () => pageView,
                                getShowHeaderContent: () => true,
                                getId: () => 'DynamicPage'
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
                            pageView.getViewName.mockImplementation(() => 'sap.fe.templates.ObjectPage.ObjectPage');
                            const componentContainer = new ComponentContainer();
                            jest.spyOn(componentContainer, 'getComponent').mockImplementation(() => {
                                return 'component-id';
                            });
                            jest.spyOn(ComponentMock, 'getComponentById').mockImplementation((id: string) => {
                                if (id === 'component-id') {
                                    return component as unknown as ComponentMock;
                                }
                            });
                            container.getCurrentPage.mockImplementation(() => {
                                return componentContainer;
                            });
                            jest.spyOn(component, 'getRootControl').mockImplementation(() => {
                                return pageView;
                            });
                            jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                                return {
                                    getVariantManagement: jest.fn().mockReturnValue(testCase.varianManagmentValue),
                                    isA: (type: string) => type === 'sap.fe.templates.ObjectPage.Component',
                                    getAppComponent: jest.fn(() => {
                                        return {
                                            getManifest: jest.fn(() => {
                                                return {
                                                    'sap.app': {
                                                        id: 'test.id'
                                                    }
                                                };
                                            })
                                        };
                                    })
                                } as unknown as UIComponent;
                            });

                            mockOverlay.getDesignTimeMetadata.mockReturnValue({
                                getData: jest.fn().mockReturnValue({
                                    manifestSettings: jest.fn().mockReturnValue([]),
                                    manifestPropertyPath: jest.fn().mockReturnValue('dummyManifestPath'),
                                    manifestPropertyChange: jest
                                        .fn()
                                        .mockImplementation((propertyValue, propertyPath) => [
                                            {
                                                component,
                                                changeSpecificData: {
                                                    appDescriptorChangeType: 'appdescr_fe_changePageConfiguration',
                                                    content: {
                                                        parameters: {
                                                            propertyValue,
                                                            propertyPath
                                                        }
                                                    }
                                                },
                                                selector: 'dummySelector'
                                            }
                                        ])
                                })
                            });
                            return container;
                        }
                    });

                    const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
                    jest.spyOn(rtaMock.getRootControlInstance(), 'getManifest').mockReturnValue({
                        'sap.ui5': {
                            routing: {
                                targets: [
                                    {
                                        name: 'sap.fe.templates.'
                                    }
                                ]
                            }
                        }
                    });
                    const registry = new FEV4QuickActionRegistry();
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
                    if (testCase.varianManagmentValue === 'Control') {
                        (tooltip =
                            'This option has been disabled because variant management is already enabled for tables and charts'),
                            (enabled = false);
                    }
                    const baseActions = [
                        {
                            enabled: true,
                            id: 'objectPage0-add-controller-to-page',
                            kind: 'simple',
                            title: 'Add Controller to Page'
                        },
                        {
                            enabled: true,
                            id: 'objectPage0-op-add-header-field',
                            kind: 'simple',
                            title: 'Add Header Field',
                            tooltip: undefined
                        },
                        {
                            enabled: true,
                            id: 'objectPage0-op-add-custom-section',
                            kind: 'simple',
                            title: 'Add Custom Section',
                            tooltip: undefined
                        }
                    ] as QuickAction[];

                    const variantManagementAction = (enabled: boolean, tooltip?: string) =>
                        ({
                            kind: 'simple',
                            id: 'objectPage0-enable-variant-management-in-tables-charts',
                            enabled,
                            title: 'Enable Variant Management in Tables and Charts',
                            tooltip
                        } as QuickAction);

                    expect(sendActionMock).toHaveBeenCalledWith(
                        quickActionListChanged([
                            {
                                title: 'OBJECT PAGE',
                                actions: testCase.supportedVersion
                                    ? [...baseActions, variantManagementAction(enabled, tooltip)]
                                    : baseActions
                            }
                        ])
                    );

                    if (testCase.supportedVersion && testCase.varianManagmentValue === 'None') {
                        await subscribeMock.mock.calls[0][0](
                            executeQuickAction({
                                id: 'objectPage0-enable-variant-management-in-tables-charts',
                                kind: 'simple'
                            })
                        );
                        expect(rtaMock.getCommandStack().pushAndExecute).toHaveBeenCalledWith({
                            'settings': {},
                            'type': 'appDescriptor',
                            'value': {
                                'changeType': 'appdescr_fe_changePageConfiguration',
                                'appComponent': undefined,
                                'parameters': {
                                    'propertyPath': 'dummyManifestPath',
                                    'propertyValue': {
                                        'variantManagement': 'Control'
                                    }
                                },
                                'reference': '',
                                'selector': 'dummySelector'
                            }
                        });
                    }
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
                    const appComponent = new AppComponentMock();
                    const component = new TemplateComponentMock();
                    jest.spyOn(component, 'getAppComponent').mockReturnValue(appComponent);
                    jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                        return component as unknown as UIComponent;
                    });
                    sapCoreMock.byId.mockImplementation((id) => {
                        if (id == 'ObjectPageLayout') {
                            pageView.getViewData.mockImplementation(() => ({
                                stableId: 'appId::BookingObjectPage'
                            }));
                            pageView.getLocalId.mockImplementation(() => 'appId::BookingObjectPage');
                            return {
                                getId: () => 'ObjectPageLayout',
                                getDomRef: () => ({}),
                                getParent: () => pageView,
                                getShowHeaderContent: () => false,
                                getSections: jest.fn().mockReturnValue([
                                    {
                                        getId: () => 'section1::entity1'
                                    }
                                ]),
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
                                    return component as unknown as ComponentMock;
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
                    jest.spyOn(rtaMock, 'getFlexSettings').mockImplementation(() => {
                        return {
                            projectId: 'dummyProjectId'
                        } as FlexSettings;
                    });
                    const registry = new FEV4QuickActionRegistry();
                    const service = new QuickActionService(
                        rtaMock,
                        new OutlineService(rtaMock, mockChangeService),
                        [registry],
                        { onStackChange: jest.fn() } as any
                    );
                    await service.init(sendActionMock, subscribeMock);
                    mockTelemetryEventIdentifier();
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
                        if (actions[i].title !== 'Add Custom Section') {
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
                        'AddCustomFragment',
                        undefined,
                        {
                            propertyPath: 'content/body/sections/',
                            appDescriptor: {
                                anchor: 'BookingObjectPage',
                                appComponent,
                                projectId: 'dummyProjectId',
                                appType: 'fe-v4',
                                pageId: 'BookingObjectPage'
                            },
                            title: 'QUICK_ACTION_OP_ADD_CUSTOM_SECTION'
                        },
                        {
                            'actionName': 'op-add-custom-section',
                            telemetryEventIdentifier
                        }
                    );
                });
            });
        });
    });

    describe('Add subpage', () => {
        const testCases: {
            ui5version?: versionUtils.Ui5VersionInfo;
            isNewPageUnavailable?: boolean;
            isUnexpectedOwnerComponent?: boolean;
            componentHasNoEntitySet?: boolean;
            isListReport?: boolean;
            isBetaFeatureDisabled?: boolean;
            isContextPathDefined?: boolean;
            isNoRouteFound?: boolean;
            expect: {
                toBeAvailable: boolean;
                toBeEnabled?: boolean;
                toThrow?: string;
                tooltip?: string;
            };
        }[] = [
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
                isContextPathDefined: true,
                expect: {
                    toBeAvailable: true,
                    toBeEnabled: false,
                    tooltip: `This option has been disabled because there are no subpages to add`
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
            },
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
                isNewPageUnavailable: true,
                isContextPathDefined: true,
                expect: {
                    toBeAvailable: true,
                    toBeEnabled: false,
                    tooltip: `This option has been disabled because there are no subpages to add`
                }
            },
            {
                ui5version: {
                    major: 1,
                    minor: 133
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
                isNoRouteFound: true,
                expect: {
                    toBeAvailable: false
                }
            }
        ];
        afterEach(() => {
            jest.restoreAllMocks();
        });
        test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
            mockTelemetryEventIdentifier();
            jest.spyOn(versionUtils, 'getUi5Version').mockResolvedValue(
                testCase.ui5version ?? { major: 1, minor: 135 }
            );
            jest.spyOn(FeatureService, 'isFeatureEnabled').mockReturnValue(!testCase.isBetaFeatureDisabled);

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
                        (testCase.isUnexpectedOwnerComponent ? 'wrongType' : 'sap.fe.templates.ListReport.Component'),
                    getEntitySet: jest
                        .fn()
                        .mockReturnValue(
                            testCase.componentHasNoEntitySet || testCase.isContextPathDefined
                                ? undefined
                                : testCase.isListReport
                                ? 'Travel'
                                : 'Booking'
                        ),
                    getContextPath: jest
                        .fn()
                        .mockReturnValue(
                            testCase.componentHasNoEntitySet || !testCase.isContextPathDefined
                                ? undefined
                                : testCase.isListReport
                                ? '/Travel'
                                : '/Booking'
                        )
                } as unknown as UIComponent;
            });

            sapCoreMock.byId.mockImplementation((id) => {
                if (id == 'ObjectPage') {
                    return {
                        isA: (type: string) => type === 'sap.fe.templates.ObjectPage.Component',
                        getId: () => id,
                        getDomRef: () => ({ ref: 'OP' }),
                        getParent: () => pageView
                    };
                }
                if (id == 'ListReport') {
                    return {
                        isA: (type: string) => type === 'sap.fe.templates.ListReport.Component',
                        getId: () => id,
                        getDomRef: () => ({ ref: 'LR' }),
                        getParent: () => pageView
                    };
                }
                if (id == 'NavContainer') {
                    const container = new NavContainer();
                    const component = new ComponentMock();
                    const view = new XMLView();
                    pageView.getDomRef.mockImplementation(() => {
                        return {
                            contains: (domRef: { ref: string }) => domRef.ref === (testCase.isListReport ? 'LR' : 'OP')
                        };
                    });
                    pageView.getViewName.mockImplementation(
                        () =>
                            `sap.fe.templates.${
                                testCase.isListReport ? 'ListReport.ListReport' : 'ObjectPage.ObjectPage'
                            }`
                    );
                    pageView.getViewData.mockImplementation(() => ({
                        stableId: testCase.isListReport ? 'appId::TravelList' : 'appId::BookingObjectPage'
                    }));

                    jest.spyOn(view, 'getComponent').mockReturnValue('component-id');

                    jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                        if (id === 'component-id') {
                            return component;
                        }
                    });
                    container.getCurrentPage.mockImplementation(() => {
                        return view;
                    });
                    jest.spyOn(component, 'getRootControl').mockImplementation(() => {
                        return pageView;
                    });
                    return container;
                }
            });

            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
            const targets = {
                TravelList: {
                    'id': 'TravelList',
                    'name': 'sap.fe.templates.ListReport',
                    'options': {
                        'settings': testCase.isContextPathDefined
                            ? {
                                  'contextPath': '/Travel'
                              }
                            : {
                                  'entitySet': 'Travel'
                              }
                    }
                },
                ...(testCase.isListReport && testCase.isNewPageUnavailable
                    ? {
                          TravelObjectPage: {
                              'id': 'TravelObjectPage',
                              'name': 'sap.fe.templates.ObjectPage',
                              'options': {
                                  'settings': testCase.isContextPathDefined
                                      ? {
                                            'contextPath': '/Travel'
                                        }
                                      : {
                                            'entitySet': 'Travel'
                                        }
                              }
                          }
                      }
                    : {}),
                BookingObjectPage: {
                    'id': 'BookingObjectPage',
                    'name': 'sap.fe.templates.ObjectPage',
                    'options': {
                        'settings': {
                            'entitySet': 'Booking'
                        }
                    }
                },
                ...(!testCase.isListReport && testCase.isNewPageUnavailable
                    ? {
                          BookSupplementObjectPage: {
                              'id': 'BookSupplementObjectPage',
                              'name': 'sap.fe.templates.ObjectPage',
                              'options': {
                                  'settings': testCase.isContextPathDefined
                                      ? {
                                            'contextPath': '/Travel/_Booking/_BookSupplement'
                                        }
                                      : {
                                            'entitySet': 'BookingSupplement'
                                        }
                              }
                          }
                      }
                    : {})
            };

            const routes = [
                {
                    'pattern': ':?query:',
                    'name': 'TravelList',
                    'target': 'TravelList'
                },
                ...(testCase.isListReport || testCase.isNewPageUnavailable
                    ? [
                          {
                              'pattern': '/Travel({key}):?query:',
                              'name': 'TravelObjectPage',
                              'target': 'TravelObjectPage'
                          }
                      ]
                    : []),
                {
                    'pattern': '/Travel({key})/_Booking({key1}):?query:',
                    'name': testCase.isNoRouteFound ? 'unknown' : 'BookingObjectPage',
                    'target': 'BookingObjectPage'
                }
            ];
            jest.spyOn(rtaMock.getRootControlInstance(), 'getManifest').mockReturnValue({
                'sap.ui5': {
                    routing: { routes, targets }
                }
            });
            jest.spyOn(rtaMock, 'getFlexSettings').mockImplementation(() => {
                return {
                    projectId: 'dummyProjectId'
                } as FlexSettings;
            });

            const dummyAppComponent = {} as unknown as AppComponentV4;
            jest.spyOn(utils, 'getV4AppComponent').mockReturnValue(dummyAppComponent);

            const metaModelMock = {
                requestObject: jest.fn().mockImplementation((path: string) => {
                    if (path.split('/').length > 2) {
                        switch (path) {
                            case '/TravelType/_Booking':
                                return {
                                    $isCollection: true
                                };
                            case '/BookingType/_BookSupplement':
                                return {
                                    $isCollection: true
                                };
                            default:
                                return {
                                    $isCollection: false
                                };
                        }
                    } else {
                        switch (path) {
                            case '/Travel':
                                return {
                                    $Type: 'TravelType',
                                    $NavigationPropertyBinding: {
                                        _Booking: 'Booking',
                                        _Agency: 'Agency'
                                    }
                                };
                            case '/Booking':
                                return {
                                    $Type: 'BookingType',
                                    $NavigationPropertyBinding: {
                                        _BookSupplement: 'BookingSupplement',
                                        _Travel: 'Travel'
                                    }
                                };
                            case '/BookingSupplement':
                                return {
                                    $Type: 'BookingSupplementType',
                                    $NavigationPropertyBinding: {}
                                };
                        }
                    }
                })
            };
            jest.spyOn(rtaMock.getRootControlInstance(), 'getModel').mockReturnValue({
                getMetaModel: () => metaModelMock
            } as unknown as ODataModelV4);

            const registry = new FEV4QuickActionRegistry();
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
                                            entitySet: 'Travel',
                                            navProperty: 'Travel'
                                        }
                                      : {
                                            entitySet: 'BookingSupplement',
                                            navProperty: '_BookSupplement'
                                        }
                              ],
                        pageDescriptor: {
                            appType: 'fe-v4',
                            appComponent: dummyAppComponent,
                            pageId: testCase.isListReport ? 'TravelList' : 'BookingObjectPage',
                            routePattern: testCase.isListReport ? ':?query:' : '/Travel({key})/_Booking({key1}):?query:'
                        },
                        title: 'ADD_SUB_PAGE_DIALOG_TITLE'
                    },
                    {
                        actionName: 'add-new-subpage',
                        telemetryEventIdentifier
                    }
                );
            }
        });
    });

    describe('change table actions', () => {
        const testCases: {
            isActionDisabled?: boolean;
            isToolbarMissing?: boolean;
            isActionNotSupported?: boolean;
            pageType: 'ListReport' | 'ObjectPage';
            expect: {
                isEnabled: boolean;
                tooltip?: string;
            };
        }[] = [
            {
                pageType: 'ListReport',
                expect: {
                    isEnabled: true
                }
            },
            {
                pageType: 'ObjectPage',
                expect: {
                    isEnabled: true
                }
            },
            {
                pageType: 'ListReport',
                isActionDisabled: true,
                expect: {
                    isEnabled: false,
                    tooltip: 'This option is disabled because the contents of the table toolbar cannot be changed.'
                }
            },
            {
                pageType: 'ListReport',
                isActionNotSupported: true,
                expect: {
                    isEnabled: false,
                    tooltip: 'This option is disabled because the contents of the table toolbar cannot be changed.'
                }
            },
            {
                pageType: 'ListReport',
                isToolbarMissing: true,
                expect: {
                    isEnabled: false,
                    tooltip: 'This option is disabled because the table toolbar is not available.'
                }
            }
        ];

        test.each(testCases)('initialize and execute action (%s)', async (testCase) => {
            const pageView = new XMLView();
            jest.spyOn(FlexRuntimeInfoAPI, 'hasVariantManagement').mockReturnValue(true);
            const scrollIntoView = jest.fn();
            const appComponent = new AppComponentMock();
            const component = new TemplateComponentMock();
            jest.spyOn(component, 'getAppComponent').mockReturnValue(appComponent);
            jest.spyOn(ComponentMock, 'getOwnerComponentFor').mockImplementation(() => {
                return component as unknown as UIComponent;
            });
            const tableControl = {
                isA: (type: string) => type === 'sap.ui.mdc.Table',
                getHeader: () => 'MyTable',
                getId: () => 'Table',
                getDomRef: () => ({
                    scrollIntoView
                }),
                getParent: () => pageView,
                getBusy: () => false
            };
            sapCoreMock.byId.mockImplementation((id) => {
                switch (id) {
                    case 'Table':
                        return tableControl;
                    case 'Toolbar':
                        return {
                            isA: (type: string) => type === 'sap.ui.mdc.ActionToolbar',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),
                            getParent: () => ({
                                isA: (type: string) => type === GRID_TABLE_TYPE,
                                getId: () => 'InnerTable',
                                getParent: () => tableControl
                            }),
                            getBusy: () => false
                        };
                    case 'Toolbar2':
                        return {
                            isA: (type: string) => type === 'sap.ui.mdc.ActionToolbar',
                            getId: () => id,
                            getDomRef: () => ({
                                scrollIntoView
                            }),
                            getParent: () => ({
                                isA: (type: string) => type === 'AnalyticalChart',
                                getId: () => 'Chart1',
                                getParent: () => pageView
                            }),
                            getBusy: () => false
                        };
                    case 'NavContainer': {
                        const container = new NavContainer();
                        const component = new TemplateComponentMock();
                        pageView.getDomRef.mockImplementation(() => {
                            return {
                                contains: () => true
                            };
                        });
                        pageView.getId.mockReturnValue('test.app::ProductsList');
                        pageView.getViewName.mockImplementation(() =>
                            testCase.pageType === 'ListReport'
                                ? 'sap.fe.templates.ListReport.ListReport'
                                : 'sap.fe.templates.ObjectPage.ObjectPage'
                        );
                        const componentContainer = new ComponentContainer();
                        jest.spyOn(componentContainer, 'getComponent').mockImplementation(() => {
                            return 'component-id';
                        });
                        jest.spyOn(Component, 'getComponentById').mockImplementation((id: string | undefined) => {
                            if (id === 'component-id') {
                                return component as unknown as ComponentMock;
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
                }
            });

            const execute = jest.fn();
            const getMock = jest.fn().mockImplementation((controlId: string) => {
                if (controlId === 'Toolbar') {
                    return testCase.isActionNotSupported
                        ? []
                        : [{ id: 'CTX_SETTINGS', enabled: !testCase.isActionDisabled }];
                }
            });
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
            jest.spyOn(rtaMock, 'getService').mockImplementation((serviceName: string): any => {
                if (serviceName === 'action') {
                    return {
                        get: getMock,
                        execute
                    };
                }
            });
            const registry = new FEV4QuickActionRegistry();
            const service = new QuickActionService(
                rtaMock,
                new OutlineService(rtaMock, mockChangeService),
                [registry],
                { onStackChange: jest.fn() } as any
            );
            await service.init(sendActionMock, subscribeMock);

            await service.reloadQuickActions({
                'sap.ui.mdc.Table': [
                    {
                        controlId: 'Table'
                    } as any
                ],
                'sap.ui.mdc.ActionToolbar': [
                    ...(testCase.isToolbarMissing
                        ? []
                        : [
                              {
                                  controlId: 'Toolbar'
                              } as any
                          ]),
                    {
                        controlId: 'Toolbar2'
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
                if (actions[i].title !== 'Change Table Actions') {
                    actions.splice(i, 1);
                }
            }

            const actionId =
                (testCase.pageType === 'ListReport' ? 'listReport' : 'objectPage') + '0-change-table-actions';
            expect(sendActionMock).toHaveBeenCalledWith(
                quickActionListChanged([
                    {
                        title: testCase.pageType === 'ListReport' ? 'LIST REPORT' : 'OBJECT PAGE',
                        actions: [
                            {
                                'kind': 'nested',
                                id: actionId,
                                title: 'Change Table Actions',
                                enabled: true,
                                children: [
                                    {
                                        path: '0',
                                        children: [],
                                        enabled: testCase.expect.isEnabled,
                                        label: `'MyTable' table`,
                                        tooltip: testCase.expect.tooltip
                                    }
                                ]
                            }
                        ]
                    }
                ])
            );

            if (testCase.expect.isEnabled) {
                await subscribeMock.mock.calls[0][0](executeQuickAction({ id: actionId, kind: 'nested', path: '0' }));
                expect(execute).toHaveBeenCalledWith('Toolbar', 'CTX_SETTINGS');
                expect(OverlayUtil.getClosestOverlayFor.mock.calls[0][0].getId()).toBe('Toolbar');
                expect(mockOverlay.setSelected).toHaveBeenCalledWith(true);
            } else {
                expect(execute).toHaveBeenCalledTimes(0);
            }
        });
    });
});
