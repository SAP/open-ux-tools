import { AdtService } from './adt-service';
import type { AdtCategory, BusinessObject } from '../../types';

/**
 * BusinessObjectsService implements ADT requests to obtain the list of business objects.
 */
export class BusinessObjectsService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static adtCategory = {
        scheme: 'http://www.sap.com/adt/categories/respository',
        term: 'search'
    };

    /**
     * Get ADT scheme ID.
     *
     * @returns AdtCategory
     */
    public static getAdtCatagory(): AdtCategory {
        return BusinessObjectsService.adtCategory;
    }

    /**
     * Get all business objects from ADT service.
     *
     * @param maxResults - The maximum number of business objects to be returned.
     * @returns A list of business objects.
     */
    public async getBusinessObjects(maxResults = 10000): Promise<BusinessObject[]> {
        const config = {
            headers: {
                Accept: 'application/xml'
            },
            params: {
                operation: 'quickSearch',
                query: `*`,
                maxResults: maxResults,
                objectType: 'BDEF',
                releaseState: 'USE_IN_CLOUD_DEVELOPMENT'
            }
        };
        const response = await this.get('', config);
        return this.parseBOResponse(response.data);
    }

    /**
     * Parse the XML document of business object entries from ADT service.
     *
     * @param xml xml document containing business object entries.
     * @returns A list of business object names.
     */
    private parseBOResponse(xml: string): BusinessObject[] {
        const parsed = this.parseResponse<any>(xml);

        let boArray = [];
        if (parsed?.objectReferences?.objectReference) {
            if (Array.isArray(parsed.objectReferences.objectReference)) {
                boArray = parsed.objectReferences.objectReference;
            } else {
                boArray = [parsed.objectReferences.objectReference];
            }
        }
        return boArray.map((item: Partial<BusinessObject>) => {
            const { name, uri, description } = item;
            return { name, uri, description };
        });
    }
}
