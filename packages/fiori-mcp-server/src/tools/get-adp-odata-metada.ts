import type { ListFunctionalitiesInput } from '../types';
import { readAnnotationfromManifest } from './functionalities/manifest-changes/manifestContext';
/**
 * Reads the OData metadata for the specified ADP (Application Development Platform) project.
 *
 * @param params - Input parameters for reading OData metadata.
 * @returns A promise resolving to an array of OData metadata.
 */
export async function readODataMetadataAdp(params: ListFunctionalitiesInput): Promise<Array<any>> {
    const metadataMap = await readAnnotationfromManifest(params.appPath);
    return Array.from(metadataMap.values());
}
