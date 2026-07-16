import { getService } from '@sap-ux/store';
import type { BackendSystem, BackendSystemKey, ConnectionType } from '@sap-ux/store';

/**
 * Options for checking system name uniqueness
 */
export interface SystemNameValidationOptions {
    /** Optional system to exclude from check (for updates) */
    excludeSystem?: BackendSystem;
    /** Connection types to filter by (defaults to all 3 types) */
    connectionTypes?: ConnectionType[];
}

/**
 * Check if a system name already exists in the store.
 * Performs case-insensitive comparison with trimming.
 *
 * @param systemName - The system name to check
 * @param options - Optional configuration
 * @returns true if name is already taken, false otherwise
 * @throws Error if unable to check the store (caller should handle appropriately)
 */
export async function isSystemNameTaken(systemName: string, options?: SystemNameValidationOptions): Promise<boolean> {
    const { excludeSystem, connectionTypes = ['abap_catalog', 'odata_service', 'generic_host'] } = options || {};

    const service = await getService<BackendSystem, BackendSystemKey>({
        entityName: 'system'
    });
    const allSystems = await service.getAll({
        backendSystemFilter: {
            connectionType: connectionTypes
        }
    });

    return allSystems.some((system) => {
        const sameNameIgnoreCase = system.name.toLowerCase() === systemName.trim().toLowerCase();
        if (!sameNameIgnoreCase) {
            return false;
        }

        // Exclude current system when updating
        if (excludeSystem) {
            return !(system.url === excludeSystem.url && system.client === excludeSystem.client);
        }
        return true;
    });
}
