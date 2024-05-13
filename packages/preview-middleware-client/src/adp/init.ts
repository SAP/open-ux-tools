import log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import UI5ElementRegistry from 'sap/ui/core/ElementRegistry';

import init from '../cpe/init';
import { initDialogs } from './init-dialogs';
import {
    ExternalAction,
    showMessage,
    startPostMessageCommunication,
    enableTelemetry
} from '@sap-ux-private/control-property-editor-common';

import { ActionHandler } from '../cpe/types';
import VersionInfo from 'sap/ui/VersionInfo';
import { getUI5VersionValidationMessage } from './ui5-version-utils';
import UI5Element from 'sap/ui/dt/Element';

export default async function (rta: RuntimeAuthoring) {
    const { version } = (await VersionInfo.load()) as { version: string };
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
                    log.error('Handler Failed: ', error);
                }
            }
        }
    );

    const syncViewsIds = getAllSyncViewsIds();
    initDialogs(rta, syncViewsIds);

    if (minor > 77) {
        const ExtensionPointService = (await import('open/ux/preview/client/adp/extension-point')).default;
        const extPointService = new ExtensionPointService(rta);
        extPointService.init(subscribe);
    }

    await init(rta);
    const ui5VersionValidationMsg = getUI5VersionValidationMessage(version);

    if (ui5VersionValidationMsg) {
        sendAction(showMessage({ message: ui5VersionValidationMsg, shouldHideIframe: true }));

        return;
    }
    if (syncViewsIds.length > 0) {
        sendAction(
            showMessage({
                message:
                    'Have in mind that synchronous views are detected for this application and controller extensions are not supported for such views. Controller extension functionality on these views will be disabled.',
                shouldHideIframe: false
            })
        );
    }

    log.debug('ADP init executed.');
}

/**
 *
 * Get Ids for all sync views
 *
 * @returns array of Ids for application sync views
 */
function getAllSyncViewsIds(): string[] {
    const elements = UI5ElementRegistry.all() as Record<string, UI5Element>;
    const syncViewIds: string[] = [];
    Object.entries(elements).forEach(([key, ui5Element]) => {
        if (ui5Element?.getMetadata()?.getName()?.includes('XMLView') && ui5Element?.oAsyncState === undefined) {
            syncViewIds.push(key);
        }
    });

    return syncViewIds;
}
