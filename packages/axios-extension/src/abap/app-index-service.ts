import type { Service } from '../base/service-provider';
import { Axios } from 'axios';
import type { Logger } from '@sap-ux/logger';

export interface App extends Record<string, unknown> {
    'sap.app/id': string;
    'sap.app/title': string;
    'sap.fiori/registrationIds': string[];
    url: string;
}

export type AppIndex = Partial<App>[];

/**
 * A class representing the app index service allowing to search applications deployed on an ABAP system.
 */
export abstract class AppIndexService extends Axios implements Service {
    public static readonly PATH = '/sap/bc/ui2/app_index';

    public log: Logger;

    /**
     * Returns list of applications matching the search query from the catalog service.
     *
     * @param searchParams key/value list of search parameters
     * @param resultFields list of fields that should be used for the response
     * @returns list of applications
     */
    public async search(searchParams: { [property: string]: string } = {}, resultFields?: string[]): Promise<AppIndex> {
        const params = Object.assign({}, searchParams);
        if (resultFields) {
            params['fields'] = resultFields.join(',');
        }
        const response = await this.get('/', { params });
        return JSON.parse(response.data).results as AppIndex;
    }

    /**
     * Gets the URL to the app manifest with the specified id.
     *
     * @param {string} appId - The id of the app.
     * @returns {Promise<string>} - URL to the app manifest.
     */
    public async getManifestUrl(appId: string): Promise<string> {
        let result = '';
        const params = {
            'id': appId
        };
        try {
            const response = await this.get('/ui5_app_info_json', { params });
            const responseValues: any = Object.values(JSON.parse(response.data));
            result =
                responseValues[0].manifestUrl !== undefined
                    ? responseValues[0].manifestUrl
                    : responseValues[0].manifest;
        } catch (e) {
            throw new Error(`Failed to get manifest URL for app with id ${appId}`);
        }
        return result;
    }
}
