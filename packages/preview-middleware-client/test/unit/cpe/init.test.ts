import RuntimeAuthoring, { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';

import * as common from '@sap-ux-private/control-property-editor-common';

import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import VersionInfo from 'mock/sap/ui/VersionInfo';
import Log from 'mock/sap/base/Log';
import { fetchMock, sapCoreMock } from 'mock/window';

import init from '../../../src/cpe/init';
import * as flexChange from '../../../src/cpe/changes/flex-change';
import { OutlineService } from '../../../src/cpe/outline/service';
import * as ui5Utils from '../../../src/cpe/ui5-utils';
import connector from '../../../src/flp/WorkspaceConnector';
import { CommunicationService } from '../../../src/cpe/communication-service';

describe('main', () => {
    const sendActionMock = jest.fn();
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
    const initOutlineSpy = jest.spyOn(OutlineService.prototype, 'init');

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

    let rta: RuntimeAuthoring;

    beforeEach(() => {
        rta = new RuntimeAuthoringMock({} as RTAOptions);
        RuntimeAuthoringMock.prototype.getFlexSettings = jest.fn().mockReturnValue({
            layer: 'VENDOR',
            scenario: common.SCENARIO.UiAdaptation
        } as any);
        RuntimeAuthoringMock.prototype.getRootControlInstance = jest.fn().mockReturnValue({
            getManifest: jest.fn().mockReturnValue({ 'sap.app': { id: 'testId' } })
        });
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

    const spyPostMessage = jest.spyOn(CommunicationService, 'subscribe');

    test('init - 1', async () => {
        initOutlineSpy.mockResolvedValue();
        // const rta = new RuntimeAuthoringMock();
        await init(rta);
        const callBackFn = spyPostMessage.mock.calls[2][0];
        (callBackFn as any)('test')
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
        expect(applyChangeSpy).toBeCalledWith({ rta }, payload);
        expect(initOutlineSpy).toHaveBeenCalledTimes(1);
    });
    test('init - rta exception', async () => {
        const error = new Error('Cannot init outline');
        initOutlineSpy.mockRejectedValue(error);

        // act
        await init(rta);

        // assert
        expect(initOutlineSpy).toHaveBeenCalledTimes(1);
        expect(Log.error).toBeCalledWith('Service Initialization Failed: ', error);
    });
});
