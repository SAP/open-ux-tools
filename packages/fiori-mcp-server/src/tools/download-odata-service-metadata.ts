import type { DownloadODataServiceMetadataInput, DownloadODataServiceMetadataOutput } from '../types/index.js';

import path from 'node:path';
import fs from 'node:fs';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { Destination } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import { getServiceMetadata, findSystem, findService } from './services/sap-system.js';

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
    let servicePath = String(params.servicePath ?? '').trim();
    const serviceName = String(params.serviceName ?? '').trim();

    if (!servicePath && !serviceName) {
        return {
            status: 'Error',
            message: 'Missing required parameter: either servicePath or serviceName must be provided',
            parameters: EMPTY_PARAMS,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    try {
        const findResult = await findSystem(sapSystemQuery || servicePath || serviceName);
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

        if (!servicePath && serviceName) {
            const result = await findService(foundSystem, serviceName);
            if (!result.found) {
                const hint =
                    result.suggestions.length > 0
                        ? ` Did you mean one of these? ${result.suggestions.map((s) => `${s.name} v${s.serviceVersion} > ${s.path} (OData V${s.odataVersion})`).join(', ')}`
                        : ' No similar services found.';
                return {
                    status: 'Error',
                    message: `No service named '${serviceName}' found.${hint}`,
                    parameters: EMPTY_PARAMS,
                    appPath: params.appPath,
                    changes: [],
                    timestamp: new Date().toISOString()
                };
            }
            servicePath = result.service.path;
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
            message: error instanceof Error ? error.message : String(error),
            parameters: EMPTY_PARAMS,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}
