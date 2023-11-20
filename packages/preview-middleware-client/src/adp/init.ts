import log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import init from '../cpe/init';
import { initDialogs } from './init-dialogs';
import { ExternalAction, showMessage, startPostMessageCommunication } from '@sap-ux-private/control-property-editor-common';
import { ActionHandler } from '../cpe/types';
import ExtensionPointService from './extension-point';
import VersionInfo from 'sap/ui/VersionInfo';
import { getUI5VersionValidationMessage } from './ui5-version-utils';

export default async function (rta: RuntimeAuthoring) {
    const extPointService = new ExtensionPointService(rta);
    const actionHandlers: ActionHandler[] = [];
    /**
     *
     * @param handler action handler
     */
    function subscribe(handler: ActionHandler): void {
        actionHandlers.push(handler);
    }

    const { sendAction } = startPostMessageCommunication<ExternalAction>(window.parent, async function onAction(action) {
        for (const handler of actionHandlers) {
            try {
                await handler(action);
            } catch (error) {
                log.error('Handler Failed: ', error);
            }
        }
    });
    
    const ui5Version = (await VersionInfo.load()) as { version: string };
    const ui5VersionValidationMessage = getUI5VersionValidationMessage(ui5Version.version);

    if(ui5VersionValidationMessage) {
        sendAction(showMessage('The current SAPUI5 version set for this Adaptation project is 1.70. The minimum version to use for SAPUI5 Adaptation Project and its SAPUI5 Visual Editor is 1.71'));
    }

    
    // initialize fragment content menu entry
    initDialogs(rta);
    // initialize extension point service
    extPointService.init(subscribe);
    // also initialize the editor
    init(rta);
    log.debug('ADP init executed.');
}


