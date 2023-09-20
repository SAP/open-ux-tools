import type Dialog from 'sap/m/Dialog';
import type Event from 'sap/ui/base/Event';
import type UI5Element from 'sap/ui/core/Element';
import JSONModel from 'sap/ui/model/json/JSONModel';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { fetchMock, sapCoreMock } from 'mock/window';

import ControllerExtension from '../../../../src/adp/controllers/ControllerExtension.controller';

describe('ControllerExtension', () => {
    beforeAll(() => {
        fetchMock.mockResolvedValue({
            json: jest.fn().mockReturnValue({ controllers: [] }),
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

            const overlayControl = {
                getElement: jest.fn().mockReturnValue({
                    getId: jest.fn().mockReturnValue('::Toolbar')
                })
            };
            sapCoreMock.byId.mockReturnValue(overlayControl);

            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            controllerExt.byId = jest.fn().mockReturnValue({
                open: jest.fn()
            });

            await controllerExt.onInit();
        });
    });

    describe('closeDialog', () => {
        test('should close dialog', () => {
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const closeSpy = jest.fn();

            controllerExt.dialog = {
                close: closeSpy
            } as unknown as Dialog;

            controllerExt.getView = jest.fn().mockReturnValue({ destroy: jest.fn() });

            controllerExt.closeDialog();

            expect(closeSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('onControllerNameInputChange', () => {
        const testModel = {
            setProperty: jest.fn(),
            getProperty: jest.fn().mockReturnValue([{ controllerName: 'Delete.js' }])
        } as unknown as JSONModel;

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('sets error when controller with the same named already exists', () => {
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const valueStateSpy = jest.fn();
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('Delete'),
                    setValueState: valueStateSpy,
                    setValueStateText: jest.fn()
                })
            };

            controllerExt.model = testModel;

            controllerExt.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            controllerExt.onControllerNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith('Error');
        });

        test('sets error when the controller name is empty', () => {
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const valueStateSpy = jest.fn();
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue(''),
                    setValueState: valueStateSpy,
                    setValueStateText: jest.fn()
                })
            };

            controllerExt.model = testModel;

            controllerExt.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            controllerExt.onControllerNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith('None');
        });

        test('sets error when the controller name is has special characters', () => {
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const valueStateSpy = jest.fn();
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('Share 2$5!'),
                    setValueState: valueStateSpy,
                    setValueStateText: jest.fn()
                })
            };

            controllerExt.model = testModel;

            controllerExt.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            controllerExt.onControllerNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith('Error');
        });

        test('sets create button to true when the controller name is valid', () => {
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const valueStateSpy = jest.fn();
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('Share'),
                    setValueState: valueStateSpy,
                    setValueStateText: jest.fn()
                })
            };

            controllerExt.model = testModel;

            controllerExt.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            controllerExt.onControllerNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith('None');
        });
    });

    describe('onCreateBtnPress', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        const testModel = {
            getProperty: jest.fn().mockReturnValueOnce('Share').mockReturnValueOnce('::Toolbar')
        } as unknown as JSONModel;

        test('creates new controller and a change', async () => {
            const addSpy = jest.fn().mockResolvedValue({ fileName: 'something.change' });
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                {} as unknown as UI5Element,
                {
                    getService: jest.fn().mockResolvedValue({ add: addSpy })
                } as unknown as RuntimeAuthoring
            );

            const event = {
                getSource: jest.fn().mockReturnValue({
                    setEnabled: jest.fn()
                })
            };

            controllerExt.model = testModel;

            fetchMock.mockResolvedValue({
                json: jest.fn(),
                text: jest.fn().mockReturnValueOnce('Controller was created!').mockReturnValueOnce('Change created'),
                ok: true
            });

            controllerExt.handleDialogClose = jest.fn();

            await controllerExt.onCreateBtnPress(event as unknown as Event);

            expect(addSpy).toHaveBeenCalledTimes(1);
        });

        test('throws error when creating new controller', async () => {
            const errorMsg = 'Could not create controller file!';
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const event = {
                getSource: jest.fn().mockReturnValue({
                    setEnabled: jest.fn()
                })
            };

            controllerExt.model = testModel;

            fetchMock.mockResolvedValue({
                json: jest.fn(),
                text: jest.fn().mockRejectedValue({ message: errorMsg }),
                ok: true
            });

            controllerExt.handleDialogClose = jest.fn();

            try {
                await controllerExt.onCreateBtnPress(event as unknown as Event);
            } catch (e) {
                expect(e.message).toBe(errorMsg);
            }
        });
    });
});
