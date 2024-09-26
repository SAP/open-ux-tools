import Log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import {
    iconsLoaded,
    enableTelemetry,
    appLoaded
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

    const selectionService = new SelectionService(rta);

    const changesService = new ChangeService({ rta }, selectionService);
    const connectorService = new WorkspaceConnectorService();
    const rtaService = new RtaService(rta);
    const outlineService = new OutlineService(rta);
    const quickActionService = new QuickActionService(rta, outlineService, registries);
    const services: Service[] = [
        connectorService,
        selectionService,
        changesService,
        outlineService,
        rtaService,
        quickActionService
    ];

    try {
        loadDefaultLibraries();

        for (const service of services) {
            service
                .init(CommunicationService.sendAction, subscribe)
                ?.catch((reason) => Log.error('Service Initialization Failed: ', getError(reason)));
        }

        const icons = getIcons();

        CommunicationService.sendAction(iconsLoaded(icons));
        CommunicationService.sendAction(appLoaded());
    } catch (error) {
        Log.error('Error during initialization of Control Property Editor', getError(error));
    }
    return Promise.resolve();
}
