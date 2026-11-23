import { getService } from '../index.js';
import type { BackendSystem, BackendSystemKey } from '../entities/backend-system.js';

/**
 * Check if a system name already exists in the store.
 * Performs case-insensitive comparison with trimming.
 * Checks all systems with supported connection types (abap_catalog, odata_service, generic_host)
 * to ensure global uniqueness across all system types.
 *
 * @param systemName - The system name to check
 * @returns true if name already exists, false otherwise
 * @throws {Error} if unable to check the store
 */
export async function isSystemNameInUse(systemName: string): Promise<boolean> {
    const service = await getService<BackendSystem, BackendSystemKey>({
        entityName: 'system'
    });
    const allSystems = await service.getAll({
        includeSensitiveData: false,
        backendSystemFilter: { connectionType: ['abap_catalog', 'odata_service', 'generic_host'] }
    });

    const trimmedName = systemName.trim().toLowerCase();
    return allSystems.some((system: BackendSystem) => system.name.toLowerCase() === trimmedName);
}
