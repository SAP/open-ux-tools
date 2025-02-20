import type { Dispatch, AnyAction } from 'redux';
import type { MiddlewareAPI } from '@reduxjs/toolkit';
import { webSocketMiddleware } from '../../src/ws-middleware';
import { fileChanged } from '../../src/slice';
import { externalFileChange } from '@sap-ux-private/control-property-editor-common';

const globalWebsocketOriginal = global.WebSocket;

describe('webSocketMiddleware', () => {
    let mockStore: MiddlewareAPI<Dispatch<AnyAction>, any>;
    let next: jest.Mock;
    let invoke: (action: AnyAction) => void;
    let mockWebSocket: WebSocket;

    beforeEach(() => {
        mockStore = {
            getState: jest
                .fn()
                .mockReturnValueOnce({ lastExternalFileChangeTimestamp: 12323243434 })
                .mockReturnValue({ lastExternalFileChangeTimestamp: 4343434343 }),
            dispatch: jest.fn()
        };

        next = jest.fn();

        const middleware = webSocketMiddleware(mockStore);
        invoke = (action: AnyAction) => middleware(next)(action);

        mockWebSocket = {
            addEventListener: jest.fn()
        } as unknown as WebSocket;

        global.WebSocket = jest.fn(() => mockWebSocket) as any;
    });

    afterEach(() => {
        jest.restoreAllMocks();
        global.WebSocket = globalWebsocketOriginal;
    });

    it('should pass the action to the next middleware', () => {
        const action = { type: 'app/initialize-livereload', payload: { port: 35000 } };
        invoke(action);

        const messageCallback = (mockWebSocket.addEventListener as jest.Mock).mock.calls[0][1];

        const mockMessageEvent = new MessageEvent('message', {
            data: JSON.stringify({ command: 'reload', path: 'file_path' })
        });

        if (messageCallback) {
            messageCallback(mockMessageEvent);
        }

        expect(next).toHaveBeenCalledWith(action);
        expect(mockStore.dispatch).toHaveBeenNthCalledWith(1, fileChanged(['file_path']));
        expect(mockStore.dispatch).toHaveBeenNthCalledWith(2, externalFileChange('file_path'));
    });
});
