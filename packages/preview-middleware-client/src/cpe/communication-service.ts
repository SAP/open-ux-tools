import Log from 'sap/base/Log';

import type { ExternalAction } from '@sap-ux-private/control-property-editor-common';
import { startPostMessageCommunication } from '@sap-ux-private/control-property-editor-common';

import { getError } from '../utils/error';

import type { ActionHandler } from './types';

export class CommunicationService {
    /**
     * Sends an action to the CPE.
     */
    static sendAction: (action: ExternalAction) => void;
    private static readonly actionHandlers: ActionHandler[] = [];

    static {
        const { sendAction } = startPostMessageCommunication<ExternalAction>(
            window.parent,
            async (action: ExternalAction) => {
                for (const handler of this.actionHandlers) {
                    try {
                        await handler(action);
                    } catch (error) {
                        Log.error('Handler Failed: ', getError(error));
                    }
                }
            }
        );
        this.sendAction = sendAction;
    }

    /**
     * Creates a listener to receive actions from the CPE.
     *
     * @param handler - Action handler.
     */
    static subscribe(handler: ActionHandler): void {
        this.actionHandlers.push(handler);
    }
}
