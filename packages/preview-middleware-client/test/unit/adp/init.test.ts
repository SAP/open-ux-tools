import * as common from '@sap-ux-private/control-property-editor-common';
import init from '../../../src/adp/init';
import { fetchMock } from 'mock/window';
import * as ui5Utils from '../../../src/cpe/ui5-utils';
import { OutlineService } from '../../../src/cpe/outline/service';
import VersionInfo from 'mock/sap/ui/VersionInfo';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import ElementRegistry from 'mock/sap/ui/core/ElementRegistry';
import Element from 'mock/sap/ui/core/Element';

describe('adp', () => {
    const addMenuItemSpy = jest.fn();
    let initOutlineSpy: jest.SpyInstance;
    const sendActionMock = jest.fn();
    const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

    rtaMock.attachUndoRedoStackModified = jest.fn();
    rtaMock.attachSelectionChange = jest.fn();
    rtaMock.getFlexSettings.mockReturnValue({
        telemetry: true,
        scenario: 'ADAPTATION_PROJECT'
    });

    const executeSpy = jest.fn();
    rtaMock.getService = jest.fn().mockResolvedValue({ execute: executeSpy });
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
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('init', async () => {
        const spyPostMessage = jest.spyOn(common, 'startPostMessageCommunication').mockImplementation(() => {
            return { dispose: jest.fn(), sendAction: jest.fn() };
        });
        const enableTelemetry = jest.spyOn(common, 'enableTelemetry');
        VersionInfo.load.mockResolvedValue({ name: 'sap.ui.core', version: '1.118.1' });

        await init(rtaMock as unknown as RuntimeAuthoring);

        expect(initOutlineSpy).toBeCalledTimes(1);
        expect(addMenuItemSpy).toBeCalledTimes(2);
        expect(setPluginsSpy).toBeCalledTimes(1);
        expect(enableTelemetry).toBeCalledTimes(2);

        const callBackFn = spyPostMessage.mock.calls[0][1];

        const payload = {
            controlId: 'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport'
        };

        await callBackFn({
            type: '[ext] add-extension-point',
            payload
        });

        expect(executeSpy).toHaveBeenCalledWith(payload.controlId, 'CTX_ADDXML_AT_EXTENSIONPOINT');
    });

    test('init - send notification for UI5 version lower than 1.71', async () => {
        jest.spyOn(common, 'startPostMessageCommunication').mockImplementation(() => {
            return { dispose: jest.fn(), sendAction: sendActionMock };
        });

        VersionInfo.load.mockResolvedValue({ name: 'sap.ui.core', version: '1.70.0' });

        await init(rtaMock as unknown as RuntimeAuthoring);

        expect(sendActionMock).toHaveBeenNthCalledWith(1, {
            type: '[ext] icons-loaded',
            payload: []
        });

        expect(sendActionMock).toHaveBeenNthCalledWith(2, {
            type: '[ext] app-loaded',
            payload: undefined
        });

        expect(sendActionMock).toHaveBeenNthCalledWith(3, {
            type: '[ext] show-dialog-message',
            payload: {
                message:
                    'The current SAPUI5 version set for this Adaptation project is 1.70. The minimum version to use for SAPUI5 Adaptation Project and its SAPUI5 Visual Editor is 1.71',
                shouldHideIframe: true
            }
        });
    });

    test('init - send notification existence of sync views for minor UI5 version bigger than 120', async () => {
        jest.spyOn(common, 'startPostMessageCommunication').mockImplementation(() => {
            return { dispose: jest.fn(), sendAction: sendActionMock };
        });

        const mockUI5Element = {
            getMetadata: jest.fn().mockReturnValue({
                getName: jest.fn().mockReturnValue('XMLView')
            }),
            oAsyncState: undefined
        };

        ElementRegistry.all.mockReturnValue({
            'application-app-preview-component---fin.ar.lineitems.display.appView': mockUI5Element
        });

        VersionInfo.load.mockResolvedValue({ name: 'sap.ui.core', version: '1.123.1' });

        await init(rtaMock as unknown as RuntimeAuthoring);

        expect(sendActionMock).toHaveBeenNthCalledWith(1, {
            type: '[ext] icons-loaded',
            payload: []
        });

        expect(sendActionMock).toHaveBeenNthCalledWith(2, {
            type: '[ext] app-loaded',
            payload: undefined
        });

        expect(sendActionMock).toHaveBeenNthCalledWith(4, {
            type: '[ext] show-dialog-message',
            payload: {
                message:
                    'Have in mind that synchronous views are detected for this application and controller extensions are not supported for such views. Controller extension functionality on these views will be disabled.',
                shouldHideIframe: false
            }
        });
    });

    test('init - send notification existence of sync views for minor UI5 version lower than 120', async () => {
        jest.spyOn(common, 'startPostMessageCommunication').mockImplementation(() => {
            return { dispose: jest.fn(), sendAction: sendActionMock };
        });

        const mockUI5Element = {
            getMetadata: jest.fn().mockReturnValue({
                getName: jest.fn().mockReturnValue('XMLView')
            }),
            oAsyncState: undefined,
            getId: jest.fn().mockReturnValue('application-app-preview-component---fin.ar.lineitems.display.appView')
        };

        Element.registry.filter.mockReturnValue([mockUI5Element]);

        VersionInfo.load.mockResolvedValue({ name: 'sap.ui.core', version: '1.118.1' });

        await init(rtaMock as unknown as RuntimeAuthoring);

        expect(sendActionMock).toHaveBeenNthCalledWith(3, {
            type: '[ext] show-dialog-message',
            payload: {
                message:
                    'Have in mind that synchronous views are detected for this application and controller extensions are not supported for such views. Controller extension functionality on these views will be disabled.',
                shouldHideIframe: false
            }
        });
    });
});
