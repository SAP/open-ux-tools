import { AdtServiceConfigs, AdtServiceName } from '../supported-services';
import { AdtCatalogService } from '../adt-catalog-service';
import { AdtService } from './adt-service';
import { AtoSettings, parseAtoResponse } from '../handlers/ato';
import { AdtCollection } from 'abap/types';

export class AtoService extends AdtService {
    constructor(public readonly catalog: AdtCatalogService) {
        super(catalog);
    }

    public async getAtoInfo(): Promise<AtoSettings> {
        let serviceSchema: AdtCollection;
        try {
            serviceSchema = await this.catalog.getServiceDefinition(AdtServiceConfigs[AdtServiceName.AtoSettings]);
        } catch (error) {
            // Service not available on target ABAP backend version, return empty setting config
            this.log.error(error);
            return {};
        }

        const acceptHeaders = {
            headers: {
                Accept: 'application/*'
            }
        };
        const response = await this.get(serviceSchema.href, acceptHeaders);
        return parseAtoResponse(response.data);
    }
}
