import type { Dispatch } from 'redux';
import type { Middleware, MiddlewareAPI } from '@reduxjs/toolkit';

import type { ExternalAction } from '@sap-ux-private/control-property-editor-common';
import {
    startPostMessageCommunication,
    changeProperty as externalChangeProperty,
    selectControl,
    deletePropertyChanges,
    addExtensionPoint,
    reloadApplication
} from '@sap-ux-private/control-property-editor-common';

import type { Action } from './actions';
import { changeProperty } from './slice';

/**
 * Communication between preview iframe and main application is realized through the communication middleware.
 *
 * @param store - redux store
 * @returns Function
 */
export const communicationMiddleware: Middleware<Dispatch<Action>> = (store: MiddlewareAPI) => {
    const { sendAction } = startPostMessageCommunication<ExternalAction>(
        function getTarget(): Window | undefined {
            let result;
            const target = (document.getElementById('preview') as HTMLIFrameElement).contentWindow;
            if (target) {
                result = target;
            }
            return result;
        },
        function onAction(action) {
            store.dispatch(action);
            return Promise.resolve();
        }
    );
    return (next: Dispatch<Action>) =>
        (action: Action): Action => {
            action = next(action);

            switch (action.type) {
                case changeProperty.type: {
                    sendAction(externalChangeProperty(action.payload));
                    break;
                }
                case reloadApplication.type:
                case deletePropertyChanges.type:
                case selectControl.type: {
                    sendAction(action);
                    break;
                }
                case addExtensionPoint.type: {
                    sendAction(action);
                    break;
                }
                default:
            }
            return action;
        };
};
