import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../types/index.js';

import path from 'node:path';
import fs from 'node:fs';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { Destination } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import { getServiceMetadata, findSystem } from './services/sap-system.js';
import { DOWNLOAD_ODATA_SERVICE_METADATA_ID } from '../constant.js';

/**
 * Executes the tool's functionality.
 *
 * @param params - The input parameters for executing the functionality.
 * @returns A promise that resolves to the execution output.
 */
export default async function (params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    const sapSystemQuery = String(params.parameters?.sapSystemQuery ?? '').trim(); // can be empty
    const servicePath = String(params.parameters?.servicePath ?? '').trim();

    if (!servicePath) {
        return {
            functionalityId: DOWNLOAD_ODATA_SERVICE_METADATA_ID,
            status: 'Error',
            message: 'Missing required parameter: servicePath',
            parameters: params.parameters,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    try {
        const foundSystem = await findSystem(sapSystemQuery || servicePath);
        if (!foundSystem) {
            return {
                functionalityId: DOWNLOAD_ODATA_SERVICE_METADATA_ID,
                status: 'Error',
                message: 'The requested system could not be found',
                parameters: params.parameters,
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
            functionalityId: DOWNLOAD_ODATA_SERVICE_METADATA_ID,
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
            functionalityId: DOWNLOAD_ODATA_SERVICE_METADATA_ID,
            status: 'Error',
            message: error?.message ?? String(error),
            parameters: params.parameters,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}
