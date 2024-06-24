import type { Logger } from '@sap-ux/logger';
import type { ValidationMessage } from '../../types';
import { AdtService } from '../services';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

/**
 * Extension of the Generator service to generate OData services
 */
export class ODataServiceGenerator extends AdtService {
    public log: Logger;

    /**
     * Validate input
     *
     * @param input: JSON string
     * @returns messages
     */
    public async validate(input: string): Promise<ValidationMessage[]> {
        const response = await this.post(`/validation`, input, {
            headers: {
                'Content-Type': 'application/vnd.sap.adt.repository.generator.content.v1+json',
                Accept: 'application/vnd.sap.adt.validationMessages.v1+xml, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.StatusMessage'
            },
            params: {
                package: '$TMP'
            }
        });
        return this.parseValidateResponse(response.data);
    }

    /**
     * Get technical name of ServiceDefinition
     * - this is a workaround for the missing service definition name in the generator response
     * - actual name might be different e.g. because of name collisions at the time when the actual generation is called
     *
     * @param input: JSON string
     * @returns technical name of service definition
     */
    public async getServiceDefinitionName(input: string): Promise<string> {
        const response = await this.post(`/preview`, input, {
            headers: {
                'Content-Type': 'application/vnd.sap.adt.repository.generator.content.v1+json',
                Accept: 'application/vnd.sap.adt.repository.objects.massoperation.v1+xml'
            },
            params: {
                package: '$TMP'
            }
        });
        return this.parsePreviewResponse(response.data);
    }

    /**
     * Generate ServiceDefinition
     *
     * @param input: JSON string
     */
    public async generateServiceDefinition(input: string): Promise<number> {
        const response = await this.post(``, input, {
            headers: {
                'Content-Type': 'application/vnd.sap.adt.repository.generator.content.v1+json',
                'Accept': 'application/vnd.sap.adt.repository.generator.v1+json'
            },
            params: {
                package: '$TMP'
            }
        });
        // return http status code as number
        return response.status;
    }

    /**
     * Parse an xml document for validation messages
     *
     * @param xml response for "validation" request
     * @returns parsed ATO settings
     */
    private parseValidateResponse(xml: string): ValidationMessage[] {
        // we expect messages - if everything is fine we should get:
        // <?xml version="1.0" encoding="UTF-8"?>
        // <validationMessages:validationMessages xmlns:validationMessages="http://www.sap.com/adt/core/validationMessages">
        // <validationMessages:validationMessage>
        // <validationMessages:severity>OK</validationMessages:severity>
        // </validationMessages:validationMessage>
        // </validationMessages:validationMessages>
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
        let validationMessages = parsed.validationMessages;
        if (!Array.isArray(validationMessages)) {
            validationMessages = [validationMessages];
        }
        return validationMessages.map((entry) => entry.validationMessage || {}) || [];
    }

    /**
     * Parse an XML document to find the technical name of the service definition
     *
     * @param xml response for "preview" request
     * @returns technical name of service definition
     */
    private parsePreviewResponse(xml: string): string {
        // we expect e.g.
        // <?xml version="1.0" encoding="UTF-8"?>
        // -<massOperation:group xmlns:massOperation="http://www.sap.com/adt/massoperation" massOperation:name="Service Artifacts">
        // -<massOperation:group massOperation:name="Business Service Layer">
        // -<massOperation:object>
        // <massOperation:property massOperation:key="Operation">CREATE</massOperation:property>
        // -<massOperation:codeSnippet>
        // <adtcore:content xmlns:adtcore="http://www.sap.com/adt/core" adtcore:type="plain/text">@EndUserText.label : 'Service Definition for ZC_BOOK000' @ObjectModel.leadingEntity.name : 'ZC_BOOK000' define service ZUI_BOOK000_O4 provider contracts odata_v4_ui {expose ZC_BOOK000 as Book; }</adtcore:content>
        // </massOperation:codeSnippet>
        // <massOperation:objectReference adtcore:name="ZUI_BOOK000_O4" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:type="SRVD/SRV" adtcore:uri="/sap/bc/adt/ddic/srvd/sources/zui_book000_o4"/>
        if (XMLValidator.validate(xml) !== true) {
            this.log.warn(`Invalid XML: ${xml}`);
            return '';
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
        const serviceLayerGroup = (parsed.group.group || []).find((entry) => entry.name === 'Business Service Layer');
        if (!serviceLayerGroup) {
            return '';
        }
        const objects = !Array.isArray(serviceLayerGroup.object)
            ? [serviceLayerGroup.object]
            : serviceLayerGroup.object;
        const serviceObject = objects.find((entry) => entry.objectReference?.type === 'SRVD/SRV');
        if (!serviceObject) {
            return '';
        }
        return serviceObject.objectReference?.name || ''; // TODO return GeneratedODataService
    }
}
