import log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type RTAOutlineService from 'sap/ui/rta/command/OutlineService';

import {
    enableTelemetry,
    MessageBarType,
    toggleAppPreviewVisibility
} from '@sap-ux-private/control-property-editor-common';

import {
    getFullyQualifiedUi5Version,
    getUi5Version,
    isLowerThanMinimalUi5Version,
    minVersionInfo
} from '../utils/version';

import init from '../cpe/init';
import { updateSyncViewsIds, showSyncViewsWarning } from './sync-views-utils';
import { getApplicationType } from '../utils/application';

import { loadDefinitions } from './quick-actions/load';
import { initDialogs } from './init-dialogs';
import { sendInfoCenterMessage } from '../utils/info-center-message';
import { CommunicationService } from '../cpe/communication-service';

export default async function (rta: RuntimeAuthoring) {
    const flexSettings = rta.getFlexSettings();
    if (flexSettings.telemetry === true) {
        enableTelemetry();
    }

    const ui5VersionInfo = await getUi5Version();

    // Plugins need to be set before adding additional plugins to prevent overriding with the default
    // and allow usage of getPlugins later in the flow
    const defaultPlugins = rta.getDefaultPlugins();
    rta.setPlugins(defaultPlugins);

    if (isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 136, patch: 2 })) {
        await initDialogs(rta, ui5VersionInfo);
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

    // Register synchronious views detection and warning
    // This is not awaited to prevent deadlock in the initialization
    rta.getService<RTAOutlineService>('outline')
        .then((outlineService) => {
            outlineService.attachEvent('update', async () => {
                await updateSyncViewsIds(ui5VersionInfo);
                await showSyncViewsWarning();
            });
        })
        .catch((error) => {
            log.error('Failed to attach update event to outline service', error);
        });

    if (isLowerThanMinimalUi5Version(ui5VersionInfo)) {
        await sendInfoCenterMessage({
            title: { key: 'FLP_UI5_VERSION_WARNING_TITLE' },
            description: {
                key: 'FLP_UI5_VERSION_WARNING_DESCRIPTION',
                params: [getFullyQualifiedUi5Version(ui5VersionInfo), getFullyQualifiedUi5Version(minVersionInfo)]
            },
            type: MessageBarType.error
        });
        CommunicationService.sendAction(toggleAppPreviewVisibility(false));
        return;
    }

    log.debug('ADP init executed.');
}
