import type { Logger } from '@sap-ux/logger';
import type { GeneratorEntry } from './types';
import type { BusinessObject } from '../services/virtual-folders-service';
import { AdtService } from '../services';

/**
 *
 */
export class UiServiceGenerator extends AdtService {
    public log: Logger;

    protected bo!: BusinessObject;

    public configure(_config: GeneratorEntry, bo: BusinessObject) {
        this.bo = bo;
    }

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
}
