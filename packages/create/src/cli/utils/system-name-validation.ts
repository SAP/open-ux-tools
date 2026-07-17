import { getService } from '@sap-ux/store';
import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';

/**
 * Options for checking system name uniqueness
 */
export interface SystemNameValidationOptions {
    /**
     * Optional system to exclude from check (for update operations).
     * When updating a system, we need to allow it to keep its own name,
     * so we exclude the current system from the uniqueness check.
     */
    excludeSystem?: BackendSystem;
}

/**
 * Check if a system name already exists in the store.
 * Performs case-insensitive comparison with trimming.
 * Checks ALL systems globally for uniqueness to avoid confusing duplicate names.
 *
 * @param systemName - The system name to check
 * @param options - Optional configuration
 * @returns true if name already exists, false otherwise
 * @throws {Error} if unable to check the store (caller should handle appropriately)
 */
export async function systemNameExists(systemName: string, options?: SystemNameValidationOptions): Promise<boolean> {
    const { excludeSystem } = options ?? {};

    const service = await getService<BackendSystem, BackendSystemKey>({
        entityName: 'system'
    });
    // Get ALL systems (no filtering) for global uniqueness
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
