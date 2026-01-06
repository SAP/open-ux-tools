import { AdtService } from './adt-service';
import type { AdtCategory } from '../../types';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { PackageInfo } from '../../types/adt-internal-types';

/**
 * Structure of input parameter for `listPackages` method.
 *
 * @see {@link ListPackageService#listPackages}
 */
export interface ListPackageParams {
    maxResults?: number;
    phrase?: string;
}

/**
 * ListPackageService implements ADT requests for fetching a list of available package names
 * from ABAP backend system.
 *
 * @class
 */
export class ListPackageService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static readonly adtCategory = {
        scheme: 'http://www.sap.com/adt/categories/respository',
        term: 'search'
    };

    /**
     * Get ADT scheme ID.
     *
     * @returns AdtCategory
     */
    public static getAdtCatagory(): AdtCategory {
        return ListPackageService.adtCategory;
    }

    /**
     * The suggested usage of this API from ADT team is to validate the input package
     * name exists rather than searching through the list to find a package name.
     * Several reasons: 1) there is a large number of package names; 2) ABAP developer
     * works with the same package name most of the time. They are likely to remember
     * the package name, typing the prefix (namespace) of the package, the backend
     * returns few package names that match the prefix, and finally developer selects
     * a package name to minimize risk of typo introduced by manual input.
     *
     * @param params
     *  maxResults Maxmium number of records to be returned by the ADT service.
     *             Based on explanation above, it is suggested to use a relatively small number like 50.
     *  phrase     Search phrase. The input is case sensitive.
     * @returns A list of package names that has prefix matching input parameter `phrase`.
     *          The list is returned in the same order as returned by the ADT API.
     *          No guarantee on alphabetic ordering of package names.
     */
    public async listPackages(params: ListPackageParams): Promise<string[]> {
        const { maxResults = 50, phrase = '' } = params;
        const config = {
            headers: {
                Accept: 'application/xml'
            },
            params: {
                operation: 'quickSearch',
                query: `${phrase}*`,
                useSearchProvider: 'X',
                maxResults,
                objectType: 'DEVC/K'
            }
        };

        const response = await this.get('', config);
        return this.parsePackageListResponse(response.data);
    }

    /**
     * Parse the XML document of package info entries from ADT service.
     *
     * @param xml xml document containing package info entries.
     * @returns A list of package names.
     */
    private parsePackageListResponse(xml: string): string[] {
        if (XMLValidator.validate(xml) !== true) {
            this.log.warn(`Invalid XML: ${xml}`);
            return [];
        }
        const options = {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            ignoreNameSpace: true,
            parseAttributeValue: true,
            removeNSPrefix: true
        };
        const parser: XMLParser = new XMLParser(options);
        const parsed = parser.parse(xml, true);

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
