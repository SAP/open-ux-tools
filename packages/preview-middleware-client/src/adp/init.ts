import log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import init from '../cpe/init';
import { initDialogs } from './init-dialogs';
import {
    ExternalAction,
    startPostMessageCommunication,
    enableTelemetry,
    showInfoCenterMessage
} from '@sap-ux-private/control-property-editor-common';

import { ActionHandler } from '../cpe/types';
import VersionInfo from 'sap/ui/VersionInfo';
import { getUI5VersionValidationMessage } from './ui5-version-utils';
import { getError } from '../cpe/error-utils';
import type {SingleVersionInfo} from '../../types/global';
import { getAllSyncViewsIds } from '../cpe/utils';

export default async function (rta: RuntimeAuthoring) {
    const version = (await VersionInfo.load({library:'sap.ui.core'}) as SingleVersionInfo)?.version;
    const versionParts = version.split('.');
    const minor = parseInt(versionParts[1], 10);
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

    const { sendAction } = startPostMessageCommunication<ExternalAction>(
        window.parent,
        async function onAction(action: ExternalAction) {
            for (const handler of actionHandlers) {
                try {
                    await handler(action);
                } catch (error) {
                    log.error('Handler Failed: ', getError(error));
                }
            }
        }
    );

    const syncViewsIds = await getAllSyncViewsIds(minor);
    initDialogs(rta, syncViewsIds, minor);
    // await initActionSettings(rta, syncViewsIds, minor);

    if (minor > 77) {
        const ExtensionPointService = (await import('open/ux/preview/client/adp/extension-point')).default;
        const extPointService = new ExtensionPointService(rta);
        extPointService.init(subscribe);
    }

    await init(rta);
    const ui5VersionValidationMsg = getUI5VersionValidationMessage(version);

    if (ui5VersionValidationMsg) {
        sendAction(showInfoCenterMessage({ message: ui5VersionValidationMsg, type: 0 }));

        return;
    }

    if (syncViewsIds.length > 0) {
        sendAction(
            showInfoCenterMessage({
                message:
                    'Have in mind that synchronous views are detected for this application and controller extensions are not supported for such views. Controller extension functionality on these views will be disabled.',
                type: 0
            })
        );
    }

    log.debug('ADP init executed.');
}


