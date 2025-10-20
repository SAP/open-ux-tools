import type { SystemConfigFile, PanelContext } from '../../../types/system';
import type { ExportSystem } from '@sap-ux/sap-systems-ext-types';
import { window, workspace } from 'vscode';
import { writeFileSync } from 'node:fs';
import { showFileSaveDialog } from '../utils';
import { getBackendSystem, geti18nOpts, TelemetryHelper, t } from '../../../utils';
import { SystemAction, SystemActionStatus, SYSTEMS_EVENT } from '../../../utils/constants';
import SystemsLogger from '../../../utils/logger';

/**
 * This action exports the details of a specified system to a JSON file.
 *
 * @param _context - the panel context (unused)
 * @param action - export system action containing the system to export
 */
export const exportSystem = async (_context: PanelContext, action: ExportSystem): Promise<void> => {
    const system = action.payload.system;
    const backendSystem = await getBackendSystem({ url: system.url, client: system.client });

    if (!backendSystem) {
        SystemsLogger.logger.error(t('error.systemNotFound', { systemName: system.name }));
        return;
    }

    try {
        const systemDetails: SystemConfigFile = {
            systems: [
                {
                    name: backendSystem.name,
                    url: backendSystem.url,
                    client: backendSystem.client
                }
            ]
        };
        const filePath = await showFileSaveDialog(backendSystem.name, workspace?.workspaceFolders);
        if (filePath?.fsPath) {
            const data = JSON.stringify(systemDetails, null, 2);
            writeFileSync(filePath.fsPath, data);
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            window.showInformationMessage(t('info.systemExported', geti18nOpts(backendSystem.name)));
            logTelemetry(SystemActionStatus.EXPORT_SUCCESS);
        }
    } catch (e) {
        const error = e instanceof Error ? e.message : e;
        const errorMsg = t('error.exportFailure', { error });
        errorHandler(errorMsg);
    }
};

/**
 * Handles the error.
 *
 * @param errorMsg - the error message to display and log
 */
function errorHandler(errorMsg: string): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    window.showErrorMessage(errorMsg);
    SystemsLogger.logger.error(errorMsg);
    logTelemetry(SystemActionStatus.EXPORT_FAIL);
}

/**
 * Logs telemetry for the export action.
 *
 * @param status - the status of the export action
 */
function logTelemetry(status: SystemActionStatus): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    TelemetryHelper.sendTelemetry(SYSTEMS_EVENT, {
        action: SystemAction.SYSTEM,
        status
    });
}
