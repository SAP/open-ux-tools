import ODataModel from 'sap/ui/model/odata/v2/ODataModel';
import { getDataSourceAnnotationFileMap } from '../../adp/api-handler';
import { ODataDownStatus, ODataHealthStatus, ODataUpStatus } from './odata-health-status';

export class ODataHealthChecker {
    async getHealthStatus(): Promise<ODataHealthStatus[]> {
        const serviceUrls = await this.getOdataServiceUrls();
        const metadataPromises = await Promise.allSettled(
            serviceUrls.map((serviceUrl) => this.getServiceMetadata(serviceUrl))
        );

        return metadataPromises.map((metadataPromise, idx) =>
            metadataPromise.status === 'fulfilled'
                ? new ODataUpStatus(serviceUrls[idx], metadataPromise.value)
                : new ODataDownStatus(serviceUrls[idx], metadataPromise.reason)
        );
    }

    private getServiceMetadata(serviceUrl: string): Promise<any> {
        const oModel = new ODataModel({
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

    private async getOdataServiceUrls(): Promise<string[]> {
        const { annotationDataSourceMap } = await getDataSourceAnnotationFileMap();
        return Object.values(annotationDataSourceMap).map(({ serviceUrl }) => serviceUrl);
    }
}
