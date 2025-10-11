import { AdtService } from './adt-service';
import type { AdtCategory, AtoSettings } from '../../../abap/types';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

/**
 * AtoService implements ADT requests for fetching ATO settings.
 */
export class AtoService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static adtCategory = {
        scheme: 'http://www.sap.com/adt/categories/ato',
        term: 'settings'
    };

    /**
     * @see AdtService.getAdtCatagory()
     * @returns AdtCategory
     */
    public static getAdtCatagory(): AdtCategory {
        return AtoService.adtCategory;
    }

    /**
     * Send ADT request to fetch ATO settings.
     *
     * @returns AtoSettings
     */
    public async getAtoInfo(): Promise<AtoSettings> {
        const acceptHeaders = {
            headers: {
                Accept: 'application/*'
            }
        };
        const response = await this.get('', acceptHeaders);
        return this.parseAtoResponse(response.data);
    }

    /**
     * Parse an XML document for ATO (Adaptation Transport Organizer) settings.
     *
     * @param xml xml document containing ATO settings
     * @returns parsed ATO settings
     */
    private parseAtoResponse(xml: string): AtoSettings {
        if (XMLValidator.validate(xml) !== true) {
            this.log.warn(`Invalid XML: ${xml}`);
            return {};
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
        return parsed.settings ? (parsed.settings as AtoSettings) : {};
    }
}
