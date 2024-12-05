import RuntimeAuthoring, { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import FlexBox from 'sap/m/FlexBox';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import type { ChangeService } from '../../../../src/cpe/changes/service';
const mockChangeService = {
    syncOutlineChanges: jest.fn()
} as unknown as ChangeService;

import {
    quickActionListChanged,
    executeQuickAction,
    QuickAction
} from '@sap-ux-private/control-property-editor-common';

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
import VersionInfo from 'mock/sap/ui/VersionInfo';

import { fetchMock } from 'mock/window';
import { mockOverlay } from 'mock/sap/ui/dt/OverlayRegistry';
import ComponentMock from 'mock/sap/ui/core/Component';
import UIComponent from 'sap/ui/core/UIComponent';
import AppComponentMock from 'mock/sap/fe/core/AppComponent';
import FlexRuntimeInfoAPI from 'mock/sap/ui/fl/apply/api/FlexRuntimeInfoAPI';
import { DialogNames } from 'open/ux/preview/client/adp/init-dialogs';
import {
    ANALYTICAL_TABLE_TYPE,
    GRID_TABLE_TYPE,
    SMART_TABLE_TYPE,
    TableQuickActionDefinitionBase,
    TREE_TABLE_TYPE
} from '../../../../src/adp/quick-actions/table-quick-action-base';
import { MDC_TABLE_TYPE } from 'open/ux/preview/client/adp/quick-actions/table-quick-action-base';
import * as QCUtils from '../../../../src/cpe/quick-actions/utils';
import ManagedObject from 'sap/ui/base/ManagedObject';
import * as versionUtils from 'open/ux/preview/client/utils/version';

describe('FE V4 quick actions', () => {
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
                        return component;
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
                VersionInfo.load.mockResolvedValue({ name: 'sap.ui.core', version: '1.129' });
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
                VersionInfo.load.mockResolvedValue({ name: 'sap.ui.core', version: '1.130.1' });
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
                                    id: 'listReport0-create_table_action',
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
                                    'title': 'Add Custom Table Column',
                                    tooltip: undefined
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
                                    id: 'listReport0-create_table_action',
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
                                    children: [
                                        {
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
                    executeQuickAction({ id: 'listReport0-create_table_action', kind: 'nested', path: '0' })
                );
            });
        });

        describe('create table custom column', () => {
            test('initialize and execute action (%s)', async () => {
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

                expect(handler).toHaveBeenCalledWith(mockOverlay, rtaMock, DialogNames.ADD_FRAGMENT, undefined, {
                    aggregation: 'columns',
                    title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
                });
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
                    expectedTooltip: 'This option is disabled because table filtering for page variants is already enabled'
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
                                    'id': 'listReport0-create-table-custom-column',
                                    'kind': 'nested',
                                    'tooltip': undefined,
                                    'title': 'Add Custom Table Column'
                                },
                                ...(isActionExpected
                                    ? [
                                          {
                                              'children': [
                                                  {
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
                        manifestPropertyPath: jest.fn().mockReturnValue('dummyManifestPath'),
                        manifestPropertyChange: jest.fn().mockImplementation((propertyValue, propertyPath) => [
                            {
                                appComponent: appComponent,
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

            describe('create table custom column', () => {
                const testCases = [
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
                test.each(testCases)(
                    'initialize and execute action (%s)',
                    async (testCase) => {
                        const pageView = new XMLView();
                        const scrollIntoView = jest.fn();
                        jest.spyOn(
                            TableQuickActionDefinitionBase.prototype as any,
                            'getInternalTable'
                        ).mockImplementation(() => {
                            return {
                                isA: (type: string) => type === SMART_TABLE_TYPE, // Check if the object is of the correct type
                                getAggregation: jest.fn().mockImplementation((aggregationName: string) => {
                                    if (aggregationName === 'items') {
                                        return testCase.enable ? ['item1', 'item2'] : []; // Return rows or empty array based on `enable`
                                    }
                                    return undefined;
                                })
                            };
                        });
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
                                                getAggregation: () => 'items'
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
                                jest.spyOn(Component, 'getComponentById').mockImplementation(
                                    (id: string | undefined) => {
                                        if (id === 'component-id') {
                                            return component;
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
                                            'enabled': testCase.enable,
                                            tooltip: testCase.enable
                                                ? undefined
                                                : 'This action has been disabled because the table rows are not available. Please load the table data and try again',
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
                    },
                    100000
                );
            });
        });
    });
});
