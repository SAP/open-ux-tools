import Log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import {
    appLoaded,
    enableTelemetry,
    iconsLoaded,
    MessageBarType
} from '@sap-ux-private/control-property-editor-common';

import { getError } from '../utils/error';
import { ChangeService } from './changes/service';
import { CommunicationService } from './communication-service';
import { WorkspaceConnectorService } from './connector-service';
import { ContextMenuService } from './context-menu-service';
import { loadDefaultLibraries } from './documentation';
import { OutlineService } from './outline/service';
import { QuickActionService } from './quick-actions/quick-action-service';
import type { QuickActionDefinitionRegistry } from './quick-actions/registry';
import { RtaService } from './rta-service';
import { SelectionService } from './selection';
import type { ActionHandler, Service } from './types';
import { getIcons } from './ui5-utils';
import { ODataHealthChecker } from './odata-health/odata-health-checker';
import { sendInfoCenterMessage } from '../utils/info-center-message';
import { isODataServiceHealthy } from './odata-health/odata-health-status';

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

    // Do health check to all available oData service instances.
    const oDataHealthChecker = new ODataHealthChecker(rta);
    oDataHealthChecker
        .getHealthStatus()
        .then((healthStatus) =>
            healthStatus.map((status) => {
                const isServiceHealthy = isODataServiceHealthy(status);
                return sendInfoCenterMessage({
                    title: { key: 'ADP_ODATA_HEALTH_CHECK_TITLE' },
                    description: isServiceHealthy
                        ? { key: 'ADP_ODATA_SERVICE_UP_DESCRIPTION', params: [status.serviceUrl] }
                        : {
                              key: 'ADP_ODATA_SERVICE_DOWN_DESCRIPTION',
                              params: [status.serviceUrl, status.errorMessage]
                          },
                    type: isServiceHealthy ? MessageBarType.info : MessageBarType.error
                });
            })
        )
        .catch((error) =>
            sendInfoCenterMessage({
                title: { key: 'ADP_ODATA_HEALTH_CHECK_TITLE' },
                description: getError(error).message,
                type: MessageBarType.error
            })
        );

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
