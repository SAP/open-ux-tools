import { AdtServiceConfigs, AdtServiceName } from '../supported-services';
import { getTransportRequestList } from '../handlers/transport';
import { AdtService } from './adt-service';
import { AdtCatalogService } from '../adt-catalog-service';
import { AdtCollection, TransportRequest } from '../../types';

export class TransportChecksService extends AdtService {
    constructor(public readonly catalog: AdtCatalogService) {
        super(catalog);
    }

    /**
     *
     * @param packageName Package name for deployment
     * @param appName Fiori project name for deployment. A new project that has not been deployed before is also allowed
     * @returns A list of transport requests that can be used for deploy
     */
    public async getTransportRequests(packageName: string, appName: string): Promise<TransportRequest[]> {
        let serviceSchema: AdtCollection;
        try {
            serviceSchema = await this.catalog.getServiceDefinition(AdtServiceConfigs[AdtServiceName.TransportChecks]);
        } catch (error) {
            this.log.error(error);
            return [];
        }

        const acceptHeaders = {
            headers: {
                Accept: 'application/vnd.sap.as+xml; dataname=com.sap.adt.transport.service.checkData',
                'content-type':
                    'application/vnd.sap.as+xml; charset=UTF-8; dataname=com.sap.adt.transport.service.checkData'
            }
        };

        const data = `
                <?xml version="1.0" encoding="UTF-8"?>
                <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
                    <asx:values>
                        <DATA>
                        <PGMID/>
                        <OBJECT/>
                        <OBJECTNAME/>
                        <DEVCLASS>${packageName}</DEVCLASS>
                        <SUPER_PACKAGE/>
                        <OPERATION>I</OPERATION>
                        <URI>/sap/bc/adt/filestore/ui5-bsp/objects/${appName}/$create</URI>
                        </DATA>
                    </asx:values>
                </asx:abap>
            `;

        const response = await this.post(serviceSchema.href, data, acceptHeaders);
        return getTransportRequestList(response.data, this.log);
    }
}
