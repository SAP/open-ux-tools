import { AdtService } from './adt-service';
import type { AdtCategory, AtoSettings, UIFlexSettings } from 'abap/types';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

/**
 * UIFlexService implements ADT requests for fetching UI Flex settings.
 */
export class UIFlexService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static adtCategory = {
        scheme: 'http://www.sap.com/adt/categories/ui_flex',
        term: 'dta_folder'
    };

    /**
     * @see AdtService.getAdtCatagory()
     * @returns AdtCategory
     */
    public static getAdtCatagory(): AdtCategory {
        return UIFlexService.adtCategory;
    }

    /**
     * Send ADT request to fetch UI Flex settings.
     *
     * @returns UIFlexSettings
     */
    public async getUIFlex(): Promise<UIFlexSettings> {
        const acceptHeaders = {
            headers: {
                Accept: 'application/*'
            }
        };

        const response = await this.get<string>('', acceptHeaders);

        return {
            isOnPremise: response.data.includes(UIFlexService.adtCategory.term),
            isUIFlex: response.data.includes(UIFlexService.adtCategory.scheme)
        };
    }
}
