import type { StoredSystemViewNode, SystemCommandContext } from '../../types/system';
import type { PanelManager, SystemPanel } from '../../panel';
import { BackendSystemKey, type BackendSystem } from '@sap-ux/store';
import { window } from 'vscode';
import { t, confirmPrompt, TelemetryHelper, geti18nOpts, getBackendSystemService } from '../../utils';
import { ConfirmationPromptType, SYSTEMS_EVENT, SystemAction, SystemActionStatus } from '../../utils/constants';

/**
 * Returns a command handler function that deletes a specified system.
 *
 * @param context - the system command context
 * @returns - a command handler function
 */
export const deleteSystemCommandHandler =
    (context: SystemCommandContext) =>
    async (system: StoredSystemViewNode): Promise<void> => {
        const backendSystemKey = new BackendSystemKey({ url: system.url, client: system.client });
        const systemService = await getBackendSystemService();
        const backendSystem = await systemService.read(backendSystemKey);

        if (!backendSystem) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            window.showErrorMessage(t('error.systemNotFound', { backendKey: backendSystemKey.getId() }));
            return;
        }

        if (!(await confirmPrompt(ConfirmationPromptType.Delete, backendSystem.name))) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            window.showWarningMessage(t('warn.deletionCancelled', { system: backendSystem.name }));
            return;
        }

        const isDeleted = await systemService.delete(backendSystem);
        if (isDeleted) {
            deletionSuccessHandler(context.panelManager, backendSystemKey.getId(), backendSystem);
        } else {
            deletionFailureHandler(backendSystem);
        }
    };

/**
 * Handles successful system deletion.
 *
 * @param panelManager - the panel manager to manage system panels
 * @param panelKey - the key of the panel to be deleted
 * @param backendSystem - the backend system that was deleted
 */
function deletionSuccessHandler(
    panelManager: PanelManager<SystemPanel>,
    panelKey: string,
    backendSystem: BackendSystem
): void {
    panelManager.deleteAndDispose(panelKey);
    logTelemetry(SystemActionStatus.DELETED_SUCCESS, backendSystem.systemType);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    window.showInformationMessage(t('info.systemDeleted', geti18nOpts(backendSystem.name)));
}

/**
 * Handles failed system deletion.
 *
 * @param system - the backend system that failed to be deleted
 */
function deletionFailureHandler(system: BackendSystem): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    window.showWarningMessage(t('error.deletingSystem', geti18nOpts(system.name)));
    logTelemetry(SystemActionStatus.DELETED_FAIL, system.systemType);
}

/**
 * Call telemetry logger for system deletion actions.
 *
 * @param status - the status of the action (success or failure)
 * @param systemType - the type of the system (optional)
 */
function logTelemetry(status: SystemActionStatus, systemType = ''): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    TelemetryHelper.sendTelemetry(SYSTEMS_EVENT, {
        action: SystemAction.SYSTEM,
        status,
        systemType
    });
}
