import Log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { iconsLoaded, enableTelemetry, appLoaded } from '@sap-ux-private/control-property-editor-common';

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
                Log.error('Service Initialization Failed: ', getError(error));
            });
        });
        Promise.all(allPromises)
            .then(() => {
                CommunicationService.sendAction(appLoaded());
            })
            // eslint-disable-next-line @typescript-eslint/unbound-method
            .catch(Log.error);
        const icons = getIcons();
        CommunicationService.sendAction(iconsLoaded(icons));
    } catch (error) {
        Log.error('Error during initialization of Control Property Editor', getError(error));
    }

    //  * This is returned immediately to avoid promise deadlock, preventing services from waiting indefinitely.
    return Promise.resolve();
}
