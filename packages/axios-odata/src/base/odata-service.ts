import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Axios } from 'axios';
import type { Logger } from '@sap-ux/logger';

/**
 * OData versions supported by Fiori elements
 */
export enum ODataVersion {
    v2 = '2',
    v4 = '4'
}

export interface ServiceDocument {
    EntitySets: string[];
}

export interface ODataServiceExtension {
    document(): Promise<ServiceDocument>;
    metadata(): Promise<string>;
}

/**
 * Parse a JSON based OData response and extract the content from the OData structure.
 *
 * @returns an object of the provided type
 */
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

export interface ODataResponse<T> extends AxiosResponse {
    odata(): T;
}

/**
 * Class extending Axios representing an OData service.
 */
export class ODataService extends Axios implements ODataServiceExtension {
    public log: Logger;

    protected doc: ServiceDocument;
    protected metadataDoc: string;

    /**
     * Get the service description document.
     *
     * @returns a service description containing all exposed entities
     */
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

    /**
     * Get the metadata of the service.
     *
     * @returns service metadata
     */
    public async metadata(): Promise<string> {
        if (!this.metadataDoc) {
            const response = await this.get('/$metadata', { headers: { Accept: 'application/xml' } });
            this.metadataDoc = response.data;
        }
        return this.metadataDoc;
    }

    /**
     * Send a get request to the OData service with some preset always used parameters.
     *
     * @param url relative url to the service
     * @param config additional axios request config
     * @returns a response enhanced with an OData parse method
     */
    public async get<T = any, R = ODataResponse<T>, D = any>(
        url: string,
        config: AxiosRequestConfig<D> = {}
    ): Promise<R> {
        // request json if not otherwise specified
        if (config.params?.['$format'] === undefined && !config.headers?.Accept) {
            config.params = config.params ?? {};
            config.params['$format'] = 'json';
            config.headers = config.headers ?? {};
            config.headers.Accept = 'application/json';
        }
        const response = await super.get<T, ODataResponse<T>>(url, config);
        if (response.data && config.params?.['$format'] === 'json') {
            response.odata = parseODataResponse.bind(response);
        }
        return response as any;
    }
}
