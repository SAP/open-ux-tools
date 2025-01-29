import { AdtService } from './adt-service';
import type { AdtCategory } from '../../types';
import type { GeneratorEntry } from '../generators/types';
/**
 * RapGeneratorService implements ADT requests for generating an OData Service
 * from ABAP backend system.
 */
export class RapGeneratorService extends AdtService {
    /**
     * @see AdtService.getAdtCategory()
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
        return RapGeneratorService.adtCategory;
    }

    private id: string;

    /**
     * Get the RAP Generator.
     *
     * @param businessObjectName - The business object name.
     * @returns TBD
     */
    public async getRAPGeneratorConfig(): Promise<GeneratorEntry> {
        const response = await this.get('', {
            headers: {
                Accept: 'application/atom+xml;type=feed'
            },
            params: {
                type: 'webapi',
                fetchAllGenerators: true
            }
        });

        let generators = (this.parseResponse<any>(response.data).feed?.entry || []) as GeneratorEntry[];
        if (generators && !Array.isArray(generators)) {
            generators = [generators];
        }
        const data = generators.find((generator) => generator.id === 'published-x-ui-service');
        if (data) {
            return data;
        } else {
            throw new Error('OData Service Generator not found');
        }
    }
}
