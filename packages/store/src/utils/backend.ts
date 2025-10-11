import type { BackendSystem } from '../entities/backend-system';

export type SystemType = 'OnPrem' | 'AbapCloud' | undefined;

/**
 * Determines the backend system type based on the authentication type and service keys (defaults to OnPrem).
 *
 * @param system - the backend system to determine the type for.
 * @returns - the system type
 */
export function getBackendSystemType(system: BackendSystem): SystemType {
    let backendSystemType: SystemType;
    if (system.authenticationType === 'reentranceTicket') {
        backendSystemType = 'AbapCloud';
    } else if (system.serviceKeys) {
        /** @deprecated Basing the system type on the auth method is no longer supported since service key support removal */
        backendSystemType = 'AbapCloud';
    } else if (system.authenticationType === 'basic' || system.username) {
        backendSystemType = 'OnPrem';
    }
    return backendSystemType;
}
