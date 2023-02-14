import { AdtService } from './adt-service';
import type { AdtCategory, PackageInfo } from '../../types';
import XmlParser from 'fast-xml-parser';

/**
 * ListPackageService implements ADT requests for fetching a list of available package names
 * from ABAP backend system.
 */
export class ListPackageService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static AdtCategory = {
        scheme: 'http://www.sap.com/adt/categories/respository',
        term: 'search'
    };

    /**
     * Get ADT scheme ID.
     *
     * @returns AdtCategory
     */
    public static getAdtCatagory(): AdtCategory {
        return ListPackageService.AdtCategory;
    }

    /**
     * ListPackageService API function to fetch a list of available package names.
     *
     * @param phrase Search phrase
     * @returns A list of package names that can be used for deploy
     */
    public async listPackages(phrase: string): Promise<string[]> {
        const config = {
            headers: {
                Accept: 'application/xml'
            },
            params: {
                operation: 'quickSearch',
                query: `${phrase}*`,
                useSearchProvider: 'X',
                maxResults: 50,
                objectType: 'DEVC/K'
            }
        };

        const response = await this.get('', config);
        return this.parsePackageListResponse(response.data);
    }

    /**
     * Parse an XML document for ATO (Adaptation Transport Organizer) settings.
     *
     * @param xml xml document containing ATO settings
     * @returns parsed ATO settings
     */
    private parsePackageListResponse(xml: string): string[] {
        if (XmlParser.validate(xml) !== true) {
            this.log.warn(`Invalid XML: ${xml}`);
            return [];
        }
        const options = {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            ignoreNameSpace: true,
            parseAttributeValue: true
        };
        const obj = XmlParser.getTraversalObj(xml, options);
        const parsed = XmlParser.convertToJson(obj, options);

        let packageArray: PackageInfo[] = [];
        if (parsed?.objectReferences?.objectReference) {
            if (Array.isArray(parsed.objectReferences.objectReference)) {
                packageArray = parsed.objectReferences.objectReference;
            } else {
                packageArray = [parsed.objectReferences.objectReference];
            }
        }
        return packageArray.map((item: PackageInfo) => item.name);
    }
}
