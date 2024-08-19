import type { Dispatch } from 'redux';
import type { Middleware, MiddlewareAPI } from '@reduxjs/toolkit';

import type { ExternalAction } from '@sap-ux-private/control-property-editor-common';
import {
    startPostMessageCommunication,
    changeProperty as externalChangeProperty,
    selectControl,
    deletePropertyChanges,
    addExtensionPoint,
    reloadApplication,
    undo,
    redo,
    save,
    setAppMode,
    executeQuickAction,
    clearInfoCenterMessage
} from '@sap-ux-private/control-property-editor-common';

import { changeProperty } from './slice';

type Action = ReturnType<typeof changeProperty>;

/**
 * Communication between preview iframe and main application is realized through the communication middleware.
 *
 * @param store - redux store
 * @returns Function
 */
export const communicationMiddleware: Middleware<Dispatch<ExternalAction>> = (store: MiddlewareAPI) => {
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
                case clearInfoCenterMessage.type:
                case executeQuickAction.type:
                case reloadApplication.type:
                case deletePropertyChanges.type:
                case setAppMode.type:
                case undo.type:
                case redo.type:
                case save.type:
                case selectControl.type:
                case addExtensionPoint.type: {
                    sendAction(action);
                    break;
                }
                default:
            }
            return action;
        };
};
