import type { ExecuteFunctionalityOutput, DownloadODataServiceMetadataInput } from '../types/index.js';
import executeFetchServiceMetadata from './download-odata-service-metadata-impl.js';
import { DOWNLOAD_ODATA_SERVICE_METADATA_ID } from '../constant.js';

/**
 * Downloads OData service metadata from a SAP system and saves it as metadata.xml.
 *
 * @param params - Input parameters containing sapSystemQuery, servicePath and appPath.
 * @returns A promise resolving to the execution output with host, servicePath, client and metadataFilePath.
 */
export async function downloadODataServiceMetadata(
    params: DownloadODataServiceMetadataInput
): Promise<Omit<ExecuteFunctionalityOutput, 'functionalityId'>> {
    const { functionalityId: _id, ...result } = await executeFetchServiceMetadata({
        functionalityId: DOWNLOAD_ODATA_SERVICE_METADATA_ID,
        parameters: {
            sapSystemQuery: params.sapSystemQuery,
            servicePath: params.servicePath
        },
        appPath: params.appPath
    });
    return result;
}
