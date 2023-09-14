import * as controlData from '../../../src/cpe/control-data';
import { SelectionService } from '../../../src/cpe/selection';
import * as Documentation from '../../../src/cpe/documentation';
import type { ExternalAction, Control } from '@sap-ux-private/control-property-editor-common';
import type Element from 'sap/ui/core/Element';
import type { ID } from 'sap/ui/core/library';
import Log from 'sap/base/Log';

describe('SelectionService', () => {
    const sendActionMock = jest.fn();
    let buildControlDataSpy: jest.SpyInstance<any>;
    let documentation: jest.SpyInstance<any>;
    Log.error = jest.fn();
    Log.info = jest.fn();
    beforeEach(() => {
        buildControlDataSpy = jest.spyOn(controlData, 'buildControlData').mockImplementation((): any => {
            return {
                id: 'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--action::SEPMRA_PROD_MAN.SEPMRA_PROD_MAN_Entities::SEPMRA_C_PD_ProductCopy', //the id of the underlying control/aggregation
                type: 'sap.m.Button', //the name of the ui5 class of the control/aggregation
                properties: [
                    {
                        editor: 'checkbox',
                        name: 'activeIcon',
                        readableName: 'test',
                        type: 'boolean',
                        isEnabled: false,
                        value: 'true'
                    },
                    {
                        editor: 'dropdown',
                        name: 'ariaHasPopup',
                        readableName: 'test',
                        type: 'string',
                        isEnabled: false,
                        value: 'test'
                    }
                ]
            } as Control;
        });
        documentation = jest.spyOn(Documentation, 'getDocumentation').mockImplementation(() =>
            Promise.resolve({
                activeIcon: {
                    defaultValue: 'test',
                    description: 'test doc',
                    propertyName: 'activeIcon',
                    type: 'testType',
                    propertyType: 'testType'
                },
                ariaHasPopup: {
                    defaultValue: 'test',
                    description: 'test doc',
                    propertyName: 'ariaHasPopup',
                    type: 'testType',
                    propertyType: 'testType'
                },
                blocked: {
                    defaultValue: 'test',
                    description: 'test description',
                    propertyName: 'blocked',
                    type: 'testType',
                    propertyType: 'testType'
                },
                busyIndicatorDelay: {
                    defaultValue: 'test',
                    description: 'test description',
                    propertyName: 'busyIndicatorDelay',
                    type: 'testType',
                    propertyType: 'testType'
                },
                fieldGroupIds: {
                    defaultValue: 'test',
                    description: 'test description',
                    propertyName: 'fieldGroupIds',
                    type: 'testType',
                    propertyType: 'testType'
                },
                text: {
                    defaultValue: 'test',
                    description: 'test description',
                    propertyName: 'text',
                    type: 'testType',
                    propertyType: 'testType'
                },
                width: {
                    defaultValue: 'test',
                    description: 'test description',
                    propertyName: 'width',
                    type: 'testType',
                    propertyType: 'testType'
                }
            })
        );
    });

    afterEach(() => {
        buildControlDataSpy.mockRestore();
        documentation.mockRestore();
    });
    beforeAll(() => {
        window.fetch = jest.fn().mockResolvedValue({});
    });

    test('attaches to RTA selection change', async () => {
        let handler: ((event: Event) => Promise<void>) | undefined;
        const cache = new Map();
        const getControlByIdSpy = jest.fn().mockImplementation((id: ID) => {
            return cache.get(id);
        });
        const selectionChangeGetParameterSpy = jest.fn().mockReturnValue([]);
        const attachSelectionChange = jest.fn().mockImplementation((newHandler: (event: Event) => Promise<void>) => {
            handler = newHandler;
        });
        const rta = {
            attachSelectionChange,
            getService: jest.fn().mockReturnValue({ get: jest.fn(), attachEvent: jest.fn() })
        } as any;
        const service = new SelectionService(rta, {
            getControlById: getControlByIdSpy,
            getIcons: jest.fn(),
            getClosestOverlayFor: jest.fn(),
            getComponent: jest.fn(),
            getOverlay: jest.fn()
        });
        await service.init(jest.fn(), jest.fn());
        expect(handler).not.toBeUndefined();
        if (handler !== undefined) {
            await handler({
                getParameter: selectionChangeGetParameterSpy
            } as any);
        }
        expect(selectionChangeGetParameterSpy).toHaveBeenCalledTimes(1);
        expect(selectionChangeGetParameterSpy).toHaveBeenCalledWith('selection');
    });

    test('attaches to selected control change', async () => {
        let handler: ((event: Event) => Promise<void>) | undefined;
        let propertyChangeHandler: ((event: Event) => Promise<void>) | undefined;
        const attachEventSpy = jest
            .fn()
            .mockImplementation((eventName: string, newHandler: (event: Event) => Promise<void>) => {
                if (eventName === '_change') {
                    propertyChangeHandler = newHandler;
                }
            });
        jest.spyOn(controlData, 'buildControlData').mockReturnValue({
            id: 'control1',
            name: 'controlName',
            type: 'controlType',
            properties: []
        });
        const cache = new Map([
            [
                'overlayControl1',
                {
                    getElementInstance: jest.fn().mockReturnValue({
                        attachEvent: attachEventSpy,
                        getBindingInfo: jest.fn(),
                        getMetadata: jest.fn().mockReturnValue({
                            getName: jest.fn().mockReturnValue('test'),
                            getLibraryName: jest.fn().mockReturnValue('sap.m'),
                            getAllProperties: jest.fn().mockReturnValue({
                                activeIcon: {
                                    name: 'activeIcon',
                                    type: 'sap.ui.core.URI',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('sap.ui.core.URI')
                                    })
                                },
                                ariaHasPopup: {
                                    name: 'ariaHasPopup',
                                    type: 'sap.ui.core.aria.HasPopup',
                                    group: 'Accessibility',
                                    defaultValue: 'None',
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('sap.ui.core.aria.HasPopup')
                                    })
                                },
                                blocked: {
                                    name: 'blocked',
                                    type: 'boolean',
                                    group: 'Misc',
                                    defaultValue: false,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('boolean')
                                    })
                                },
                                busyIndicatorDelay: {
                                    name: 'busyIndicatorDelay',
                                    type: 'int',
                                    group: 'Misc',
                                    defaultValue: 1000,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('int')
                                    })
                                },
                                fieldGroupIds: {
                                    name: 'fieldGroupIds',
                                    type: 'string[]',
                                    group: 'Misc',
                                    defaultValue: 'test',
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('string[]')
                                    })
                                },
                                text: {
                                    name: 'text',
                                    type: 'string',
                                    group: 'Misc',
                                    defaultValue: '',
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('string')
                                    })
                                },
                                width: {
                                    name: 'width',
                                    type: 'sap.ui.core.CSSSize',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('sap.ui.core.CSSSize')
                                    })
                                },
                                test: {
                                    name: 'test',
                                    type: 'float',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('float')
                                    })
                                },
                                testProperty: undefined,
                                testProperty1: {
                                    name: 'testProperty1',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue(undefined)
                                },
                                testProperty2: {
                                    name: 'testProperty2',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue(undefined)
                                    })
                                },
                                testProperty3: {
                                    name: 'testProperty3',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('any')
                                    })
                                },
                                testProperty4: {
                                    name: 'testProperty4',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('object')
                                    })
                                },
                                testProperty5: {
                                    name: 'testProperty5',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('void')
                                    })
                                }
                            })
                        })
                    })
                }
            ]
        ]);
        const getControlByIdSpy = jest.fn().mockImplementation((id: ID) => {
            return cache.get(id);
        });
        const selectionChangeGetParameterSpy = jest.fn().mockReturnValue([
            {
                getId: () => 'overlayControl1'
            }
        ]);
        const attachSelectionChange = jest.fn().mockImplementation((newHandler: (event: Event) => Promise<void>) => {
            handler = newHandler;
        });
        const rta = {
            attachSelectionChange,
            getService: jest.fn().mockReturnValue({ get: jest.fn(), attachEvent: jest.fn() })
        } as any;
        const service = new SelectionService(rta, {
            getControlById: getControlByIdSpy,
            getOverlay: jest.fn(),
            getComponent: jest.fn(),
            getClosestOverlayFor: jest.fn(),
            getIcons: jest.fn()
        });
        const sendActionSpy = jest.fn();
        await service.init(sendActionSpy, jest.fn());
        expect(handler).not.toBeUndefined();
        // Select control
        if (handler !== undefined) {
            await handler({
                getParameter: selectionChangeGetParameterSpy
            } as any);
        }

        expect(propertyChangeHandler).not.toBeUndefined();
        // Trigger change
        if (propertyChangeHandler !== undefined) {
            await propertyChangeHandler({
                getParameter: (name: string) => {
                    switch (name) {
                        case 'name':
                            return 'text';
                        case 'id':
                            return 'control1';
                        case 'newValue':
                            return 'newText';
                        default:
                            throw 'Unknown';
                    }
                }
            } as any);
        }
        expect(sendActionSpy).toHaveBeenCalledTimes(2);
        expect(sendActionSpy).toHaveBeenNthCalledWith(1, {
            payload: { controlId: 'control1', newValue: 'newText', propertyName: 'text' },
            type: '[ext] property-changed'
        });
    });

    test('dispose handlers after selection', async () => {
        let handler: ((event: Event) => Promise<void>) | undefined;
        let propertyChangeHandler: ((event: Event) => void) | undefined;
        const attachEventSpy = jest
            .fn()
            .mockImplementation((eventName: string, newHandler: (event: Event) => Promise<void>) => {
                if (eventName === '_change') {
                    propertyChangeHandler = newHandler;
                }
            });
        jest.spyOn(controlData, 'buildControlData').mockReturnValue({
            id: 'control1',
            type: 'controlType',
            name: 'controlName',
            properties: []
        });
        const cache = new Map([
            [
                'overlayControl1',
                {
                    getElementInstance: jest.fn().mockReturnValue({
                        attachEvent: attachEventSpy,
                        detachEvent: jest.fn().mockImplementation((eventName: string) => {
                            if (eventName === '_change') {
                                propertyChangeHandler = undefined;
                            }
                        }),
                        getBindingInfo: jest.fn(),
                        getMetadata: jest.fn().mockReturnValue({
                            getName: jest.fn().mockReturnValue('test'),
                            getLibraryName: jest.fn().mockReturnValue('sap.m'),
                            getAllProperties: jest.fn().mockReturnValue({
                                activeIcon: {
                                    name: 'activeIcon',
                                    type: 'sap.ui.core.URI',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('sap.ui.core.URI')
                                    })
                                },
                                ariaHasPopup: {
                                    name: 'ariaHasPopup',
                                    type: 'sap.ui.core.aria.HasPopup',
                                    group: 'Accessibility',
                                    defaultValue: 'None',
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('sap.ui.core.aria.HasPopup')
                                    })
                                },
                                blocked: {
                                    name: 'blocked',
                                    type: 'boolean',
                                    group: 'Misc',
                                    defaultValue: false,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('boolean')
                                    })
                                },
                                busyIndicatorDelay: {
                                    name: 'busyIndicatorDelay',
                                    type: 'int',
                                    group: 'Misc',
                                    defaultValue: 1000,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('int')
                                    })
                                },
                                fieldGroupIds: {
                                    name: 'fieldGroupIds',
                                    type: 'string[]',
                                    group: 'Misc',
                                    defaultValue: 'test',
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('string[]')
                                    })
                                },
                                text: {
                                    name: 'text',
                                    type: 'string',
                                    group: 'Misc',
                                    defaultValue: '',
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('string')
                                    })
                                },
                                width: {
                                    name: 'width',
                                    type: 'sap.ui.core.CSSSize',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('sap.ui.core.CSSSize')
                                    })
                                },
                                test: {
                                    name: 'test',
                                    type: 'float',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('float')
                                    })
                                },
                                testProperty: undefined,
                                testProperty1: {
                                    name: 'testProperty1',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue(undefined)
                                },
                                testProperty2: {
                                    name: 'testProperty2',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue(undefined)
                                    })
                                },
                                testProperty3: {
                                    name: 'testProperty3',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('any')
                                    })
                                },
                                testProperty4: {
                                    name: 'testProperty4',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('object')
                                    })
                                },
                                testProperty5: {
                                    name: 'testProperty5',
                                    group: 'Misc',
                                    defaultValue: null,
                                    bindable: false,
                                    getType: jest.fn().mockReturnValue({
                                        getName: jest.fn().mockReturnValue('void')
                                    })
                                }
                            })
                        })
                    })
                }
            ]
        ]);
        const getControlByIdSpy = jest.fn().mockImplementation((id: ID) => {
            return cache.get(id);
        });
        const selectionChangeGetParameterSpy = jest.fn().mockReturnValue([
            {
                getId: () => 'overlayControl1'
            }
        ]);
        const attachSelectionChange = jest.fn().mockImplementation((newHandler: (event: Event) => Promise<void>) => {
            handler = newHandler;
        });
        const rta = {
            attachSelectionChange,
            getService: jest.fn().mockReturnValue({ get: jest.fn(), attachEvent: jest.fn() })
        } as any;
        const service = new SelectionService(rta, {
            getControlById: getControlByIdSpy,
            getIcons: jest.fn(),
            getClosestOverlayFor: jest.fn(),
            getComponent: jest.fn(),
            getOverlay: jest.fn()
        });
        const sendActionSpy = jest.fn();
        await service.init(sendActionSpy, jest.fn());
        expect(handler).not.toBeUndefined();
        if (handler !== undefined) {
            // Select control
            await handler({
                getParameter: selectionChangeGetParameterSpy
            } as any);
            // deselect control
            await handler({
                getParameter: jest.fn().mockReturnValue([])
            } as any);
        }

        if (propertyChangeHandler !== undefined) {
            // Trigger change
            propertyChangeHandler({
                getParameter: (name: string) => {
                    switch (name) {
                        case 'name':
                            return 'text';
                        case 'id':
                            return 'control1';
                        case 'newValue':
                            return 'newText';
                        default:
                            throw 'Unknowtype';
                    }
                }
            } as any);
        }

        expect(sendActionSpy).toHaveBeenCalledTimes(1);
    });

    test('select control', async () => {
        const actionHandlers: ((action: ExternalAction) => void)[] = [];
        function subscribe(handler: (action: ExternalAction) => Promise<void> | void): void {
            actionHandlers.push(handler);
        }

        const cache = new Map();
        cache.set(
            'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--action::SEPMRA_PROD_MAN.SEPMRA_PROD_MAN_Entities::SEPMRA_C_PD_ProductCopy',
            {} as Element
        );
        cache.set('testId', undefined);
        cache.set('testIdfinal', {
            getMetadata: jest.fn().mockReturnValue({
                getName: jest.fn().mockReturnValue('activeIcon'),
                getLibraryName: jest.fn().mockReturnValue('sap.m'),
                getAllProperties: jest.fn().mockReturnValue({
                    activeIcon: {
                        name: 'activeIcon',
                        type: 'sap.ui.core.URI',
                        group: 'Misc',
                        defaultValue: null,
                        bindable: false,
                        getType: jest.fn().mockReturnValue({
                            getName: jest.fn().mockReturnValue('sap.ui.core.URI')
                        })
                    },
                    ariaHasPopup: {
                        name: 'ariaHasPopup',
                        type: 'sap.ui.core.aria.HasPopup',
                        group: 'Accessibility',
                        defaultValue: 'None',
                        bindable: false,
                        getType: jest.fn().mockReturnValue({
                            getName: jest.fn().mockReturnValue('sap.ui.core.aria.HasPopup')
                        })
                    }
                })
            })
        } as any);

        const getControlByIdSpy = jest.fn().mockImplementation((id: ID) => {
            return cache.get(id);
        });
        const getComponentSpy = jest.fn().mockImplementation(() => {
            return {
                getMetadata: jest.fn().mockReturnValue({
                    getName: jest.fn().mockReturnValue('activeIcon'),
                    getLibraryName: jest.fn().mockReturnValue('sap.m'),
                    getAllProperties: jest.fn().mockReturnValue({
                        activeIcon: {
                            name: 'activeIcon',
                            type: 'sap.ui.core.URI',
                            group: 'Misc',
                            defaultValue: null,
                            bindable: false,
                            getType: jest.fn().mockReturnValue({
                                getName: jest.fn().mockReturnValue('sap.ui.core.URI')
                            })
                        },
                        ariaHasPopup: {
                            name: 'ariaHasPopup',
                            type: 'sap.ui.core.aria.HasPopup',
                            group: 'Accessibility',
                            defaultValue: 'None',
                            bindable: false,
                            getType: jest.fn().mockReturnValue({
                                getName: jest.fn().mockReturnValue('sap.ui.core.aria.HasPopup')
                            })
                        },
                        blocked: {
                            name: 'blocked',
                            type: 'boolean',
                            group: 'Misc',
                            defaultValue: false,
                            bindable: false,
                            getType: jest.fn().mockReturnValue({
                                getName: jest.fn().mockReturnValue('boolean')
                            })
                        },
                        busyIndicatorDelay: {
                            name: 'busyIndicatorDelay',
                            type: 'int',
                            group: 'Misc',
                            defaultValue: 1000,
                            bindable: false,
                            getType: jest.fn().mockReturnValue({
                                getName: jest.fn().mockReturnValue('int')
                            })
                        },
                        fieldGroupIds: {
                            name: 'fieldGroupIds',
                            type: 'string[]',
                            group: 'Misc',
                            defaultValue: 'test',
                            bindable: false,
                            getType: jest.fn().mockReturnValue({
                                getName: jest.fn().mockReturnValue('string[]')
                            })
                        },
                        text: {
                            name: 'text',
                            type: 'string',
                            group: 'Misc',
                            defaultValue: '',
                            bindable: false,
                            getType: jest.fn().mockReturnValue({
                                getName: jest.fn().mockReturnValue('string')
                            })
                        },
                        width: {
                            name: 'width',
                            type: 'sap.ui.core.CSSSize',
                            group: 'Misc',
                            defaultValue: null,
                            bindable: false,
                            getType: jest.fn().mockReturnValue({
                                getName: jest.fn().mockReturnValue('sap.ui.core.CSSSize')
                            })
                        }
                    })
                })
            } as any;
        });
        const getOverlaySpy = jest.fn().mockImplementation();

        const getClosestOverlayForSpy = jest
            .fn()
            .mockImplementationOnce(() => {
                return { isSelectable: jest.fn().mockReturnValue(true), setSelected: jest.fn() } as any;
            })
            .mockImplementationOnce(() => {
                return { isSelectable: jest.fn().mockReturnValue(false) } as any;
            });
        const attachSelectionChange = jest.fn().mockImplementation();
        const rta = {
            attachSelectionChange,
            getSelection: jest.fn().mockReturnValue([{ setSelected: jest.fn() }, { setSelected: jest.fn() }]),
            getService: jest.fn().mockReturnValue({ get: jest.fn(), attachEvent: jest.fn() })
        } as any;
        const service = new SelectionService(rta, {
            getControlById: getControlByIdSpy,
            getComponent: getComponentSpy,
            getOverlay: getOverlaySpy,
            getClosestOverlayFor: getClosestOverlayForSpy,
            getIcons: jest.fn()
        });
        await service.init(sendActionMock, subscribe);

        for (const handler2 of actionHandlers) {
            // control.isSelectable = true
            handler2({
                type: '[ext] select-control',
                payload:
                    'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--action::SEPMRA_PROD_MAN.SEPMRA_PROD_MAN_Entities::SEPMRA_C_PD_ProductCopy'
            });

            // !control
            await handler2({
                type: '[ext] select-control',
                payload: 'testId'
            });

            //control.isSelectable = false
            await handler2({
                type: '[ext] select-control',
                payload: 'testIdfinal'
            });
        }
        expect(sendActionMock).toBeCalledTimes(2);
        expect(buildControlDataSpy).toBeCalledTimes(2);
    });
});
