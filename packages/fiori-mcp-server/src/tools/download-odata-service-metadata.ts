import type { ExecuteFunctionalityOutput, DownloadODataServiceMetadataInput } from '../types';
import executeFetchServiceMetadata from './functionalities/fetch-service-metadata/execute-functionality';
import { FETCH_SERVICE_METADATA_ID } from '../constant';

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
        functionalityId: FETCH_SERVICE_METADATA_ID,
        parameters: {
            sapSystemQuery: params.sapSystemQuery,
            servicePath: params.servicePath
        },
        appPath: params.appPath
    });
}
