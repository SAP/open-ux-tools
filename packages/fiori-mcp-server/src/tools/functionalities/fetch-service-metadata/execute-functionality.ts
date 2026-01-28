import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types';

import path from 'node:path';
import fs from 'node:fs';
import { getServiceMetadata, findSapSystem } from './service-metadata';
import details from './details';

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
        throw new Error('Missing required parameter: servicePath');
    }

    const sapSystem = await findSapSystem(sapSystemQuery || servicePath);
    try {
        const { metadata, entitySets } = await getServiceMetadata(sapSystem, servicePath);
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
                metadataFilePath,
                entitySets
            },
            appPath: params.appPath,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            functionalityId: details.functionalityId,
            status: 'Error',
            message: `Failed to fetch service metadata: ${error instanceof Error ? error.message : String(error)}`,
            changes: [],
            parameters: {
                host: sapSystem.url,
                client: sapSystem.client,
                servicePath: servicePath
            },
            appPath: params.appPath,
            timestamp: new Date().toISOString()
        };
    }
}
