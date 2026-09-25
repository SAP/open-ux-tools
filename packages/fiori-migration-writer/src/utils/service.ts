import { fileExists } from './file-access.js';
import type { Manifest } from '../project-spec-types.js';
import { XMLValidator, XMLParser } from 'fast-xml-parser';
import { join } from 'node:path';

const options = {
    attributeNamePrefix: '',
    ignoreAttributes: false,
    ignoreNameSpace: true,
    parseAttributeValue: true,
    removeNSPrefix: true
};

export function xmlToJson(metadata: any): JSON | undefined {
    return XMLValidator.validate(metadata) ? new XMLParser(options).parse(metadata, true) : undefined;
}

export async function validateMetadata(
    rootPath: string,
    webappPath: string,
    isSAPApp?: boolean,
    manifestJSON?: Manifest | undefined
): Promise<{ config: boolean; fileExists: boolean }> {
    if (!manifestJSON) {
        return { config: false, fileExists: false };
    }

    // SAP apps with no datasources are considered valid
    if (!manifestJSON['sap.app']?.dataSources && isSAPApp) {
        return { config: true, fileExists: true };
    }

    // Validate datasources if they exist
    if (manifestJSON['sap.app']?.dataSources) {
        return validateDataSources(manifestJSON['sap.app'].dataSources, rootPath, webappPath);
    }

    return { config: false, fileExists: false };
}

/**
 * Validate OData datasources in manifest
 * Preserves last-wins behavior: if multiple datasources have localUri,
 * the result reflects the last one processed
 *
 * @param dataSources
 * @param rootPath
 * @param webappPath
 */
async function validateDataSources(
    dataSources: Record<string, any>,
    rootPath: string,
    webappPath: string
): Promise<{ config: boolean; fileExists: boolean }> {
    const datasourceKeys = Object.keys(dataSources);
    let metadataValidation = { config: false, fileExists: false };

    for (const datasourceKey of datasourceKeys) {
        const datasource = dataSources[datasourceKey];

        // Check OData datasources or datasources without explicit type
        if (datasource.type === 'OData' || datasource.type === undefined) {
            const result = await checkLocalMetadata(datasource, rootPath, webappPath);
            if (result.config) {
                metadataValidation = result;
            }
        }
    }

    return metadataValidation;
}

/**
 * Check if local metadata file exists for a datasource
 *
 * @param datasource
 * @param rootPath
 * @param webappPath
 */
async function checkLocalMetadata(
    datasource: any,
    rootPath: string,
    webappPath: string
): Promise<{ config: boolean; fileExists: boolean }> {
    if (!datasource.settings?.localUri) {
        return { config: false, fileExists: false };
    }

    const metadataPath = join(rootPath, webappPath, datasource.settings.localUri);
    const exists = await fileExists(metadataPath);

    return {
        config: true,
        fileExists: exists
    };
}
