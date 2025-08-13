import Log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import {
    iconsLoaded,
    enableTelemetry,
    appLoaded,
    MessageBarType
} from '@sap-ux-private/control-property-editor-common';

import type { ActionHandler, Service } from './types';
import { OutlineService } from './outline/service';
import { SelectionService } from './selection';
import { ChangeService } from './changes/service';
import { loadDefaultLibraries } from './documentation';
import { getIcons } from './ui5-utils';
import { WorkspaceConnectorService } from './connector-service';
import { RtaService } from './rta-service';
import { getError } from '../utils/error';
import { QuickActionService } from './quick-actions/quick-action-service';
import type { QuickActionDefinitionRegistry } from './quick-actions/registry';
import { CommunicationService } from './communication-service';
import { ContextMenuService } from './context-menu-service';
import { sendInfoCenterMessage } from '../utils/info-center-message';

export default function init(
    rta: RuntimeAuthoring,
    registries: QuickActionDefinitionRegistry<string>[] = []
): Promise<void> {
    Log.info('Initializing Control Property Editor');

    // enable telemetry if requested
    const flexSettings = rta.getFlexSettings();
    if (flexSettings.telemetry === true) {
        enableTelemetry();
    }

    /**
     *
     * @param handler action handler
     */
    function subscribe(handler: ActionHandler): void {
        CommunicationService.subscribe(handler);
    }

    const rtaService = new RtaService(rta);

    const changesService = new ChangeService({ rta });
    const selectionService = new SelectionService(rta, changesService);
    const connectorService = new WorkspaceConnectorService();
    const contextMenuService = new ContextMenuService(rta);
    const outlineService = new OutlineService(rta, changesService);
    const quickActionService = new QuickActionService(rta, outlineService, registries, changesService);
    const services: Service[] = [
        connectorService,
        selectionService,
        changesService,
        contextMenuService,
        outlineService,
        rtaService,
        quickActionService
    ];

    try {
        loadDefaultLibraries();
        const allPromises = services.map((service) => {
            return service.init(CommunicationService.sendAction, subscribe)?.catch((error) => {
                const extendedError = getError(error);
                Log.error('Service Initialization Failed: ', extendedError);
                return sendInfoCenterMessage({
                    title: { key: 'INIT_ERROR_TITLE' },
                    description: extendedError.message,
                    type: MessageBarType.error
                });
            });
        });
        Promise.all(allPromises)
            .then(() => {
                CommunicationService.sendAction(appLoaded());
            })
            // eslint-disable-next-line @typescript-eslint/unbound-method
            .catch((error) => {
                Log.error(error);
                return sendInfoCenterMessage({
                    title: { key: 'INIT_ERROR_TITLE' },
                    description: getError(error).message,
                    type: MessageBarType.error
                });
            });
        const icons = getIcons();
        CommunicationService.sendAction(iconsLoaded(icons));
    } catch (error) {
        const extendedError = getError(error);
        Log.error('Error during initialization of Control Property Editor', extendedError);
        void sendInfoCenterMessage({
            title: { key: 'INIT_ERROR_TITLE' },
            description: extendedError.message,
            type: MessageBarType.error
        });
    }

    //  * This is returned immediately to avoid promise deadlock, preventing services from waiting indefinitely.
    return Promise.resolve();
}
