import type { ExecuteFunctionalityOutput } from '../../types';
import { ADP_CONTROLLER_EXTENSION_FUNCTIONALITY_ID } from '../../constant';

/**
 * Statuses surfaced by the `adp_controller_extension` tool.
 */
export type AdpControllerExtensionStatus = 'success' | 'error' | 'info' | 'skipped';

/**
 * Builds an {@link ExecuteFunctionalityOutput} envelope for the
 * `adp_controller_extension` tool. Centralised so every code path produces an
 * identically shaped response and the functionality id is set in one place.
 *
 * @param status Outcome of the call.
 * @param message Human-readable message returned to the caller.
 * @param appPath Adaptation project root, echoed back for the caller.
 * @param parameters Subset of input parameters to echo back. Pass `{}` when
 * the call short-circuited before parameters were validated.
 * @param changes File-system changes performed during the call.
 * @returns Tool output envelope.
 */
export function buildOutput(
    status: AdpControllerExtensionStatus,
    message: string,
    appPath: string,
    parameters: Record<string, unknown> = {},
    changes: string[] = []
): ExecuteFunctionalityOutput {
    return {
        functionalityId: ADP_CONTROLLER_EXTENSION_FUNCTIONALITY_ID,
        status,
        message,
        parameters,
        appPath,
        changes,
        timestamp: new Date().toISOString()
    };
}
