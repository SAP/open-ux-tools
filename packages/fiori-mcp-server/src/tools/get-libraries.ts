import type { ListFunctionalitiesInput } from '../types';
import { getAvailableLibraryFromSystem } from './functionalities/manifest-changes/manifestContext';

/**
 * Lists all available libraries from the specified SAP system.
 *
 * @param params - Input parameters for listing libraries.
 * @returns A promise resolving to an array of library objects.
 */
export async function listLibrariesFromSystem(params: ListFunctionalitiesInput): Promise<Array<object>> {
    const libraries = await getAvailableLibraryFromSystem(params.appPath);
    return libraries;
}
