import log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import {
    ExternalAction,
    showMessage,
    startPostMessageCommunication,
    enableTelemetry
} from '@sap-ux-private/control-property-editor-common';

import { getUi5Version } from '../utils/version';

import init from '../cpe/init';
import { getError } from '../cpe/error-utils';
import { getAllSyncViewsIds } from '../cpe/utils';
import { getFeVersion } from '../cpe/quick-actions/utils';
import { ActionHandler } from '../cpe/types';

import { getUI5VersionValidationMessage } from './ui5-version-utils';
import { loadDefinitions } from './quick-actions/load';
import { initDialogs } from './init-dialogs';
import { getResourceBundle } from '../i18n';

export default async function (rta: RuntimeAuthoring) {
    const version = await getUi5Version();
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

    const feVersion = getFeVersion(rta.getRootControlInstance().getManifest());
    const quickActionRegistry = await loadDefinitions(feVersion);

    await init(rta, [quickActionRegistry]);
    const ui5VersionValidationMsg = getUI5VersionValidationMessage(version);

    if (ui5VersionValidationMsg) {
        sendAction(showMessage({ message: ui5VersionValidationMsg, shouldHideIframe: true }));

        return;
    }

    if (syncViewsIds.length > 0) {
        const bundle = await getResourceBundle();
        const key = 'ADP_SYNC_VIEWS_MESSAGE';
        sendAction(
            showMessage({
                message: bundle.getText(key) ?? key,
                shouldHideIframe: false
            })
        );
    }

    log.debug('ADP init executed.');
}
