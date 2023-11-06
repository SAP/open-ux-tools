import * as common from '@sap-ux-private/control-property-editor-common';
import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import init from '../../../src/adp/init';
import { fetchMock } from 'mock/window';
import * as ui5Utils from '../../../src/cpe/ui5-utils';
import * as outline from '../../../src/cpe/outline';

describe('adp', () => {
    const addMenuItemSpy = jest.fn();
    let initOutlineSpy: jest.SpyInstance;
    rtaMock.attachUndoRedoStackModified = jest.fn();
    rtaMock.attachSelectionChange = jest.fn();
    rtaMock.getDefaultPlugins
        .mockReturnValueOnce({
            contextMenu: {
                addMenuItem: addMenuItemSpy
            }
        })
        .mockReturnValueOnce({});
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

        initOutlineSpy = jest.spyOn(outline, 'initOutline').mockImplementation(() => {
            return Promise.resolve();
        });

        jest.spyOn(ui5Utils, 'getIcons').mockImplementation(() => {
            return [];
        });
    });

    test('init', async () => {
        const spyPostMessage = jest.spyOn(common, 'startPostMessageCommunication').mockImplementation(() => {
            return { dispose: jest.fn(), sendAction: jest.fn() };
        });

        init(rtaMock);

        expect(initOutlineSpy).toBeCalledTimes(1);
        expect(addMenuItemSpy).toBeCalledTimes(2);
        expect(setPluginsSpy).toBeCalledTimes(1);

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
});
