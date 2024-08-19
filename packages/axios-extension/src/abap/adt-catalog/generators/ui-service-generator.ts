import type { GeneratorEntry } from './types';
import type { AbapCDSView, BusinessObject, ValidationResponse } from '../../types';
import { AdtService } from '../services';

/**
 *
 */
export class UiServiceGenerator extends AdtService {
    protected referencedObject!: BusinessObject | AbapCDSView;

    /**
     * Configure the UI service generator.
     *
     * @param _config - The generator configuration.
     * @param referencedObject - The referenced object (business object or abap cds view).
     */
    public configure(_config: GeneratorEntry, referencedObject: BusinessObject | AbapCDSView) {
        this.referencedObject = referencedObject;
    }

    /**
     * Get the schema of the service binding.
     *
     * @returns The schema of the service binding.
     */
    public async getSchema(): Promise<any> {
        const response = await this.get('/schema', {
            headers: {
                Accept: 'application/vnd.sap.adt.repository.generator.schema.v1+json'
            },
            params: {
                referencedObject: this.referencedObject.uri
            }
        });
        return JSON.parse(response.data);
    }

    /**
     * Get the content of the service binding.
     *
     * @param pckg - The package name.
     * @returns The content of the service binding.
     */
    public async getContent(pckg: string): Promise<string> {
        const response = await this.get('/content', {
            headers: {
                Accept: 'application/vnd.sap.adt.repository.generator.content.v1+json'
            },
            params: {
                referencedObject: this.referencedObject.uri,
                package: pckg
            }
        });
        const content = response.data;
        const contentObj = JSON.parse(content);
        if (!contentObj['metadata']) {
            contentObj['metadata'] = {
                package: pckg
            };
        }

        return JSON.stringify(contentObj);
    }

    /**
     * Validate the package before generation.
     *
     * @param pckg - The package to be validated.
     * @returns The response of the validation.
     */
    public async validatePackage(pckg: string): Promise<any> {
        const response = await this.get('/validation', {
            headers: {
                Accept: 'application/vnd.sap.adt.validationMessages.v1+xml'
            },
            params: {
                referencedObject: this.referencedObject.uri,
                package: pckg,
                checks: 'package'
            }
        });
        return this.parseResponse(response.data);
    }

    /**
     * Validate the service content and package before generation.
     *
     * @param content - The content to be validated.
     * @returns The response of the validation.
     */
    public async validateContent(content: string): Promise<ValidationResponse> {
        const response = await this.post('/validation', content, {
            headers: {
                'Content-Type': 'application/vnd.sap.adt.repository.generator.content.v1+json',
                Accept: 'application/vnd.sap.adt.validationMessages.v1+xml'
            },
            params: {
                referencedObject: this.referencedObject.uri,
                checks: 'package,referencedobject,authorization'
            }
        });
        const data = this.parseResponse<any>(response.data);
        return data.validationMessages?.validationMessage;
    }

    /**
     * Generate the service binding.
     *
     * @param content - The content of the service binding.
     * @param transport - The transport.
     * @returns The object references.
     */
    public async generate(content: string, transport: string): Promise<unknown> {
        const response = await this.post('', content, {
            headers: {
                'Content-Type': 'application/vnd.sap.adt.repository.generator.content.v1+json',
                Accept: 'application/vnd.sap.adt.repository.generator.v1+json, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.StatusMessage'
            },
            params: {
                referencedObject: this.referencedObject.uri,
                corrNr: transport
            }
        });
        return this.parseResponse(response.data);
    }
}
