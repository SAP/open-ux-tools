import log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import init from '../cpe/init';
import { initDialogs } from './init-dialogs';
import { ExternalAction, startPostMessageCommunication } from '@sap-ux-private/control-property-editor-common';
import { ActionHandler } from '../cpe/types';
import ExtensionPointService from './extension-point';

export default function (rta: RuntimeAuthoring) {
    const extPointService = new ExtensionPointService(rta);
    const actionHandlers: ActionHandler[] = [];
    /**
     *
     * @param handler action handler
     */
    function subscribe(handler: ActionHandler): void {
        actionHandlers.push(handler);
    }

    startPostMessageCommunication<ExternalAction>(window.parent, async function onAction(action) {
        for (const handler of actionHandlers) {
            try {
                await handler(action);
            } catch (error) {
                log.error('Handler Failed: ', error);
            }
        }
    });
    // initialize fragment content menu entry
    initDialogs(rta);
    // initialize extension point service
    extPointService.init(subscribe);
    // also initialize the editor
    init(rta);
    log.debug('ADP init executed.');
}
