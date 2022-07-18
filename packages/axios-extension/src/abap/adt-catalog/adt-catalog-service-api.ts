import type { AdtCategory, AdtCollection } from 'abap/types';

/**
 * Adt Catalog Service which fetches the Adt service specification for a given ADT service
 */
export interface AdtCatalogServiceApi {
    /**
     *
     * @param adtCategory Specifies the ADT service
     * @returns Adt service schema/specification
     */
    getServiceDefinition(adtCategory: AdtCategory): Promise<AdtCollection>;
}
