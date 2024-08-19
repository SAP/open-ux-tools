import { AdtService } from './adt-service';
import type { AbapCDSView, AdtCategory } from '../../types';

/**
 * AbapCDSViewService implements ADT requests to obtain the list of abap cds views.
 */
export class AbapCDSViewService extends AdtService {
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
        return AbapCDSViewService.adtCategory;
    }

    /**
     * Get all abap cds views from ADT service.
     *
     * @param maxResults - The maximum number of abap cds views to be returned.
     * @returns A list of abap cds views.
     */
    public async getAbapCDSViews(maxResults = 10000): Promise<AbapCDSView[]> {
        const config = {
            headers: {
                Accept: 'application/xml'
            },
            params: {
                operation: 'quickSearch',
                query: `*`,
                maxResults: maxResults,
                objectType: 'DDLS',
                releaseState: 'USE_IN_CLOUD_DEVELOPMENT'
            }
        };
        const response = await this.get('', config);
        return this.parseAbapCDSViewResponse(response.data);
    }

    /**
     * Parse the XML document of abap cds view entries from ADT service.
     *
     * @param xml xml document containing abap cds view entries.
     * @returns A list of abap cds view names.
     */
    private parseAbapCDSViewResponse(xml: string): AbapCDSView[] {
        const parsed = this.parseResponse<any>(xml);

        let abapCDSViewArray = [];
        if (parsed?.objectReferences?.objectReference) {
            if (Array.isArray(parsed.objectReferences.objectReference)) {
                abapCDSViewArray = parsed.objectReferences.objectReference;
            } else {
                abapCDSViewArray = [parsed.objectReferences.objectReference];
            }
        }
        return abapCDSViewArray.map((item: Partial<AbapCDSView>) => {
            const { name, uri, description } = item;
            return { name, uri, description };
        });
    }
}
