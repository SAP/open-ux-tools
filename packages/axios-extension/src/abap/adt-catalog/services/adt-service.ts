import { Logger } from '@sap-ux/logger';
import { AdtServiceConfigs, AdtServiceName } from './supported-services';
import { Axios } from 'axios';
import { AdtCatalogService } from '../adt-catalog-service';
import { AdtCollection } from 'abap/types';

export abstract class AdtService extends Axios {
    // Instantiated by calling ServiceProvider.createService()
    public log: Logger;

    constructor(public readonly catalog: AdtCatalogService) {
        super();
        this.log = this.catalog.log;
    }
}
