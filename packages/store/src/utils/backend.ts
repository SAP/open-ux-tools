import type { BackendSystem } from '../entities/backend-system';

export type SystemType = 'OnPrem' | 'S4HC' | 'BTP' | undefined;

/**
 * Determines the backend system type based on the authentication type and service keys (defaults to OnPrem).
 *
 * @param system - the backend system to determine the type for.
 * @returns - the system type
 */
export function getBackendSystemType(system: BackendSystem): SystemType {
    let backendSystemType: SystemType;
    if (system.authenticationType === 'reentranceTicket') {
        backendSystemType = 'S4HC';
    } else if (system.serviceKeys) {
        backendSystemType = 'BTP';
    } else if (system.authenticationType === 'basic' || system.username) {
        backendSystemType = 'OnPrem';
    }
    return backendSystemType;
}
