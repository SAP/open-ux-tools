import * as controlData from '../../src/cpe/control-data';
import { SelectionService } from '../../src/cpe/selection';
import type { ExternalAction } from '@sap-ux/control-property-editor-common';
import type Component from 'sap/ui/core/Component';
import type Element from 'sap/ui/core/Element';
import type { ID } from 'sap/ui/core/library';

describe('SelectionService', () => {
    const sendActionMock = jest.fn();
    let buildControlDataSpy: jest.SpyInstance<any>;

    beforeEach(() => {
        buildControlDataSpy = jest.spyOn(controlData, 'buildControlData').mockImplementation((): any => {
            return {
                id: 'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--action::SEPMRA_PROD_MAN.SEPMRA_PROD_MAN_Entities::SEPMRA_C_PD_ProductCopy', //the id of the underlying control/aggregation
                type: 'sap.m.Button', //the name of the ui5 class of the control/aggregation
                properties: []
            };
        });
    });

    afterEach(() => {
        buildControlDataSpy.mockRestore();
    });
    beforeAll(() => {
        (global as any).fetch = jest.fn(() => Promise.resolve({}));
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
        jest.spyOn(controlData, 'buildControlData').mockResolvedValue({
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
                            getName: jest.fn().mockReturnValue('test')
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
        expect(sendActionSpy).toHaveBeenNthCalledWith(2, {
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
        jest.spyOn(controlData, 'buildControlData').mockResolvedValue({
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
                            getName: jest.fn().mockReturnValue('test')
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
        cache.set('testIdfinal', {} as Element);

        const getControlByIdSpy = jest.fn().mockImplementation((id: ID) => {
            return cache.get(id);
        });
        const getComponentSpy = jest.fn().mockImplementation(() => {
            return {} as Component;
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
