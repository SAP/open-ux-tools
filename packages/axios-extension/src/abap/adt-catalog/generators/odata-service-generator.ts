import type { Logger } from '@sap-ux/logger';
import type { GeneratorEntry } from './types';
import type { ODataServiceTechnicalDetails, ValidationMessage } from '../../types';
import { AdtService } from '../services';

/**
 * Extension of the Generator service to generate OData services
 */
export class ODataServiceGenerator extends AdtService {

    /**
     * package to be used for generated objects
     */
    protected packageName!: string;

    /**
     * Configure the UI service generator.
     *
     * @param _config - The generator configuration.
     * @param packageName - package to be used for generated objects
     */
    public configure(_config: GeneratorEntry, packageName: string) {
        this.packageName = packageName;
    }

    /**
     * Validate input for OData Service Definition
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
                package: this.packageName
            }
        });
        return this.parseValidateResponse(response.data);
    }

    /**
     * Get technical details of (to be generated) OData service
     * - this is a workaround for the missing service definition name in the generator response
     * - actual name might be different e.g. because of name collisions at the time when the actual generation is called
     *
     * @param input: JSON string
     * @returns technical name of service definition
     */
    public async getTechnicalDetails(input: string): Promise<ODataServiceTechnicalDetails> {
        const response = await this.post(`/preview`, input, {
            headers: {
                'Content-Type': 'application/vnd.sap.adt.repository.generator.content.v1+json',
                Accept: 'application/vnd.sap.adt.repository.objects.massoperation.v1+xml'
            },
            params: {
                package: this.packageName
            }
        });
        return this.parsePreviewResponse(response.data);
    }

    /**
     * Generate OData Service Definition
     *
     * @param input: JSON string
     */
    public async generate(input: string): Promise<number> {
        const response = await this.post(``, input, {
            headers: {
                'Content-Type': 'application/vnd.sap.adt.repository.generator.content.v1+json',
                'Accept': 'application/vnd.sap.adt.repository.generator.v1+json'
            },
            params: {
                package: this.packageName
            }
        });
        // return http status code as number
        return response.status;
    }

    /**
     * Parse an xml document for validation messages
     *
     * @param xml response for "validation" request
     * @returns messages
     */
    private parseValidateResponse(xml: string): ValidationMessage[] {
        // we expect messages - if everything is fine we should get:
        // <?xml version="1.0" encoding="UTF-8"?>
        // <validationMessages:validationMessages xmlns:validationMessages="http://www.sap.com/adt/core/validationMessages">
        // <validationMessages:validationMessage>
        // <validationMessages:severity>OK</validationMessages:severity>
        // </validationMessages:validationMessage>
        // </validationMessages:validationMessages>
        interface ValidateResponse {
            validationMessages: {
                validationMessage: ValidationMessage;
            }[];
        }
        const parsed = this.parseResponse<ValidateResponse>(xml);
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
     * @returns technical details of service definition
     */
    private parsePreviewResponse(xml: string): ODataServiceTechnicalDetails | undefined {
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
        interface PreviewResponse {
            group: {
                group: {
                    name: string; // group name
                    object: {
                        objectReference: {
                            type: string; // object type
                            name: string; // technical name of the object
                        };
                    };
                }[];
            };
        }
        const parsed = this.parseResponse<PreviewResponse>(xml);
        const serviceLayerGroup = (parsed.group.group || []).find((entry) => entry.name === 'Business Service Layer');
        if (!serviceLayerGroup) {
            return;
        }
        const objects = !Array.isArray(serviceLayerGroup.object)
            ? [serviceLayerGroup.object]
            : serviceLayerGroup.object;
        const serviceObject = objects.find((entry) => entry.objectReference?.type === 'SRVD/SRV');
        const serviceBindingObject = objects.find((entry) => entry.objectReference?.type === 'SRVB/SVB');
        if (!serviceObject || !serviceBindingObject) {
            return;
        }
        return {
            serviceName: serviceBindingObject.objectReference?.name || '',
            serviceDefinitionName: serviceObject.objectReference?.name || '',
            serviceVersion: '0001' 
        };
    }
}
