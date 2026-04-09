import { jest } from '@jest/globals';
import * as actualCommon from '@sap-ux-private/control-property-editor-common';

const mockSendAction = jest.fn();
const mockDispose = jest.fn();
const mockStartPostMessageCommunication = jest.fn().mockReturnValue({
    sendAction: mockSendAction,
    dispose: mockDispose
});

jest.unstable_mockModule('@sap-ux-private/control-property-editor-common', () => ({
    ...actualCommon,
    startPostMessageCommunication: mockStartPostMessageCommunication
}));

jest.unstable_mockModule('../../src/slice', () => ({
    changeProperty: { type: '[ext] property-changed' }
}));

const common = await import('@sap-ux-private/control-property-editor-common');
const { communicationMiddleware } = await import('../../src/middleware');

describe('communication middleware', () => {
    let dispatch: jest.Mock;
    let middleWare: any;

    beforeEach(() => {
        dispatch = jest.fn();
        middleWare = communicationMiddleware({
            dispatch,
            getState: jest.fn().mockReturnValue({ selectedControl: { id: 'filterBar' } })
        } as any);
        jest.spyOn(document, 'getElementById').mockReturnValue({
            contentWindow: 'Target'
        } as any);
    });
    afterEach(() => {
        mockStartPostMessageCommunication.mockClear();
        mockSendAction.mockReset();
    });

    test('property changed in UI5 application', () => {
        const action = common.propertyChanged({
            controlId: 'control1',
            propertyName: 'text',
            newValue: 'new value'
        });
        mockStartPostMessageCommunication.mock.calls[0][1](action);
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenNthCalledWith(1, action);
    });

    test('select control in UI5 application on apploaded', () => {
        const action = common.appLoaded();
        mockStartPostMessageCommunication.mock.calls[0][1](action);
        expect(mockSendAction).toHaveBeenCalledWith(common.selectControl('filterBar'));
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenNthCalledWith(1, action);
    });

    test('control selected in UI5 application', () => {
        const action = common.controlSelected({
            id: 'control1',
            name: 'testing',
            type: 'text',
            properties: []
        });
        mockStartPostMessageCommunication.mock.calls[0][1](action);
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenNthCalledWith(1, action);
    });

    test('outline changed in UI5 application', () => {
        const action = common.outlineChanged([]);
        mockStartPostMessageCommunication.mock.calls[0][1](action);
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenNthCalledWith(1, action);
    });

    test('property change failed in UI5 application', () => {
        const action = common.propertyChangeFailed({
            controlId: 'control1',
            propertyName: 'text',
            errorMessage: 'change failed'
        });
        mockStartPostMessageCommunication.mock.calls[0][1](action);
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenNthCalledWith(1, action);
    });

    test('getTarget', () => {
        expect(mockStartPostMessageCommunication.mock.calls[0][0]()).toEqual('Target');
    });

    test('property change - send action', () => {
        const action = common.propertyChanged({
            controlId: 'control1',
            propertyName: 'text',
            newValue: 'new value'
        });
        const next = jest.fn().mockReturnValue(action);
        const result = middleWare(next)(action);
        expect(result).toMatchInlineSnapshot(`
            Object {
              "payload": Object {
                "controlId": "control1",
                "newValue": "new value",
                "propertyName": "text",
              },
              "type": "[ext] property-changed",
            }
        `);
        expect(mockSendAction).toHaveBeenCalledTimes(1);
    });

    test('select control - send action', () => {
        const action = common.selectControl('01-02');
        const next = jest.fn().mockReturnValue(action);
        const result = middleWare(next)(action);
        expect(result).toMatchInlineSnapshot(`
            Object {
              "payload": "01-02",
              "type": "[ext] select-control",
            }
        `);
        expect(mockSendAction).toHaveBeenCalledTimes(1);
    });

    test('add extension point - send action', () => {
        const action = common.addExtensionPoint({ controlId: 'control1' } as common.OutlineNode);
        const next = jest.fn().mockReturnValue(action);
        const result = middleWare(next)(action);
        expect(result).toMatchInlineSnapshot(`
            Object {
              "payload": Object {
                "controlId": "control1",
              },
              "type": "[ext] add-extension-point",
            }
        `);
        expect(mockSendAction).toHaveBeenCalledTimes(1);
    });

    test('undo - send action', () => {
        const action = common.undo();
        const next = jest.fn().mockReturnValue(action);
        const result = middleWare(next)(action);
        expect(result).toMatchInlineSnapshot(`
            Object {
              "payload": undefined,
              "type": "[ext] undo",
            }
        `);
        expect(mockSendAction).toHaveBeenCalledTimes(1);
    });

    test('redo - send action', () => {
        const action = common.redo();
        const next = jest.fn().mockReturnValue(action);
        const result = middleWare(next)(action);
        expect(result).toMatchInlineSnapshot(`
            Object {
              "payload": undefined,
              "type": "[ext] redo",
            }
        `);
        expect(mockSendAction).toHaveBeenCalledTimes(1);
    });

    test('save - send action', () => {
        const action = common.save();
        const next = jest.fn().mockReturnValue(action);
        const result = middleWare(next)(action);
        expect(result).toMatchInlineSnapshot(`
            Object {
              "payload": undefined,
              "type": "[ext] save",
            }
        `);
        expect(mockSendAction).toHaveBeenCalledTimes(1);
    });

    test('setAppMode(adaptation) mode - send action', () => {
        const action = common.setAppMode('adaptation');
        const next = jest.fn().mockReturnValue(action);
        const result = middleWare(next)(action);
        expect(result).toMatchInlineSnapshot(`
            Object {
              "payload": "adaptation",
              "type": "[ext] set-app-mode",
            }
        `);
        expect(mockSendAction).toHaveBeenCalledTimes(1);
    });
    test('setAppMode(navigation) mode - send action', () => {
        const action = common.setAppMode('navigation');
        const next = jest.fn().mockReturnValue(action);
        const result = middleWare(next)(action);
        expect(result).toMatchInlineSnapshot(`
            Object {
              "payload": "navigation",
              "type": "[ext] set-app-mode",
            }
        `);
        expect(mockSendAction).toHaveBeenCalledTimes(1);
    });
    test('externalFileChange - send action', () => {
        const action = common.externalFileChange('file-path');
        const next = jest.fn().mockReturnValue(action);
        const result = middleWare(next)(action);
        expect(result).toMatchInlineSnapshot(`
            Object {
              "payload": "file-path",
              "type": "[ext] external-file-change",
            }
        `);
        expect(mockSendAction).toHaveBeenCalledTimes(1);
    });
});
