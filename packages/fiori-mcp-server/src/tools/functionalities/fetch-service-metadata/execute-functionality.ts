import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types/index.js';

import path from 'node:path';
import fs from 'node:fs';
import { getServiceMetadata, findSapSystem } from './service-metadata.js';
import details from './details.js';

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
            functionalityId: details.functionalityId,
            status: 'Error',
            message: 'Missing required parameter: servicePath',
            parameters: params.parameters,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    try {
        const sapSystem = await findSapSystem(sapSystemQuery || servicePath);
        const metadata = await getServiceMetadata(sapSystem, servicePath);
        const metadataFilePath = path.join(params.appPath, 'metadata.xml');
        fs.writeFileSync(metadataFilePath, metadata, 'utf-8');

        return {
            functionalityId: details.functionalityId,
            status: 'Success',
            message: 'Fetched systems successfully.',
            changes: [],
            parameters: {
                host: sapSystem.url,
                client: sapSystem.client,
                servicePath: servicePath,
                metadataFilePath
            },
            appPath: params.appPath,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            functionalityId: details.functionalityId,
            status: 'Error',
            message: error?.message ?? String(error),
            parameters: params.parameters,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}
