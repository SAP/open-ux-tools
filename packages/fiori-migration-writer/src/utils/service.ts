import { fileExists } from './file-access.js';
import { createMemFsEditor } from './fs-adapter.js';
import type { Manifest } from '../project-spec-types.js';
import type { Editor } from 'mem-fs-editor';
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
    manifestJSON?: Manifest | undefined,
    fsEditor?: Editor
): Promise<{ config: boolean; fileExists: boolean }> {
    const fs = fsEditor ?? createMemFsEditor();
    if (!manifestJSON) {
        return { config: false, fileExists: false };
    }

    // SAP apps with no datasources are considered valid
    if (!manifestJSON['sap.app']?.dataSources && isSAPApp) {
        return { config: true, fileExists: true };
    }

    // Validate datasources if they exist
    if (manifestJSON['sap.app']?.dataSources) {
        return validateDataSources(fs, manifestJSON['sap.app'].dataSources, rootPath, webappPath);
    }

    return { config: false, fileExists: false };
}

/**
 * Validate OData datasources in manifest
 * Preserves last-wins behavior: if multiple datasources have localUri,
 * the result reflects the last one processed
 *
 * @param fs
 * @param dataSources
 * @param rootPath
 * @param webappPath
 */
function validateDataSources(
    fs: Editor,
    dataSources: Record<string, any>,
    rootPath: string,
    webappPath: string
): { config: boolean; fileExists: boolean } {
    const datasourceKeys = Object.keys(dataSources);
    let metadataValidation = { config: false, fileExists: false };

    // Check datasources sequentially - stops at first valid metadata file found
    for (const datasourceKey of datasourceKeys) {
        const datasource = dataSources[datasourceKey];

        // Check OData datasources or datasources without explicit type
        if (datasource.type === 'OData' || datasource.type === undefined) {
            const result = checkLocalMetadata(fs, datasource, rootPath, webappPath);
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
 * @param fs
 * @param datasource
 * @param rootPath
 * @param webappPath
 */
function checkLocalMetadata(
    fs: Editor,
    datasource: any,
    rootPath: string,
    webappPath: string
): { config: boolean; fileExists: boolean } {
    if (!datasource.settings?.localUri) {
        return { config: false, fileExists: false };
    }

    const metadataPath = join(rootPath, webappPath, datasource.settings.localUri);
    const exists = fileExists(fs, metadataPath);

    return {
        config: true,
        fileExists: exists
    };
}
