import type Dialog from 'sap/m/Dialog';
import Event from 'sap/ui/base/Event';
import type UI5Element from 'sap/ui/core/Element';
import JSONModel from 'sap/ui/model/json/JSONModel';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import CommandFactory from 'mock/sap/ui/rta/command/CommandFactory';
import { fetchMock, sapCoreMock } from 'mock/window';

import ControlUtils from '../../../../src/adp/control-utils';
import AddFragment from '../../../../src/adp/controllers/AddFragment.controller';
import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { ValueState } from 'mock/sap/ui/core/library';
import OverlayRegistry from 'mock/sap/ui/dt/OverlayRegistry';
import type ManagedObject from 'sap/ui/base/ManagedObject';

describe('AddFragment', () => {
    beforeAll(() => {
        fetchMock.mockResolvedValue({
            json: jest.fn().mockReturnValue({ fragments: [] }),
            text: jest.fn(),
            ok: true
        });
    });

    describe('onInit', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('fills json model with data', async () => {
            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            ControlUtils.getRuntimeControl = jest.fn().mockReturnValue({
                getMetadata: jest.fn().mockReturnValue({
                    getAllAggregations: jest.fn().mockReturnValue({
                        'tooltip': {},
                        'customData': {},
                        'layoutData': {},
                        'dependents': {},
                        'dragDropConfig': {},
                        'content': {}
                    }),
                    getDefaultAggregationName: jest.fn().mockReturnValue('content'),
                    getName: jest.fn().mockReturnValue('Toolbar')
                })
            });

            ControlUtils.getControlAggregationByName = jest
                .fn()
                .mockReturnValue({ 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} });

            const overlayControl = {
                getDesignTimeMetadata: jest.fn().mockReturnValue({
                    getData: jest.fn().mockReturnValue({
                        aggregations: { content: { actions: { move: null }, domRef: ':sap-domref' } }
                    })
                })
            };
            sapCoreMock.byId.mockReturnValue(overlayControl);

            OverlayRegistry.getOverlay = jest.fn().mockReturnValue({
                getDesignTimeMetadata: jest.fn().mockReturnValue({
                    getData: jest.fn().mockReturnValue({
                        aggregations: {}
                    })
                })
            });

            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const openSpy = jest.fn();
            addFragment.byId = jest.fn().mockReturnValue({
                open: openSpy,
                close: jest.fn(),
                setEscapeHandler: jest.fn()
            });

            addFragment.createId = jest.fn().mockReturnValue('sampleId');

            addFragment.getView = jest.fn().mockReturnValue({ destroy: jest.fn(), setModel: jest.fn() });

            await addFragment.onInit();

            const escapeHandlerCb = (addFragment.dialog.setEscapeHandler as jest.Mock).mock.calls[0][0];

            escapeHandlerCb({ resolve: jest.fn() });

            expect(openSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('onAggregationChanged', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('on selected aggregations changed', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const event = {
                getSource: jest.fn().mockReturnValue({
                    getSelectedItem: jest.fn().mockReturnValue({ getText: jest.fn().mockReturnValue('someText') }),
                    getSelectedKey: jest.fn().mockReturnValue('0')
                })
            };

            ControlUtils.getControlAggregationByName = jest.fn().mockReturnValue({ 0: {} });

            OverlayRegistry.getOverlay = jest.fn().mockReturnValue({
                getDesignTimeMetadata: jest.fn().mockReturnValue({
                    getData: jest.fn().mockReturnValue({
                        aggregations: { someText:{ specialIndexHandling: 'true' } }
                    })
                })
            });

            addFragment['runtimeControl'] = {
                getMetadata: jest.fn().mockReturnValue({
                    getName: jest.fn().mockReturnValue('Toolbar')
                })
            } as unknown as ManagedObject;

            const setPropertySpy = jest.fn();
            addFragment.model = {
                setProperty: setPropertySpy
            } as unknown as JSONModel;

            const updatedIndexArray = [{key: 0, value: 0}, {key: 1, value: 1}, {key: 2, value: 2}]

            addFragment.onAggregationChanged(event as unknown as Event);

            expect(setPropertySpy).toHaveBeenCalledTimes(7);
            expect(setPropertySpy).toHaveBeenCalledWith('/selectedAggregation/key', '0');
            expect(setPropertySpy).toHaveBeenCalledWith('/selectedAggregation/value', 'someText');
            expect(setPropertySpy).toHaveBeenCalledWith('/indexHandlingFlag', false);
            expect(setPropertySpy).toHaveBeenCalledWith('/specialIndexHandlingIcon', true);
            expect(setPropertySpy).toHaveBeenCalledWith('/iconTooltip', 'Index is defined by special logic of Toolbar and can\'t be set here');
            expect(setPropertySpy).toHaveBeenCalledWith('/index', updatedIndexArray);
            expect(setPropertySpy).toHaveBeenCalledWith('/selectedIndex', 2);
        });
    });

    describe('handleDialogClose', () => {
        test('should close dialog', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const closeSpy = jest.fn();

            addFragment.dialog = {
                close: closeSpy
            } as unknown as Dialog;

            addFragment.getView = jest.fn().mockReturnValue({ destroy: jest.fn() });

            addFragment.handleDialogClose();

            expect(closeSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('onIndexChanged', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('on selected aggragations changed', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const event = {
                getSource: jest.fn().mockReturnValue({
                    getSelectedItem: jest.fn().mockReturnValue({ getText: jest.fn().mockReturnValue('0') })
                })
            };

            const setPropertySpy = jest.fn();

            addFragment.model = {
                setProperty: setPropertySpy
            } as unknown as JSONModel;

            addFragment.onIndexChanged(event as unknown as Event);

            expect(setPropertySpy).toHaveBeenCalledWith('/selectedIndex', '0');
        });
    });

    describe('onFragmentNameInputChange', () => {
        const testModel = {
            setProperty: jest.fn(),
            getProperty: jest.fn().mockReturnValue([{ fragmentName: 'Delete.fragment.xml' }])
        } as unknown as JSONModel;

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('sets error when fragment with the same named already exists', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('Delete'),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;

            addFragment.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error);
        });

        test('sets error when the fragment name is empty', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue(''),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;

            addFragment.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.None);
        });

        test('sets error when the fragment name has special characters', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('Share 2$5!'),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;

            addFragment.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error);
        });

        test('sets error when the fragment name contains a whitespace at the end', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('samplename '),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;
            
            addFragment.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error);
        })

        test('sets error when the fragment name exceeds 64 characters', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('thisisverylongnamethisisverylongnamethisisverylongnamethisisveryl'),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;
            
            addFragment.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error);
        })

        test('sets create button to true when the fragment name is valid', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('Share'),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;

            addFragment.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Success);
        });
    });

    describe('onCreateBtnPress', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });
        const testModel = {
            getProperty: jest.fn().mockReturnValueOnce('Share').mockReturnValueOnce('0').mockReturnValueOnce('content')
        } as unknown as JSONModel;

        test('creates new fragment and a change', async () => {
            const executeSpy = jest.fn();
            rtaMock.getCommandStack.mockReturnValue({
                pushAndExecute: executeSpy
            });
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                rtaMock
            );

            const event = {
                getSource: jest.fn().mockReturnValue({
                    setEnabled: jest.fn()
                })
            };

            addFragment.model = testModel;

            CommandFactory.getCommandFor = jest.fn().mockReturnValue({ fileName: 'something.change' });

            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue({
                    id: 'id',
                    reference: 'reference',
                    namespace: 'namespace',
                    layer: 'layer'
                }),
                text: jest.fn().mockReturnValue('XML Fragment was created!'),
                ok: true
            });

            addFragment.handleDialogClose = jest.fn();

            await addFragment.onCreateBtnPress(event as unknown as Event);

            expect(executeSpy).toHaveBeenCalledWith({ fileName: 'something.change' });
        });

        test('throws error when creating new fragment', async () => {
            const errorMsg = 'Could not create XML Fragment!';

            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const event = {
                getSource: jest.fn().mockReturnValue({
                    setEnabled: jest.fn()
                })
            };

            addFragment.model = testModel;

            CommandFactory.getCommandFor = jest.fn().mockReturnValue({});

            fetchMock.mockResolvedValue({
                json: jest.fn(),
                text: jest.fn().mockRejectedValue({ message: errorMsg }),
                ok: true
            });

            try {
                await addFragment.onCreateBtnPress(event as unknown as Event);
            } catch (e) {
                expect(e.message).toBe(errorMsg);
            }
        });
    });
});
