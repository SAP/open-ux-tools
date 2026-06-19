import type { AdpMetadataInput } from '../types/index.js';
import { readAnnotationfromManifest } from './functionalities/manifest-changes/manifestContext.js';
/**
 * Reads the OData metadata for the specified ADP (Application Development Platform) project.
 *
 * @param params - Input parameters for reading OData metadata.
 * @returns A promise resolving to an array of OData metadata.
 */
export async function readODataMetadataAdp(params: AdpMetadataInput): Promise<Array<any>> {
    const metadataMap = await readAnnotationfromManifest(params.appPath, params.saveLocal);
    return Array.from(metadataMap.values());
}
