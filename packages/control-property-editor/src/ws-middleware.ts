import type { AnyAction, Dispatch } from 'redux';
import type { Middleware, MiddlewareAPI } from '@reduxjs/toolkit';

import type { Action } from './actions';
import type reducer from './slice';
import { fileChanged, initializeLivereload } from './slice';
import { externalFileChange } from '@sap-ux-private/control-property-editor-common';

/**
 * Communication between preview iframe and main application is realized through the communication middleware.
 *
 * @param store - redux store
 * @returns Function
 */
export const webSocketMiddleware: Middleware<Dispatch<Action>> = (
    store: MiddlewareAPI<Dispatch<AnyAction>, ReturnType<typeof reducer>>
) => {
    return (next: Dispatch<Action>) =>
        (action: Action): Action => {
            if (initializeLivereload.match(action)) {
                const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
                const url = action.payload.url
                    ? action.payload.url.replace('http', 'ws')
                    : `${protocol}://${location.hostname}:${action.payload.port}`;
                const socket = new WebSocket(url);
                socket.addEventListener('message', (event) => {
                    const request = JSON.parse(event.data);
                    if (request.command === 'reload') {
                        const timestampBefore = store.getState().lastExternalFileChangeTimestamp;
                        store.dispatch(fileChanged([request.path]));
                        const timestampAfter = store.getState().lastExternalFileChangeTimestamp;
                        if (timestampAfter !== timestampBefore) {
                            store.dispatch(externalFileChange(request.path));
                        }
                    }
                });
            }
            action = next(action);
            return action;
        };
};
