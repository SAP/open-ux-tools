import type { ExecuteFunctionalityOutput } from '../types';
import type { DownloadODataServiceMetadataInput } from '../types/input';
import executeFetchServiceMetadata from './functionalities/fetch-service-metadata/execute-functionality';

/**
 * Downloads OData service metadata from a SAP system and saves it as metadata.xml.
 *
 * @param params - Input parameters containing sapSystemQuery, servicePath and appPath.
 * @returns A promise resolving to the execution output with host, servicePath, client and metadataFilePath.
 */
export async function downloadODataServiceMetadata(
    params: DownloadODataServiceMetadataInput
): Promise<ExecuteFunctionalityOutput> {
    return executeFetchServiceMetadata({
        functionalityId: 'fetch-service-metadata',
        parameters: {
            sapSystemQuery: params.sapSystemQuery,
            servicePath: params.servicePath
        },
        appPath: params.appPath
    });
}
