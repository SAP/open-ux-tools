import type { Dispatch } from 'redux';
import type { Middleware, MiddlewareAPI } from '@reduxjs/toolkit';

import type { Action } from './actions';
import { fileChanged } from './slice';

/**
 * Communication between preview iframe and main application is realized through the communication middleware.
 *
 * @param store - redux store
 * @returns Function
 */
export const webSocketMiddleware: Middleware<Dispatch<Action>> = (store: MiddlewareAPI) => {
    const socket = new WebSocket(`ws://${location.host}`);
    socket.addEventListener('message', (event) => {
        store.dispatch(fileChanged(event.data.split(',')));
    });
    return (next: Dispatch<Action>) =>
        (action: Action): Action => {
            action = next(action);
            return action;
        };
};
