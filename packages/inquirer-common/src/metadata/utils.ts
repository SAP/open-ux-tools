import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { t } from '../i18n';

export interface EdmxConversionResult {
    convertedMetadata: ConvertedMetadata;
    odataVersion: OdataVersion;
}

/**
 * Converts an EDMX string to a ConvertedMetadata object.
 *
 * @param edmx - The EDMX string to convert.
 * @returns The converted metadata object.
 * @throws If the EDMX cannot be parsed or the OData version is unparseable.
 */
export function convertEdmxToConvertedMetadata(edmx: string): ConvertedMetadata {
    try {
        const convertedMetadata = convert(parse(edmx));
        const parsedOdataVersion = Number.parseInt(convertedMetadata?.version, 10);
        if (Number.isNaN(parsedOdataVersion)) {
            throw new Error(t('errors.unparseableOdataVersion'));
        }
        return convertedMetadata;
    } catch (error) {
        throw new Error(t('errors.unparseableMetadata', { error: (error as Error).message }));
    }
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
    try {
        const convertedMetadata = convert(parse(edmx));

        // Handle cases where version might be missing or unparseable
        if (!convertedMetadata?.version) {
            throw new Error(t('errors.unparseableOdataVersion'));
        }

        const parsedOdataVersion = Number.parseInt(convertedMetadata.version, 10);

        // When unparseable version is encountered (e.g., version="invalid", version="", etc.)
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
        // Provide specific error context for debugging
        const errorMessage = (error as Error).message;
        throw new Error(t('errors.unparseableMetadata', { error: errorMessage }));
    }
}
