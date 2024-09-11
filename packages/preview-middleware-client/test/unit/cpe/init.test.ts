import init from '../../../src/cpe/init';
import * as common from '@sap-ux-private/control-property-editor-common';
import * as flexChange from '../../../src/cpe/changes/flex-change';
import * as outline from '../../../src/cpe/outline';
import type Event from 'sap/ui/base/Event';
import Log from 'mock/sap/base/Log';
import { fetchMock, sapCoreMock } from 'mock/window';
import * as ui5Utils from '../../../src/cpe/ui5-utils';
import connector from '../../../src/flp/WorkspaceConnector';
import VersionInfo from 'mock/sap/ui/VersionInfo';
import { ChangeService } from '../../../src/cpe/changes/service';

describe('main', () => {
    let sendActionMock: jest.Mock;
    VersionInfo.load.mockResolvedValue({ version: '1.120.4' });
    const applyChangeSpy = jest
        .spyOn(flexChange, 'applyChange')
        .mockResolvedValueOnce()
        .mockRejectedValueOnce({
            toString: jest
                .fn()
                .mockReturnValue(
                    'Error: Applying property changes failed: Error: "" is of type string, expected boolean for property "enabled" of Element sap.m.Buttonx#v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--action::SEPMRA_PROD_MAN.SEPMRA_PROD_MAN_Entities::SEPMRA_C_PD_ProductCopy'
                )
        });
    const initOutlineSpy = jest.spyOn(outline, 'initOutline');
    beforeAll(() => {
        const apiJson = {
            json: () => {
                return {};
            }
        };
        fetchMock
            .mockImplementationOnce(() => Promise.resolve(apiJson))
            .mockImplementation(() => Promise.resolve({ json: jest.fn().mockResolvedValue({}) }));
    });
    beforeEach(() => {
        sendActionMock = jest.fn();
    });
    afterEach(() => {
        applyChangeSpy.mockClear();
        initOutlineSpy.mockClear();
    });

    sapCoreMock.byId.mockReturnValueOnce({
        name: 'sap.m.Button',
        getMetadata: jest.fn().mockImplementationOnce(() => {
            return {
                getName: jest.fn().mockReturnValueOnce('sap.m.Button')
            };
        })
    });
    const mockIconResult = [
        {
            content: 'testIcon1',
            fontFamily: 'sap-icon-font',
            name: 'testIcon1'
        },
        {
            content: 'testIcon2',
            fontFamily: 'sap-icon-font',
            name: 'testIcon2'
        }
    ];
    jest.spyOn(ui5Utils, 'getIcons').mockImplementation(() => {
        return mockIconResult;
    });
    const attachSelectionChange = jest.fn().mockImplementation((newHandler: (event: Event) => Promise<void>) => {
        return newHandler;
    });

    const rta = {
        attachSelectionChange,
        getSelection: jest.fn().mockReturnValue([{ setSelected: jest.fn() }, { setSelected: jest.fn() }]),
        attachUndoRedoStackModified: jest.fn(),
        getFlexSettings: jest.fn().mockReturnValue({ layer: 'VENDOR', scenario: common.SCENARIO.UiAdaptation }),
        getRootControlInstance: jest.fn().mockReturnValue({
            getManifest: jest.fn().mockReturnValue({ 'sap.app': { id: 'testId' } })
        }),
        attachStop: jest.fn(),
        attachModeChanged: jest.fn()
    } as any;

    const spyPostMessage = jest.spyOn(common, 'startPostMessageCommunication').mockImplementation(() => {
        return { sendAction: sendActionMock, dispose: jest.fn() };
    });

    test('init - 1', async () => {
        initOutlineSpy.mockResolvedValue();
        await init(rta);
        const callBackFn = spyPostMessage.mock.calls[0][1];
        // apply change without error
        const payload = {
            controlId:
                'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--action::SEPMRA_PROD_MAN.SEPMRA_PROD_MAN_Entities::SEPMRA_C_PD_ProductCopy',
            propertyName: 'enabled',
            value: false
        };
        await callBackFn({
            type: '[ext] change-property',
            payload
        });

        // check delete notifier
        sendActionMock.mockClear();
        await connector.storage.removeItem('sap.ui.fl.testFile');

        //assert
        expect(applyChangeSpy).toBeCalledWith({ rta: rta }, payload);
        expect(initOutlineSpy).toBeCalledWith(rta, sendActionMock, expect.any(ChangeService));
    });
    test('init - rta exception', async () => {
        const error = new Error('Cannot init outline');
        initOutlineSpy.mockRejectedValue(error);
        await init(rta);
        const callBackFn = spyPostMessage.mock.calls[0][1];
        const payload = {
            controlId:
                'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--action::SEPMRA_PROD_MAN.SEPMRA_PROD_MAN_Entities::SEPMRA_C_PD_ProductCopy',
            propertyName: 'enabled',
            value: 'falsee'
        };
        // apply change
        await callBackFn({
            type: '[ext] change-property',
            payload
        });

        // assert
        expect(applyChangeSpy).toBeCalledWith({ rta: rta }, payload);
        expect(sendActionMock).toHaveBeenNthCalledWith(1, {
            type: '[ext] icons-loaded',
            payload: mockIconResult
        });
        expect(sendActionMock).toHaveBeenNthCalledWith(2, {
            type: '[ext] app-loaded',
            payload: undefined
        });
        expect(sendActionMock).toHaveBeenNthCalledWith(3, {
            type: '[ext] change-stack-modified',
            payload: { saved: [], pending: [] }
        });
        expect(initOutlineSpy).toBeCalledWith(rta, sendActionMock, expect.any(ChangeService));
        expect(Log.error).toBeCalledWith('Error during initialization of Control Property Editor', error);
    });
});
