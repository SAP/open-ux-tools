import log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import {
    ExternalAction,
    showMessage,
    startPostMessageCommunication,
    enableTelemetry
} from '@sap-ux-private/control-property-editor-common';

import { ActionHandler } from '../cpe/types';
import { getError } from '../utils/error';
import { getUi5Version, getUI5VersionValidationMessage, isLowerThanMinimalUi5Version } from '../utils/version';

import init from '../cpe/init';
import { getApplicationType } from '../utils/application';
import { getTextBundle } from '../i18n';

import { loadDefinitions } from './quick-actions/load';
import { getAllSyncViewsIds } from './utils';
import { initDialogs } from './init-dialogs';

export default async function (rta: RuntimeAuthoring) {
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

    const ui5VersionInfo = await getUi5Version();
    const syncViewsIds = await getAllSyncViewsIds(ui5VersionInfo);
    initDialogs(rta, syncViewsIds, ui5VersionInfo);

    if (!isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 78 })) {
        const ExtensionPointService = (await import('open/ux/preview/client/adp/extension-point')).default;
        const extPointService = new ExtensionPointService(rta);
        extPointService.init(subscribe);
    }

    const applicationType = getApplicationType(rta.getRootControlInstance().getManifest());
    const quickActionRegistries = await loadDefinitions(applicationType);

    await init(rta, quickActionRegistries);

    if (isLowerThanMinimalUi5Version(ui5VersionInfo)) {
        sendAction(showMessage({ message: getUI5VersionValidationMessage(ui5VersionInfo), shouldHideIframe: true }));
        return;
    }

    if (syncViewsIds.length > 0) {
        const bundle = await getTextBundle();
        sendAction(
            showMessage({
                message: bundle.getText('ADP_SYNC_VIEWS_MESSAGE'),
                shouldHideIframe: false
            })
        );
    }

    log.debug('ADP init executed.');
}
