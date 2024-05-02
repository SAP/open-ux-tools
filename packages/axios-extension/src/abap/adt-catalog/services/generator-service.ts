import { AdtService } from './adt-service';
import type { AdtCategory } from '../../types';
import { XMLParser } from 'fast-xml-parser';
import type { GeneratorEntry } from '../generators/types';
import _ from 'lodash';

const parser = new XMLParser();

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
     * @param businessObjectName
     * @param _log
     * @returns TBD
     */
    public async getUIServiceGeneratorConfig(businessObjectName: string, _log?: any): Promise<GeneratorEntry> {
        const response = await this.get('', {
            headers: {
                Accept: 'application/atom+xml;type=feed'
            },
            params: {
                referencedObject: `/sap/bc/adt/bo/behaviordefinitions/${businessObjectName.toLocaleLowerCase()}`
            }
        });

        const data = this.parseResponse<any>(response.data).feed?.entry as GeneratorEntry;
        //_log.info('data: ' + JSON.stringify(data));
        if (data?.id === 'ui-service' || data?.id === 'uiservice') {
            return data;
        } else {
            throw new Error('UI Service Generator not found');
        }
    }
}
