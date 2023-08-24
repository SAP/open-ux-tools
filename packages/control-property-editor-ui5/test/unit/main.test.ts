import { init } from '../../src/main';
import * as common from '@sap-ux/control-property-editor-common';
import * as flexChange from '../../src/changes/flexChange';
import * as outline from '../../src/outline';
import * as facade from '../../src/facade';
import type Event from 'sap/ui/base/Event';

describe('main', () => {
    let sendActionMock: jest.Mock<any, any, any>;
    let applyChangeSpy: jest.SpyInstance<any>;
    beforeAll(() => {
        const apiJson = {
            json: () => {
                return {};
            }
        };
        (global as any).fetch = jest.fn(() => Promise.resolve(apiJson));
    });

    afterEach(() => {
        sendActionMock.mockRestore();
        applyChangeSpy.mockRestore();
    });

    jest.spyOn(facade, 'createUi5Facade').mockImplementation(() => {
        return {
            getControlById: jest.fn().mockReturnValueOnce({
                name: 'sap,m.Button',
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
    let handler: ((event: Event) => Promise<void>) | undefined;
    const attachSelectionChange = jest.fn().mockImplementation((newHandler: (event: Event) => Promise<void>) => {
        handler = newHandler;
    });

    const initOutlineSpy = jest.spyOn(outline, 'initOutline').mockImplementation();
    applyChangeSpy = jest
        .spyOn(flexChange, 'applyChange')
        .mockResolvedValueOnce()
        .mockRejectedValueOnce({
            toString: jest
                .fn()
                .mockReturnValue(
                    'Error: Applying property changes failed: Error: "" is of type string, expected boolean for property "enabled" of Element sap.m.Buttonx#v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--action::SEPMRA_PROD_MAN.SEPMRA_PROD_MAN_Entities::SEPMRA_C_PD_ProductCopy'
                )
        })
        .mockResolvedValueOnce();
    const rta = {
        attachSelectionChange,
        getSelection: jest.fn().mockReturnValue([{ setSelected: jest.fn() }, { setSelected: jest.fn() }]),
        attachUndoRedoStackModified: jest.fn()
    } as any;
    sendActionMock = jest.fn();
    const spyPostMessage = jest.spyOn(common, 'startPostMessageCommunication').mockImplementation(() => {
        return { sendAction: sendActionMock, dispose: jest.fn() };
    });

    test('init - 1', async () => {
        init({ rta, componentId: 'testComponentId', generator: 'testGenerator', layer: 'VENDOR' });
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
        expect(sendActionMock).toBeCalledTimes(1);
    });
    test('init - rta exception', async () => {
        init({ rta, componentId: 'testComponentId', generator: 'testGenerator', layer: 'VENDOR' });
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
        expect(sendActionMock).toBeCalledTimes(2);
    });
});
