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
     * Get the UI service generator for the given referenced object.
     *
     * @param objectUri - The object (business object or abap cds view) uri.
     * @returns TBD
     */
    public async getUIServiceGeneratorConfig(objectUri: string): Promise<GeneratorEntry> {
        const response = await this.get('', {
            headers: {
                Accept: 'application/atom+xml;type=feed'
            },
            params: {
                referencedObject: objectUri,
                type: 'webapi'
            }
        });

        const data = this.parseResponse<any>(response.data).feed?.entry as GeneratorEntry;
        if (data?.id === 'published-ui-service') {
            return data;
        } else {
            throw new Error('UI Service Generator not found');
        }
    }
}
