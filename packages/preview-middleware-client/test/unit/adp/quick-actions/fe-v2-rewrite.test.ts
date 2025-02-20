import RuntimeAuthoring from 'mock/sap/ui/rta/RuntimeAuthoring';

import { quickActionListChanged, executeQuickAction } from '@sap-ux-private/control-property-editor-common';

import { QuickActionService } from '../../../../src/cpe/quick-actions/quick-action-service';
import { OutlineService } from '../../../../src/cpe/outline/service';
import { FeatureService } from '../../../../src/cpe/feature-service';

import FEV2QuickActionRegistry from '../../../../src/adp/quick-actions/fe-v2/registry';
import NavContainer from 'mock/sap/m/NavContainer';
import ComponentContainer from 'mock/sap/ui/core/ComponentContainer';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import UIComponentMock from 'mock/sap/ui/core/UIComponent';
import type { ChangeService } from '../../../../src/cpe/changes/service';
import Element from 'sap/ui/core/Element';
import XMLView from 'mock/sap/ui/core/mvc/XMLView';
import Component from 'sap/ui/core/Component';
import { attachBeforeClose } from 'mock/sap/ui/core/Fragment';
import { fetchMock } from 'mock/window';
import FlexUtils from 'mock/sap/ui/fl/Utils';
import { DialogFactory } from '../../../../src/adp/dialog-factory';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';

// Mock not working. Need to avoid i18n files
// import * as i18n from '../../../../src/i18n';
// jest.mock('../../../../src/i18n', () => {
//     return {
//         ...jest.requireActual('../../../../src/i18n'),
//         getTextBundle: () => {
//             return Promise.resolve({
//                 getText: (str: string) => {
//                     return str;
//                 }
//             });
//         },
//         getResourceModel: () => {
//             return Promise.resolve({
//                 getProperty: (str: string) => {
//                     return str;
//                 },
//                 setProperty: (str: string) => {
//                     const _test = str;
//                 }
//             });
//         }
//     };
// });
export const mockOverlay = {
    getDesignTimeMetadata: jest.fn(),
    isSelectable: jest.fn(),
    setSelected: jest.fn(),
    getDomRef: jest.fn(),
    getElementInstance: jest.fn()
};

/* 1. Issue with import */
// import { mockOverlay } from 'mock/sap/ui/dt/OverlayRegistry';

// Not able import the above constant because of the following error
// ModuleError: failed to execute module factory for ''/packages/preview-middleware-client/test/unit/adp/quick-actions/fe-v2-rewrite.test.ts'': Cannot read properties of undefined (reading 'mockOverlay')

describe('FE V2 quick actions', () => {
    let sendActionMock: jest.Mock;
    let subscribeMock: jest.Mock;
    const mockChangeService = {
        syncOutlineChanges: jest.fn()
    } as unknown as ChangeService;
    beforeEach(() => {
        sendActionMock = jest.fn();
        subscribeMock = jest.fn();
        // jest.spyOn(DialogFactory, 'createDialog').mockResolvedValue();
        jest.clearAllMocks();
    });

    afterEach(() => {
        //fetchMock.mockRestore();
    });

    describe('ListReport', () => {
        beforeEach(() => {
            // jest.spyOn(i18n, 'getTextBundle').mockResolvedValue({
            //     getText: (str: string) => {
            //         return str;
            //     }
            // } as any);
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
        describe.only('clear filter bar button', () => {
            test('initialize and execute action', async () => {
                Element.getElementById = undefined as unknown as any;
                sap.ui.getCore().byId = jest.fn().mockImplementation((id) => {
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
                        jest.spyOn(componentContainer, 'getComponent').mockImplementation(() => {
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
                        container.getCurrentPage = jest.fn().mockImplementation(() => {
                            return view;
                        });
                        component.getRootControl.mockImplementation(() => {
                            return pageView;
                        });
                        return container;
                    }
                });

                CommandFactory.getCommandFor = jest.fn().mockImplementation((control, type, value, _, settings) => {
                    return { type, value, settings };
                });

                const rtaMock = new RuntimeAuthoring({} as any);
                jest.spyOn(rtaMock, 'getService').mockImplementation((serviceName = 'action'): any => {
                    return {
                        get: (controlId: string) => {
                            return [{ id: 'testCase.actionId' }];
                        },
                        execute: jest.fn()
                    };
                });
                rtaMock.getRootControlInstance = jest.fn().mockReturnValue({
                    getManifest: jest.fn().mockReturnValue({})
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
                                    /* Issue Translation text not returned anymore, rather key is returned */
                                    title: 'V2_QUICK_ACTION_LR_ENABLE_CLEAR_FILTER_BAR',
                                    tooltip: undefined,
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

        /* 3. Issue with uncommenting test lead to the first test failing when trying to load resouceBundle */
       /*  describe('add controller to the page', () => {
            test('initialize and execute action', async () => {
                const pageView = new XMLView();
                // 4. This FlexUtils class is undefined
                FlexUtils.getViewForControl = jest.fn().mockImplementation(() => {
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
                sap.ui.getCore().byId = jest.fn().mockImplementation((id) => {
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
                const rtaMock = new RuntimeAuthoring({} as RTAOptions);
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
        }); */
    });
});
