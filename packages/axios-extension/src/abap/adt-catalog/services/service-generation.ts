import { AdtService } from './adt-service';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser();

export class ServiceGeneration extends AdtService {
    private id: string;
    public async getConnection(): Promise<boolean> {
        try {
            await this.get('/sap/bc/adt/discovery', {
                headers: {
                    Accept: 'application/atomsvc+xml'
                }
            });
            return true;
        } catch {
            return false;
        }
    }

    public async getBusinessObjects(): Promise<{ name: string; text: string; package: string }[]> {
        const postData = `<?xml version="1.0" encoding="UTF-8"?>
            <vfs:virtualFoldersRequest xmlns:vfs="http://www.sap.com/adt/ris/virtualFolders" objectSearchPattern="*">
            <vfs:preselection facet="api">
                <vfs:value>USE_IN_CLOUD_DEVELOPMENT</vfs:value>
            </vfs:preselection>
            <vfs:preselection facet="group">
                <vfs:value>CORE_DATA_SERVICES</vfs:value>
            </vfs:preselection>
            <vfs:preselection facet="type">
                <vfs:value>BDEF</vfs:value>
            </vfs:preselection>
            <vfs:facetorder/>
            </vfs:virtualFoldersRequest>`;
        const response = await this.post('/sap/bc/adt/repository/informationsystem/virtualfolders/contents', postData, {
            headers: {
                'Content-Type': 'application/vnd.sap.adt.repository.virtualfolders.request.v1+xml',
                Accept: 'application/vnd.sap.adt.repository.virtualfolders.result.v1+xml'
            }
        });

        const data = parser.parse(response.data, true);

        return data.virtualFoldersResult?.object as {
            name: string;
            text: string;
            package: string;
        }[];
    }

    public async getGenerator(businessObjectName: string): Promise<{ id: string; summary: string; title: string }> {
        const response = await this.get('/sap/bc/adt/repository/generators', {
            headers: {
                Accept: 'application/atom+xml;type=feed'
            },
            params: {
                referencedObject: `/sap/bc/adt/bo/behaviordefinitions/${businessObjectName.toLocaleLowerCase()}`
            }
        });

        const data = parser.parse(response.data, true);

        return data.feed?.entry as {
            id: string;
            summary: string;
            title: string;
        };
    }

    public async getContent(bo: string, pckg: string): Promise<string> {
        const response = await this.get(`/sap/bc/adt/businessservices/generators/${this.id}/content`, {
            headers: {
                Accept: 'application/vnd.sap.adt.repository.generator.content.v1+json'
            },
            params: {
                referencedObject: `/sap/bc/adt/bo/behaviordefinitions/${bo.toLocaleLowerCase()}`,
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

    public async generate(bo: string, content: string, transport: string): Promise<any> {
        const response = await this.post(`/sap/bc/adt/businessservices/generators/${this.id}`, content, {
            headers: {
                'Content-Type': 'application/vnd.sap.adt.repository.generator.content.v1+json',
                Accept: 'application/vnd.sap.adt.repository.generator.v1+json, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.StatusMessage'
            },
            params: {
                referencedObject: `/sap/bc/adt/bo/behaviordefinitions/${bo.toLocaleLowerCase()}`,
                corrNr: transport
            }
        });
        // Service binding is in XML format, ready to be used for the subsequent activation and publish.
        const data = parser.parse(response.data, true);
        return data.objectReferences;
    }

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
