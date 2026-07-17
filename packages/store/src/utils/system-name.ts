import { getService } from '../index.js';
import type { BackendSystem, BackendSystemKey } from '../entities/backend-system.js';

/**
 * Check if a system name already exists in the store.
 * Performs case-insensitive comparison with trimming.
 * Checks ALL systems globally for uniqueness (no connection type filtering).
 *
 * @param systemName - The system name to check
 * @returns true if name already exists, false otherwise
 * @throws {Error} if unable to check the store
 */
export async function isSystemNameInUse(systemName: string): Promise<boolean> {
    const service = await getService<BackendSystem, BackendSystemKey>({
        entityName: 'system'
    });
    const allSystems = await service.getAll();

    const trimmedName = systemName.trim().toLowerCase();
    return allSystems.some((system: BackendSystem) => system.name.toLowerCase() === trimmedName);
}
