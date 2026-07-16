import { getService } from '@sap-ux/store';
import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';

/**
 * Check if a system name already exists in the store.
 * Performs case-insensitive comparison with trimming.
 *
 * @param systemName - The system name to check
 * @param excludeSystem - Optional system to exclude from check (for updates)
 * @returns true if name is already taken, false otherwise
 * @throws Error if unable to check the store (caller should handle appropriately)
 */
export async function isSystemNameTaken(systemName: string, excludeSystem?: BackendSystem): Promise<boolean> {
    const service = await getService<BackendSystem, BackendSystemKey>({
        entityName: 'system'
    });
    const allSystems = await service.getAll();

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
