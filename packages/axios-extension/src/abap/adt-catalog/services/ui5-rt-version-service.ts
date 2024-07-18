import type { AdtCategory } from '../../types';
import { AdtService } from './adt-service';

/**
 * UI5RtVersionService implements ADT requests to get UI5 Version
 * of ABAP system.
 */
export class UI5RtVersionService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static adtCategory = {
        scheme: 'http://www.sap.com/adt/categories/filestore',
        term: 'ui5-rt-version'
    };

    /**
     * Get ADT scheme ID.
     *
     * @returns AdtCategory
     */
    public static getAdtCatagory(): AdtCategory {
        return UI5RtVersionService.adtCategory;
    }

    /**
     * Get UI5 Version of ABAP system.
     *
     * @returns UI5 Version on the connected ABAP System.
     */
    public async getUI5Version(): Promise<string> {
        try {
            const result = await this.get('');
            return result.data as string;
        } catch (error) {
            this.log.error('Could not fetch UI5 Version.');
            this.log.debug(error);
            throw error;
        }
    }
}
