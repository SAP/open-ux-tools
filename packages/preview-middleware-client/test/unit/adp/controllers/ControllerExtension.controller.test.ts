import type Dialog from 'sap/m/Dialog';
import type Event from 'sap/ui/base/Event';
import type UI5Element from 'sap/ui/core/Element';
import type JSONModel from 'sap/ui/model/json/JSONModel';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { fetchMock, openMock, sapCoreMock } from 'mock/window';

import ControllerExtension from '../../../../src/adp/controllers/ControllerExtension.controller';

import Utils from 'mock/sap/ui/fl/Utils';
import { ValueState } from 'mock/sap/ui/core/library';

describe('ControllerExtension', () => {
    beforeAll(() => {
        fetchMock.mockResolvedValue({
            json: jest
                .fn()
                .mockReturnValueOnce({ controllerExists: false, controllerPath: '', controllerPathFromRoot: '' })
                .mockReturnValueOnce({ controllers: [] }),
            text: jest.fn(),
            ok: true
        });
    });

    describe('onInit', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        beforeAll(() => {
            const controlView = jest.fn().mockReturnValue({
                getMetadata: jest
                    .fn()
                    .mockReturnValue({ getName: () => 'sap.suite.ui.generic.template.ListReport.view.ListReport' })
            });

            Utils.getViewForControl.mockReturnValue({
                getId: jest.fn().mockReturnValue('some-id'),
                getController: controlView
            });
        });

        test('fills json model with data (controller exists: false)', async () => {
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

            const openSpy = jest.fn();
            controllerExt.byId = jest.fn().mockReturnValue({
                open: openSpy,
                setEscapeHandler: jest.fn()
            });

            await controllerExt.onInit();

            expect(openSpy).toHaveBeenCalledTimes(1);
        });

        test('fills json model with data (controller exists: true)', async () => {
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

            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue({
                    controllerExists: true,
                    controllerPath: 'C:/users/projects/adp.app/webapp/changes/coding/share.js',
                    controllerPathFromRoot: 'adp.app/webapp/changes/coding/share.js'
                }),
                text: jest.fn(),
                ok: true
            });

            const openSpy = jest.fn();
            const setTextSpy = jest.fn();
            const setEnabledSpy = jest.fn();

            controllerExt.byId = jest
                .fn()
                .mockReturnValueOnce({
                    open: openSpy,
                    getBeginButton: jest
                        .fn()
                        .mockReturnValue({ setText: jest.fn().mockReturnValue({ setEnabled: setEnabledSpy }) }),
                    getEndButton: jest.fn().mockReturnValue({ setText: setTextSpy }),
                    setEscapeHandler: jest.fn()
                })
                .mockReturnValue({
                    setVisible: jest.fn()
                });

            await controllerExt.onInit();

            expect(openSpy).toHaveBeenCalledTimes(1);
            expect(setEnabledSpy).toHaveBeenCalledWith(true);
            expect(setTextSpy).toHaveBeenCalledWith('Close');
        });

        test('throws error when trying to get existing controller data', async () => {
            const errorMsg = 'Could not retrieve existing controller!';
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

            const openSpy = jest.fn();
            controllerExt.byId = jest.fn().mockReturnValue({
                open: openSpy,
                setEscapeHandler: jest.fn()
            });

            fetchMock.mockResolvedValue({
                json: jest.fn().mockRejectedValue({ message: errorMsg }),
                text: jest.fn(),
                ok: true
            });

            try {
                await controllerExt.onInit();
            } catch (e) {
                expect(e.message).toBe(errorMsg);
            }
            expect(openSpy).not.toHaveBeenCalled();
        });

        test('throws error when trying to get controllers from the project workspace', async () => {
            const errorMsg = 'Could not retrieve controllers!';
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
                open: jest.fn(),
                setEscapeHandler: jest.fn()
            });

            fetchMock.mockResolvedValue({
                json: jest
                    .fn()
                    .mockReturnValueOnce({ controllerExists: false, controllerPath: '', controllerPathFromRoot: '' })
                    .mockRejectedValueOnce({ message: errorMsg }),
                text: jest.fn(),
                ok: true
            });

            try {
                await controllerExt.onInit();
            } catch (e) {
                expect(e.message).toBe(errorMsg);
            }
        });
    });

    describe('handleDialogClose', () => {
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

            controllerExt.handleDialogClose();

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

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('Delete'),
                    setValueState: valueStateSpy
                })
            };

            controllerExt.model = testModel;

            controllerExt.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            controllerExt.onControllerNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error);
        });

        test('sets error when the controller name is empty', () => {
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
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

            controllerExt.model = testModel;

            controllerExt.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            controllerExt.onControllerNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.None);
        });

        test('sets error when the controller name has special characters', () => {
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
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

            controllerExt.model = testModel;

            controllerExt.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            controllerExt.onControllerNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error);
        });

        test('sets error when the controller name contains a whitespace at the end', () => {
            const controllerExt = new ControllerExtension(
            'adp.extension.controllers.ControllerExtension',
            {} as unknown as UI5Element,
            {} as unknown as RuntimeAuthoring
            );
            
            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('samplename '),
                    setValueState: valueStateSpy,
                })
            };

            controllerExt.model = testModel;
            
            controllerExt.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            controllerExt.onControllerNameInputChange(event as unknown as Event)
            
            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error)
        })

        test('sets error when the controller name exceeds 64 characters', () => {
            const controllerExt = new ControllerExtension(
            'adp.extension.controllers.ControllerExtension',
            {} as unknown as UI5Element,
            {} as unknown as RuntimeAuthoring
            );
            
            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('thisisverylongnamethisisverylongnamethisisverylongnamethisisveryl'),
                    setValueState: valueStateSpy,
                })
            };

            controllerExt.model = testModel;
            
            controllerExt.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            controllerExt.onControllerNameInputChange(event as unknown as Event)
            
            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error)
        })

        test('sets create button to true when the controller name is valid', () => {
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
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

            controllerExt.model = testModel;

            controllerExt.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            controllerExt.onControllerNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Success);
        });
    });

    describe('onCreateBtnPress', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

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

            controllerExt.model = {
                getProperty: jest
                    .fn()
                    .mockReturnValueOnce(false)
                    .mockReturnValueOnce('Share')
                    .mockReturnValueOnce('::Toolbar'),
                setProperty: jest.fn()
            } as unknown as JSONModel;

            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue({ controllers: [], id: 'adp.app' }),
                text: jest.fn().mockReturnValueOnce('Controller was created!').mockReturnValueOnce('Change created'),
                ok: true
            });

            controllerExt.handleDialogClose = jest.fn();

            await controllerExt.onCreateBtnPress(event as unknown as Event);

            expect(addSpy).toHaveBeenCalledTimes(1);
        });

        test('opens link to existing controller', async () => {
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

            controllerExt.model = {
                getProperty: jest
                    .fn()
                    .mockReturnValueOnce(true)
                    .mockReturnValueOnce('C:/users/projects/adp.app/webapp/changes/coding/share.js'),
                setProperty: jest.fn()
            } as unknown as JSONModel;

            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue({ controllers: [], id: 'adp.app' }),
                text: jest.fn().mockReturnValueOnce('Controller was created!').mockReturnValueOnce('Change created'),
                ok: true
            });

            controllerExt.handleDialogClose = jest.fn();

            await controllerExt.onCreateBtnPress(event as unknown as Event);

            expect(openMock).toHaveBeenCalledTimes(1);
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

            controllerExt.model = {
                getProperty: jest
                    .fn()
                    .mockReturnValueOnce(false)
                    .mockReturnValueOnce('Share')
                    .mockReturnValueOnce('::Toolbar'),
                setProperty: jest.fn()
            } as unknown as JSONModel;

            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue([]),
                text: jest.fn().mockRejectedValueOnce({ message: errorMsg }),
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
