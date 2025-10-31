import type { Middleware, MiddlewareAPI, Dispatch, Action } from 'redux';
import { WEB_APP_ACTION_TYPES_SET } from '@sap-ux/sap-systems-ext-types';
import { initVsCodeApi } from '../utils';

export const postMessageMiddleware: Middleware = (store: MiddlewareAPI) => {
    window.addEventListener('message', (event: MessageEvent) => {
        if (event.origin === globalThis.origin) {
            if (event.data && typeof event.data.type === 'string') {
                store.dispatch(event.data);
            }
        }
    });

    if (!globalThis.vscode) {
        initVsCodeApi();
    }

    return (next: Dispatch) =>
        (action): Action => {
            action = next(action);
            if (action && typeof action.type === 'string' && WEB_APP_ACTION_TYPES_SET.has(action.type)) {
                globalThis.vscode?.postMessage(action);
            }
            return action;
        };
};
