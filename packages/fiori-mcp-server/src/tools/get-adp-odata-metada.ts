import type { AdpMetadataInput } from '../types';
import { readODataMetadataFromManifest } from './functionalities/manifest-context/manifestContext';
/**
 * Reads the OData metadata for the specified ADP (Application Development Platform) project.
 *
 * @param params - Input parameters for reading OData metadata.
 * @returns A promise resolving to an array of OData metadata entries.
 */
export async function readODataMetadataAdp(params: AdpMetadataInput): Promise<Array<unknown>> {
    return readODataMetadataFromManifest(params.appPath, params.saveLocal);
}
