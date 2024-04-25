import type { ExternalAction } from '@sap-ux-private/control-property-editor-common';
import {
    startPostMessageCommunication,
    iconsLoaded,
    enableTelemetry,
    storageFileChanged
} from '@sap-ux-private/control-property-editor-common';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import type { ActionHandler, Service } from './types';
import { initOutline } from './outline/index';
import { SelectionService } from './selection';
import { ChangeService } from './changes/service';
import { loadDefaultLibraries } from './documentation';
import Log from 'sap/base/Log';
import { logger } from './logger';
import { getIcons } from './ui5-utils';
import workspaceConnector from '../flp/WorkspaceConnector';

export default function init(rta: RuntimeAuthoring): Promise<void> {
    Log.info('Initializing Control Property Editor');

    // enable telemetry if requested
    const flexSettings = rta.getFlexSettings();
    if (flexSettings.telemetry === true) {
        enableTelemetry();
    }

    const actionHandlers: ActionHandler[] = [];
    /**
     *
     * @param handler action handler
     */
    function subscribe(handler: ActionHandler): void {
        actionHandlers.push(handler);
    }

    const selectionService = new SelectionService(rta);

    const changesService = new ChangeService({ rta }, selectionService);
    const services: Service[] = [selectionService, changesService];
    try {
        loadDefaultLibraries();
        const { sendAction } = startPostMessageCommunication<ExternalAction>(
            window.parent,
            async function onAction(action) {
                for (const handler of actionHandlers) {
                    try {
                        await handler(action);
                    } catch (error) {
                        Log.error('Handler Failed: ', error);
                    }
                }
            },
            logger
        );

        for (const service of services) {
            service.init(sendAction, subscribe);
        }
        // For initOutline to complete the RTA needs to already running (to access RTA provided services).
        // That can only happen if the plugin initialization has completed.
        initOutline(rta, sendAction).catch((error) =>
            Log.error('Error during initialization of Control Property Editor', error)
        );
        const icons = getIcons();

        // hook the file deletion listener to the UI5 workspace connector
        workspaceConnector.storage.fileChangeRequestNotifier = (
            fileName: string,
            kind: 'delete' | 'create',
            changeType?: string
        ) => {
            if ((changeType && changeType !== 'appdescr_fe_changePageConfiguration') || kind === 'delete') {
                sendAction(storageFileChanged(fileName?.replace('sap.ui.fl.', '')));
            }
        };

        sendAction(iconsLoaded(icons));
    } catch (error) {
        Log.error('Error during initialization of Control Property Editor', error);
    }
    return Promise.resolve();
}
