import type Dialog from 'sap/m/Dialog';
import Utils from 'mock/sap/ui/fl/Utils';
import type Event from 'sap/ui/base/Event';
import type UI5Element from 'sap/ui/core/Element';
import type JSONModel from 'sap/ui/model/json/JSONModel';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { ValueState } from 'mock/sap/ui/core/library';
import { fetchMock, openMock, sapCoreMock } from 'mock/window';

import type { ExtendControllerData } from 'open/ux/preview/client/adp/extend-controller';
import { MessageBarType, showInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import { CommunicationService } from 'open/ux/preview/client/cpe/communication-service';

// Pre-import for spread
const _apiHandler = await import('open/ux/preview/client/adp/api-handler');
const _adpUtils = await import('open/ux/preview/client/adp/utils');
const _utils = await import('open/ux/preview/client/utils/version');
const _coreUtils = await import('open/ux/preview/client/utils/core');

const writeChangeMock = jest.fn().mockImplementation(async (data) => Promise.resolve(data));
jest.unstable_mockModule('open/ux/preview/client/adp/api-handler', () => ({
    ..._apiHandler,
    writeChange: writeChangeMock
}));

const checkForExistingChangeMock = jest.fn().mockReturnValue(false);
jest.unstable_mockModule('open/ux/preview/client/adp/utils', () => ({
    ..._adpUtils,
    checkForExistingChange: checkForExistingChangeMock
}));

const getUi5VersionMock = jest.fn();
const isLowerThanMinimalUi5VersionMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/utils/version', () => ({
    ..._utils,
    getUi5Version: getUi5VersionMock,
    isLowerThanMinimalUi5Version: isLowerThanMinimalUi5VersionMock
}));

const getControlByIdMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/utils/core', () => ({
    ..._coreUtils,
    getControlById: getControlByIdMock
}));

jest.unstable_mockModule('open/ux/preview/client/adp/command-executor', () => {
    return {
        default: jest.fn().mockImplementation(() => ({
            getCommand: jest.fn().mockResolvedValue({}),
            pushAndExecuteCommand: jest.fn()
        }))
    };
});

const { default: ControllerExtension } = await import(
    'open/ux/preview/client/adp/controllers/ControllerExtension.controller'
);

describe('ControllerExtension', () => {
    beforeAll(() => {
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
            checkForExistingChangeMock.mockReturnValue(false);
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

            await controllerExt.setup({
                open: openSpy,
                setEscapeHandler: jest.fn(),
                setModel: jest.fn()
            } as unknown as Dialog);

            expect(openSpy).toHaveBeenCalledTimes(1);
        });

        test('fills json model with data (controller exists: true | env: VS Code)', async () => {
            checkForExistingChangeMock.mockReturnValue(false);
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
                    controllerPathFromRoot: 'adp.app/webapp/changes/coding/share.js',
                    isRunningInBAS: false,
                    isTsSupported: false
                }),
                text: jest.fn(),
                ok: true
            });

            const openSpy = jest.fn();
            const setTextSpy = jest.fn();
            const setEnabledSpy = jest.fn();

            controllerExt.byId = jest.fn().mockReturnValueOnce({}).mockReturnValue({
                setVisible: jest.fn()
            });

            await controllerExt.setup({
                open: openSpy,
                getBeginButton: jest
                    .fn()
                    .mockReturnValue({ setText: jest.fn().mockReturnValue({ setEnabled: setEnabledSpy }) }),
                getEndButton: jest.fn().mockReturnValue({ setText: setTextSpy }),
                setEscapeHandler: jest.fn(),
                setModel: jest.fn(),
                getContent: jest.fn().mockReturnValue([{ setVisible: jest.fn() }, { setVisible: jest.fn() }])
            } as unknown as Dialog);

            expect(openSpy).toHaveBeenCalledTimes(1);
            expect(setEnabledSpy).toHaveBeenCalledWith(true);
            expect(setTextSpy).toHaveBeenCalledWith('Close');
        });

        test('fills json model with data (controller exists: true | env: BAS)', async () => {
            checkForExistingChangeMock.mockReturnValue(true);
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
                    controllerPath: 'C:/users/projects/adp.app/webapp/changes/coding/share.ts',
                    controllerPathFromRoot: 'adp.app/webapp/changes/coding/share.ts',
                    isRunningInBAS: true,
                    isTsSupported: true
                }),
                text: jest.fn(),
                ok: true
            });

            const openSpy = jest.fn();
            const setTextSpy = jest.fn();
            const setVisibleSpy = jest.fn();

            controllerExt.byId = jest.fn().mockReturnValueOnce({}).mockReturnValue({
                setVisible: jest.fn()
            });

            await controllerExt.setup({
                open: openSpy,
                getBeginButton: jest.fn().mockReturnValue({ setVisible: setVisibleSpy }),
                getEndButton: jest.fn().mockReturnValue({ setText: setTextSpy }),
                setEscapeHandler: jest.fn(),
                setModel: jest.fn(),
                getContent: jest.fn().mockReturnValue([{ setVisible: jest.fn() }, { setVisible: jest.fn() }])
            } as unknown as Dialog);

            expect(openSpy).toHaveBeenCalledTimes(1);
            expect(setVisibleSpy).toHaveBeenCalledWith(false);
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

            fetchMock.mockResolvedValue({
                json: jest.fn().mockRejectedValue(new Error(errorMsg)),
                text: jest.fn(),
                ok: true
            });

            try {
                await controllerExt.setup({
                    setModel: jest.fn(),
                    open: openSpy,
                    setEscapeHandler: jest.fn()
                } as unknown as Dialog);
            } catch (e) {
                expect(e.message).toBe(errorMsg);
            }
            expect(openSpy).not.toHaveBeenCalled();
        });

        test('throws error when trying to get controllers from the project workspace', async () => {
            checkForExistingChangeMock.mockReturnValue(false);
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

            fetchMock.mockResolvedValue({
                json: jest
                    .fn()
                    .mockReturnValueOnce({ controllerExists: false, controllerPath: '', controllerPathFromRoot: '' })
                    .mockRejectedValueOnce(new Error(errorMsg)),
                text: jest.fn(),
                ok: true
            });

            try {
                await controllerExt.setup({
                    setModel: jest.fn(),
                    open: jest.fn(),
                    setEscapeHandler: jest.fn()
                } as unknown as Dialog);
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
                close: closeSpy,
                destroy: jest.fn()
            } as unknown as Dialog;

            controllerExt.handleDialogClose();

            expect(closeSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('onControllerNameInputChange', () => {
        const testModel = {
            setProperty: jest.fn(),
            getProperty: jest.fn().mockReturnValue([{ controllerName: 'Delete' }])
        } as unknown as JSONModel;

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('sets error when controller with the same named already exists', () => {
            checkForExistingChangeMock.mockReturnValue(false);
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

        test('sets error when controller with the same named already exists as pending change', () => {
            checkForExistingChangeMock.mockReturnValue(true);
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('Test'),
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
            checkForExistingChangeMock.mockReturnValue(false);
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
            checkForExistingChangeMock.mockReturnValue(false);
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
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

            controllerExt.model = testModel;

            controllerExt.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: jest.fn() })
            } as unknown as Dialog;

            controllerExt.onControllerNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error);
        });

        test('sets error when the controller name exceeds 64 characters', () => {
            checkForExistingChangeMock.mockReturnValue(false);
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest
                        .fn()
                        .mockReturnValue('thisisverylongnamethisisverylongnamethisisverylongnamethisisveryl'),
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

        test('sets create button to true when the controller name is valid', () => {
            checkForExistingChangeMock.mockReturnValue(false);
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
        beforeAll(() => {
            jest.clearAllMocks();

            jest.spyOn(global, 'Date').mockImplementation(
                () =>
                    ({
                        toISOString: () => '2020-01-01T00:00:00.000Z'
                    }) as unknown as Date
            );
            writeChangeMock.mockImplementation(async (data) => {
                return Promise.resolve(data);
            });
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        afterAll(() => {
            jest.restoreAllMocks();
        });

        test('creates new controller and a change', async () => {
            isLowerThanMinimalUi5VersionMock.mockReturnValue(true);
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
            expect(writeChangeMock).toHaveBeenCalledWith({
                creation: '2020-01-01T00:00:00.000Z',
                fileName: 'something.change'
            });
        });

        test('creates new controller and a change for version >1.136', async () => {
            getControlByIdMock.mockReturnValueOnce(undefined);
            checkForExistingChangeMock.mockReturnValue(false);
            getUi5VersionMock.mockResolvedValueOnce({ major: 1, minor: 136, patch: 0 });
            isLowerThanMinimalUi5VersionMock.mockReturnValueOnce(false);
            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                overlays as unknown as UI5Element,
                {
                    getService: jest.fn(),
                    getFlexSettings: jest.fn()
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

            await controllerExt.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: jest.fn(),
                close: jest.fn()
            } as unknown as Dialog);

            await controllerExt.onCreateBtnPress(event as unknown as Event);

            expect(getControlByIdMock).toHaveBeenCalledWith('::Toolbar');
        });

        test('display info message in the info center when the controller extension is supported during creation of a new controller', async () => {
            getControlByIdMock.mockReturnValueOnce(undefined);
            checkForExistingChangeMock.mockReturnValue(false);
            getUi5VersionMock.mockResolvedValue({ major: 1, minor: 136, patch: 0 });
            isLowerThanMinimalUi5VersionMock.mockReturnValue(false);
            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };
            const mockData = {
                deferred: {
                    resolve: jest.fn()
                }
            } as unknown as ExtendControllerData;
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                overlays as unknown as UI5Element,
                {
                    getService: jest.fn(),
                    getFlexSettings: jest.fn()
                } as unknown as RuntimeAuthoring,
                mockData
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

            jest.spyOn(CommunicationService, 'sendAction');

            await controllerExt.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: jest.fn(),
                close: jest.fn()
            } as unknown as Dialog);

            await controllerExt.onCreateBtnPress(event as unknown as Event);

            expect(CommunicationService.sendAction).toHaveBeenCalledWith(
                showInfoCenterMessage({
                    title: 'Create Controller Extension',
                    description: 'Note: The `Share` controller extension will be created once you save the change.',
                    type: MessageBarType.info
                })
            );
        });

        test('resolve deffered data promise when passed', async () => {
            checkForExistingChangeMock.mockReturnValue(false);
            // Use the real getUi5Version so it falls back and sends the version retrieval failure message
            getUi5VersionMock.mockImplementation(_utils.getUi5Version);
            isLowerThanMinimalUi5VersionMock.mockImplementation(_utils.isLowerThanMinimalUi5Version);
            const addSpy = jest.fn().mockResolvedValue({ fileName: 'something.change' });
            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };
            const event = {
                getSource: jest.fn().mockReturnValue({
                    setEnabled: jest.fn()
                })
            };
            const resolveSpy = jest.fn();
            const mockData = {
                deferred: {
                    resolve: resolveSpy
                }
            } as unknown as ExtendControllerData;
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                overlays as unknown as UI5Element,
                {
                    getService: jest.fn().mockResolvedValue({ add: addSpy })
                } as unknown as RuntimeAuthoring,
                mockData
            );
            controllerExt.model = {
                setProperty: jest.fn(),
                getProperty: jest
                    .fn()
                    .mockReturnValueOnce(undefined)
                    .mockReturnValueOnce('testController')
                    .mockReturnValueOnce('viewId')
            } as unknown as JSONModel;

            controllerExt.handleDialogClose = jest.fn();

            jest.spyOn(CommunicationService, 'sendAction');

            await controllerExt.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: jest.fn(),
                close: jest.fn()
            } as unknown as Dialog);

            await controllerExt.onCreateBtnPress(event as unknown as Event);

            expect(mockData.deferred.resolve).toHaveBeenCalledWith({
                codeRef: 'coding/testController.js',
                viewId: 'viewId'
            });
            expect(CommunicationService.sendAction).toHaveBeenCalledWith(
                showInfoCenterMessage({
                    title: 'SAPUI5 Version Retrieval Failed',
                    description: 'Could not get the SAPUI5 version of the application. Using 1.130.9 as fallback.',
                    type: MessageBarType.error
                })
            );
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
            isLowerThanMinimalUi5VersionMock.mockReturnValue(true);
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
                text: jest.fn().mockRejectedValueOnce(new Error(errorMsg)),
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
