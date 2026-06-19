import type { DownloadODataServiceMetadataInput, DownloadODataServiceMetadataOutput } from '../types/index.js';

import path from 'node:path';
import fs from 'node:fs';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { Destination } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import { getServiceMetadata, findSystem } from './services/sap-system.js';

/**
 * Downloads OData service metadata from a SAP system and saves it as metadata.xml.
 *
 * @param params - Input parameters containing sapSystemQuery, servicePath and appPath.
 * @returns A promise resolving to the execution output with host, servicePath, client and metadataFilePath.
 */
export async function downloadODataServiceMetadata(
    params: DownloadODataServiceMetadataInput
): Promise<DownloadODataServiceMetadataOutput> {
    const sapSystemQuery = String(params.sapSystemQuery ?? '').trim(); // can be empty
    const servicePath = String(params.servicePath ?? '').trim();

    if (!servicePath) {
        return {
            status: 'Error',
            message: 'Missing required parameter: servicePath',
            parameters: params as any,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    try {
        const foundSystem = await findSystem(sapSystemQuery || servicePath);
        if (!foundSystem) {
            return {
                status: 'Error',
                message: 'The requested system could not be found',
                parameters: params as any,
                appPath: params.appPath,
                changes: [],
                timestamp: new Date().toISOString()
            };
        }

        const metadata = await getServiceMetadata(foundSystem, servicePath);
        const metadataFilePath = path.join(params.appPath, 'metadata.xml');
        fs.writeFileSync(metadataFilePath, metadata, 'utf-8');

        const isAS = isAppStudio();
        const dest = foundSystem as Destination;
        const backend = foundSystem as BackendSystem;
        const host = isAS ? dest.Host : backend.url;
        const client = isAS ? dest['sap-client'] : backend.client;
        const destination = isAS ? dest.Name : undefined;

        return {
            status: 'Success',
            message: 'Service metadata downloaded successfully.',
            changes: [],
            parameters: {
                host,
                client,
                servicePath,
                metadataFilePath,
                destination
            },
            appPath: params.appPath,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'Error',
            message: error?.message ?? String(error),
            parameters: params as any,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}
