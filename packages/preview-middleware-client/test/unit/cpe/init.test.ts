import init from '../../../src/cpe/init';
import * as common from '@sap-ux-private/control-property-editor-common';
import * as flexChange from '../../../src/cpe/changes/flex-change';
import * as outline from '../../../src/cpe/outline';
import * as facade from '../../../src/cpe/facade';
import type Event from 'sap/ui/base/Event';
import Log from 'sap/base/Log';
import { fetchMock } from 'mock/window';

describe('main', () => {
    let sendActionMock: jest.Mock;
    Log.error = jest.fn();
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

    jest.spyOn(facade, 'createUi5Facade').mockImplementation(() => {
        return {
            getControlById: jest.fn().mockReturnValueOnce({
                name: 'sap.m.Button',
                getMetadata: jest.fn().mockImplementationOnce(() => {
                    return {
                        getName: jest.fn().mockReturnValueOnce('sap.m.Button')
                    };
                })
            }),
            getIcons: jest.fn().mockImplementation(() => {
                return ['testIcon1', 'testIcon2'];
            }),
            getClosestOverlayFor: jest.fn(),
            getComponent: jest.fn(),
            getOverlay: jest.fn()
        };
    });
    const attachSelectionChange = jest.fn().mockImplementation((newHandler: (event: Event) => Promise<void>) => {
        return newHandler;
    });

    const rta = {
        attachSelectionChange,
        getSelection: jest.fn().mockReturnValue([{ setSelected: jest.fn() }, { setSelected: jest.fn() }]),
       attachUndoRedoStackModified : jest.fn(),
        getFlexSettings: jest.fn().mockReturnValue({ layer: 'VENDOR' }),
        getRootControlInstance: jest.fn().mockReturnValue({
            getManifest: jest.fn().mockReturnValue({ 'sap.app': { id: 'testId' } })
        })
    } as any;

    const spyPostMessage = jest.spyOn(common, 'startPostMessageCommunication').mockImplementation(() => {
        return { sendAction: sendActionMock, dispose: jest.fn() };
    });

    test('init - 1', async () => {
        initOutlineSpy.mockResolvedValue();
        await init(rta);
        const callBackFn = spyPostMessage.mock.calls[0][1];
        // apply change without error
        await callBackFn({
            type: '[ext] change-property',
            payload: {
                controlId:
                    'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--action::SEPMRA_PROD_MAN.SEPMRA_PROD_MAN_Entities::SEPMRA_C_PD_ProductCopy',
                propertyName: 'enabled',
                value: false
            }
        });

        //assert
        expect(applyChangeSpy).toBeCalledTimes(1);
        expect(initOutlineSpy).toBeCalledTimes(1);
    });
    test('init - rta exception', async () => {
        initOutlineSpy.mockRejectedValue('error');
        await init(rta);
        const callBackFn = spyPostMessage.mock.calls[0][1];

        // apply change
        await callBackFn({
            type: '[ext] change-property',
            payload: {
                controlId:
                    'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--action::SEPMRA_PROD_MAN.SEPMRA_PROD_MAN_Entities::SEPMRA_C_PD_ProductCopy',
                propertyName: 'enabled',
                value: 'falsee'
            }
        });

        // assert
        expect(applyChangeSpy).toBeCalledTimes(1);
        expect(sendActionMock).toBeCalledTimes(2);
        expect(initOutlineSpy).toBeCalledTimes(1);
    });
});
