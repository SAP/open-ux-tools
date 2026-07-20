import type { AdpMetadataInput } from '../types/input.js';
import type { ODataMetadataEntry } from '../tools/functionalities/manifest-context/index.js';
import { readODataMetadataFromManifest } from './functionalities/manifest-context/index.js';
/**
 * Reads the OData metadata for the specified ADP (Adaptation project).
 *
 * @param params - Input parameters for reading OData metadata.
 * @returns A promise resolving to an array of OData metadata entries.
 */
export async function readODataMetadataAdp(params: AdpMetadataInput): Promise<ODataMetadataEntry[]> {
    return readODataMetadataFromManifest(params.appPath, params.saveLocal);
}
