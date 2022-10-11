import { AdtServiceConfigs, AdtServiceName } from '../supported-services';
import { AdtService } from './adt-service';
import { AdtCatalogService } from '../adt-catalog-service';
import { AdtCollection } from '../../types';
import { getTransportNumberFromResponse } from '../handlers/transport';

export class TransportRequestService extends AdtService {
    constructor(public readonly catalog: AdtCatalogService) {
        super(catalog);
    }

    /**
     *
     * @param description Description of the new transport request to be created
     * @returns Newly created transport request number
     */
    public async createTransportRequest(description: string): Promise<string> {
        let serviceSchema: AdtCollection;
        try {
            serviceSchema = await this.catalog.getServiceDefinition(AdtServiceConfigs[AdtServiceName.CreateTransport]);
        } catch {
            // Service not available on target ABAP backend version, return empty string
            return '';
        }

        if (!serviceSchema || !serviceSchema.href) {
            return '';
        }
        const urlPath = serviceSchema.href;
        const acceptHeaders = {
            headers: {
                Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml',
                'content-type': 'text/plain'
            }
        };

        const data = `
                <?xml version="1.0" encoding="ASCII"?>
                <tm:root xmlns:tm="http://www.sap.com/cts/adt/tm" tm:useraction="newrequest">
                    <tm:request tm:desc="${description}" tm:type="K" tm:target="LOCAL" tm:cts_project="">
                        <tm:task tm:owner=""/>
                    </tm:request>
                </tm:root>
            `;
        const response = await this.post(urlPath, data, acceptHeaders);
        return getTransportNumberFromResponse(response.data, this.log);
    }
}
