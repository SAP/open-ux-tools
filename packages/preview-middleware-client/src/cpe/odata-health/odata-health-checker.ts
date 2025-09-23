import ODataModelV2 from 'sap/ui/model/odata/v2/ODataModel';
import ODataModelV4 from 'sap/ui/model/odata/v4/ODataModel';
import { getDataSourceAnnotationFileMap, ODataVersion } from '../../adp/api-handler';
import { ODataDownStatus, ODataHealthStatus, ODataMetadata, ODataUpStatus } from './odata-health-status';

/**
 * Describes an OData service instance for health checking.
 */
interface ODataServiceInfo {
    /**
     * The URL of the OData service.
     */
    serviceUrl: string;
    /**
     * The OData protocol version ('v2' or 'v4').
     */
    oDataVersion: ODataVersion;
    /**
     * Optional error message from backend metadata retrieval.
     */
    metadataReadErrorMsg: string | undefined;
}

/**
 * Use this class to do a health check for an OData service, supports both v2 and v4
 * format. This health checker ensures not only that $metadata is valid, but also that UI5
 * itself can consume the service via its models.
 */
export class ODataHealthChecker {
    /**
     * Does a health check to all available OData services.
     *
     * @returns {Promise<ODataHealthStatus[]>} Resolves with array containing the health
     * status for each OData service.
     */
    async getHealthStatus(): Promise<ODataHealthStatus[]> {
        const services = await this.getServices();
        const metadataPromises = await Promise.allSettled(
            services.map(({ serviceUrl, oDataVersion, metadataReadErrorMsg }) =>
                this.getServiceMetadata(serviceUrl, oDataVersion, metadataReadErrorMsg)
            )
        );

        return metadataPromises.map((metadataPromise, idx) =>
            metadataPromise.status === 'fulfilled'
                ? new ODataUpStatus(services[idx].serviceUrl, metadataPromise.value)
                : new ODataDownStatus(services[idx].serviceUrl, metadataPromise.reason)
        );
    }

    /**
     * This method does strong health check (with ODataModel). This ensures not only
     * that $metadata is valid, but also that UI5 itself can consume the service via its models.
     * Some services may have valid $metadata but still fail in UI5’s ODataModel
     * (e.g., weird annotations, CORS issues, etc.).
     *
     * @param {string} serviceUrl - The OData service url.
     * @param {ODataVersion} oDataVersion - The OData version.
     * @param {string|undefined} metadataReadErrorMsg - Any backend error message during the metadata retreival in the backend.
     * The metadata is used to determine the oData version and send that version back to the client.
     * @returns {Promise<any>} Rsolved with valid metadata.
     */
    private async getServiceMetadata(
        serviceUrl: string,
        oDataVersion: ODataVersion,
        metadataReadErrorMsg: string | undefined
    ): Promise<ODataMetadata> {
        switch (oDataVersion) {
            case 'v2':
                return this.getServiceV2Metadata(serviceUrl);
            case 'v4':
                return this.getServiceV4Metadata(serviceUrl);
            default: {
                const errorDetails = metadataReadErrorMsg ? ` ${metadataReadErrorMsg}` : '';
                throw new Error(`Unable to read OData version from the metadata xml.${errorDetails}`);
            }
        }
    }

    private getServiceV2Metadata(serviceUrl: string): Promise<ODataMetadata> {
        const oModel = new ODataModelV2({
            serviceUrl,
            json: true,
            // We do not want the annotatations concatenated to the final result.
            loadAnnotationsJoined: false
        });
        // This method actually returns promise which is resolved with the metadata.
        return oModel.metadataLoaded(true).finally(
            // Do cleant up in case the helath check is done multiplpe times.
            () => oModel.destroy()
        );
    }

    private getServiceV4Metadata(serviceUrl: string): Promise<ODataMetadata> {
        const oModel = new ODataModelV4({
            serviceUrl,
            // Only metadata loaded. We only want the model to load $metadata,
            // not fetch entity data or bind to any UI controls.
            synchronizationMode: 'None'
        });
        // This method actually returns promise which is resolved with the metadata.
        return oModel
            .getMetaModel()
            .requestObject('/')
            .finally(
                // Do cleant up in case the helath check is done multiplpe times.
                () => oModel.destroy()
            );
    }

    private async getServices(): Promise<ODataServiceInfo[]> {
        const { annotationDataSourceMap } = await getDataSourceAnnotationFileMap();
        return Object.values(annotationDataSourceMap).map(({ serviceUrl, oDataVersion, metadataReadErrorMsg }) => ({
            serviceUrl,
            oDataVersion,
            metadataReadErrorMsg
        }));
    }
}
