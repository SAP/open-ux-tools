import { AdtService } from './adt-service';
import type { AdtCategory } from '../../types';
import type { GeneratorEntry } from '../generators/types';

/**
 *
 */
export class GeneratorService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static adtCategory = {
        scheme: 'http://www.sap.com/adt/categories/respository',
        term: 'generators'
    };

    /**
     * Get ADT scheme ID.
     *
     * @returns AdtCategory
     */
    public static getAdtCatagory(): AdtCategory {
        return GeneratorService.adtCategory;
    }

    private id: string;

    /**
     * Get the UI service generator for the given business object.
     *
     * @param businessObjectName - The business object name.
     * @returns TBD
     */
    public async getUIServiceGeneratorConfig(businessObjectName: string): Promise<GeneratorEntry> {
        const response = await this.get('', {
            headers: {
                Accept: 'application/atom+xml;type=feed'
            },
            params: {
                referencedObject: `/sap/bc/adt/bo/behaviordefinitions/${businessObjectName.toLocaleLowerCase()}`
            }
        });

        const data = this.parseResponse<any>(response.data).feed?.entry as GeneratorEntry;
        if (data?.id === 'ui-service' || data?.id === 'uiservice') {
            return data;
        } else {
            throw new Error('UI Service Generator not found');
        }
    }
}
