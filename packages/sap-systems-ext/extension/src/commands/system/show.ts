import type { StoredSystemViewNode, SystemCommandContext } from '../../types/system';
import { BackendSystemKey, SystemService, type BackendSystem } from '@sap-ux/store';
import { window } from 'vscode';
import { SystemPanel } from '../../panel';
import { logTelemetryEvent, t } from '../../utils';
import { SystemAction, LaunchViewStatus, SystemPanelViewType, SYSTEMS_EVENT } from '../../utils/constants';
import SystemsLogger from '../../utils/logger';

/**
 * Returns a command handler function that shows the details of a specified system.
 *
 * @param context - the system command context
 * @returns - a command handler function
 */
export const showSystemsCommandHandler =
    (context: SystemCommandContext) =>
    async (system: StoredSystemViewNode, statusMsg?: string): Promise<void> => {
        try {
            if (!system.url) {
                throw new Error(t('error.urlMissing'));
            }
            const backendSystemKey = new BackendSystemKey({
                url: system.url,
                client: system.client
            });
            const backendService = new SystemService(SystemsLogger.logger);
            const storedBackendSystem = await backendService.read(backendSystemKey);

            if (!storedBackendSystem) {
                SystemsLogger.logger.error(`CIAN System not found: ${backendSystemKey.getId()}`);
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                window.showErrorMessage(t('error.systemNotFound', { backendKey: backendSystemKey.getId() }));
                return;
            }
            openSystemPanel(context, backendSystemKey, storedBackendSystem, statusMsg);
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            window.showErrorMessage(t('error.viewSystemDetails', { err }));
            logTelemetryFailure();
        }
    };

/**
 *  Opens a system panel for the specified backend system.
 *
 * @param context - the system command context
 * @param backendSystemKey - the backend system key
 * @param backendSystem - the backend system
 * @param systemStatusMessage - optional status message to display in the panel
 */
function openSystemPanel(
    context: SystemCommandContext,
    backendSystemKey: BackendSystemKey,
    backendSystem: BackendSystem,
    systemStatusMessage?: string
): void {
    const panelKey = backendSystemKey.getId();
    const { extContext, panelManager } = context;
    const panel = panelManager.getOrCreateNewPanel(
        panelKey,
        () =>
            new SystemPanel({
                extensionPath: extContext.extensionPath,
                systemPanelViewType: SystemPanelViewType.View,
                backendSystem,
                disposeCallback: () => panelManager.deleteAndDispose(panelKey),
                systemStatusMessage
            })
    );
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    panel.reveal();

    logTelemetryEvent(SYSTEMS_EVENT, {
        action: SystemAction.VIEW_LAUNCHED,
        status: LaunchViewStatus.SUCCEED
    });
}

/**
 * Logs telemetry for failed attempt to open system details panel.
 */
function logTelemetryFailure(): void {
    logTelemetryEvent(SYSTEMS_EVENT, {
        action: SystemAction.VIEW_LAUNCHED,
        status: LaunchViewStatus.FAILED
    });
}
