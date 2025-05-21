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
    /**
     * Retrieves the service document.
     *
     * @returns A Promise that resolves to a ServiceDocument
     */
    document(): Promise<ServiceDocument>;
    /**
     * Retrieves the metadata of the service.
     *
     * @returns A Promise that resolves to a string containing the metadata
     */
    metadata(): Promise<string>;
}

/**
 * Parse a JSON based OData response and extract the content from the OData structure.
 *
 * @param includeV4ControlData unless specified only the value of the parsed v4 odata response is returned, otherwise all additional data is included e.g. `@odata.nextLink`
 * @returns an object of the provided type
 */
function parseODataResponse<T>(includeV4ControlData = false): T {
    const data = this.data ? JSON.parse(this.data) : {};
    if (data.d) {
        // v2
        if (data.d.results) {
            return data.d.results as T;
        } else {
            return data.d as T;
        }
    } else if (!includeV4ControlData && data['@odata.context']) {
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
    /**
     *
     */
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
     * @param includeV4ControlData include the control information that is not part of the odata value but may be required e.g. `@odata.nextLink`
     * @returns a response enhanced with an OData parse method
     */
    public async get<T = any, R = ODataResponse<T>, D = any>(
        url: string,
        config: AxiosRequestConfig<D> = {},
        includeV4ControlData = false
    ): Promise<R> {
        // AxiosRequestConfig `params` property supports plain object or URLSearchParams
        if (config.params instanceof URLSearchParams && !config.params.has('$format') && !config.headers?.Accept) {
            config.params.set('$format', 'json');
            config.headers = config.headers ?? {};
            config.headers.Accept = 'application/json';
        } else if (config.params?.['$format'] === undefined && !config.headers?.Accept) {
            config.params = config.params ?? {};
            config.params['$format'] = 'json';
            config.headers = config.headers ?? {};
            config.headers.Accept = 'application/json';
        }
        const response = await super.get<T, ODataResponse<T>>(url, config);
        const contentType = response.headers['content-type'] ?? response.headers['Content-Type'];
        if (response.data && (contentType?.includes('application/json') || config.params?.['$format'] === 'json')) {
            response.odata = parseODataResponse.bind(response, includeV4ControlData);
        }
        return response as any;
    }
}
