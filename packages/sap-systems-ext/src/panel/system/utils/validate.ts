import type { BackendSystem } from '@sap-ux/store';
import { getBackendSystemService, t } from '../../../utils';

/**
 * Validates the provided system information.
 * Currently only checks that a URL is provided.
 *
 * @param input - system information to validate
 * @returns true if valid, otherwise a string with the validation error message
 */
export function validateSystemInfo(input: BackendSystem): boolean | string {
    if (!input.url) {
        return t('validation.provideUrl');
    }
    return true;
}

/**
 * Validates that the provided system name is unique in the store (case insensitive).
 *
 * @param newName - the new name to validate
 * @param currentName - the name of the system when the panel was opened
 * @returns - true if the new name is valid
 * @throws error if the new name already exists in the store (and is not the current name)
 */
export async function validateSystemName(newName: string, currentName?: string): Promise<true> {
    const systemService = await getBackendSystemService();
    const allSystems = await systemService.getAll({ includeSensitiveData: false });
    const newSystemName = newName.trim();

    const nameExists = allSystems.some(
        (sys) => sys.name.toLowerCase() === newSystemName.toLowerCase() && sys.name !== currentName
    );

    if (nameExists) {
        throw t('validation.systemNameExists');
    }

    return true;
}

/**
 * Validates that the provided URL is valid and only contains the origin (protocol, hostname, and optional port).
 * This is to ensure that system entries are consistent and to prevent issues with trailing paths when connecting to the system.
 *
 * @param url - the URL to validate
 * @returns true if the URL is valid, otherwise throws an error
 */
export function validateSystemUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        throw t('validation.systemUrlInvalid', { url });
    }
}
