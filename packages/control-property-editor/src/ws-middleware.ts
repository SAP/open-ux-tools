import type { Dispatch } from 'redux';
import type { Middleware, MiddlewareAPI } from '@reduxjs/toolkit';

import type { Action } from './actions';
import { fileChanged, initializeLivereload } from './slice';

/**
 * Communication between preview iframe and main application is realized through the communication middleware.
 *
 * @param store - redux store
 * @returns Function
 */
export const webSocketMiddleware: Middleware<Dispatch<Action>> = (store: MiddlewareAPI) => {
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
                        store.dispatch(fileChanged([request.path]));
                    }
                });
            }
            action = next(action);
            return action;
        };
};
