import log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { enableTelemetry, MessageBarType, toggleAppPreviewVisibility } from '@sap-ux-private/control-property-editor-common';

import { getFullyQualifiedUi5Version, getUi5Version, isLowerThanMinimalUi5Version, minVersionInfo } from '../utils/version';

import init from '../cpe/init';
import { getApplicationType } from '../utils/application';

import { loadDefinitions } from './quick-actions/load';
import { getAllSyncViewsIds } from './utils';
import { initDialogs } from './init-dialogs';
import { sendInfoCenterMessage } from '../utils/info-center-message';
import { CommunicationService } from '../cpe/communication-service';

export default async function (rta: RuntimeAuthoring) {
    const flexSettings = rta.getFlexSettings();
    if (flexSettings.telemetry === true) {
        enableTelemetry();
    }

    const ui5VersionInfo = await getUi5Version();
    const syncViewsIds = await getAllSyncViewsIds(ui5VersionInfo);

    // Plugins need to be set before adding additional plugins to prevent overriding with the default
    // and allow usage of getPlugins later in the flow
    const defaultPlugins = rta.getDefaultPlugins();
    rta.setPlugins(defaultPlugins);

    if (isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 136, patch: 2 })) {
        await initDialogs(rta, syncViewsIds, ui5VersionInfo);
    } else {
        (await import('open/ux/preview/client/adp/add-fragment')).initAddXMLPlugin(rta);
        (await import('open/ux/preview/client/adp/extend-controller')).initExtendControllerPlugin(rta);
    }

    if (!isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 78 })) {
        const ExtensionPointService = (await import('open/ux/preview/client/adp/extension-point')).default;
        const extPointService = new ExtensionPointService(rta);
        extPointService.init();
    }

    const applicationType = getApplicationType(rta.getRootControlInstance().getManifest());
    const quickActionRegistries = await loadDefinitions(applicationType);

    await init(rta, quickActionRegistries);

    if (isLowerThanMinimalUi5Version(ui5VersionInfo)) {
        await sendInfoCenterMessage({
            title: { key: 'FLP_UI5_VERSION_WARNING_TITLE' },
            description: {
                key: 'FLP_UI5_VERSION_WARNING_DESCRIPTION', params: [
                    getFullyQualifiedUi5Version(ui5VersionInfo),
                    getFullyQualifiedUi5Version(minVersionInfo)]
            },
            type: MessageBarType.error
        });
        CommunicationService.sendAction(toggleAppPreviewVisibility(false));
        return;
    }

    if (syncViewsIds.length > 0) {
        await sendInfoCenterMessage({
            title: { key: 'ADP_SYNC_VIEWS_TITLE' },
            description: { key: 'ADP_SYNC_VIEWS_MESSAGE' },
            type: MessageBarType.warning
        });
    }

    log.debug('ADP init executed.');
}
