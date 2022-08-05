import { Logger } from '@sap-ux/logger';
import { AdtServiceConfigs, AdtServiceName } from './supported-services';
import { Axios } from 'axios';
import { AdtCatalogService } from './adt-catalog-service';
import { getTransportNumberList } from './handlers/transport';

export class AdtServices extends Axios {
    // Instantiated by calling ServiceProvider.createService()
    public log: Logger;

    public readonly serviceSchemas: any;

    constructor(public readonly catalog: AdtCatalogService) {
        super();
        this.log = this.catalog.log;
    }

    /**
     *
     * @param packageName Package name for deployment
     * @param appName Fiori project name for deployment. A new project that has not been deployed before is also allowed
     * @returns
     */
    public async getTransportRequests(packageName: string, appName: string): Promise<string[]> {
        try {
            if (!this.serviceSchemas[AdtServiceName.TransportChecks]) {
                this.serviceSchemas[AdtServiceName.TransportChecks] = await this.catalog.getServiceDefinition(
                    AdtServiceConfigs[AdtServiceName.TransportChecks]
                );
            }
        } catch {
            // Service not available on target ABAP backend version, return empty setting config
            return [];
        }
        const urlPath = this.serviceSchemas[AdtServiceName.TransportChecks]?.href;
        if (!urlPath) {
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

        const response = await this.post(urlPath, data, acceptHeaders);
        return getTransportNumberList(response.data, this.log);
    }
}
