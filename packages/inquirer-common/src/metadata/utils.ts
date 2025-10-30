import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import { t } from '../i18n';

export interface EdmxConversionResult {
    convertedMetadata: ConvertedMetadata;
    odataVersion: OdataVersion;
}

/**
 * Internal function that performs the core EDMX conversion with comprehensive error handling.
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
function convertEdmxInternal(edmx: string): EdmxConversionResult {
    try {
        const convertedMetadata = convert(parse(edmx));
        const parsedOdataVersion = Number.parseInt(convertedMetadata?.version, 10);

        // Handle unparseable OData version - this will prevent generator crashes
        if (Number.isNaN(parsedOdataVersion)) {
            throw new Error(t('errors.unparseableOdataVersion'));
        }

        // Note that OData version > 4 (e.g., 4.1) is not currently supported by @sap-ux/edmx-converter
        // For now, we treat any version >= 4 as v4, but this could be enhanced in the future
        const odataVersion = parsedOdataVersion >= 4 ? OdataVersion.v4 : OdataVersion.v2;

        return {
            convertedMetadata,
            odataVersion
        };
    } catch (error) {
        // Provide specific error message for OData version parsing issues
        if (error instanceof Error && error.message.includes('errors.unparseableOdataVersion')) {
            throw error; // Re-throw the specific version error
        }
        // Wrap all other errors with general metadata parsing error
        throw new Error(t('errors.unparseableMetadata', { error: (error as Error).message }));
    }
}

/**
 * Converts an EDMX string to a ConvertedMetadata object.
 * This function provides backward compatibility and focuses on metadata conversion only.
 *
 * @param edmx - The EDMX string to convert.
 * @returns The converted metadata object.
 * @throws Error with descriptive message if EDMX cannot be parsed or OData version is unparseable.
 */
export function convertEdmxToConvertedMetadata(edmx: string): ConvertedMetadata {
    const result = convertEdmxInternal(edmx);
    return result.convertedMetadata;
}

/**
 * Converts EDMX string to converted metadata with OData version information.
 * This function provides the full conversion result including version detection.
 *
 * @param edmx - The EDMX string to convert
 * @returns Object containing the converted metadata and OData version
 * @throws Error with descriptive message if EDMX cannot be parsed or OData version is unparseable.
 */
export function convertEdmxWithVersion(edmx: string): EdmxConversionResult {
    return convertEdmxInternal(edmx);
}
