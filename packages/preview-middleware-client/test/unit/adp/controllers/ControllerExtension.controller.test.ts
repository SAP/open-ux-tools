import { jest } from '@jest/globals';
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
const getPendingCodeExtViewIdsMock = jest.fn().mockReturnValue([]);
jest.unstable_mockModule('open/ux/preview/client/adp/utils', () => ({
    ..._adpUtils,
    checkForExistingChange: checkForExistingChangeMock,
    getPendingCodeExtViewIds: getPendingCodeExtViewIdsMock
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

const { default: ControllerExtension } =
    await import('open/ux/preview/client/adp/controllers/ControllerExtension.controller');

describe('ControllerExtension', () => {
    beforeAll(() => {
        fetchMock.mockResolvedValue({
            json: jest
                .fn()
                .mockReturnValueOnce({
                    baseControllerExists: false,
                    baseControllerPath: '',
                    baseControllerPathFromRoot: '',
                    instanceControllerExists: false,
                    instanceControllerPath: '',
                    instanceControllerPathFromRoot: '',
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
            isLowerThanMinimalUi5VersionMock.mockReturnValue(true);
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
                    baseControllerExists: true,
                    baseControllerPath: 'C:/users/projects/adp.app/webapp/changes/coding/share.js',
                    baseControllerPathFromRoot: 'adp.app/webapp/changes/coding/share.js',
                    instanceControllerExists: false,
                    instanceControllerPath: '',
                    instanceControllerPathFromRoot: '',
                    isRunningInBAS: false,
                    isTsSupported: false
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

        test('fills json model with data (controller exists: true | env: BAS)', async () => {
            checkForExistingChangeMock.mockReturnValue(true);
            isLowerThanMinimalUi5VersionMock.mockReturnValue(true);
            getPendingCodeExtViewIdsMock.mockReturnValue([undefined]);
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
                    baseControllerExists: true,
                    baseControllerPath: 'C:/users/projects/adp.app/webapp/changes/coding/share.ts',
                    baseControllerPathFromRoot: 'adp.app/webapp/changes/coding/share.ts',
                    instanceControllerExists: false,
                    instanceControllerPath: '',
                    instanceControllerPathFromRoot: '',
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
            getPendingCodeExtViewIdsMock.mockReturnValue([]);
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
            isLowerThanMinimalUi5VersionMock.mockReturnValue(true);
            getPendingCodeExtViewIdsMock.mockReturnValue([]);
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
                    .mockReturnValueOnce({ baseControllerExists: false, instanceControllerExists: false })
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
                    .mockReturnValueOnce(false) // /controllerExists
                    .mockReturnValueOnce('Share') // /newControllerName
                    .mockReturnValueOnce('::Toolbar') // /viewId
                    .mockReturnValueOnce(false), // /isInstanceSpecific
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
            expect(addSpy).toHaveBeenCalledWith('coding/Share.js', '::Toolbar', false);
            expect(writeChangeMock).toHaveBeenCalledWith({
                creation: '2020-01-01T00:00:00.000Z',
                fileName: 'something.change'
            });
        });

        test('creates new controller and a change for version >1.136', async () => {
            getControlByIdMock.mockReturnValueOnce(undefined);
            checkForExistingChangeMock.mockReturnValue(false);
            getUi5VersionMock.mockResolvedValue({ major: 1, minor: 136, patch: 0 });
            isLowerThanMinimalUi5VersionMock
                .mockReturnValueOnce(true) // isInstanceSpecificSupported: 1.136 < 1.143
                .mockReturnValueOnce(false); // isControllerExtensionSupported: 1.136 >= 1.135
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
                    .mockReturnValueOnce(false) // /controllerExists
                    .mockReturnValueOnce('Share') // /newControllerName
                    .mockReturnValueOnce('::Toolbar') // /viewId
                    .mockReturnValueOnce(false), // /isInstanceSpecific
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
                    .mockReturnValueOnce(false) // /controllerExists
                    .mockReturnValueOnce('Share') // /newControllerName
                    .mockReturnValueOnce('::Toolbar') // /viewId
                    .mockReturnValueOnce(false), // /isInstanceSpecific
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
                    .mockReturnValueOnce(undefined) // /controllerExists
                    .mockReturnValueOnce('testController') // /newControllerName
                    .mockReturnValueOnce('viewId') // /viewId
                    .mockReturnValueOnce(false) // /isInstanceSpecific
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
                viewId: 'viewId',
                instanceSpecific: false
            });
            expect(CommunicationService.sendAction).toHaveBeenCalledWith(
                showInfoCenterMessage({
                    title: 'SAPUI5 Version Retrieval Failed',
                    description: 'Could not get the SAPUI5 version of the application. Using 1.130.9 as fallback.',
                    type: MessageBarType.error
                })
            );
        });

        test('opens base controller link via onOpenBaseController', () => {
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            controllerExt.model = {
                getProperty: jest.fn().mockReturnValue('C:/users/projects/adp.app/webapp/changes/coding/base.js'),
                setProperty: jest.fn()
            } as unknown as JSONModel;

            controllerExt.onOpenBaseController();

            expect(openMock).toHaveBeenCalledWith(
                'vscode://fileC:/users/projects/adp.app/webapp/changes/coding/base.js'
            );
        });

        test('opens instance controller link via onOpenInstanceController', () => {
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            controllerExt.model = {
                getProperty: jest.fn().mockReturnValue('C:/users/projects/adp.app/webapp/changes/coding/instance.js'),
                setProperty: jest.fn()
            } as unknown as JSONModel;

            controllerExt.onOpenInstanceController();

            expect(openMock).toHaveBeenCalledWith(
                'vscode://fileC:/users/projects/adp.app/webapp/changes/coding/instance.js'
            );
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
                    .mockReturnValueOnce(false) // /controllerExists
                    .mockReturnValueOnce('Share') // /newControllerName
                    .mockReturnValueOnce('::Toolbar') // /viewId
                    .mockReturnValueOnce(false), // /isInstanceSpecific
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

        test('resolves deferred with viewId when instance-specific controller is selected', async () => {
            checkForExistingChangeMock.mockReturnValue(false);
            getUi5VersionMock.mockResolvedValue({ major: 1, minor: 143, patch: 0 });
            isLowerThanMinimalUi5VersionMock.mockReturnValue(false);
            const overlays = { getId: jest.fn().mockReturnValue('some-id') };
            const resolveSpy = jest.fn();
            const mockData = { deferred: { resolve: resolveSpy } } as unknown as ExtendControllerData;

            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                overlays as unknown as UI5Element,
                { getService: jest.fn(), getFlexSettings: jest.fn() } as unknown as RuntimeAuthoring,
                mockData
            );

            controllerExt.model = {
                setProperty: jest.fn(),
                getProperty: jest
                    .fn()
                    .mockReturnValueOnce(false) // /controllerExists
                    .mockReturnValueOnce('MyController') // /newControllerName
                    .mockReturnValueOnce('myViewId') // /viewId
                    .mockReturnValueOnce(true) // /isInstanceSpecific
            } as unknown as JSONModel;

            controllerExt.handleDialogClose = jest.fn();

            const event = { getSource: jest.fn().mockReturnValue({ setEnabled: jest.fn() }) };
            await controllerExt.onCreateBtnPress(event as unknown as Event);

            expect(resolveSpy).toHaveBeenCalledWith({
                codeRef: 'coding/MyController.js',
                viewId: 'myViewId',
                instanceSpecific: true
            });
        });
    });

    describe('onControllerTypeSelectionChange', () => {
        test('sets isInstanceSpecific to false when base controller radio button is selected', () => {
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );
            controllerExt.model = {
                setProperty: jest.fn(),
                getProperty: jest.fn()
            } as unknown as JSONModel;

            const event = {
                getSource: jest.fn().mockReturnValue({ getSelectedIndex: jest.fn().mockReturnValue(0) })
            };

            controllerExt.onControllerTypeSelectionChange(event as unknown as Event);

            expect(controllerExt.model.setProperty).toHaveBeenCalledWith('/isInstanceSpecific', false);
        });

        test('sets isInstanceSpecific to true when instance-specific radio button is selected', () => {
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );
            controllerExt.model = {
                setProperty: jest.fn(),
                getProperty: jest.fn()
            } as unknown as JSONModel;

            const event = {
                getSource: jest.fn().mockReturnValue({ getSelectedIndex: jest.fn().mockReturnValue(1) })
            };

            controllerExt.onControllerTypeSelectionChange(event as unknown as Event);

            expect(controllerExt.model.setProperty).toHaveBeenCalledWith('/isInstanceSpecific', true);
        });
    });

    describe('instanceSpecificVisibility', () => {
        beforeEach(() => {
            const overlayControl = {
                getElement: jest.fn().mockReturnValue({ getId: jest.fn().mockReturnValue('::ObjectPage') })
            };
            sapCoreMock.byId.mockReturnValue(overlayControl);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('is false when UI5 version is below 1.143', async () => {
            checkForExistingChangeMock.mockReturnValue(false);
            getUi5VersionMock.mockResolvedValue({ major: 1, minor: 142, patch: 0 });
            isLowerThanMinimalUi5VersionMock.mockReturnValue(true);

            const overlays = { getId: jest.fn().mockReturnValue('some-id') };
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            fetchMock.mockResolvedValue({
                json: jest
                    .fn()
                    .mockReturnValueOnce({
                        baseControllerExists: false,
                        baseControllerPath: '',
                        baseControllerPathFromRoot: '',
                        instanceControllerExists: false,
                        instanceControllerPath: '',
                        instanceControllerPathFromRoot: '',
                        isRunningInBAS: false,
                        isTsSupported: false
                    })
                    .mockReturnValueOnce({ controllers: [] }),
                text: jest.fn(),
                ok: true
            });

            const setPropertySpy = jest.spyOn(controllerExt.model, 'setProperty');

            await controllerExt.setup({
                open: jest.fn(),
                setEscapeHandler: jest.fn(),
                setModel: jest.fn()
            } as unknown as Dialog);

            expect(setPropertySpy).toHaveBeenCalledWith('/instanceSpecificVisibility', false);
        });

        test('is true when UI5 version is 1.143 or above', async () => {
            checkForExistingChangeMock.mockReturnValue(false);
            getUi5VersionMock.mockResolvedValue({ major: 1, minor: 143, patch: 0 });
            isLowerThanMinimalUi5VersionMock.mockReturnValue(false);

            const overlays = { getId: jest.fn().mockReturnValue('some-id') };
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );

            fetchMock.mockResolvedValue({
                json: jest
                    .fn()
                    .mockReturnValueOnce({
                        baseControllerExists: false,
                        baseControllerPath: '',
                        baseControllerPathFromRoot: '',
                        instanceControllerExists: false,
                        instanceControllerPath: '',
                        instanceControllerPathFromRoot: '',
                        isRunningInBAS: false,
                        isTsSupported: false
                    })
                    .mockReturnValueOnce({ controllers: [] }),
                text: jest.fn(),
                ok: true
            });

            const setPropertySpy = jest.spyOn(controllerExt.model, 'setProperty');

            await controllerExt.setup({
                open: jest.fn(),
                setEscapeHandler: jest.fn(),
                setModel: jest.fn()
            } as unknown as Dialog);

            expect(setPropertySpy).toHaveBeenCalledWith('/instanceSpecificVisibility', true);
        });
    });

    describe('radio enablement based on existing extensions (UI5 >= 1.143)', () => {
        const codeExtResponse = (base: boolean, instance: boolean) => ({
            baseControllerExists: base,
            baseControllerPath: base ? 'C:/adp.app/webapp/changes/coding/base.js' : '',
            baseControllerPathFromRoot: base ? 'adp.app/webapp/changes/coding/base.js' : '',
            instanceControllerExists: instance,
            instanceControllerPath: instance ? 'C:/adp.app/webapp/changes/coding/instance.js' : '',
            instanceControllerPathFromRoot: instance ? 'adp.app/webapp/changes/coding/instance.js' : '',
            isRunningInBAS: false,
            isTsSupported: false
        });

        beforeEach(() => {
            checkForExistingChangeMock.mockReturnValue(false);
            getPendingCodeExtViewIdsMock.mockReturnValue([]);
            getUi5VersionMock.mockResolvedValue({ major: 1, minor: 143, patch: 0 });
            isLowerThanMinimalUi5VersionMock.mockReturnValue(false);
            Utils.getViewForControl.mockReturnValue({
                getId: jest.fn().mockReturnValue('view1'),
                getController: jest.fn().mockReturnValue({
                    getMetadata: jest.fn().mockReturnValue({ getName: () => 'my.Controller' })
                })
            });
            const overlayControl = {
                getElement: jest.fn().mockReturnValue({ getId: jest.fn().mockReturnValue('::ObjectPage') })
            };
            sapCoreMock.byId.mockReturnValue(overlayControl);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        const setupDialog = async (base: boolean, instance: boolean) => {
            const overlays = { getId: jest.fn().mockReturnValue('some-id') };
            const controllerExt = new ControllerExtension(
                'adp.extension.controllers.ControllerExtension',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring
            );
            fetchMock.mockResolvedValue({
                json: jest
                    .fn()
                    .mockReturnValueOnce(codeExtResponse(base, instance))
                    .mockReturnValueOnce({ controllers: [] }),
                text: jest.fn(),
                ok: true
            });
            const setPropertySpy = jest.spyOn(controllerExt.model, 'setProperty');
            await controllerExt.setup({
                open: jest.fn(),
                setEscapeHandler: jest.fn(),
                setModel: jest.fn(),
                getBeginButton: jest.fn().mockReturnValue({
                    setText: jest.fn().mockReturnValue({ setEnabled: jest.fn() }),
                    setVisible: jest.fn()
                }),
                getEndButton: jest.fn().mockReturnValue({ setText: jest.fn() })
            } as unknown as Dialog);
            return setPropertySpy;
        };

        test('both radios enabled and base preselected when neither exists', async () => {
            const setPropertySpy = await setupDialog(false, false);
            expect(setPropertySpy).toHaveBeenCalledWith('/baseControllerEnabled', true);
            expect(setPropertySpy).toHaveBeenCalledWith('/instanceControllerEnabled', true);
            expect(setPropertySpy).toHaveBeenCalledWith('/controllerTypeSelectedIndex', 0);
            expect(setPropertySpy).toHaveBeenCalledWith('/isInstanceSpecific', false);
        });

        test('base radio disabled and instance preselected when only base exists', async () => {
            const setPropertySpy = await setupDialog(true, false);
            expect(setPropertySpy).toHaveBeenCalledWith('/baseControllerEnabled', false);
            expect(setPropertySpy).toHaveBeenCalledWith('/instanceControllerEnabled', true);
            expect(setPropertySpy).toHaveBeenCalledWith('/controllerTypeSelectedIndex', 1);
            expect(setPropertySpy).toHaveBeenCalledWith('/isInstanceSpecific', true);
        });

        test('instance radio disabled and base preselected when only instance exists', async () => {
            const setPropertySpy = await setupDialog(false, true);
            expect(setPropertySpy).toHaveBeenCalledWith('/baseControllerEnabled', true);
            expect(setPropertySpy).toHaveBeenCalledWith('/instanceControllerEnabled', false);
            expect(setPropertySpy).toHaveBeenCalledWith('/controllerTypeSelectedIndex', 0);
            expect(setPropertySpy).toHaveBeenCalledWith('/isInstanceSpecific', false);
        });

        test('shows existing controller form with both paths when both base and instance exist', async () => {
            const setPropertySpy = await setupDialog(true, true);
            expect(setPropertySpy).toHaveBeenCalledWith('/existingControllerFormVisibility', true);
            expect(setPropertySpy).toHaveBeenCalledWith('/inputFormVisibility', false);
            // Both paths are surfaced separately so the user can open either one.
            expect(setPropertySpy).toHaveBeenCalledWith('/baseControllerExists', true);
            expect(setPropertySpy).toHaveBeenCalledWith(
                '/baseControllerPath',
                'C:/adp.app/webapp/changes/coding/base.js'
            );
            expect(setPropertySpy).toHaveBeenCalledWith('/instanceControllerExists', true);
            expect(setPropertySpy).toHaveBeenCalledWith(
                '/instanceControllerPath',
                'C:/adp.app/webapp/changes/coding/instance.js'
            );
        });

        test('shows pending-change form when both exist only as pending changes', async () => {
            getPendingCodeExtViewIdsMock.mockReturnValue([undefined, 'view1']);
            const setPropertySpy = await setupDialog(false, false);
            expect(setPropertySpy).toHaveBeenCalledWith('/pendingChangeFormVisibility', true);
            expect(setPropertySpy).toHaveBeenCalledWith('/inputFormVisibility', false);
        });
    });
});
