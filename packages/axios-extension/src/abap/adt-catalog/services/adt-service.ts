import { Logger } from '@sap-ux/logger';
import { AdtCategory, AdtCollection } from 'abap/types';
import { Axios } from 'axios';

interface AdtServiceExtension {
    attachAdtSchema(serviceSchema: AdtCollection): void;
}

export abstract class AdtService extends Axios implements AdtServiceExtension {
    // Instantiated by calling ServiceProvider.createService()
    public log: Logger;
    serviceSchema: AdtCollection;

    /**
     * Subclass that implements each specific ADT service
     * should provide AdtCatagory to retrive the schema.
     */
    public static getAdtCatagory(): AdtCategory {
        throw 'NEEDS TO BE IMPLEMENTED BY AdtService SUBCLASSES';
    }

    public attachAdtSchema(serviceSchema: AdtCollection): void {
        this.serviceSchema = serviceSchema;
    }
}
