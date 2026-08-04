import type { DownloadODataServiceMetadataInput, DownloadODataServiceMetadataOutput } from '../types/index.js';

import path from 'node:path';
import fs from 'node:fs';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import { getServiceMetadata, findSystem } from './services/sap-system.js';

const EMPTY_PARAMS: DownloadODataServiceMetadataOutput['parameters'] = {
    host: '',
    servicePath: '',
    metadataFilePath: ''
};

/**
 * Downloads OData service metadata from a SAP system and saves it as metadata.xml.
 *
 * @param params - Input parameters containing sapSystemQuery, servicePath and appPath.
 * @returns A promise resolving to the execution output with host, servicePath, client and metadataFilePath.
 */
export async function downloadODataServiceMetadata(
    params: DownloadODataServiceMetadataInput
): Promise<DownloadODataServiceMetadataOutput> {
    const sapSystemQuery = String(params.sapSystemQuery ?? '').trim();
    const servicePath = String(params.servicePath ?? '').trim();

    // Check if we're in AppStudio - if so, this tool should not be used
    // Service Center MCP should be used instead for BAS/Destination scenarios
    if (isAppStudio()) {
        return {
            status: 'Error',
            message:
                'This tool is not supported in SAP Business Application Studio. Please use the Service Center MCP server tool to retrieve service metadata when working with destinations.',
            parameters: EMPTY_PARAMS,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    if (!servicePath) {
        return {
            status: 'Error',
            message: 'Missing required parameter: servicePath must be provided',
            parameters: EMPTY_PARAMS,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    try {
        const findResult = await findSystem(sapSystemQuery || servicePath);
        if (!findResult.system) {
            return {
                status: 'Error',
                message: findResult.message ?? 'The requested system could not be found',
                parameters: EMPTY_PARAMS,
                appPath: params.appPath,
                changes: [],
                timestamp: new Date().toISOString()
            };
        }
        const foundSystem = findResult.system;

        // At this point, foundSystem should be a BackendSystem (VSCode only)
        const metadata = await getServiceMetadata(foundSystem as BackendSystem, servicePath);
        const metadataFilePath = path.join(params.appPath, 'metadata.xml');
        fs.writeFileSync(metadataFilePath, metadata, 'utf-8');

        const backend = foundSystem as BackendSystem;
        const host = backend.url;
        const client = backend.client;

        return {
            status: 'Success',
            message: 'Service metadata downloaded successfully.',
            changes: [],
            parameters: {
                host,
                client,
                servicePath,
                metadataFilePath
            },
            appPath: params.appPath,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'Error',
            message: error instanceof Error ? error.message : String(error),
            parameters: EMPTY_PARAMS,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}
