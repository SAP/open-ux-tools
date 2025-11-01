import ODataModelV2 from 'sap/ui/model/odata/v2/ODataModel';
import ODataModelV4 from 'sap/ui/model/odata/v4/ODataModel';
import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { ODataDownStatus, ODataHealthStatus, ODataMetadata, ODataUpStatus } from './odata-health-status';
import Log from 'sap/base/Log';

/**
 * The OData version type.
 */
type ODataVersion = 'v2' | 'v4' | '2.0' | '4.0';

/**
 * Describes an OData service instance.
 */
interface ODataServiceInfo {
    /**
     * The URL of the OData service.
     */
    serviceUrl: string;
    /**
     * The OData protocol version.
     */
    oDataVersion: ODataVersion;
}

/**
 * Represents the OData service data source from the manifest.
 */
interface DataSource {
    uri: string;
    type: string;
    settings: {
        odataVersion?: ODataVersion;
        localUri: string;
    };
}

type DataSourceRecord = Record<string, DataSource>;

/**
 * Use this class to do a health check for all available OData services, supports both v2 and v4
 * format. This health checker ensures not only that $metadata is valid, but also that the UI5 framework
 * itself can consume the service via its models.
 */
export class ODataHealthChecker {
    /**
     * The OData type.
     */
    private static readonly ODATA_TYPE: string = 'OData';

    /**
     * The default OData version.
     */
    private static readonly DEFAULT_ODATA_VERSION: ODataVersion = 'v2';

    /**
     * Use this helper function to filter the OData data source items from the manifest.
     * @param src The service data source.
     * @returns True if the data source represents an OData service.
     */
    private readonly isOdataService = (src: DataSource): boolean => src.type === ODataHealthChecker.ODATA_TYPE;

    /**
     * Use this helper function to map the OData data source to the internal structure
     * used in this class.
     * @param src The OData service data source.
     * @returns The OData service info object.
     */
    private readonly toOdataServiceInfo = (src: DataSource): ODataServiceInfo => ({
        serviceUrl: src.uri,
        oDataVersion: src.settings.odataVersion ?? ODataHealthChecker.DEFAULT_ODATA_VERSION
    });

    constructor(private readonly rta: RuntimeAuthoring) {}

    /**
     * Does a health check to all available OData services.
     *
     * @returns Resolves with an array containing the health
     * status for each OData service.
     */
    async getHealthStatus(): Promise<ODataHealthStatus[]> {
        const oDataHealthCheckStartTime = Date.now();

        const services = this.getServices();
        const metadataPromises = await Promise.allSettled(
            services.map(({ serviceUrl, oDataVersion }) => this.getServiceMetadata(serviceUrl, oDataVersion))
        );

        const oDataHelathCheckDurationInSec = ((Date.now() - oDataHealthCheckStartTime) / 1000).toFixed(2);
        Log.info(`OData service health check took ${oDataHelathCheckDurationInSec} sec.`);

        return metadataPromises.map((metadataPromise, idx) =>
            metadataPromise.status === 'fulfilled'
                ? new ODataUpStatus(services[idx].serviceUrl, metadataPromise.value)
                : new ODataDownStatus(services[idx].serviceUrl, metadataPromise.reason)
        );
    }

    /**
     * This method does a strong health check (with the ODataModel). This ensures not only
     * that the $metadata is valid, but also that the UI5 framework itself can consume the service via its models.
     * Some services may have valid $metadata but still fail in the UI5’s ODataModel
     * (e.g., weird annotations, CORS issues, etc.).
     *
     * @param serviceUrl The OData service url.
     * @param oDataVersion The OData version.
     * @returns Rsolved with valid metadata.
     */
    private async getServiceMetadata(serviceUrl: string, oDataVersion: ODataVersion): Promise<ODataMetadata> {
        switch (oDataVersion) {
            case 'v2':
            case '2.0':
                return this.getServiceV2Metadata(serviceUrl);
            case 'v4':
            case '4.0':
                return this.getServiceV4Metadata(serviceUrl);
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

    private getServices(): ODataServiceInfo[] {
        const manifest = this.rta.getRootControlInstance().getManifest();
        const dataSources = manifest?.['sap.app']?.dataSources as unknown as DataSourceRecord;
        return Object.values(dataSources ?? {})
            .filter(this.isOdataService)
            .map(this.toOdataServiceInfo);
    }
}
