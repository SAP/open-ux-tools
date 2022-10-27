import type { Logger } from '@sap-ux/logger';
import type { AdtCategory, AdtCollection } from 'abap/types';
import { Axios } from 'axios';

interface AdtServiceExtension {
    attachAdtSchema(serviceSchema: AdtCollection): void;
}

/**
 * AdtService provides abstraction of AdtService implementations. Each specific ADT service
 * should be implemented as subclass of AdtService.
 */
export abstract class AdtService extends Axios implements AdtServiceExtension {
    // Instantiated by calling ServiceProvider.createService()
    public log: Logger;
    // ADT schema for the corresponding AdtService subclass
    serviceSchema: AdtCollection;

    /**
     * Subclass that implements each specific ADT service
     * should provide AdtCatagory for the corresponding AdtService.
     * The AdtCatagory properties combined to identify a particular
     * ADT service schema in ADT schema.
     */
    public static getAdtCatagory(): AdtCategory {
        throw new Error('NEEDS TO BE IMPLEMENTED BY AdtService SUBCLASSES');
    }

    /**
     * Attach schema to AdtService subclass.
     *
     * @param serviceSchema ADT schema for this particular ADT service catalog.
     */
    attachAdtSchema(serviceSchema: AdtCollection): void {
        this.serviceSchema = serviceSchema;
    }
}
