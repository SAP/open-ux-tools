import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { convertEdmxToConvertedMetadata } from './metadataHelpers';

export interface EdmxConversionResult {
    convertedMetadata: ConvertedMetadata;
    odataVersion: OdataVersion;
}

/**
 * Converts EDMX string to converted metadata with OData version information.
 * This centralized function handles all EDMX conversion scenarios including error handling
 * for unparseable versions and invalid EDMX content.
 *
 * @param edmx - The EDMX string to convert
 * @returns Object containing the converted metadata and OData version
 * @throws Error with descriptive message if:
 *   - EDMX cannot be parsed (invalid XML structure)
 *   - OData version is missing, null, undefined, or unparseable
 *   - Any other conversion error occurs
 */
export function convertEdmxWithVersion(edmx: string): EdmxConversionResult {
    const convertedMetadata = convertEdmxToConvertedMetadata(edmx);

    // Parse OData version to determine if it's v2 or v4
    const parsedOdataVersion = Number.parseInt(convertedMetadata.version, 10);

    // Note that OData version > 4 (e.g., 4.1) is not currently supported by @sap-ux/edmx-converter
    // For now, we treat any version >= 4 as v4, but this could be enhanced in the future
    const odataVersion = parsedOdataVersion >= 4 ? OdataVersion.v4 : OdataVersion.v2;

    return {
        convertedMetadata,
        odataVersion
    };
}
