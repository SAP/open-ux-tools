import type Dialog from 'sap/m/Dialog';
import Event from 'sap/ui/base/Event';
import type UI5Element from 'sap/ui/core/Element';
import JSONModel from 'sap/ui/model/json/JSONModel';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import CommandFactory from 'mock/sap/ui/rta/command/CommandFactory';
import { fetchMock, sapCoreMock, sapMock } from 'mock/window';

import ControlUtils from '../../../../src/adp/control-utils';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { ValueState } from 'mock/sap/ui/core/library';
import OverlayRegistry from 'mock/sap/ui/dt/OverlayRegistry';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import AddTableColumnFragments from 'open/ux/preview/client/adp/controllers/AddTableColumnFragments.controller';
import SimpleForm from 'sap/ui/layout/form';
import Control from 'sap/ui/core/Control';

const mocks = {
    setValueStateMock: jest.fn(),
    setValueStateTextMock: jest.fn()
};

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

type StateType = ValueState | keyof typeof ValueState;
const mockFormInput = (
    isInput: boolean,
    values: String | String[] = '',
    states?: StateType | StateType[],
    stateTexts?: string | string[]
) => ({
    isA: jest.fn().mockReturnValue(isInput),
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

describe('AddTableColumnsFragments controller', () => {
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
                        'columns': {},
                        'items': {}
                    }),
                    getDefaultAggregationName: jest.fn().mockReturnValue('content'),
                    getName: jest.fn().mockReturnValue('Table')
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

            const addFragment = new AddTableColumnFragments(
                'adp.extension.controllers.AddTableColumnFragments',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
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
            const addFragment = new AddTableColumnFragments(
                'adp.extension.controllers.AddTableColumnFragments',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
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

    describe('onFragmentNameInputChange', () => {
        const getTestModel = () =>
            ({
                setProperty: jest.fn(),
                getProperty: jest.fn().mockReturnValue([{ fragmentName: 'Delete.fragment.xml' }])
            } as unknown as JSONModel);

        let addFragment: AddTableColumnFragments;
        let beginBtnSetEnabledMock: jest.Mock<any, any, any>;

        const createDialog = (content: Control[], rtaMock: RuntimeAuthoring = {} as unknown as RuntimeAuthoring) => {
            addFragment = new AddTableColumnFragments(
                'adp.extension.controllers.AddTableColumnFragments',
                {
                    getId: jest.fn().mockReturnValue('some-id')
                } as unknown as UI5Element,
                rtaMock,
                {
                    title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
                }
            );
            addFragment.model = getTestModel();
            beginBtnSetEnabledMock = jest.fn().mockReturnValue({ rerender: jest.fn() });
            addFragment.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: beginBtnSetEnabledMock }),
                getContent: jest.fn().mockReturnValue([
                    {
                        getContent: jest.fn().mockReturnValue(content)
                    } as unknown as SimpleForm<Control[]>
                ])
            } as unknown as Dialog;
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

        test('sets error when fragment with the same named already exists', () => {
            const event = mockInputEvent('Delete');

            createDialog([
                mockFormInput(false),
                mockFormInput(true, 'Delete', ValueState.Success),
                mockFormInput(false),
                mockFormInput(true, '', ValueState.Success)
            ] as unknown as Control[]);

            addFragment.checkForExistingChange = jest.fn().mockReturnValue(false);

            addFragment.onColumnFragmentNameInputChange(event as unknown as Event);
            addFragment.onCellFragmentNameInputChange(event as unknown as Event);
            expect(mocks.setValueStateMock).toHaveBeenCalledTimes(2);
            const expectedMessage =
                'Enter a different name. The fragment name that you entered already exists in your project.';
            expect(mocks.setValueStateTextMock).toHaveBeenNthCalledWith(1, expectedMessage);
            expect(mocks.setValueStateTextMock).toHaveBeenNthCalledWith(2, expectedMessage);
        });

        describe('duplicate fragment names', () => {
            test('sets error when column and cell fragments have the same name', () => {
                const event = mockInputEvent('Name1');

                createDialog([
                    mockFormInput(true, 'Name1', [ValueState.Success, ValueState.Error]),
                    mockFormInput(true, 'Name1', [ValueState.Success, ValueState.Error])
                ] as unknown as Control[]);

                addFragment.checkForExistingChange = jest.fn().mockReturnValue(false);

                addFragment.onColumnFragmentNameInputChange(event as unknown as Event);

                expect(mocks.setValueStateMock).toHaveBeenCalledTimes(3);
                expect(mocks.setValueStateMock).toHaveBeenNthCalledWith(1, ValueState.Success);
                expect(mocks.setValueStateMock).toHaveBeenNthCalledWith(2, ValueState.Error);
                expect(mocks.setValueStateMock).toHaveBeenNthCalledWith(3, ValueState.Error);
                expect(mocks.setValueStateTextMock).toHaveBeenNthCalledWith(1, '');
                expect(mocks.setValueStateTextMock).toHaveBeenNthCalledWith(2, 'Duplicate name');
                expect(mocks.setValueStateTextMock).toHaveBeenNthCalledWith(3, 'Duplicate name');
                expect(beginBtnSetEnabledMock).lastCalledWith(false);
            });

            test('does not override other errors', () => {
                const event = mockInputEvent('Delete');

                const errorMsg =
                    'Enter a different name. The fragment name that you entered already exists in your project.';

                createDialog([
                    mockFormInput(true, 'Delete', ValueState.Error, errorMsg),
                    mockFormInput(true, 'Delete', ValueState.Error, errorMsg)
                ] as unknown as Control[]);

                addFragment.checkForExistingChange = jest.fn().mockReturnValue(false);

                addFragment.onColumnFragmentNameInputChange(event as unknown as Event);

                expect(mocks.setValueStateMock).toHaveBeenCalledTimes(1);
                expect(mocks.setValueStateMock).toHaveBeenCalledWith(ValueState.Error);
                expect(mocks.setValueStateTextMock).toHaveBeenCalledWith(errorMsg);
            });

            test('clears errors on value change', () => {
                const event = mockInputEvent('Name2');

                createDialog([
                    mockFormInput(true, 'Name2', [ValueState.Error, ValueState.Success], ['Duplicate name', '']),
                    mockFormInput(true, 'Delete', [ValueState.Error, ValueState.Success], ['Duplicate name', ''])
                ] as unknown as Control[]);

                addFragment.checkForExistingChange = jest.fn().mockReturnValue(false);

                addFragment.onColumnFragmentNameInputChange(event as unknown as Event);

                expect(mocks.setValueStateMock).toHaveBeenCalledTimes(3);
                expect(mocks.setValueStateMock.mock.calls.every((call) => call[0] === ValueState.Success)).toBe(true);
                expect(mocks.setValueStateMock).toHaveBeenNthCalledWith(2, ValueState.Success);
                expect(beginBtnSetEnabledMock).lastCalledWith(true);
            });
        });

        test('sets error when the fragment name is empty', () => {
            const event = mockInputEvent('');

            createDialog([
                mockFormInput(true, ['Name1', ''], [ValueState.Success, ValueState.None]),
                mockFormInput(true, 'Name2', ValueState.Success)
            ] as unknown as Control[]);

            addFragment.checkForExistingChange = jest.fn().mockReturnValue(false);

            addFragment.onColumnFragmentNameInputChange(event as unknown as Event);

            expect(mocks.setValueStateMock).toHaveBeenCalledWith(ValueState.None);
            expect(beginBtnSetEnabledMock).lastCalledWith(false);
        });

        test('sets error when the fragment name has special characters', () => {
            const event = mockInputEvent('Share2$5!');

            createDialog([
                mockFormInput(true, ['Name1', 'Share2$5!'], [ValueState.Success, ValueState.Error]),
                mockFormInput(true, 'Name2', ValueState.Success)
            ] as unknown as Control[]);

            addFragment.checkForExistingChange = jest.fn().mockReturnValue(false);

            addFragment.onColumnFragmentNameInputChange(event as unknown as Event);

            expect(mocks.setValueStateMock).toHaveBeenCalledWith(ValueState.Error);
            expect(mocks.setValueStateTextMock).toHaveBeenCalledWith(
                'The fragment name cannot contain white spaces or special characters.'
            );
            expect(beginBtnSetEnabledMock).lastCalledWith(false);
        });

        test('sets error when the fragment name contains a whitespace at the end', () => {
            const event = mockInputEvent('Name ');

            createDialog([
                mockFormInput(true, ['Name1', 'Name '], [ValueState.Success, ValueState.Error]),
                mockFormInput(true, 'Name2', ValueState.Success)
            ] as unknown as Control[]);

            addFragment.checkForExistingChange = jest.fn().mockReturnValue(false);

            addFragment.onColumnFragmentNameInputChange(event as unknown as Event);

            expect(mocks.setValueStateMock).toHaveBeenCalledWith(ValueState.Error);
            expect(mocks.setValueStateTextMock).toHaveBeenCalledWith(
                'The fragment name cannot contain white spaces or special characters.'
            );
            expect(beginBtnSetEnabledMock).lastCalledWith(false);
        });

        test('sets error when the fragment name exceeds 64 characters', () => {
            const longValue = 'thisisverylongnamethisisverylongnamethisisverylongnamethisisveryl';

            const event = mockInputEvent(longValue);

            createDialog([
                mockFormInput(true, ['Name1', longValue], [ValueState.Success, ValueState.Error]),
                mockFormInput(true, 'Name2', ValueState.Success)
            ] as unknown as Control[]);

            addFragment.checkForExistingChange = jest.fn().mockReturnValue(false);

            addFragment.onColumnFragmentNameInputChange(event as unknown as Event);

            expect(mocks.setValueStateMock).toHaveBeenCalledWith(ValueState.Error);
            expect(mocks.setValueStateTextMock).toHaveBeenCalledWith(
                'A fragment file name cannot contain more than 64 characters.'
            );
            expect(beginBtnSetEnabledMock).lastCalledWith(false);
        });

        test('does not crash if composite command exists in command stack', () => {
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

            const command = {
                getCommandStack: jest.fn().mockReturnValue([])
            };

            rtaMock.getCommandStack.mockReturnValue({
                getCommands: jest.fn().mockReturnValue([command])
            });

            createDialog(
                [
                    mockFormInput(true, 'New', ValueState.Success),
                    mockFormInput(true, 'Name2', ValueState.Success)
                ] as unknown as Control[],
                rtaMock
            );

            addFragment.onColumnFragmentNameInputChange(mockInputEvent('New'));
            expect(mocks.setValueStateMock).toHaveBeenCalledWith(ValueState.Success);
        });

        test('sets error when the fragment name already exists in command stack', () => {
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
            const change = {
                content: {
                    fragmentPath: 'fragments/New.fragment.xml'
                }
            };
            const command = {
                getProperty: jest.fn().mockReturnValue(''),
                getPreparedChange: jest.fn().mockReturnValue({ getDefinition: jest.fn().mockReturnValue(change) })
            };

            rtaMock.getCommandStack.mockReturnValue({
                getCommands: jest.fn().mockReturnValue([command])
            });

            createDialog(
                [
                    mockFormInput(true, 'New', ValueState.Error),
                    mockFormInput(true, 'Name2', ValueState.Success)
                ] as unknown as Control[],
                rtaMock
            );

            addFragment.onColumnFragmentNameInputChange(mockInputEvent('New'));

            expect(mocks.setValueStateMock).toHaveBeenCalledWith(ValueState.Error);
        });

        test('sets error when the fragment name already exists in command stack (command is "composite")', () => {
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
            const change = {
                content: {
                    fragmentPath: 'fragments/New.fragment.xml'
                }
            };
            const command = {
                getProperty: jest.fn().mockReturnValue('addXMLAtExtensionPoint'),
                getPreparedChange: jest.fn().mockReturnValue({ getDefinition: jest.fn().mockReturnValue(change) })
            };
            const compositeCommand = {
                getProperty: jest.fn().mockReturnValue('composite'),
                getCommands: jest.fn().mockReturnValue([command])
            };

            rtaMock.getCommandStack.mockReturnValue({
                getCommands: jest.fn().mockReturnValue([compositeCommand])
            });

            createDialog(
                [
                    mockFormInput(true, 'New', ValueState.Error),
                    mockFormInput(true, 'Name2', ValueState.Success)
                ] as unknown as Control[],
                rtaMock
            );

            addFragment.onColumnFragmentNameInputChange(mockInputEvent('New'));

            expect(mocks.setValueStateMock).toHaveBeenCalledWith(ValueState.Error);
        });

        test('sets create button to true when the fragment name is valid', () => {
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
            rtaMock.getCommandStack.mockReturnValue({
                getCommands: jest.fn().mockReturnValue([])
            });

            createDialog(
                [
                    mockFormInput(true, 'New', ValueState.Success),
                    mockFormInput(true, 'Name2', ValueState.Success)
                ] as unknown as Control[],
                rtaMock
            );

            addFragment.onColumnFragmentNameInputChange(mockInputEvent('Share'));

            expect(mocks.setValueStateMock).toHaveBeenCalledWith(ValueState.Success);
        });

        test('throws exception if control does not have valid aggregations', async () => {
            createDialog([
                mockFormInput(true, 'New', ValueState.Success),
                mockFormInput(true, 'Name2', ValueState.Success)
            ] as unknown as Control[]);

            const getAggregationMock = jest.fn().mockReturnValue([{ dummyAggregation: true }]);
            jest.spyOn(ControlUtils, 'getRuntimeControl').mockReturnValue({
                getMetadata: jest.fn().mockReturnValue({
                    getAllAggregations: jest.fn().mockReturnValue({}),
                    getName: jest.fn().mockReturnValue('sap.uxap.ObjectPageLayout'),
                    getDefaultAggregationName: jest.fn().mockReturnValue('content')
                }),
                getAggregation: getAggregationMock
            } as unknown as ManagedObject);

            let thrown: string | undefined;
            try {
                await addFragment.setup({
                    setEscapeHandler: jest.fn(),
                    destroy: jest.fn(),
                    setModel: jest.fn(),
                    open: jest.fn(),
                    close: jest.fn()
                } as unknown as Dialog);
            } catch (e) {
                thrown = (e as Error).message;
            }
            expect(thrown).toBe(`Selected control does not have "columns" aggregation`);

            jest.spyOn(ControlUtils, 'getRuntimeControl').mockReturnValue({
                getMetadata: jest.fn().mockReturnValue({
                    getAllAggregations: jest.fn().mockReturnValue({ 'columns': {} }),
                    getName: jest.fn().mockReturnValue('sap.uxap.ObjectPageLayout'),
                    getDefaultAggregationName: jest.fn().mockReturnValue('content')
                }),
                getAggregation: getAggregationMock
            } as unknown as ManagedObject);

            try {
                await addFragment.setup({
                    setEscapeHandler: jest.fn(),
                    destroy: jest.fn(),
                    setModel: jest.fn(),
                    open: jest.fn(),
                    close: jest.fn()
                } as unknown as Dialog);
            } catch (e) {
                thrown = (e as Error).message;
            }
            expect(thrown).toBe(`Selected control does not have "items" aggregation`);
        });
    });

    describe('onCreateBtnPress', () => {
        const getTestModel = () =>
            ({
                setProperty: jest.fn(),
                getProperty: jest.fn().mockReturnValue([{ fragmentName: 'Delete.fragment.xml' }])
            } as unknown as JSONModel);

        let addFragment: AddTableColumnFragments;
        let beginBtnSetEnabledMock: jest.Mock<any, any, any>;

        const createDialog = (content: Control[], rtaMock: RuntimeAuthoring = {} as unknown as RuntimeAuthoring) => {
            addFragment = new AddTableColumnFragments(
                'adp.extension.controllers.AddTableColumnFragments',
                {
                    getId: jest.fn().mockReturnValue('some-id')
                } as unknown as UI5Element,
                rtaMock,
                {
                    title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN'
                }
            );
            addFragment.model = getTestModel();
            beginBtnSetEnabledMock = jest.fn().mockReturnValue({ rerender: jest.fn() });
            addFragment.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: beginBtnSetEnabledMock }),
                getContent: jest.fn().mockReturnValue([
                    {
                        getContent: jest.fn().mockReturnValue(content)
                    } as unknown as SimpleForm<Control[]>
                ])
            } as unknown as Dialog;
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

        const testModel = {
            getProperty: nCallsMock(['Name1', 'Name2', '0', 'columns', 'items']),
            setProperty: jest.fn()
        } as unknown as JSONModel;
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

        test('creates new fragments and a changes', async () => {
            sapMock.ui.version = '1.71.62';
            const executeSpy = jest.fn();
            rtaMock.getCommandStack.mockReturnValue({
                pushAndExecute: executeSpy
            });
            rtaMock.getFlexSettings.mockReturnValue({ projectId: 'adp.app' });

            sapCoreMock.byId.mockReturnValue({});
            const getAggregationMock = jest.fn().mockReturnValue([{ dummyAggregation: true }]);
            jest.spyOn(ControlUtils, 'getRuntimeControl').mockReturnValue({
                getMetadata: jest.fn().mockReturnValue({
                    getAllAggregations: jest.fn().mockReturnValue({ 'columns': {}, 'items': {} }),
                    getName: jest.fn().mockReturnValue('sap.uxap.ObjectPageLayout'),
                    getDefaultAggregationName: jest.fn().mockReturnValue('content')
                }),
                getAggregation: getAggregationMock
            } as unknown as ManagedObject);

            createDialog(
                [
                    mockFormInput(true, 'Name1', ValueState.Success),
                    mockFormInput(true, 'Name2', ValueState.Success)
                ] as unknown as Control[],
                rtaMock
            );

            addFragment.model = testModel;

            const setContentMock = jest.fn();
            const content1 = {
                fragmentPath: 'dummyPath',
                index: 0,
                targetAggregation: 'columns'
            };
            const content2 = {
                fragmentPath: 'dummyPath',
                index: 0,
                targetAggregation: 'items'
            };
            type CommandBase = {
                _oPreparedChange: {
                    _oDefinition: { moduleName: string };
                };
            };
            const commandStack: CommandBase[] = [];
            const addCommandMock = jest.fn().mockImplementation((cmd: CommandBase) => {
                commandStack.push(cmd);
            });
            CommandFactory.getCommandFor = nCallsMock([
                {
                    addCommand: addCommandMock
                },
                {
                    _oPreparedChange: {
                        _oDefinition: { moduleName: 'adp/app/changes/fragments/Name1.fragment.xml' },
                        setModuleName: jest.fn()
                    },
                    getPreparedChange: jest.fn().mockReturnValue({
                        getContent: () => content1,
                        setContent: setContentMock
                    })
                },
                {
                    _oPreparedChange: {
                        _oDefinition: { moduleName: 'adp/app/changes/fragments/Name2.fragment.xml' },
                        setModuleName: jest.fn()
                    },
                    getPreparedChange: jest.fn().mockReturnValue({
                        getContent: () => content2,
                        setContent: setContentMock
                    })
                }
            ]);

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

            await addFragment.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: jest.fn(),
                close: jest.fn()
            } as unknown as Dialog);

            const event = {
                getSource: jest.fn().mockReturnValue({
                    setEnabled: jest.fn()
                })
            } as unknown as Event;
            await addFragment.onCreateBtnPress(event);

            expect(commandStack[0]._oPreparedChange._oDefinition.moduleName).toBe(
                'adp/app/changes/fragments/Name1.fragment.xml'
            );
            expect(setContentMock.mock.calls[0][0]).toStrictEqual({
                ...content1,
                templateName: 'V2_SMART_TABLE_COLUMN'
            });
            expect(commandStack[1]._oPreparedChange._oDefinition.moduleName).toBe(
                'adp/app/changes/fragments/Name2.fragment.xml'
            );
            expect(setContentMock.mock.calls[1][0]).toStrictEqual({ ...content2, templateName: 'V2_SMART_TABLE_CELL' });
            expect(CommandFactory.getCommandFor.mock.calls[0][1]).toBe('composite');

            expect(CommandFactory.getCommandFor.mock.calls[1][0].dummyAggregation).toBeUndefined();
            expect(CommandFactory.getCommandFor.mock.calls[1][1]).toBe('addXML');
            expect(CommandFactory.getCommandFor.mock.calls[1][2].targetAggregation).toBe('columns');

            expect(CommandFactory.getCommandFor.mock.calls[2][0].dummyAggregation).toBe(true);
            expect(CommandFactory.getCommandFor.mock.calls[2][2].targetAggregation).toBe('cells');
        });
    });
});
