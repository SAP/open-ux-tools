import type { GeneratorEntry } from './types';
import type { BusinessObject } from '../../types';
import { AdtService } from '../services';

/**
 *
 */
export class UiServiceGenerator extends AdtService {
    protected bo!: BusinessObject;

    /**
     * Configure the UI service generator.
     *
     * @param _config - The generator configuration.
     * @param bo - The business object.
     */
    public configure(_config: GeneratorEntry, bo: BusinessObject) {
        this.bo = bo;
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
                referencedObject: this.bo.uri,
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
     * Generate the service binding.
     *
     * @param content - The content of the service binding.
     * @param transport - The transport.
     * @returns The object references.
     */
    public async generate(content: string, transport: string): Promise<any> {
        const response = await this.post('', content, {
            headers: {
                'Content-Type': 'application/vnd.sap.adt.repository.generator.content.v1+json',
                Accept: 'application/vnd.sap.adt.repository.generator.v1+json, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.StatusMessage'
            },
            params: {
                referencedObject: this.bo.uri,
                corrNr: transport
            }
        });
        // Service binding is in XML format, ready to be used for the subsequent activation and publish.
        const data = this.parseResponse<any>(response.data);
        return data.objectReferences;
    }

    /**
     * Lock the service binding. The class should be configured with the uri of the service binding
     * The uri is returned from the generate method.
     */
    public async lockServiceBinding() {
        await this.post('', '', {
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
}
