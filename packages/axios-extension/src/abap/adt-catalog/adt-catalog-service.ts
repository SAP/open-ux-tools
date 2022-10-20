import type { Logger } from '@sap-ux/logger';
import type { AdtCategory, AdtCollection, AdtSchemaData } from 'abap/types';
import { Axios } from 'axios';
import { AdtSchemaStore } from './adt-schema-store';
import XmlParser from 'fast-xml-parser';

/**
 * Adt Catalog Service implementation fetches the
 * Adt service specification for a given ADT service.
 */
export class AdtCatalogService extends Axios {
    // Discovery service url provided by ADT team
    public static ADT_DISCOVERY_SERVICE_PATH = '/sap/bc/adt/discovery';
    // Cache of fetched discovery schema
    protected schemaStore = new AdtSchemaStore();
    // Instantiated by calling ServiceProvider.createService()
    public log: Logger;

    /**
     * Adt Catalog Service which fetches the Adt service
     * specification for a given ADT service.
     *
     * @param adtCategory Adt service Id
     * @returns Service schema of the input Adt service
     */
    public async getServiceDefinition(adtCategory: AdtCategory): Promise<AdtCollection | null> {
        await this.checkOrLoadAdtDiscoverySchema();
        // Find the schema for the input service url path
        const serviceSchema = this.schemaStore.getAdtCollection(adtCategory);
        const isValidSchema = this.validateServiceSchema(adtCategory, serviceSchema);

        if (isValidSchema) {
            return serviceSchema;
        } else {
            this.log.warn('Invalid Discovery Schema');
            return null;
        }
    }

    /**
     *
     * @param adtCategory adtCategory
     * @param serviceSchema serviceSchema
     * @returns boolean boolean result of schema validity
     */
    private validateServiceSchema(adtCategory: AdtCategory, serviceSchema: AdtCollection): boolean {
        if (!serviceSchema) {
            this.log.warn(`Schema Not Found: ${adtCategory.term} - ${adtCategory.scheme}`);
            return false;
        } else if (!serviceSchema.href) {
            this.log.warn(`Empty href in schema: ${adtCategory.term} - ${adtCategory.scheme}`);
            return false;
        } else {
            return true;
        }
    }

    /**
     * Check if discover schema is in the local cache. If not, fetch it by
     * calling discover service request.
     *
     * @returns Promise<void>
     */
    private async checkOrLoadAdtDiscoverySchema(): Promise<void> {
        if (!this.schemaStore.isAdtSchemaEmpty()) {
            return;
        }
        const response = await this.get('', {
            headers: {
                Accept: 'application/*'
            }
        });
        const schemaData = this.parseAdtSchemaData(response.data);
        this.schemaStore.updateSchemaData(schemaData);
    }

    /**
     *
     * @param xml Raw XML response data of discovery service request
     * @returns Discovery schema data object
     */
    private parseAdtSchemaData(xml: string): AdtSchemaData | null {
        if (XmlParser.validate(xml) !== true) {
            return null;
        }
        const options = {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            ignoreNameSpace: true,
            parseAttributeValue: true
        };
        const obj = XmlParser.getTraversalObj(xml, options);
        const parsed = XmlParser.convertToJson(obj, options);

        if (parsed.service) {
            return parsed;
        } else {
            return null;
        }
    }
}
