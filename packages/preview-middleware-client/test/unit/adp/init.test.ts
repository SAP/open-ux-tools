import * as common from '@sap-ux-private/control-property-editor-common';
import init from '../../../src/adp/init';
import { fetchMock } from 'mock/window';
import * as ui5Utils from '../../../src/cpe/ui5-utils';
import { OutlineService } from '../../../src/cpe/outline/service';
import { CommunicationService } from '../../../src/cpe/communication-service';
import VersionInfo from 'mock/sap/ui/VersionInfo';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import ElementRegistry from 'mock/sap/ui/core/ElementRegistry';
import Element from 'mock/sap/ui/core/Element';
import { MessageBarType, showInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import { resetSyncViews } from '../../../src/adp/sync-views-utils';

const addFragmentServiceMock = jest.fn();
jest.mock('open/ux/preview/client/adp/add-fragment', () => ({
    initAddXMLPlugin: addFragmentServiceMock
}));

const extendControllerServiceMock = jest.fn();
jest.mock('open/ux/preview/client/adp/extend-controller', () => ({
    initExtendControllerPlugin: extendControllerServiceMock
}));

describe('adp', () => {
    const addMenuItemSpy = jest.fn();
    let initOutlineSpy: jest.SpyInstance;
    const sendActionMock = jest.spyOn(CommunicationService, 'sendAction');
    const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

    rtaMock.attachUndoRedoStackModified = jest.fn();
    rtaMock.attachSelectionChange = jest.fn();
    rtaMock.getFlexSettings.mockReturnValue({
        telemetry: true,
        scenario: 'ADAPTATION_PROJECT'
    });

    const executeSpy = jest.fn();
    const attachEventSpy = jest.fn();
    rtaMock.getService = jest.fn().mockResolvedValue({ execute: executeSpy, attachEvent: attachEventSpy });
    const setPluginsSpy = jest.fn();
    rtaMock.setPlugins = setPluginsSpy;

    beforeAll(() => {
        const apiJson = {
            json: () => {
                return {};
            }
        };

        window.fetch = fetchMock
            .mockImplementationOnce(() => Promise.resolve(apiJson))
            .mockImplementation(() => Promise.resolve({ json: jest.fn().mockResolvedValue({}) }));

        initOutlineSpy = jest.spyOn(OutlineService.prototype, 'init').mockImplementation(() => {
            return Promise.resolve();
        });

        jest.spyOn(ui5Utils, 'getIcons').mockImplementation(() => {
            return [];
        });
    });

    beforeEach(() => {
        rtaMock.getDefaultPlugins.mockReturnValue({
            contextMenu: {
                addMenuItem: addMenuItemSpy
            }
        });
        rtaMock.getPlugins.mockReturnValue({});
    });

    afterEach(() => {
        jest.clearAllMocks();
        resetSyncViews();
    });

    test('init', async () => {
        const spyPostMessage = jest.spyOn(CommunicationService, 'subscribe');
        const enableTelemetry = jest.spyOn(common, 'enableTelemetry');
        VersionInfo.load.mockResolvedValue({
            name: 'SAPUI5 Distribution',
            libraries: [{ name: 'sap.ui.core', version: '1.118.1' }]
        });

        await init(rtaMock as unknown as RuntimeAuthoring);

        expect(initOutlineSpy).toHaveBeenCalledTimes(1);
        expect(addMenuItemSpy).toHaveBeenCalledTimes(2);
        expect(setPluginsSpy).toHaveBeenCalledTimes(2);
        expect(enableTelemetry).toHaveBeenCalledTimes(2);

        const callBackFn = spyPostMessage.mock.calls[0][0];

        const action1 = common.addExtensionPoint({
            controlId: 'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport--PgLayout',
            children: [],
            controlType: '',
            editable: true,
            name: 'PgLayout',
            visible: true
        });
        const action2 = common.addExtensionPoint({
            controlId: 'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport',
            children: [],
            controlType: '',
            editable: true,
            name: '',
            visible: true
        });

        await callBackFn(action1);
        await callBackFn(action2);

        expect(executeSpy).toHaveBeenNthCalledWith(
            1,
            'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport',
            'CTX_ADDXML_AT_EXTENSIONPOINT'
        );
        expect(executeSpy).toHaveBeenNthCalledWith(
            2,
            'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport',
            'CTX_ADDXML_AT_EXTENSIONPOINT'
        );
    });

    test('init - send notification for UI5 version lower than 1.71', async () => {
        VersionInfo.load.mockResolvedValue({
            name: 'SAPUI5 Distribution',
            libraries: [{ name: 'sap.ui.core', version: '1.70.0' }]
        });
        jest.spyOn(CommunicationService, 'sendAction');

        await init(rtaMock as unknown as RuntimeAuthoring);

        expect(sendActionMock).toHaveBeenNthCalledWith(2, {
            type: '[ext] icons-loaded',
            payload: []
        });

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'SAPUI5 Version Warning',
                description:
                    'The current SAPUI5 version set for this adaptation project is 1.70. The minimum version for SAPUI5 Adaptation Project and its SAPUI5 Adaptation Editor is 1.71. Install version 1.71 or higher.',
                type: MessageBarType.error
            })
        );

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(common.toggleAppPreviewVisibility(false));
    });

    test('init - send notification existence of sync views for minor UI5 version bigger than 120', async () => {
        const mockUI5Element = {
            getMetadata: jest.fn().mockReturnValue({
                getName: jest.fn().mockReturnValue('XMLView')
            }),
            oAsyncState: undefined
        };

        ElementRegistry.all.mockReturnValueOnce({
            'application-app-preview-component---fin.ar.lineitems.display.appView': mockUI5Element
        });

        VersionInfo.load.mockResolvedValue({
            name: 'SAPUI5 Distribution',
            libraries: [{ name: 'sap.ui.core', version: '1.123.1' }]
        });

        jest.spyOn(CommunicationService, 'sendAction');

        await init(rtaMock as unknown as RuntimeAuthoring);
        // Simulate the 'update' event
        const updateHandler = attachEventSpy.mock.calls[0][1];
        await updateHandler();

        expect(sendActionMock).toHaveBeenNthCalledWith(2, {
            type: '[ext] icons-loaded',
            payload: []
        });

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'Synchronous Views Detected',
                description:
                    'Synchronous views are detected for this application. Controller extensions are not supported for such views and will be disabled.',
                type: MessageBarType.warning
            })
        );
    });

    test('init - send notification existence of sync views for minor UI5 version lower than 120', async () => {
        const mockUI5Element = {
            getMetadata: jest.fn().mockReturnValue({
                getName: jest.fn().mockReturnValue('XMLView')
            }),
            oAsyncState: undefined,
            getId: jest.fn().mockReturnValue('application-app-preview-component---fin.ar.lineitems.display.appView')
        };

        Element.registry.filter.mockReturnValue([mockUI5Element]);

        VersionInfo.load.mockResolvedValue({
            name: 'SAPUI5 Distribution',
            libraries: [{ name: 'sap.ui.core', version: '1.118.1' }]
        });

        jest.spyOn(CommunicationService, 'sendAction');

        await init(rtaMock as unknown as RuntimeAuthoring);
        // Simulate the 'update' event
        const updateHandler = attachEventSpy.mock.calls[0][1];
        await updateHandler();

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'Synchronous Views Detected',
                description:
                    'Synchronous views are detected for this application. Controller extensions are not supported for such views and will be disabled.',
                type: MessageBarType.warning
            })
        );
    });

    test('init - use AddXMLPlugin and ExtendControllerPlugin for UI5 version higher than 1.136.1', async () => {
        const mockUI5Element = {
            getMetadata: jest.fn().mockReturnValue({
                getName: jest.fn().mockReturnValue('XMLView')
            }),
            oAsyncState: undefined,
            getId: jest.fn().mockReturnValue('application-app-preview-component---fin.ar.lineitems.display.appView')
        };

        Element.registry.filter.mockReturnValue([mockUI5Element]);

        VersionInfo.load.mockResolvedValue({
            name: 'SAPUI5 Distribution',
            libraries: [{ name: 'sap.ui.core', version: '1.136.2' }]
        });

        await init(rtaMock as unknown as RuntimeAuthoring);

        expect(addFragmentServiceMock).toHaveBeenCalledWith(rtaMock);
        expect(extendControllerServiceMock).toHaveBeenCalledWith(rtaMock);
    });

    test('init - use for UI5 version higher than 1.136.1', async () => {
        const mockUI5Element = {
            getMetadata: jest.fn().mockReturnValue({
                getName: jest.fn().mockReturnValue('XMLView')
            }),
            oAsyncState: undefined,
            getId: jest.fn().mockReturnValue('application-app-preview-component---fin.ar.lineitems.display.appView')
        };

        Element.registry.filter.mockReturnValue([mockUI5Element]);

        VersionInfo.load.mockResolvedValue({
            name: 'SAPUI5 Distribution',
            libraries: [{ name: 'sap.ui.core', version: '1.136.0' }]
        });

        await init(rtaMock as unknown as RuntimeAuthoring);

        expect(addFragmentServiceMock).not.toHaveBeenCalledWith(rtaMock);
        expect(extendControllerServiceMock).not.toHaveBeenCalledWith(rtaMock);
    });
});
