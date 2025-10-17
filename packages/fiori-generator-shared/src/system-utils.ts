import { t } from './i18n';
import type { BackendSystem } from '@sap-ux/store';

/**
 * Creates and returns a display name for the system, appending the system type and user display name if available.
 *
 * @param system the backend system to create a display name for
 * @returns the display name for the system
 */
export function getBackendSystemDisplayName(system: BackendSystem): string {
    const systemTypeName = getSystemDisplayName(system.name, system.userDisplayName, system.systemType);
    return systemTypeName;
}

/**
 * Get the system display name.
 *
 * @param systemName - system name
 * @param displayUsername - display username
 * @param systemType - Backend system type (as string) or undefined
 * @returns system display name
 */
export function getSystemDisplayName(systemName: string, displayUsername?: string, systemType?: string): string {
    const userDisplayName = displayUsername ? ` [${displayUsername}]` : '';
    return `${systemName}${getSystemTypeLabel(systemType)}${userDisplayName}`;
}

/**
 * Returns the formatted system type name for the given backend system.
 *
 * @param systemType the system type to get the parenthesised name for
 * @returns system type name formatted as a string, e.g. " (ABAP Cloud)".
 */
function getSystemTypeLabel(systemType?: string): string {
    let systemTypeName = ''; // for on prem we do not show the system type
    const abapCloudLabel = ` (${t('texts.systemTypeLabel.abapCloud')})`;
    // Legacy store system types will now display as ABAP Cloud
    if (systemType === 'AbapCloud' || systemType === 'S4HC' || systemType === 'BTP') {
        systemTypeName = abapCloudLabel;
    }
    return systemTypeName;
}
