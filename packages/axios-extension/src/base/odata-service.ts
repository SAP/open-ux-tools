import { Axios, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Logger } from '@sap-ux/logger';

export interface ODataServiceExtension {
    document(): Promise<ServiceDocument>;
    metadata(): Promise<string>;
}

function parseODataResponse<T>(): T {
    const data = this.data ? JSON.parse(this.data) : {};
    if (data.d) {
        // v2
        if (data.d.results) {
            return data.d.results as T;
        } else {
            return data.d as T;
        }
    } else if (data['@odata.context']) {
        // v4
        if (data.value) {
            return data.value as T;
        } else {
            return data as T;
        }
    }

    // not an OData response, let the caller figure it out
    return data as T;
}

export interface ServiceDocument {
    EntitySets: string[];
}

export interface ODataResponse<T> extends AxiosResponse {
    odata(): T;
}

export class ODataService extends Axios implements ODataServiceExtension {
    public log: Logger;

    protected doc: ServiceDocument;
    protected metadataDoc: string;

    public async document(): Promise<ServiceDocument> {
        if (!this.doc) {
            const response = await this.get<ServiceDocument | { name: string; url: string }[]>('/');
            const data = response.odata();
            if (data['EntitySets']) {
                this.doc = data as ServiceDocument;
            } else {
                this.doc = {
                    EntitySets: (data as { name: string; url: string }[]).map((obj) => obj.name)
                };
            }
        }
        return this.doc;
    }

    public async metadata(): Promise<string> {
        if (!this.metadataDoc) {
            const response = await super.get('/$metadata', { headers: { Accept: 'application/xml' } });
            this.metadataDoc = response.data;
        }
        return this.metadataDoc;
    }

    public async get<T = any, R = ODataResponse<T>, D = any>(
        url: string,
        config: AxiosRequestConfig<D> = { params: {} }
    ): Promise<R> {
        if (config.params['$format'] === undefined) {
            config.params['$format'] = 'json';
            config.headers = config.headers ?? {};
            config.headers.Accept = 'application/json';
        }
        const response = await super.get<T, ODataResponse<T>>(url, config);
        if (response.data && config.params['$format'] === 'json') {
            response.odata = parseODataResponse.bind(response);
        }
        return response as any;
    }
}
