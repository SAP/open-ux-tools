import Log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import {
    appLoaded,
    enableTelemetry,
    iconsLoaded,
    MessageBarType
} from '@sap-ux-private/control-property-editor-common';

import { getError } from '../utils/error.js';
import { ChangeService } from './changes/service.js';
import { CommunicationService } from './communication-service.js';
import { WorkspaceConnectorService } from './connector-service.js';
import { ContextMenuService } from './context-menu-service.js';
import { loadDefaultLibraries } from './documentation.js';
import { OutlineService } from './outline/service.js';
import { QuickActionService } from './quick-actions/quick-action-service.js';
import type { QuickActionDefinitionRegistry } from './quick-actions/registry.js';
import { RtaService } from './rta-service.js';
import { SelectionService } from './selection.js';
import type { ActionHandler, Service } from './types.js';
import { getIcons } from './ui5-utils.js';
import { ODataHealthChecker } from './odata-health/odata-health-checker.js';
import { sendInfoCenterMessage } from '../utils/info-center-message.js';
import { ODataUpStatus } from './odata-health/odata-health-status.js';

/**
 * Subscribes a handler to the CommunicationService
 *
 * @param handler action handler
 */
function subscribe(handler: ActionHandler): void {
    CommunicationService.subscribe(handler);
}

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
            healthStatus.map((status) =>
                status instanceof ODataUpStatus
                    ? Promise.resolve()
                    : sendInfoCenterMessage({
                          title: { key: 'ADP_ODATA_HEALTH_CHECK_TITLE' },
                          description: {
                              key: 'ADP_ODATA_SERVICE_DOWN_DESCRIPTION',
                              params: [status.serviceUrl, status.errorMessage]
                          },
                          type: MessageBarType.warning
                      })
            )
        )
        .catch((error) =>
            sendInfoCenterMessage({
                title: { key: 'ADP_ODATA_HEALTH_CHECK_TITLE' },
                description: getError(error).message,
                type: MessageBarType.warning
            })
        );

    try {
        loadDefaultLibraries();
        const allPromises = services.map((service) => {
            return service.init(CommunicationService.sendAction, subscribe)?.catch((error) => {
                Log.error('Service Initialization Failed: ', getError(error));
            });
        }).filter((p): p is Promise<void> => p !== undefined);
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
