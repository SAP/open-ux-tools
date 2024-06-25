import type { Service } from '../base/service-provider';
import { Axios, isAxiosError } from 'axios';
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
     * Returns if manifest is first supported.
     *
     * @param {string} appId - The id of the app.
     * @returns {Promise<boolean>} - is manifest first supported.
     */
    public async getIsManiFirstSupported(appId: string): Promise<boolean> {
        try {
            const params = {
                'id': appId
            };
            const response = await this.get('/ui5_app_mani_first_supported', { params });
            const parseResponseData = JSON.parse(response.data);

            return parseResponseData as boolean;
        } catch (error) {
            if (isAxiosError(error)) {
                this.log.debug(`Fail fetching ui5_app_mani_first_supported for app with id: ${appId}.`);
            }
            this.log.debug(error);
            throw error;
        }
    }
}
