import type { StoredSystemViewNode, SystemCommandContext } from '../../types/system';
import { commands, window } from 'vscode';
import { TelemetryHelper, getBackendSystemService, t } from '../../utils';
import {
    fioriToolsAppModAppGenLaunchCmd,
    launchAppGenCmdType,
    SystemAction,
    SystemActionStatus,
    SYSTEMS_EVENT
} from '../../utils/constants';
import { BackendSystemKey } from '@sap-ux/store';
import SystemsLogger from '../../utils/logger';

/**
 * Returns a command handler function that launches the Fiori Application Generator for a specified system.
 *
 * @param _context - the system command context (unused)
 * @returns - a command handler function
 */
export const launchAppGenCommandHandler =
    (_context: SystemCommandContext) =>
    async (system: StoredSystemViewNode): Promise<void> => {
        if (system.url) {
            const systemService = await getBackendSystemService();
            const backendSystem = await systemService.read(
                new BackendSystemKey({ url: system.url, client: system.client })
            );
            try {
                await commands.executeCommand(fioriToolsAppModAppGenLaunchCmd, {
                    type: launchAppGenCmdType,
                    systemName: backendSystem?.name
                });
                logTelemetry(SystemActionStatus.LAUNCH_FIORI_GEN_SUCCESS);
            } catch (e) {
                const error = e instanceof Error ? e.message : e;
                errorHandler(error, backendSystem?.name);
                logTelemetry(SystemActionStatus.LAUNCH_FIORI_GEN_FAIL);
            }
        }
    };

/**
 * Sends telemetry for successful launch of the Fiori Application Generator.
 *
 * @param status - the status of the launch action
 */
function logTelemetry(status: SystemActionStatus): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    TelemetryHelper.sendTelemetry(SYSTEMS_EVENT, {
        action: SystemAction.SYSTEM,
        status
    });
}

/**
 * Handles logging and sending telemetry for error encountered.
 *
 * @param error - the error message
 * @param systemName - the name of the system
 */
function errorHandler(error: string, systemName = 'unknown'): void {
    const errorMsg = t('error.launchAppGen', {
        interpolation: { escapeValue: false },
        systemName
    });

    SystemsLogger.logger.debug(error);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    window.showErrorMessage(errorMsg);
}
