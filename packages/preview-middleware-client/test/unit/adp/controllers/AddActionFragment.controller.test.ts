import type Dialog from 'sap/m/Dialog';
import Event from 'sap/ui/base/Event';
import type UI5Element from 'sap/ui/core/Element';
import JSONModel from 'sap/ui/model/json/JSONModel';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import CommandFactory from 'mock/sap/ui/rta/command/CommandFactory';
import { fetchMock, sapCoreMock } from 'mock/window';

import ControlUtils from '../../../../src/adp/control-utils';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { ValueState } from 'mock/sap/ui/core/library';
import OverlayRegistry from 'mock/sap/ui/dt/OverlayRegistry';
import AddActionFragment from 'open/ux/preview/client/adp/controllers/AddActionFragment.controller';
import Control from 'sap/ui/core/Control';
import SimpleForm from 'sap/ui/layout/form';
const mocks = {
    setValueStateMock: jest.fn(),
    setValueStateTextMock: jest.fn()
};

type StateType = ValueState | keyof typeof ValueState;
const mockFormInput = (
    isInput: boolean,
    values: String | String[] = '',
    states?: StateType | StateType[],
    stateTexts?: string | string[],
    controlStates: {
        editable?: boolean;
        visible?: boolean;
    } = { editable: true, visible: true }
) => ({
    isA: jest.fn().mockReturnValue(isInput),
    getVisible: jest.fn().mockReturnValue(controlStates.visible),
    getEditable: jest.fn().mockReturnValue(controlStates.editable),
    getValue: nCallsMock(values),
    getValueState: nCallsMock(states),
    getValueStateText: nCallsMock(stateTexts),
    setValueState: mocks.setValueStateMock
});
const mockInputEvent = (value: String | Object): Event =>
    ({
        getSource: jest.fn().mockReturnValue({
            getValue: jest.fn().mockReturnValue(value),
            setValueState: mocks.setValueStateMock
        })
    } as unknown as Event);
/**
 * Simulates various values returns in sequential calls
 * the last value stays persistent and is returned in further calls
 * @param v - value or array of values
 * @returns jest mock function returning provided values, the last value stays persistent and is returned in further calls
 */
const nCallsMock = <T>(v: T | T[]) => {
    const values = Array.isArray(v) ? v : [v];
    return values.reduce((acc, value, idx) => {
        if (idx === values.length - 1) {
            acc.mockReturnValue(value);
        } else {
            acc.mockReturnValueOnce(value);
        }
        return acc;
    }, jest.fn());
};
describe('AddActionFragment', () => {
    beforeAll(() => {
        fetchMock.mockResolvedValue({
            json: jest.fn().mockReturnValue({ fragments: [] }),
            text: jest.fn(),
            ok: true
        });
    });

    describe('setup', () => {
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

            const addFragment = new AddActionFragment(
                'adp.extension.controllers.AddActionFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    propertyPath: 'content/header/actions/',
                    controllerReference: '',
                    validateActionId: () => true,
                    name: 'AddActionFragmentTest',
                    appDescriptor: {
                        anchor: 'someAnchor',
                        projectId: 'test',
                        pageId: 'listPage',
                        appComponent: {} as any,
                        appType: 'fe-v4'
                    },
                    title: 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION'
                }
            );

            const openSpy = jest.fn();

            await addFragment.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: openSpy,
                close: jest.fn()
            } as unknown as Dialog);

            const escapeHandlerCb = (addFragment.dialog.setEscapeHandler as jest.Mock).mock.calls[0][0];

            escapeHandlerCb({ resolve: jest.fn() });

            expect(openSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('handleDialogClose', () => {
        test('should close dialog', () => {
            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const addFragment = new AddActionFragment(
                'adp.extension.controllers.AddActionFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    propertyPath: 'content/header/actions/',
                    controllerReference: '',
                    validateActionId: () => true,
                    name: 'AddActionFragmentTest',
                    appDescriptor: {
                        anchor: 'someAnchor',
                        projectId: 'test',
                        pageId: 'listPage',
                        appComponent: {} as any,
                        appType: 'fe-v4'
                    },
                    title: 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION'
                }
            );

            const closeSpy = jest.fn();

            addFragment.dialog = {
                close: closeSpy,
                destroy: jest.fn()
            } as unknown as Dialog;

            addFragment.handleDialogClose();

            expect(closeSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('onActionIdChange and onButtonTextChange', () => {
        let addFragment: AddActionFragment;
        const overlays = {
            getId: jest.fn().mockReturnValue('some-id')
        };
        let beginBtnSetEnabledMock: jest.Mock<any, any, any>;
        const createDialog = (content: Control[], validateActionIdResult = true) => {
            addFragment = new AddActionFragment(
                'adp.extension.controllers.AddActionFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    propertyPath: 'content/header/actions/',
                    controllerReference: '',
                    validateActionId: () => validateActionIdResult,
                    name: 'AddActionFragmentTest',
                    appDescriptor: {
                        anchor: 'someAnchor',
                        projectId: 'test',
                        pageId: 'listPage',
                        appComponent: {} as any,
                        appType: 'fe-v4'
                    },
                    title: 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION'
                }
            );
            //addFragment.model = getTestModel();
            beginBtnSetEnabledMock = jest.fn().mockReturnValue({ rerender: jest.fn() });
            addFragment.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: beginBtnSetEnabledMock }),
                getContent: jest.fn().mockReturnValue([
                    {
                        getContent: jest.fn().mockReturnValue(content)
                    } as unknown as SimpleForm<Control[]>
                ])
            } as unknown as Dialog;
            return addFragment;
        };

        beforeEach(() => {
            mocks.setValueStateTextMock = jest.fn();
            mocks.setValueStateMock = jest.fn().mockReturnValue({
                setValueStateText: mocks.setValueStateTextMock
            });
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('sets error when action id and button text input field empty', () => {
            const event = mockInputEvent('');

            createDialog([
                mockFormInput(false),
                mockFormInput(true, '', ValueState.Success),
                mockFormInput(false),
                mockFormInput(true, '', ValueState.Success)
            ] as unknown as Control[]);

            addFragment.onActionIdInputChange(event as unknown as Event);
            addFragment.onButtonTextInputChange(event as unknown as Event);
            expect(mocks.setValueStateMock).toHaveBeenCalledTimes(2);
            expect(mocks.setValueStateTextMock).toHaveBeenNthCalledWith(1, 'Action ID is required');
            expect(mocks.setValueStateTextMock).toHaveBeenNthCalledWith(2, 'Button Text is required');
        });

        test('sets error when action id has space', () => {
            const event = mockInputEvent('test id');

            createDialog([
                mockFormInput(false),
                mockFormInput(true, '', ValueState.Success),
                mockFormInput(false),
                mockFormInput(true, '', ValueState.Success)
            ] as unknown as Control[]);

            addFragment.onActionIdInputChange(event as unknown as Event);
            expect(mocks.setValueStateMock).toHaveBeenCalledTimes(1);
            expect(mocks.setValueStateTextMock).toHaveBeenNthCalledWith(1, 'Action ID cannot contain spaces');
        });

        test('sets error when action id starts with numerals', () => {
            const event = mockInputEvent('1testid');

            createDialog([
                mockFormInput(false),
                mockFormInput(true, '', ValueState.Success),
                mockFormInput(false),
                mockFormInput(true, '', ValueState.Success)
            ] as unknown as Control[]);

            addFragment.onActionIdInputChange(event as unknown as Event);
            expect(mocks.setValueStateMock).toHaveBeenCalledTimes(1);
            expect(mocks.setValueStateTextMock).toHaveBeenNthCalledWith(1, 'Action ID cannot start with a number');
        });

        test('sets error when action id already being used', () => {
            const event = mockInputEvent('testId');

            createDialog(
                [
                    mockFormInput(false),
                    mockFormInput(true, '', ValueState.Success),
                    mockFormInput(false),
                    mockFormInput(true, '', ValueState.Success)
                ] as unknown as Control[],
                false
            );

            addFragment.onActionIdInputChange(event as unknown as Event);
            expect(mocks.setValueStateMock).toHaveBeenCalledTimes(1);
            expect(mocks.setValueStateTextMock).toHaveBeenNthCalledWith(
                1,
                `Action with ID 'testId' is already defined`
            );
        });

        test('form with no error', () => {
            const event = mockInputEvent('AddItem');

            createDialog([
                mockFormInput(false),
                mockFormInput(true, '', ValueState.Success),
                mockFormInput(false),
                mockFormInput(true, '', ValueState.Success)
            ] as unknown as Control[]);

            addFragment.onActionIdInputChange(event as unknown as Event);
            addFragment.onButtonTextInputChange(event as unknown as Event);
            expect(mocks.setValueStateMock).toHaveBeenCalledTimes(2);

            expect(mocks.setValueStateTextMock).toHaveBeenNthCalledWith(1, '');
            expect(mocks.setValueStateTextMock).toHaveBeenNthCalledWith(2, '');
        });
    });
    describe('onCreateBtnPress', () => {
        let addFragment: AddActionFragment;
        const overlays = {
            getId: jest.fn().mockReturnValue('some-id')
        };
        let beginBtnSetEnabledMock: jest.Mock<any, any, any>;
        const createDialog = (
            content: Control[],
            validateActionIdResult = true,
            rta: RuntimeAuthoring = {} as RuntimeAuthoring
        ) => {
            addFragment = new AddActionFragment(
                'adp.extension.controllers.AddActionFragment',
                overlays as unknown as UI5Element,
                rta,
                {
                    propertyPath: 'content/header/actions/',
                    controllerReference: '',
                    validateActionId: () => validateActionIdResult,
                    name: 'AddActionFragmentTest',
                    appDescriptor: {
                        anchor: 'someAnchor',
                        projectId: 'adp.v4.app',
                        pageId: 'listPage',
                        appComponent: {} as any,
                        appType: 'fe-v4'
                    },
                    title: 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION'
                }
            );
            beginBtnSetEnabledMock = jest.fn().mockReturnValue({ rerender: jest.fn() });
            addFragment.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: beginBtnSetEnabledMock }),
                getContent: jest.fn().mockReturnValue([
                    {
                        getContent: jest.fn().mockReturnValue(content)
                    } as unknown as SimpleForm<Control[]>
                ])
            } as unknown as Dialog;
            return addFragment;
        };

        beforeEach(() => {
            mocks.setValueStateTextMock = jest.fn();
            mocks.setValueStateMock = jest.fn().mockReturnValue({
                setValueStateText: mocks.setValueStateTextMock
            });
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });
        test('create page action', async () => {
            const testModel = {
                setProperty: jest.fn(),
                getProperty: nCallsMock(['AddItem', 'Add Item'])
            } as unknown as JSONModel;
            const executeSpy = jest.fn();
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
            rtaMock.getCommandStack.mockReturnValue({
                pushAndExecute: executeSpy
            });
            rtaMock.getFlexSettings.mockReturnValue({ projectId: 'adp.v4.app' });
            const event = mockInputEvent('AddItem');
            const event1 = mockInputEvent('Add Item');
            createDialog(
                [
                    mockFormInput(false),
                    mockFormInput(true, '', ValueState.Success),
                    mockFormInput(false),
                    mockFormInput(true, '', ValueState.Success)
                ] as unknown as Control[],
                true,
                rtaMock
            );
            addFragment.model = testModel;
            addFragment.handleDialogClose = jest.fn();
            addFragment.onActionIdInputChange(event as unknown as Event);
            addFragment.onButtonTextInputChange(event1 as unknown as Event);
            await addFragment.onCreateBtnPress({
                getSource: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Event);

            expect(executeSpy).toHaveBeenCalledTimes(1);
            const commandCall = CommandFactory.getCommandFor.mock.calls[0];
            expect(commandCall[1]).toBe('appDescriptor');
            expect(commandCall[2]).toStrictEqual({
                appComponent: {} as any,
                changeType: 'appdescr_fe_changePageConfiguration',
                reference: 'adp.v4.app',
                parameters: {
                    page: 'listPage',
                    entityPropertyChange: {
                        propertyPath: 'content/header/actions/AddItem',
                        propertyValue: {
                            press: '',
                            enabled: true,
                            visible: true,
                            text: 'Add Item'
                        },
                        operation: 'UPSERT'
                    }
                }
            });
        });
    });
});
