import log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import {
    showMessage,
    enableTelemetry,
    showInfoCenterMessage,
    MessageBarType
} from '@sap-ux-private/control-property-editor-common';

import { getUi5Version, getUI5VersionValidationMessage, isLowerThanMinimalUi5Version } from '../utils/version';

import { CommunicationService } from '../cpe/communication-service';
import init from '../cpe/init';
import { getApplicationType } from '../utils/application';
import { getTextBundle } from '../i18n';

import { getAllSyncViewsIds } from './utils';
import { initDialogs } from './init-dialogs';
import { checkAllMetadata } from './metadata-checker';
import { loadDefinitions } from './quick-actions/load';

export default async function (rta: RuntimeAuthoring) {
    const flexSettings = rta.getFlexSettings();
    if (flexSettings.telemetry === true) {
        enableTelemetry();
    }

    const ui5VersionInfo = await getUi5Version();
    const syncViewsIds = await getAllSyncViewsIds(ui5VersionInfo);
    initDialogs(rta, syncViewsIds, ui5VersionInfo);

    if (!isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 78 })) {
        const ExtensionPointService = (await import('open/ux/preview/client/adp/extension-point')).default;
        const extPointService = new ExtensionPointService(rta);
        extPointService.init();
    }

    const applicationType = getApplicationType(rta.getRootControlInstance().getManifest());
    const quickActionRegistries = await loadDefinitions(applicationType);

    await init(rta, quickActionRegistries);

    void checkAllMetadata();

    if (isLowerThanMinimalUi5Version(ui5VersionInfo)) {
        CommunicationService.sendAction(
            showMessage({ message: getUI5VersionValidationMessage(ui5VersionInfo), shouldHideIframe: true })
        );
        CommunicationService.sendAction(
            showInfoCenterMessage({
                message: {
                    title: 'UI5 Validation message',
                    description: getUI5VersionValidationMessage(ui5VersionInfo)
                },
                type: MessageBarType.info
            })
        );
        return;
    }

    if (syncViewsIds.length > 0) {
        const bundle = await getTextBundle();
        CommunicationService.sendAction(
            showMessage({
                message: bundle.getText('ADP_SYNC_VIEWS_MESSAGE'),
                shouldHideIframe: false
            })
        );
        CommunicationService.sendAction(
            showInfoCenterMessage({
                message: {
                    title: 'Synchronous views are detected',
                    description: bundle.getText('ADP_SYNC_VIEWS_MESSAGE')
                },
                type: MessageBarType.info
            })
        );
    }

    log.debug('ADP init executed.');
}
