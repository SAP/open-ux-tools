import { AdtService } from './adt-service';
import type { AdtCategory } from '../../types';
import { XMLParser } from 'fast-xml-parser';
import type { GeneratorEntry } from '../generators/types';

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
        if (data?.id === 'ui-service') {
            return data;
        } else {
            throw new Error('UI Service Generator not found');
        }
    }

    /**
     *
     * @param binding
     */
    public async lock(binding: string) {
        // POST /sap/bc/adt/businessservices/bindings/zui_costcentertp_2009_o4?_action=LOCK&accessMode=MODIFY
        // binding name example zui_costcentertp_2009_o4
        // application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result;q=0.8, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result2;q=0.9
        const bindingLowerCase = binding.toLowerCase();

        await this.post(`/sap/bc/adt/businessservices/bindings/${bindingLowerCase}`, '', {
            headers: {
                Accept: 'application/*,application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result',
                'x-sap-adt-sessiontype': 'stateful'
            },
            params: {
                _action: `LOCK`,
                accessMode: 'MODIFY'
            }
        });
    }


    private buildServiceBindingContent(serviceType: string, serviceBindingName: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?><adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core"><adtcore:objectReference adtcore:type="${serviceType}" adtcore:name="${serviceBindingName}"/></adtcore:objectReferences>`;
    }


    public async publish(
        serviceBindingContent: string
    ): Promise<{ SEVERITY: string; SHORT_TEXT: string; LONG_TEXT: string }> {
        const content = this.buildServiceBindingContent('SERVICE_BINDING', serviceBindingContent);
        const response = await this.post(`/sap/bc/adt/businessservices/odatav4/publishjobs`, content, {
            headers: {
                'Content-Type': 'application/xml',
                Accept: 'application/xml, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.StatusMessage'
            }
        });

        const data = parser.parse(response.data, true);
        return data.abap.values.DATA;
    }
}
