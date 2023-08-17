import * as postMessage from '../../../src/postMessage';
import { communicationMiddleware } from '../../../src/app/middleware';
import {
    controlSelected,
    outlineChanged,
    propertyChanged,
    propertyChangeFailed,
    selectControl
} from '../../../src/api';

jest.mock('../../../src/app/slice', () => {
    return {
        changeProperty: { type: '[ext] property-changed' }
    };
});

describe('communication middleware', () => {
    let messageProcessor: jest.SpyInstance;
    let dispatch: jest.SpyInstance;
    let middleWare: any;
    const sendActionfn = jest.fn();

    beforeEach(() => {
        messageProcessor = jest.spyOn(postMessage, 'startPostMessageCommunication').mockReturnValue({
            sendAction: sendActionfn,
            dispose: jest.fn()
        });
        dispatch = jest.fn();
        middleWare = communicationMiddleware({ dispatch } as any);
        jest.spyOn(document, 'getElementById').mockReturnValue({
            contentWindow: 'Target'
        } as any);
    });

    test('property changed in UI5 application', () => {
        const action = propertyChanged({
            controlId: 'control1',
            propertyName: 'text',
            newValue: 'new value'
        });
        messageProcessor.mock.calls[0][1](action);
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenNthCalledWith(1, action);
    });

    test('control selected in UI5 application', () => {
        const action = controlSelected({
            id: 'control1',
            type: 'text',
            properties: []
        });
        messageProcessor.mock.calls[0][1](action);
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenNthCalledWith(1, action);
    });

    test('outline changed in UI5 application', () => {
        const action = outlineChanged([]);
        messageProcessor.mock.calls[0][1](action);
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenNthCalledWith(1, action);
    });

    test('property change failed in UI5 application', () => {
        const action = propertyChangeFailed({
            controlId: 'control1',
            propertyName: 'text',
            errorMessage: 'change failed'
        });
        messageProcessor.mock.calls[0][1](action);
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenNthCalledWith(1, action);
    });

    test('getTarget', () => {
        expect(messageProcessor.mock.calls[0][0]()).toEqual('Target');
    });

    test('property change - send action', () => {
        const action = propertyChanged({
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
        expect(sendActionfn).toHaveBeenCalledTimes(1);
    });

    test('select control - send action', () => {
        const action = selectControl('01-02');
        const next = jest.fn().mockReturnValue(action);
        jest.mock('../../../src/api', () => {
            return {
                selectControl: { type: '[ext] select-control' }
            };
        });
        const result = middleWare(next)(action);
        expect(result).toMatchInlineSnapshot(`
            Object {
              "payload": "01-02",
              "type": "[ext] select-control",
            }
        `);
        expect(sendActionfn).toHaveBeenCalledTimes(1);
    });
});
