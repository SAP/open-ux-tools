import type Dialog from 'sap/m/Dialog';
import type Event from 'sap/ui/base/Event';
import type UI5Element from 'sap/ui/core/Element';
import type JSONModel from 'sap/ui/model/json/JSONModel';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import ControlUtils from '../../../src/adp/control-utils';
import AddFragment from '../../../src/adp/controllers/AddFragment.controller';
import CommandExecutor from '../../../src/adp/command-executor';
import { fetchMock, sapCoreMock } from 'mock/window';

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
            const overlays = [
                {
                    getId: jest.fn().mockReturnValue('some-id')
                }
            ];

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
                    getDefaultAggregationName: jest.fn().mockReturnValue('content')
                })
            });
            ControlUtils.buildControlData = jest.fn().mockResolvedValue({ name: 'selected-control-name' });
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

            // @ts-ignore
            const addFragment = new AddFragment('adp.extension.controllers.AddFragment');

            addFragment.overlays = overlays as unknown as UI5Element[];
            try {
                await addFragment.onInit();
            } catch (e) {
                fail('Test should not have failed!');
            }
        });
    });

    describe('onAggregationChanged', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('on selected aggragations changed', () => {
            // @ts-ignore
            const addFragment = new AddFragment('adp.extension.controllers.AddFragment');

            const event = {
                getSource: jest.fn().mockReturnValue({
                    getSelectedItem: jest.fn().mockReturnValue({ getText: jest.fn().mockReturnValue('some-text') }),
                    getSelectedKey: jest.fn().mockReturnValue('0')
                })
            };

            ControlUtils.getControlAggregationByName = jest.fn().mockReturnValue({ 0: {} });

            const setPropSpy = jest.fn();
            addFragment.model = {
                setProperty: setPropSpy
            } as unknown as JSONModel;

            addFragment.onAggregationChanged(event as unknown as Event);

            expect(setPropSpy.mock.calls.length).toBe(4);
        });
    });

    describe('onIndexChanged', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('on selected aggragations changed', () => {
            // @ts-ignore
            const addFragment = new AddFragment('adp.extension.controllers.AddFragment');

            const event = {
                getSource: jest.fn().mockReturnValue({
                    getSelectedItem: jest.fn().mockReturnValue({ getText: jest.fn().mockReturnValue('0') })
                })
            };

            const setPropSpy = jest.fn();
            addFragment.model = {
                setProperty: setPropSpy
            } as unknown as JSONModel;

            addFragment.onIndexChanged(event as unknown as Event);

            expect(setPropSpy.mock.calls.length).toBe(1);
        });
    });

    describe('onFragmentNameInputChange', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('sets error when fragment with the same named already exists', () => {
            // @ts-ignore
            const addFragment = new AddFragment('adp.extension.controllers.AddFragment');
            const valueStateSpy = jest.fn();
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('Share'),
                    setValueState: valueStateSpy,
                    setValueStateText: jest.fn()
                })
            };

            addFragment.model = {
                setProperty: jest.fn(),
                getProperty: jest.fn().mockReturnValue([{ fragmentName: 'Share.fragment.xml' }])
            } as unknown as JSONModel;

            addFragment.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy.mock.calls.length).toBe(1);
        });

        test('sets error when the fragment name is empty', () => {
            // @ts-ignore
            const addFragment = new AddFragment('adp.extension.controllers.AddFragment');
            const valueStateSpy = jest.fn();
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue(''),
                    setValueState: valueStateSpy,
                    setValueStateText: jest.fn()
                })
            };

            addFragment.model = {
                setProperty: jest.fn(),
                getProperty: jest.fn().mockReturnValue([{ fragmentName: 'Delete.fragment.xml' }])
            } as unknown as JSONModel;

            addFragment.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy.mock.calls.length).toBe(1);
        });

        test('sets error when the fragment name is has special characters', () => {
            // @ts-ignore
            const addFragment = new AddFragment('adp.extension.controllers.AddFragment');
            const valueStateSpy = jest.fn();
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('Share 2$5!'),
                    setValueState: valueStateSpy,
                    setValueStateText: jest.fn()
                })
            };

            addFragment.model = {
                setProperty: jest.fn(),
                getProperty: jest.fn().mockReturnValue([{ fragmentName: 'Delete.fragment.xml' }])
            } as unknown as JSONModel;

            addFragment.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy.mock.calls.length).toBe(1);
        });

        test('sets create button to true when the fragment name is valid', () => {
            // @ts-ignore
            const addFragment = new AddFragment('adp.extension.controllers.AddFragment');
            const valueStateSpy = jest.fn();
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('Share'),
                    setValueState: valueStateSpy,
                    setValueStateText: jest.fn()
                })
            };

            addFragment.model = {
                setProperty: jest.fn(),
                getProperty: jest.fn().mockReturnValue([{ fragmentName: 'Delete.fragment.xml' }])
            } as unknown as JSONModel;

            addFragment.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy.mock.calls.length).toBe(1);
        });
    });

    describe('onCreateBtnPress', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('creates new fragment', async () => {
            // @ts-ignore
            const addFragment = new AddFragment('adp.extension.controllers.AddFragment');

            const event = {
                getSource: jest.fn().mockReturnValue({
                    setEnabled: jest.fn()
                })
            };

            addFragment.model = {
                getProperty: jest
                    .fn()
                    .mockReturnValueOnce('Share')
                    .mockReturnValueOnce('0')
                    .mockReturnValueOnce('content')
            } as unknown as JSONModel;

            const createFragmentSpy = jest.fn();
            // @ts-ignore
            addFragment.createNewFragment = createFragmentSpy;
            // @ts-ignore
            addFragment.handleDialogClose = jest.fn();

            await addFragment.onCreateBtnPress(event as unknown as Event);

            expect(createFragmentSpy.mock.calls.length).toBe(1);
        });
    });

    describe('createNewFragment', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('creates new fragment', async () => {
            // @ts-ignore
            const addFragment = new AddFragment('adp.extension.controllers.AddFragment');

            fetchMock.mockResolvedValue({
                json: jest.fn(),
                text: jest.fn().mockReturnValue('XML Fragment was created!'),
                ok: true
            });

            const fragmentData = { fragmentName: 'Share', index: 0, targetAggregation: 'content' };

            const createChangeSpy = jest.fn();

            // @ts-ignore
            addFragment.createFragmentChange = createChangeSpy;

            // @ts-ignore
            await addFragment.createNewFragment(fragmentData);

            expect(createChangeSpy.mock.calls.length).toBe(1);
        });
    });

    describe('createFragmentChange', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('creates new fragment', async () => {
            // @ts-ignore
            const addFragment = new AddFragment('adp.extension.controllers.AddFragment');

            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue({ id: '', reference: '', namespace: '', layer: '' }),
                text: jest.fn(),
                ok: true
            });

            const fragmentData = { fragmentName: 'Share', index: 0, targetAggregation: 'content' };

            const executorSpy = jest.fn();

            // @ts-ignore
            addFragment.commandExecutor = new CommandExecutor({} as unknown as RuntimeAuthoring);
            // @ts-ignore
            addFragment.commandExecutor.generateAndExecuteCommand = executorSpy;

            // @ts-ignore
            await addFragment.createFragmentChange(fragmentData);

            expect(executorSpy.mock.calls.length).toBe(1);
        });
    });
});
